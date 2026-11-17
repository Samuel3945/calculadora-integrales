"""Worker stand-in that never finishes, to exercise the symbolic timeout deterministically."""

from __future__ import annotations

import time
from multiprocessing.connection import Connection
from typing import Any


def sleeping_worker(conn: Connection, expr: Any, variable: str, lower: Any, upper: Any, want_exact: bool) -> None:
    conn.send(("ready",))
    conn.send(("singularities", [0.5]))
    time.sleep(60)


def never_ready_worker(conn: Connection, expr: Any, variable: str, lower: Any, upper: Any, want_exact: bool) -> None:
    time.sleep(60)
