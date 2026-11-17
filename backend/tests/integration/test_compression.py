"""Large responses must be gzip-compressed to stay under serverless body-size limits."""

from __future__ import annotations

import gzip

from fastapi.testclient import TestClient

from src.presentation.main import create_app

VERCEL_BODY_LIMIT_BYTES = 4_500_000


def test_worst_case_solve_response_is_gzipped_under_serverless_limit() -> None:
    client = TestClient(create_app())
    payload = {
        "expression": "sin(x)",
        "variable": "x",
        "lower_bound": 0,
        "upper_bound": "pi",
        "method": "closed_boole",
        "variant": "composite",
        "panel_count": 10_000,
        "options": {"calculate_exact": False, "generate_graph": True, "graph_points": 2000, "estimate_error": False},
    }
    response = client.post(
        "/api/v1/integrals/solve",
        json=payload,
        headers={"Accept-Encoding": "gzip"},
    )
    assert response.status_code == 200
    assert response.headers.get("content-encoding") == "gzip"
    # httpx transparently decodes; re-compress the decoded body to bound the wire size.
    assert len(gzip.compress(response.content)) < VERCEL_BODY_LIMIT_BYTES
    assert len(response.json()["evaluations"]) == 50_000


def test_small_responses_are_not_compressed() -> None:
    client = TestClient(create_app())
    response = client.get("/api/v1/health", headers={"Accept-Encoding": "gzip"})
    assert response.status_code == 200
    assert "content-encoding" not in response.headers
