from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from src.domain.exceptions import InvalidPanelsError, UnknownVariantError

MAX_PANELS = 10_000
MIN_COMPOSITE_PANELS = 2


class Variant(StrEnum):
    SIMPLE = "simple"
    COMPOSITE = "composite"


@dataclass(frozen=True, slots=True)
class IntegrationConfig:
    """Method id, variant and panel count. Use :meth:`create` to validate raw input."""

    method_id: str
    variant: Variant
    panel_count: int

    @classmethod
    def create(cls, method_id: str, variant: str, panel_count: int | None) -> IntegrationConfig:
        try:
            parsed_variant = Variant(variant)
        except ValueError:
            raise UnknownVariantError(
                f"unknown variant {variant!r}", {"variant": variant, "allowed": [v.value for v in Variant]}
            ) from None
        if parsed_variant is Variant.SIMPLE:
            if panel_count not in (None, 1):
                raise InvalidPanelsError(
                    "the simple variant uses exactly one panel", {"panel_count": panel_count}
                )
            return cls(method_id, parsed_variant, 1)
        if panel_count is None or isinstance(panel_count, bool) or not isinstance(panel_count, int):
            raise InvalidPanelsError("composite variant requires an integer panel_count", {"panel_count": panel_count})
        if not MIN_COMPOSITE_PANELS <= panel_count <= MAX_PANELS:
            raise InvalidPanelsError(
                f"panel_count must be between {MIN_COMPOSITE_PANELS} and {MAX_PANELS}",
                {"panel_count": panel_count, "min": MIN_COMPOSITE_PANELS, "max": MAX_PANELS},
            )
        return cls(method_id, parsed_variant, panel_count)
