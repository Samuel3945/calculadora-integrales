from __future__ import annotations

import threading
import time

import pytest

from src.application.ports.symbolic_integrator import ExactStatus
from src.infrastructure.symbolic import sympy_integrator, thread_integrator
from src.infrastructure.symbolic.sympy_integrator import SympyIntegrator
from src.infrastructure.symbolic.thread_integrator import ThreadSympyIntegrator
from src.presentation.dependencies import build_symbolic
from src.presentation.settings import Settings
from tests.helpers.slow_worker import never_ready_worker


def run(integ, parser, text="x**2", a=0, b=1, exact=True):  # type: ignore[no-untyped-def]
    return integ.analyze(parser.parse(text, "x"), parser.parse_constant(a), parser.parse_constant(b), exact)


def test_thread_mode_computes_exact(parser) -> None:  # type: ignore[no-untyped-def]
    r = run(ThreadSympyIntegrator(10), parser)
    assert r.exact.status is ExactStatus.COMPUTED and r.exact.value == pytest.approx(1 / 3)
    assert run(ThreadSympyIntegrator(10), parser, "1/x", 0, 1, exact=False).singular_points == (0.0,)


def test_thread_mode_timeout_and_busy_fast_path(parser, monkeypatch) -> None:  # type: ignore[no-untyped-def]
    release = threading.Event()

    def slow_job(partial, *args):  # type: ignore[no-untyped-def]
        partial["points"] = (0.5,)
        release.wait(30)

    monkeypatch.setattr(thread_integrator, "_job", slow_job)
    integ = ThreadSympyIntegrator(0.4)
    try:
        start = time.monotonic()
        r = run(integ, parser)
        assert r.exact.status is ExactStatus.TIMEOUT and r.singular_points == (0.5,)
        assert time.monotonic() - start < 0.9
        run(integ, parser)  # second worker now also stuck
        start = time.monotonic()
        r = run(integ, parser)  # pool saturated: immediate, nothing queued
        assert time.monotonic() - start < 0.1
        assert r.exact.status is ExactStatus.UNAVAILABLE
    finally:
        release.set()
        deadline = time.monotonic() + 5
        while thread_integrator._in_flight and time.monotonic() < deadline:
            time.sleep(0.02)


def test_thread_mode_never_raises(parser, monkeypatch) -> None:  # type: ignore[no-untyped-def]
    monkeypatch.setattr(thread_integrator, "_job", lambda *a: (_ for _ in ()).throw(RuntimeError("x")))
    assert run(ThreadSympyIntegrator(2), parser).exact.status is ExactStatus.UNAVAILABLE


def test_process_mode_fails_fast_when_child_never_starts(parser) -> None:  # type: ignore[no-untyped-def]
    integ = SympyIntegrator(timeout_seconds=5, worker=never_ready_worker, startup_seconds=0.5)
    start = time.monotonic()
    r = run(integ, parser)
    assert r.exact.status is ExactStatus.UNAVAILABLE
    assert time.monotonic() - start < 3


@pytest.mark.parametrize(
    ("mode", "vercel", "expected"),
    [("auto", None, "process"), ("auto", "1", "thread"), ("process", "1", "process"), ("thread", None, "thread")],
)
def test_mode_resolution(monkeypatch, mode, vercel, expected) -> None:  # type: ignore[no-untyped-def]
    monkeypatch.delenv("VERCEL", raising=False)
    if vercel:
        monkeypatch.setenv("VERCEL", vercel)
    settings = Settings(_env_file=None, symbolic_mode=mode)
    assert settings.resolved_symbolic_mode == expected
    cls = ThreadSympyIntegrator if expected == "thread" else sympy_integrator.SympyIntegrator
    assert type(build_symbolic(settings)) is cls


def test_default_mode_is_auto(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    monkeypatch.delenv("SYMBOLIC_MODE", raising=False)
    assert Settings(_env_file=None).symbolic_mode == "auto"
