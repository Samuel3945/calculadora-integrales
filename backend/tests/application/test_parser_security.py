"""The parser must reject anything that is not plain math, without ever executing it."""

from __future__ import annotations

import builtins
import time

import pytest

from src.domain.exceptions import IntegrationError
from src.infrastructure.parsers.sympy_expression_parser import SympyExpressionParser

ATTACKS = [
    "__import__('os')",
    "__import__('os').system('echo pwned')",
    "x.__class__",
    "().__class__",
    "().__class__.__bases__[0].__subclasses__()",
    "lambda: 1",
    "(lambda x: x)(1)",
    "[x for x in y]",
    "{x for x in y}",
    "(x for x in y)",
    "open('f')",
    "eval('1')",
    "exec('1')",
    "compile('1','a','eval')",
    "getattr(x, 'a')",
    "x[0]",
    "x[0:1]",
    "'a'*10",
    "f'{x}'",
    "x := 1",
    "[1, 2]",
    "(1, 2)",
    "{1: 2}",
    "sin(x).real",
    "sin.__call__(x)",
    "globals()",
    "sympify('x')",
    "9**9**9",
    "9**9**9**9",
    "(10**100)**100",
    "9" * 300,
    "sin(" * 35 + "x" + ")" * 35,
    "-" * 100 + "x",
    "(" * 300 + "x" + ")" * 300,
    "x;import os",
    "x\nimport os",
    "import os",
    "await x",
    "yield x",
    "x if x else 2",
    "x @ x",
]


@pytest.mark.parametrize("attack", ATTACKS, ids=[a[:30] for a in ATTACKS])
def test_attacks_are_rejected(parser: SympyExpressionParser, attack: str) -> None:
    start = time.monotonic()
    with pytest.raises(IntegrationError) as info:
        parser.parse(attack, "x")
    assert info.value.code in {"INVALID_EXPRESSION", "EXPRESSION_TOO_COMPLEX"}
    assert time.monotonic() - start < 1.0  # rejected cheaply, nothing huge got computed


def test_rejected_input_never_runs(parser: SympyExpressionParser, monkeypatch: pytest.MonkeyPatch) -> None:
    called: list[str] = []
    monkeypatch.setattr(builtins, "open", lambda *a, **k: called.append("open"))
    for attack in ("open('f')", "__import__('os')", "eval('1')"):
        with pytest.raises(IntegrationError):
            parser.parse(attack, "x")
    assert called == []


def test_attacks_are_rejected_as_bounds_too(parser: SympyExpressionParser) -> None:
    for attack in ("__import__('os')", "x", "9**9**9", "().__class__"):
        with pytest.raises(IntegrationError):
            parser.parse_constant(attack)


def test_parser_source_never_calls_eval_exec_or_sympify() -> None:
    import ast
    from pathlib import Path

    path = Path(__file__).resolve().parents[2] / "src" / "infrastructure" / "parsers" / "sympy_expression_parser.py"
    called = {
        node.func.id
        for node in ast.walk(ast.parse(path.read_text()))
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
    }
    assert not called & {"eval", "exec", "sympify", "parse_expr", "compile", "__import__"}
