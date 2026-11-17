# API contract — v1

Single source of truth shared by `backend/` (implements it) and `frontend/` (consumes it).
All identifiers and messages are in English. The frontend maps `error.code` and `warnings[].code`
to Spanish user-facing text; it never shows backend `message` strings verbatim.

Base URL: `${API_BASE_URL}/api/v1` (default `http://localhost:8000/api/v1`).

## Canonical expression format

Python-like infix syntax, parsed server-side with a whitelisted AST (never `eval`, `exec`, or raw `sympify`).

- Numbers: `2`, `0.5`, `1e-3`
- Variable: the request `variable` (single ASCII letter, default `x`; `e` is not allowed as a variable)
- Operators: `+ - * /`, power `**` (`^` accepted and normalized to `**`), unary `-`, parentheses
- Functions: `sin cos tan asin acos atan sinh cosh tanh sqrt exp log abs` (`log` = natural log)
- Constants: `pi`, `E`
- Limits: max 256 characters, max 200 AST nodes, max nesting depth 30, numeric exponent |n| <= 100,
  no constant power towers (e.g. `9**9**9`) evaluated at parse time.

Bounds (`lower_bound`, `upper_bound`) accept a number or a constant expression in the same grammar
with no variable (e.g. `"pi/2"`, `"E"`, `"-1/3"`). Both must evaluate to finite reals.

## Method identifiers

| id | family | degree | subintervals/panel | nodes/panel | composite error order |
|---|---|---|---|---|---|
| closed_trapezoid | closed | 1 | 1 | 2 | 2 |
| closed_simpson_13 | closed | 3 | 2 | 3 | 4 |
| closed_simpson_38 | closed | 3 | 3 | 4 | 4 |
| closed_boole | closed | 5 | 4 | 5 | 6 |
| open_midpoint | open | 1 | 2 | 1 | 2 |
| open_newton_cotes_2 | open | 1 | 3 | 2 | 2 |
| open_newton_cotes_3 | open | 3 | 4 | 3 | 4 |
| open_newton_cotes_4 | open | 3 | 5 | 4 | 4 |

Variants: `simple` (panel_count = 1) and `composite` (panel_count >= 2, max 10000).
`W = (b - a) / r` (panel width, signed), `h = W / subintervals_per_panel` (internal step, signed).
Inverted bounds keep the sign of the integral naturally through the signed `W`.

## Shared node semantics

In closed composite rules the node between two adjacent panels belongs to both panels.
`evaluations[]` lists one row per (panel, node) pair so each panel sum is verifiable; rows for a shared
node carry `shared: true`. `function_evaluations` counts unique x values actually evaluated
(closed: `r*n + 1`, open: `r * nodes_per_panel`).

## Error envelope (any non-2xx)

```json
{ "error": { "code": "FUNCTION_EVALUATION_ERROR", "message": "f is not real-valued at x = 0", "details": { "x": 0.0 } } }
```

Codes: `INVALID_EXPRESSION` (422), `EXPRESSION_TOO_COMPLEX` (422), `INVALID_VARIABLE` (422),
`INVALID_BOUNDS` (422), `INVALID_PANELS` (422), `UNKNOWN_METHOD` (422), `UNKNOWN_VARIANT` (422),
`FUNCTION_EVALUATION_ERROR` (422, details: `x`, `reason` in `nan|infinite|domain|division_by_zero`),
`VALIDATION_ERROR` (422, Pydantic errors in `details.errors`), `INTERNAL_ERROR` (500).

## Warning codes (in successful responses)

`EQUAL_BOUNDS`, `POSSIBLE_SINGULARITY` (details: `points: number[]`), `EXACT_TIMEOUT`,
`EXACT_UNAVAILABLE`, `ESTIMATE_UNAVAILABLE`.

## GET /health

`200 { "status": "ok", "version": "1.0.0" }`

## GET /methods

```json
{ "methods": [ {
  "id": "closed_simpson_13", "family": "closed", "degree_of_exactness": 3,
  "subintervals_per_panel": 2, "nodes_per_panel": 3, "error_order": 4,
  "local_nodes": [0, 1, 2], "local_weights": [0.3333333333, 1.3333333333, 0.3333333333],
  "formula_latex": "\\frac{h}{3}\\left[f(x_0)+4f(x_1)+f(x_2)\\right]"
} ], "variants": ["simple", "composite"] }
```
`local_nodes` are node indices in units of `h` from the panel start; `local_weights` are in units of `h`.

## POST /expressions/validate

Request: `{ "expression": "sin(x)", "variable": "x" }`
Response 200 (always 200 for a well-formed body; invalid expressions are reported in the payload):
```json
{ "valid": true, "canonical": "sin(x)", "latex": "\\sin{\\left(x \\right)}", "error": null }
{ "valid": false, "canonical": null, "latex": null, "error": { "code": "INVALID_EXPRESSION", "message": "...", "details": {} } }
```

## POST /integrals/solve

Request:
```json
{
  "expression": "sin(x)", "variable": "x",
  "lower_bound": 0, "upper_bound": "pi",
  "method": "closed_simpson_13", "variant": "composite", "panel_count": 2,
  "options": { "calculate_exact": true, "generate_graph": true, "graph_points": 300, "estimate_error": true }
}
```
`panel_count` is optional for `simple` (defaults to 1; any other value -> `INVALID_PANELS`).
`graph_points` range 50..2000 (default 300).

Response 200:
```json
{
  "method": { "id": "closed_simpson_13", "family": "closed", "degree_of_exactness": 3,
              "subintervals_per_panel": 2, "nodes_per_panel": 3, "error_order": 4 },
  "variant": "composite",
  "expression": { "canonical": "sin(x)", "latex": "\\sin{\\left(x \\right)}", "variable": "x" },
  "bounds": { "lower": 0.0, "upper": 3.141592653589793, "lower_latex": "0", "upper_latex": "\\pi" },
  "panel_count": 2, "subinterval_count": 4,
  "panel_width": 1.5707963267948966, "step": 0.7853981633974483,
  "approximation": 2.0045597549844207,
  "exact": { "status": "computed", "value": 2.0, "latex": "2" },
  "absolute_error": 0.0045597549844207, "relative_error": 0.0022798774922104,
  "estimated_error": { "value": -0.0045766, "method": "richardson", "refined_approximation": 2.0002691699, "refined_panel_count": 4 },
  "function_evaluations": 5,
  "evaluations": [ { "index": 1, "panel": 1, "x": 0.0, "fx": 0.0, "weight": 0.2617993878, "contribution": 0.0, "shared": false } ],
  "panels": [ { "index": 1, "start": 0.0, "end": 1.5707963268, "approximation": 1.0022798775 } ],
  "graph": {
    "curve": { "x": [], "y": [] },
    "area":  { "x": [], "y": [] },
    "nodes": { "x": [], "y": [] },
    "approximation_curves": [ { "panel": 1, "x": [], "y": [] } ]
  },
  "warnings": [ { "code": "POSSIBLE_SINGULARITY", "message": "...", "details": { "points": [0.0] } } ]
}
```
- `exact.status`: `computed | disabled | unavailable | timeout`. When not `computed`: `value`, `latex`,
  `absolute_error`, `relative_error` are `null`. `relative_error` is also `null` when the exact value is 0.
- `estimated_error`: Richardson extrapolation `E ≈ (I_2r − I_r) · 2^p / (2^p − 1)`, `p = error_order`;
  estimates `exact − I_r`. `null` when `estimate_error` is false or the refined run fails (then warning
  `ESTIMATE_UNAVAILABLE`).
- `graph`: `null` when `generate_graph` is false. `curve` samples `[min(a,b) − 10%, max(a,b) + 10%]`
  with `graph_points` points; `y` is `null` where f is undefined/non-finite. `area` samples only `[a, b]`.
  `nodes` are the unique evaluated points. `approximation_curves` is the interpolating polynomial of each
  panel through that panel's nodes, sampled over the whole panel (a constant for the midpoint rule).
- Equal bounds: `approximation = 0`, empty `evaluations`/`panels`, warning `EQUAL_BOUNDS`.
- If f is not finite/real at any required node the request fails with `FUNCTION_EVALUATION_ERROR`;
  no approximation is returned.

## POST /integrals/compare

Request:
```json
{
  "expression": "sin(x)", "variable": "x", "lower_bound": 0, "upper_bound": "pi",
  "methods": ["closed_trapezoid", "open_midpoint"],
  "variant": "composite", "panel_count": 2,
  "options": { "calculate_exact": true }
}
```
`methods` optional (default: all 8, in the table order above).

Response 200:
```json
{
  "expression": { "canonical": "sin(x)", "latex": "...", "variable": "x" },
  "bounds": { "lower": 0.0, "upper": 3.1415926536, "lower_latex": "0", "upper_latex": "\\pi" },
  "variant": "composite", "panel_count": 2,
  "exact": { "status": "computed", "value": 2.0, "latex": "2" },
  "results": [ {
    "method": { "id": "closed_trapezoid", "family": "closed", "degree_of_exactness": 1,
                "subintervals_per_panel": 1, "nodes_per_panel": 2, "error_order": 2 },
    "status": "ok", "approximation": 1.5707963268, "absolute_error": 0.4292036732,
    "relative_error": 0.2146018366, "function_evaluations": 3, "error": null
  } ],
  "warnings": []
}
```
A method that fails (e.g. a closed rule evaluating `1/sqrt(x)` at `x = 0`) returns `status: "error"`,
numeric fields `null`, and `error: { code, message, details }`; the other methods still succeed.
