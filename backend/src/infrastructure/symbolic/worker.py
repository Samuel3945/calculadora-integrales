"""Code executed inside the killable child process (singularity check + exact integral).

It receives already-validated SymPy objects built by our whitelist parser (never user text) and
streams results over a pipe so the parent keeps partial results if the timeout fires.
"""

from __future__ import annotations

import math
from multiprocessing.connection import Connection
from typing import Any

import sympy
from sympy.calculus.util import continuous_domain

from src.infrastructure.parsers.sympy_expression_parser import make_symbol


def _bad_points(bad: Any) -> list[float]:
    """Flatten the 'not continuous' set into real numbers (interval ends for intervals)."""
    if isinstance(bad, sympy.FiniteSet):
        raw = list(bad.args)
    elif isinstance(bad, sympy.Interval):
        raw = [bad.start, bad.end]
    elif isinstance(bad, sympy.Union):
        return [p for part in bad.args for p in _bad_points(part)]
    else:
        return []
    points: list[float] = []
    for item in raw:
        try:
            value = float(sympy.N(item))
        except (TypeError, ValueError):
            continue
        if math.isfinite(value):
            points.append(value)
    return points


def find_singular_points(expr: Any, variable: str, lower: Any, upper: Any) -> list[float]:
    """Best effort: points of [lower, upper] where the expression is not continuous."""
    x = make_symbol(variable)
    lo, hi = sorted((lower, upper), key=lambda v: float(sympy.N(v)))
    interval = sympy.Interval(lo, hi)
    domain = continuous_domain(expr, x, interval)
    points = _bad_points(sympy.Complement(interval, domain))
    return sorted({p for p in points if float(sympy.N(lo)) <= p <= float(sympy.N(hi))})


def compute_exact(expr: Any, variable: str, lower: Any, upper: Any) -> tuple[float, str] | None:
    """Exact definite integral as (value, latex), or None when not a finite real closed form."""
    x = make_symbol(variable)
    result = sympy.integrate(expr, (x, lower, upper))
    if result.has(sympy.Integral):
        return None
    numeric = sympy.N(result, 25)
    if numeric.is_real is not True:
        return None
    value = float(numeric)
    if not math.isfinite(value):
        return None
    return value, sympy.latex(result)


def run_analysis(
    conn: Connection, expr: Any, variable: str, lower: Any, upper: Any, want_exact: bool
) -> None:
    """Child entry point. Messages: ("ready",), ("singularities", [..]), ("exact", value, latex),
    ("unavailable",) or ("error", text)."""
    try:
        conn.send(("ready",))  # lets the parent fail fast if the child cannot start
        try:
            points = find_singular_points(expr, variable, lower, upper)
        except Exception:  # best effort only
            points = []
        conn.send(("singularities", points))
        if want_exact:
            try:
                outcome = compute_exact(expr, variable, lower, upper)
            except Exception:
                outcome = None
            conn.send(("unavailable",) if outcome is None else ("exact", outcome[0], outcome[1]))
    except BaseException as exc:  # noqa: BLE001 - report anything, the parent decides
        try:
            conn.send(("error", repr(exc)))
        except Exception:
            pass
    finally:
        conn.close()
