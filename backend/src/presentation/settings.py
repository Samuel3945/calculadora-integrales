from __future__ import annotations

import os
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

API_VERSION = "1.0.0"


class Settings(BaseSettings):
    """Runtime configuration, read from environment variables and an optional ``.env`` file."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Comma-separated list of allowed browser origins.
    cors_origins: str = "http://localhost:5173"
    # Wall-clock budget of the symbolic (SymPy) child process, in seconds.
    symbolic_timeout_seconds: float = Field(default=5.0, gt=0)

    # auto: "thread" when the VERCEL env var is set, otherwise "process".
    symbolic_mode: Literal["auto", "process", "thread"] = "auto"

    @property
    def resolved_symbolic_mode(self) -> Literal["process", "thread"]:
        if self.symbolic_mode != "auto":
            return self.symbolic_mode
        return "thread" if os.environ.get("VERCEL") else "process"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
