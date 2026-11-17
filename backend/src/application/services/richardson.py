"""Richardson error estimate: rerun the same rule with twice as many panels."""

from __future__ import annotations

from src.application.dto import EstimatedError
from src.domain.entities.integration_problem import IntegrationProblem
from src.domain.interfaces.integration_strategy import IntegrationStrategy
from src.domain.value_objects.integration_config import IntegrationConfig


def richardson_estimate(
    strategy: IntegrationStrategy, problem: IntegrationProblem, panel_count: int, approximation: float
) -> EstimatedError:
    """E = (I_2r - I_r) * 2^p / (2^p - 1) with p = error order of the composite rule.

    The composite error behaves as C*h^p, so I_exact - I_r ~ (I_2r - I_r) * 2^p / (2^p - 1). It is
    an *estimate* of ``exact - I_r``, valid only while the integrand is smooth on the interval.
    Raises IntegrationError if the refined run is not possible (e.g. 2r > MAX_PANELS)."""
    # Validates the refined panel count too (raises InvalidPanelsError beyond MAX_PANELS).
    refined_count = IntegrationConfig.create(strategy.id, "composite", panel_count * 2).panel_count
    refined = strategy.integrate(problem, refined_count)
    p = strategy.error_order
    factor = 2**p / (2**p - 1)
    return EstimatedError(
        value=(refined.approximation - approximation) * factor,
        method="richardson",
        refined_approximation=refined.approximation,
        refined_panel_count=refined_count,
    )
