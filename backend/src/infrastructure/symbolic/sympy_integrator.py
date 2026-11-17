"""SymPy adapter: exact integral and singularity check in a separate, killable process.

``sympy.integrate`` can run for an arbitrary time on some inputs and cannot be interrupted from
inside the interpreter, so the work runs in a child process that is killed on timeout. The
``forkserver`` start method (``spawn`` on Windows) is used: children are forked from a clean,
single-threaded server that has SymPy preloaded, which avoids fork-in-threaded-process hazards
and the multi-second cost of re-importing SymPy on every request.
"""

from __future__ import annotations

import multiprocessing
import time
from collections.abc import Callable
from multiprocessing.connection import Connection
from typing import Any

from src.application.ports.expression_parser import ParsedConstant, ParsedExpression
from src.application.ports.symbolic_integrator import (
    ExactResult,
    ExactStatus,
    SymbolicAnalysis,
    SymbolicIntegrator,
)
from src.infrastructure.symbolic.worker import run_analysis

WorkerTarget = Callable[[Connection, Any, str, Any, Any, bool], None]
STARTUP_SECONDS = 1.5
_PRELOAD = ["sympy", "numpy", "src.infrastructure.symbolic.worker"]


def _context() -> multiprocessing.context.BaseContext:
    if "forkserver" in multiprocessing.get_all_start_methods():
        ctx = multiprocessing.get_context("forkserver")
        ctx.set_forkserver_preload(_PRELOAD)
        return ctx
    return multiprocessing.get_context("spawn")


class SympyIntegrator(SymbolicIntegrator):
    def __init__(
        self,
        timeout_seconds: float = 5.0,
        worker: WorkerTarget = run_analysis,
        startup_seconds: float = STARTUP_SECONDS,
    ) -> None:
        self._timeout = timeout_seconds
        # The child must send "ready" within this window or it is treated as unable to start.
        self._startup = min(startup_seconds, timeout_seconds)
        self._worker = worker
        self._ctx = _context()

    def warm_up(self) -> None:
        """Start the fork server now so the first request does not pay the SymPy import."""
        if self._ctx.get_start_method() == "forkserver":
            from multiprocessing import forkserver

            forkserver.ensure_running()

    def analyze(
        self,
        expression: ParsedExpression,
        lower: ParsedConstant,
        upper: ParsedConstant,
        compute_exact: bool,
    ) -> SymbolicAnalysis:
        recv, send = self._ctx.Pipe(duplex=False)
        process = self._ctx.Process(
            target=self._worker,
            args=(send, expression.payload, expression.variable, lower.payload, upper.payload, compute_exact),
            daemon=True,
        )
        points: tuple[float, ...] = ()
        exact: ExactResult | None = None
        timed_out = False
        try:
            process.start()
            send.close()
            started = time.monotonic()
            deadline = started + self._timeout
            ready = False
            while True:
                limit = deadline if ready else started + self._startup
                remaining = limit - time.monotonic()
                if remaining <= 0 or not recv.poll(remaining):
                    timed_out = ready  # no "ready" in time: unavailable, not a timeout
                    break
                try:
                    message = recv.recv()
                except EOFError:  # child died without a final message
                    break
                kind = message[0]
                if kind == "ready":
                    ready = True
                elif kind == "singularities":
                    points = tuple(message[1])
                    if not compute_exact:
                        break
                elif kind == "exact":
                    exact = ExactResult(ExactStatus.COMPUTED, message[1], message[2])
                    break
                else:  # "unavailable" or "error"
                    break
        except OSError:
            pass
        finally:
            if process.is_alive():
                process.kill()
            process.join(timeout=2)
            recv.close()

        if not compute_exact:
            return SymbolicAnalysis(ExactResult(ExactStatus.DISABLED), points)
        if exact is None:
            status = ExactStatus.TIMEOUT if timed_out else ExactStatus.UNAVAILABLE
            exact = ExactResult(status)
        return SymbolicAnalysis(exact, points)
