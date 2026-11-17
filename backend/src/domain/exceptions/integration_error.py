"""Base class for every domain/application error that maps to an API error code."""

from __future__ import annotations

from typing import Any, ClassVar


class IntegrationError(Exception):
    """Error carrying a stable machine-readable ``code`` and optional ``details``."""

    code: ClassVar[str] = "INTERNAL_ERROR"

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details: dict[str, Any] = dict(details or {})
