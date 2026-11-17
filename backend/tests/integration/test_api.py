"""FastAPI integration tests: real app, real parser/evaluator/SymPy process."""

from __future__ import annotations

import math
from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient

from src.application.factories.strategy_factory import StrategyFactory
from src.infrastructure.numerical.numpy_evaluator import NumpyEvaluator
from src.infrastructure.parsers.sympy_expression_parser import SympyExpressionParser
from src.infrastructure.symbolic.sympy_integrator import SympyIntegrator
from src.presentation.dependencies import Container
from src.presentation.main import create_app
from src.presentation.settings import Settings
from tests.helpers.slow_worker import sleeping_worker

PREFIX = "/api/v1"
ALL_IDS = [
    "closed_trapezoid", "closed_simpson_13", "closed_simpson_38", "closed_boole",
    "open_midpoint", "open_newton_cotes_2", "open_newton_cotes_3", "open_newton_cotes_4",
]


@pytest.fixture(scope="module")
def client() -> Iterator[TestClient]:
    app = create_app(Settings(_env_file=None, symbolic_timeout_seconds=10))
    with TestClient(app) as c:
        yield c


def solve_body(**overrides: Any) -> dict[str, Any]:
    body: dict[str, Any] = {
        "expression": "sin(x)", "variable": "x", "lower_bound": 0, "upper_bound": "pi",
        "method": "closed_simpson_13", "variant": "composite", "panel_count": 2,
        "options": {"calculate_exact": True, "generate_graph": True, "graph_points": 300, "estimate_error": True},
    }
    body.update(overrides)
    return body


def assert_error(response, status: int, code: str) -> dict[str, Any]:  # type: ignore[no-untyped-def]
    assert response.status_code == status, response.text
    payload = response.json()
    assert set(payload) == {"error"}
    assert set(payload["error"]) == {"code", "message", "details"}
    assert payload["error"]["code"] == code
    return payload["error"]


# -- health / methods ---------------------------------------------------------------------------
def test_health(client: TestClient) -> None:
    r = client.get(f"{PREFIX}/health")
    assert r.status_code == 200 and r.json() == {"status": "ok", "version": "1.0.0"}


def test_methods(client: TestClient) -> None:
    body = client.get(f"{PREFIX}/methods").json()
    assert body["variants"] == ["simple", "composite"]
    assert [m["id"] for m in body["methods"]] == ALL_IDS
    simpson = body["methods"][1]
    assert simpson["family"] == "closed" and simpson["degree_of_exactness"] == 3
    assert simpson["subintervals_per_panel"] == 2 and simpson["nodes_per_panel"] == 3 and simpson["error_order"] == 4
    assert simpson["local_nodes"] == [0, 1, 2]
    assert simpson["local_weights"] == pytest.approx([1 / 3, 4 / 3, 1 / 3])
    assert "\\frac{h}{3}" in simpson["formula_latex"]
    midpoint = body["methods"][4]
    assert (midpoint["subintervals_per_panel"], midpoint["local_nodes"], midpoint["local_weights"]) == (2, [1], [2.0])


def test_openapi_docs(client: TestClient) -> None:
    assert client.get("/docs").status_code == 200
    paths = client.get("/openapi.json").json()["paths"]
    assert set(paths) == {
        f"{PREFIX}/health", f"{PREFIX}/methods", f"{PREFIX}/expressions/validate",
        f"{PREFIX}/integrals/solve", f"{PREFIX}/integrals/compare",
    }


# -- validate -----------------------------------------------------------------------------------
def test_validate_valid(client: TestClient) -> None:
    r = client.post(f"{PREFIX}/expressions/validate", json={"expression": "sin(x)", "variable": "x"})
    assert r.status_code == 200
    assert r.json() == {"valid": True, "canonical": "sin(x)", "latex": r"\sin{\left(x \right)}", "error": None}


def test_validate_invalid_is_still_200(client: TestClient) -> None:
    r = client.post(f"{PREFIX}/expressions/validate", json={"expression": "__import__('os')"})
    assert r.status_code == 200
    body = r.json()
    assert body["valid"] is False and body["canonical"] is None and body["latex"] is None
    assert body["error"]["code"] == "INVALID_EXPRESSION"


def test_validate_too_complex_and_bad_variable(client: TestClient) -> None:
    r = client.post(f"{PREFIX}/expressions/validate", json={"expression": "x" * 300})
    assert r.json()["error"]["code"] == "EXPRESSION_TOO_COMPLEX"
    r = client.post(f"{PREFIX}/expressions/validate", json={"expression": "x", "variable": "e"})
    assert r.json()["error"]["code"] == "INVALID_VARIABLE"


def test_validate_malformed_body(client: TestClient) -> None:
    error = assert_error(client.post(f"{PREFIX}/expressions/validate", json={}), 422, "VALIDATION_ERROR")
    assert error["details"]["errors"][0]["loc"] == ["body", "expression"]


# -- solve --------------------------------------------------------------------------------------
def test_solve_known_value_full_payload(client: TestClient) -> None:
    r = client.post(f"{PREFIX}/integrals/solve", json=solve_body())
    assert r.status_code == 200, r.text
    b = r.json()
    assert b["method"] == {
        "id": "closed_simpson_13", "family": "closed", "degree_of_exactness": 3,
        "subintervals_per_panel": 2, "nodes_per_panel": 3, "error_order": 4,
    }
    assert b["variant"] == "composite"
    assert b["expression"] == {"canonical": "sin(x)", "latex": r"\sin{\left(x \right)}", "variable": "x"}
    assert b["bounds"]["lower"] == 0.0 and b["bounds"]["upper"] == pytest.approx(math.pi)
    assert (b["bounds"]["lower_latex"], b["bounds"]["upper_latex"]) == ("0", r"\pi")
    assert (b["panel_count"], b["subinterval_count"]) == (2, 4)
    assert b["panel_width"] == pytest.approx(math.pi / 2) and b["step"] == pytest.approx(math.pi / 4)
    assert b["approximation"] == pytest.approx(2.0045597549844207, abs=1e-12)
    assert b["exact"] == {"status": "computed", "value": 2.0, "latex": "2"}
    assert b["absolute_error"] == pytest.approx(0.0045597549844207, abs=1e-12)
    assert b["relative_error"] == pytest.approx(0.0022798774922104, abs=1e-12)
    est = b["estimated_error"]
    assert est["method"] == "richardson" and est["refined_panel_count"] == 4
    assert est["value"] == pytest.approx(-0.0045766, abs=1e-6)
    assert est["refined_approximation"] == pytest.approx(2.0002691699, abs=1e-9)
    assert b["function_evaluations"] == 5 and len(b["evaluations"]) == 6 and len(b["panels"]) == 2
    first = b["evaluations"][0]
    assert set(first) == {"index", "panel", "x", "fx", "weight", "contribution", "shared"}
    assert first["weight"] == pytest.approx(0.2617993878) and first["shared"] is False
    assert [e["shared"] for e in b["evaluations"]] == [False, False, True, True, False, False]
    assert b["panels"][0] == {"index": 1, "start": 0.0, "end": pytest.approx(math.pi / 2), "approximation": pytest.approx(1.0022798775)}
    g = b["graph"]
    assert len(g["curve"]["x"]) == len(g["curve"]["y"]) == 300
    assert g["curve"]["x"][0] == pytest.approx(-0.1 * math.pi)
    assert len(g["nodes"]["x"]) == 5
    assert [c["panel"] for c in g["approximation_curves"]] == [1, 2]
    assert b["warnings"] == []


def test_solve_without_optional_parts(client: TestClient) -> None:
    body = solve_body(options={"calculate_exact": False, "generate_graph": False, "estimate_error": False})
    b = client.post(f"{PREFIX}/integrals/solve", json=body).json()
    assert b["exact"] == {"status": "disabled", "value": None, "latex": None}
    assert b["absolute_error"] is None and b["relative_error"] is None
    assert b["estimated_error"] is None and b["graph"] is None


def test_solve_defaults_and_simple_variant(client: TestClient) -> None:
    r = client.post(f"{PREFIX}/integrals/solve", json={
        "expression": "x**2", "lower_bound": 0, "upper_bound": 1, "method": "closed_simpson_13", "variant": "simple",
    })
    assert r.status_code == 200
    b = r.json()
    assert b["panel_count"] == 1 and b["approximation"] == pytest.approx(1 / 3, abs=1e-12)
    assert b["exact"]["status"] == "computed" and b["graph"] is not None


DEGREES = dict(zip(ALL_IDS, [1, 3, 3, 5, 1, 1, 3, 3], strict=True))


@pytest.mark.parametrize("method", ALL_IDS)
@pytest.mark.parametrize("variant", ["simple", "composite"])
def test_all_sixteen_variants_over_http(client: TestClient, method: str, variant: str) -> None:
    """Each rule integrates a polynomial of its own degree of exactness exactly, via HTTP."""
    degree = DEGREES[method]
    body = solve_body(expression=f"x^{degree}", lower_bound=0, upper_bound=1, method=method, variant=variant,
                      panel_count=None if variant == "simple" else 3,
                      options={"calculate_exact": False, "generate_graph": False, "estimate_error": False})
    b = client.post(f"{PREFIX}/integrals/solve", json=body).json()
    assert b["approximation"] == pytest.approx(1 / (degree + 1), abs=1e-12)
    assert b["method"]["id"] == method and b["variant"] == variant


def test_degree_one_rules_are_not_exact_on_cubics(client: TestClient) -> None:
    for method in ("closed_trapezoid", "open_midpoint", "open_newton_cotes_2"):
        body = solve_body(expression="x^3", lower_bound=0, upper_bound=1, method=method, variant="simple", panel_count=None,
                          options={"calculate_exact": False, "generate_graph": False, "estimate_error": False})
        assert abs(client.post(f"{PREFIX}/integrals/solve", json=body).json()["approximation"] - 0.25) > 1e-3


def test_solve_bound_expressions(client: TestClient) -> None:
    body = solve_body(expression="cos(x)", lower_bound="-pi/2", upper_bound="pi/2", method="closed_boole", panel_count=4)
    b = client.post(f"{PREFIX}/integrals/solve", json=body).json()
    assert b["approximation"] == pytest.approx(2.0, abs=1e-5)
    assert b["bounds"]["lower"] == pytest.approx(-math.pi / 2)
    assert b["bounds"]["lower_latex"] == r"- \frac{\pi}{2}"
    assert b["exact"]["value"] == pytest.approx(2.0)


def test_solve_inverted_bounds(client: TestClient) -> None:
    body = solve_body(lower_bound="pi", upper_bound=0)
    b = client.post(f"{PREFIX}/integrals/solve", json=body).json()
    assert b["approximation"] == pytest.approx(-2.0045597549844207, abs=1e-12)
    assert b["exact"]["value"] == pytest.approx(-2.0)
    assert b["panel_width"] < 0
    assert b["absolute_error"] == pytest.approx(0.0045597549844207, abs=1e-12)


def test_solve_equal_bounds(client: TestClient) -> None:
    b = client.post(f"{PREFIX}/integrals/solve", json=solve_body(lower_bound=2, upper_bound="2")).json()
    assert b["approximation"] == 0 and b["evaluations"] == [] and b["panels"] == []
    assert [w["code"] for w in b["warnings"]] == ["EQUAL_BOUNDS"]
    assert b["function_evaluations"] == 0 and b["estimated_error"] is None


def test_solve_singularity_warning_does_not_block(client: TestClient) -> None:
    body = solve_body(expression="1/sqrt(x)", lower_bound=0, upper_bound=1, method="open_midpoint", panel_count=10)
    r = client.post(f"{PREFIX}/integrals/solve", json=body)
    assert r.status_code == 200
    b = r.json()
    warning = next(w for w in b["warnings"] if w["code"] == "POSSIBLE_SINGULARITY")
    assert warning["details"] == {"points": [0.0]}
    assert 1.5 < b["approximation"] < 2.0
    assert b["graph"]["curve"]["y"][0] is None  # sampled at x < 0: undefined, not an error


def test_solve_exact_unavailable_is_a_warning_only(client: TestClient) -> None:
    body = solve_body(expression="1/x", lower_bound=-1, upper_bound=2, method="open_midpoint", panel_count=2)
    b = client.post(f"{PREFIX}/integrals/solve", json=body).json()
    assert b["exact"]["status"] == "unavailable" and b["absolute_error"] is None
    assert {w["code"] for w in b["warnings"]} == {"EXACT_UNAVAILABLE", "POSSIBLE_SINGULARITY"}
    assert math.isfinite(b["approximation"])


def test_solve_exact_timeout_is_a_warning_only() -> None:
    settings = Settings(_env_file=None, symbolic_timeout_seconds=0.5)
    container = Container(SympyExpressionParser(), NumpyEvaluator(), SympyIntegrator(0.5, worker=sleeping_worker), StrategyFactory.default())
    with TestClient(create_app(settings, container)) as c:
        b = c.post(f"{PREFIX}/integrals/solve", json=solve_body()).json()
    assert b["exact"]["status"] == "timeout" and b["exact"]["value"] is None
    assert b["approximation"] == pytest.approx(2.0045597549844207, abs=1e-12)
    assert "EXACT_TIMEOUT" in {w["code"] for w in b["warnings"]}


@pytest.mark.parametrize(
    ("overrides", "status", "code"),
    [
        ({"method": "simpson"}, 422, "UNKNOWN_METHOD"),
        ({"variant": "triple"}, 422, "UNKNOWN_VARIANT"),
        ({"variant": "simple", "panel_count": 3}, 422, "INVALID_PANELS"),
        ({"variant": "composite", "panel_count": 1}, 422, "INVALID_PANELS"),
        ({"variant": "composite", "panel_count": 0}, 422, "INVALID_PANELS"),
        ({"variant": "composite", "panel_count": 10001}, 422, "INVALID_PANELS"),
        ({"variant": "composite", "panel_count": None}, 422, "INVALID_PANELS"),
        ({"expression": "sin(x"}, 422, "INVALID_EXPRESSION"),
        ({"expression": "__import__('os').system('ls')"}, 422, "INVALID_EXPRESSION"),
        ({"expression": "foo(x)"}, 422, "INVALID_EXPRESSION"),
        ({"expression": "x" * 300}, 422, "EXPRESSION_TOO_COMPLEX"),
        ({"expression": "9**9**9"}, 422, "EXPRESSION_TOO_COMPLEX"),
        ({"expression": "sin(" * 40 + "x" + ")" * 40}, 422, "EXPRESSION_TOO_COMPLEX"),
        ({"variable": "e"}, 422, "INVALID_VARIABLE"),
        ({"variable": "xy"}, 422, "INVALID_VARIABLE"),
        ({"lower_bound": "inf"}, 422, "INVALID_BOUNDS"),
        ({"upper_bound": "x"}, 422, "INVALID_BOUNDS"),
        ({"upper_bound": "1/0"}, 422, "INVALID_BOUNDS"),
        ({"upper_bound": "sqrt(-1)"}, 422, "INVALID_BOUNDS"),
    ],
)
def test_solve_request_errors(client: TestClient, overrides: dict[str, Any], status: int, code: str) -> None:
    assert_error(client.post(f"{PREFIX}/integrals/solve", json=solve_body(**overrides)), status, code)


def test_solve_non_finite_json_bound(client: TestClient) -> None:
    r = client.post(f"{PREFIX}/integrals/solve", content='{"expression":"x","lower_bound":0,"upper_bound":Infinity,"method":"open_midpoint","variant":"simple"}', headers={"content-type": "application/json"})
    assert_error(r, 422, "INVALID_BOUNDS")


@pytest.mark.parametrize(
    "expression", ["1/x", "log(x)", "1/sqrt(x)", "sqrt(x - 1)", "1/(x-0.5)"],
)
def test_solve_function_evaluation_error(client: TestClient, expression: str) -> None:
    body = solve_body(expression=expression, lower_bound=0, upper_bound=1, method="closed_trapezoid", panel_count=2)
    error = assert_error(client.post(f"{PREFIX}/integrals/solve", json=body), 422, "FUNCTION_EVALUATION_ERROR")
    assert set(error["details"]) == {"x", "reason"}
    assert error["details"]["reason"] in {"nan", "infinite", "domain", "division_by_zero"}
    if expression == "1/x":
        assert error["details"] == {"x": 0.0, "reason": "division_by_zero"}
    if expression == "log(x)":
        assert error["details"]["reason"] == "domain"


def test_solve_validation_errors(client: TestClient) -> None:
    assert_error(client.post(f"{PREFIX}/integrals/solve", json={"expression": "x"}), 422, "VALIDATION_ERROR")
    for points in (49, 2001):
        body = solve_body(options={"graph_points": points})
        error = assert_error(client.post(f"{PREFIX}/integrals/solve", json=body), 422, "VALIDATION_ERROR")
        assert error["details"]["errors"][0]["loc"][-1] == "graph_points"
    assert_error(client.post(f"{PREFIX}/integrals/solve", content="not json", headers={"content-type": "application/json"}), 422, "VALIDATION_ERROR")
    assert_error(client.post(f"{PREFIX}/integrals/solve", json=solve_body(panel_count="many")), 422, "VALIDATION_ERROR")


# -- compare ------------------------------------------------------------------------------------
def test_compare_default_all_methods(client: TestClient) -> None:
    body = {"expression": "sin(x)", "lower_bound": 0, "upper_bound": "pi", "variant": "composite", "panel_count": 2}
    b = client.post(f"{PREFIX}/integrals/compare", json=body).json()
    assert b["exact"] == {"status": "computed", "value": 2.0, "latex": "2"}
    assert [r["method"]["id"] for r in b["results"]] == ALL_IDS
    assert all(r["status"] == "ok" and r["error"] is None for r in b["results"])
    simpson = b["results"][1]
    assert simpson["approximation"] == pytest.approx(2.0045597549844207, abs=1e-12)
    assert simpson["function_evaluations"] == 5
    assert simpson["absolute_error"] == pytest.approx(abs(2 - simpson["approximation"]))
    assert b["variant"] == "composite" and b["panel_count"] == 2 and b["bounds"]["upper_latex"] == r"\pi"


def test_compare_selected_methods(client: TestClient) -> None:
    body = {"expression": "sin(x)", "lower_bound": 0, "upper_bound": "pi", "variant": "composite", "panel_count": 2,
            "methods": ["closed_trapezoid", "open_midpoint"], "options": {"calculate_exact": True}}
    b = client.post(f"{PREFIX}/integrals/compare", json=body).json()
    assert [r["method"]["id"] for r in b["results"]] == ["closed_trapezoid", "open_midpoint"]
    assert b["results"][0]["approximation"] == pytest.approx(math.pi / 2, abs=1e-12)  # (W/2)[f(0)+2f(pi/2)+f(pi)], W = pi/2
    assert b["results"][0]["function_evaluations"] == 3


def test_compare_with_partially_failing_methods(client: TestClient) -> None:
    body = {"expression": "1/sqrt(x)", "lower_bound": 0, "upper_bound": 1, "variant": "composite", "panel_count": 4}
    r = client.post(f"{PREFIX}/integrals/compare", json=body)
    assert r.status_code == 200
    b = r.json()
    rows = {row["method"]["id"]: row for row in b["results"]}
    for method in ALL_IDS[:4]:  # closed rules evaluate f(0)
        row = rows[method]
        assert row["status"] == "error"
        assert row["approximation"] is None and row["absolute_error"] is None
        assert row["relative_error"] is None and row["function_evaluations"] is None
        assert row["error"]["code"] == "FUNCTION_EVALUATION_ERROR"
        assert row["error"]["details"]["x"] == 0.0
    for method in ALL_IDS[4:]:
        row = rows[method]
        assert row["status"] == "ok" and row["error"] is None and math.isfinite(row["approximation"])
    assert b["exact"]["value"] == pytest.approx(2.0)
    assert "POSSIBLE_SINGULARITY" in {w["code"] for w in b["warnings"]}


def test_compare_equal_bounds(client: TestClient) -> None:
    body = {"expression": "x", "lower_bound": 1, "upper_bound": 1, "variant": "simple"}
    b = client.post(f"{PREFIX}/integrals/compare", json=body).json()
    assert [w["code"] for w in b["warnings"]] == ["EQUAL_BOUNDS"]
    assert all(r["approximation"] == 0 for r in b["results"])


def test_compare_bound_expressions_and_errors(client: TestClient) -> None:
    base = {"expression": "cos(x)", "lower_bound": "-pi", "upper_bound": "pi", "variant": "composite", "panel_count": 8}
    b = client.post(f"{PREFIX}/integrals/compare", json=base).json()
    assert b["bounds"]["lower"] == pytest.approx(-math.pi)
    assert_error(client.post(f"{PREFIX}/integrals/compare", json={**base, "methods": ["nope"]}), 422, "UNKNOWN_METHOD")
    assert_error(client.post(f"{PREFIX}/integrals/compare", json={**base, "variant": "x"}), 422, "UNKNOWN_VARIANT")
    assert_error(client.post(f"{PREFIX}/integrals/compare", json={**base, "panel_count": 1}), 422, "INVALID_PANELS")
    assert_error(client.post(f"{PREFIX}/integrals/compare", json={**base, "expression": "("}), 422, "INVALID_EXPRESSION")
    assert_error(client.post(f"{PREFIX}/integrals/compare", json={**base, "methods": []}), 422, "VALIDATION_ERROR")


# -- cross-cutting ------------------------------------------------------------------------------
def test_cors_preflight_from_vite_origin(client: TestClient) -> None:
    r = client.options(
        f"{PREFIX}/integrals/solve",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert r.status_code == 200
    assert r.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "POST" in r.headers["access-control-allow-methods"]
    assert "content-type" in r.headers["access-control-allow-headers"].lower()


def test_cors_header_on_actual_response_and_foreign_origin(client: TestClient) -> None:
    ok = client.get(f"{PREFIX}/health", headers={"Origin": "http://localhost:5173"})
    assert ok.headers["access-control-allow-origin"] == "http://localhost:5173"
    other = client.get(f"{PREFIX}/health", headers={"Origin": "http://evil.example"})
    assert "access-control-allow-origin" not in other.headers


def test_cors_origins_come_from_settings() -> None:
    app = create_app(Settings(_env_file=None, cors_origins="http://a.test, http://b.test"))
    with TestClient(app) as c:
        r = c.get(f"{PREFIX}/health", headers={"Origin": "http://b.test"})
    assert r.headers["access-control-allow-origin"] == "http://b.test"


def test_unknown_route_uses_the_envelope(client: TestClient) -> None:
    assert_error(client.get(f"{PREFIX}/nope"), 404, "NOT_FOUND")
    assert_error(client.get(f"{PREFIX}/integrals/solve"), 405, "METHOD_NOT_ALLOWED")


def test_unexpected_errors_become_internal_error() -> None:
    class Boom(NumpyEvaluator):
        def compile(self, expression):  # type: ignore[no-untyped-def]
            raise RuntimeError("boom")

    container = Container(SympyExpressionParser(), Boom(), SympyIntegrator(1), StrategyFactory.default())
    with TestClient(create_app(Settings(_env_file=None), container), raise_server_exceptions=False) as c:
        error = assert_error(c.post(f"{PREFIX}/integrals/solve", json=solve_body()), 500, "INTERNAL_ERROR")
    assert "boom" not in error["message"]  # internals are not leaked
