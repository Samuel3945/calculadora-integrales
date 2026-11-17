from __future__ import annotations

from typing import ClassVar

from src.domain.exceptions.integration_error import IntegrationError


class InvalidBoundsError(IntegrationError):
    code: ClassVar[str] = "INVALID_BOUNDS"
