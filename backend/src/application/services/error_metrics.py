from __future__ import annotations

import math

from src.application.ports.symbolic_integrator import ExactResult, ExactStatus


def compute_errors(exact: ExactResult, approximation: float) -> tuple[float | None, float | None]:
    """Return ``(absolute_error, relative_error)``; both None without a computed exact value.

    relative_error is None when the exact value is 0 (undefined)."""
    if exact.status is not ExactStatus.COMPUTED or exact.value is None:
        return None, None
    absolute = abs(exact.value - approximation)
    if exact.value == 0.0:
        return absolute, None
    relative = absolute / abs(exact.value)
    return absolute, relative if math.isfinite(relative) else None
