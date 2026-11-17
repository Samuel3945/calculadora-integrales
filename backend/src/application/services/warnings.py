"""Builders for the warning codes of the API contract."""

from __future__ import annotations

from src.application.dto import ResultWarning
from src.application.ports.symbolic_integrator import ExactStatus, SymbolicAnalysis


def equal_bounds() -> ResultWarning:
    return ResultWarning("EQUAL_BOUNDS", "lower and upper bounds are equal; the integral is 0")


def possible_singularity(points: tuple[float, ...]) -> ResultWarning:
    return ResultWarning(
        "POSSIBLE_SINGULARITY",
        "the function may have a singularity or discontinuity inside the interval",
        {"points": list(points)},
    )


def estimate_unavailable(reason: str) -> ResultWarning:
    return ResultWarning("ESTIMATE_UNAVAILABLE", "the Richardson error estimate could not be computed", {"reason": reason})


def from_analysis(analysis: SymbolicAnalysis) -> list[ResultWarning]:
    warnings: list[ResultWarning] = []
    if analysis.singular_points:
        warnings.append(possible_singularity(analysis.singular_points))
    if analysis.exact.status is ExactStatus.TIMEOUT:
        warnings.append(ResultWarning("EXACT_TIMEOUT", "the exact integral timed out and was skipped"))
    elif analysis.exact.status is ExactStatus.UNAVAILABLE:
        warnings.append(ResultWarning("EXACT_UNAVAILABLE", "no closed form could be computed for the exact integral"))
    return warnings
