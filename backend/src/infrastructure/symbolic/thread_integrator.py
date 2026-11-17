"""In-process SymPy adapter for platforms where child processes are unusable (e.g. Vercel).

The job runs on a small, shared ``ThreadPoolExecutor`` and is bounded by
``future.result(timeout=...)``. Trade-off: a Python thread cannot be killed, so a pathological
integral keeps running (and holding its worker) after the request has already received
``timeout``. To keep one bad input from stalling later requests, jobs are never queued: when
every worker is still busy, ``analyze`` returns immediately without running anything.
"""

from __future__ import annotations

import threading
from concurrent.futures import Future, ThreadPoolExecutor
from concurrent.futures import TimeoutError as FutureTimeout
from typing import Any

from src.application.ports.expression_parser import ParsedConstant, ParsedExpression
from src.application.ports.symbolic_integrator import (
    ExactResult,
    ExactStatus,
    SymbolicAnalysis,
    SymbolicIntegrator,
)
from src.infrastructure.symbolic.worker import compute_exact, find_singular_points

MAX_WORKERS = 2
_executor = ThreadPoolExecutor(max_workers=MAX_WORKERS, thread_name_prefix="symbolic")
_in_flight = 0
_lock = threading.Lock()


def _try_acquire() -> bool:
    global _in_flight
    with _lock:
        if _in_flight >= MAX_WORKERS:
            return False
        _in_flight += 1
        return True


def _release(_: Future[Any]) -> None:
    global _in_flight
    with _lock:
        _in_flight -= 1


def _job(
    partial: dict[str, Any], expr: Any, variable: str, lower: Any, upper: Any, want_exact: bool
) -> ExactResult:
    try:
        partial["points"] = tuple(find_singular_points(expr, variable, lower, upper))
    except Exception:  # best effort only
        partial["points"] = ()
    if not want_exact:
        return ExactResult(ExactStatus.DISABLED)
    try:
        outcome = compute_exact(expr, variable, lower, upper)
    except Exception:
        outcome = None
    if outcome is None:
        return ExactResult(ExactStatus.UNAVAILABLE)
    return ExactResult(ExactStatus.COMPUTED, outcome[0], outcome[1])


class ThreadSympyIntegrator(SymbolicIntegrator):
    def __init__(self, timeout_seconds: float = 5.0) -> None:
        self._timeout = timeout_seconds

    def analyze(
        self,
        expression: ParsedExpression,
        lower: ParsedConstant,
        upper: ParsedConstant,
        compute_exact: bool,
    ) -> SymbolicAnalysis:
        unavailable = SymbolicAnalysis(
            ExactResult(ExactStatus.UNAVAILABLE if compute_exact else ExactStatus.DISABLED)
        )
        try:
            if not _try_acquire():  # earlier timed-out jobs still occupy every worker
                return unavailable
            partial: dict[str, Any] = {}
            try:
                future = _executor.submit(
                    _job, partial, expression.payload, expression.variable,
                    lower.payload, upper.payload, compute_exact,
                )
            except BaseException:
                _release(None)  # type: ignore[arg-type]
                raise
            future.add_done_callback(_release)
            try:
                exact = future.result(timeout=self._timeout)
            except FutureTimeout:
                status = ExactStatus.TIMEOUT if compute_exact else ExactStatus.DISABLED
                return SymbolicAnalysis(ExactResult(status), partial.get("points", ()))
            return SymbolicAnalysis(exact, partial.get("points", ()))
        except Exception:
            return unavailable
