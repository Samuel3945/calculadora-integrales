"""The domain layer may only depend on the standard library."""

from __future__ import annotations

import ast
from pathlib import Path

DOMAIN = Path(__file__).resolve().parents[2] / "src" / "domain"
FORBIDDEN = {"fastapi", "sympy", "numpy", "pydantic", "pydantic_settings", "starlette", "scipy"}
FORBIDDEN_INTERNAL = {"src.application", "src.infrastructure", "src.presentation"}


def _imports(path: Path) -> list[str]:
    tree = ast.parse(path.read_text(encoding="utf-8"))
    names: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            names += [alias.name for alias in node.names]
        elif isinstance(node, ast.ImportFrom) and node.module:
            names.append(node.module)
    return names


def test_domain_has_python_files() -> None:
    assert len(list(DOMAIN.rglob("*.py"))) > 15


def test_domain_has_no_forbidden_imports() -> None:
    offenders: list[str] = []
    for path in DOMAIN.rglob("*.py"):
        for name in _imports(path):
            root = name.split(".")[0]
            if root in FORBIDDEN or any(name == p or name.startswith(p + ".") for p in FORBIDDEN_INTERNAL):
                offenders.append(f"{path.relative_to(DOMAIN)}: {name}")
    assert offenders == []
