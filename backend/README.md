# Definite Integral Calculator - Backend

FastAPI service that approximates definite integrals with eight Newton-Cotes rules (4 closed,
4 open), each as a *simple* (1 panel) or *composite* (r panels) variant, and optionally computes
the exact value with SymPy. The HTTP contract is defined in `../docs/api-contract.md`.

## Requirements

- Python 3.12+ (developed and tested with **3.14.4**; every pinned dependency ships 3.14 wheels)
- [uv](https://docs.astral.sh/uv/)

## Setup

```bash
cd backend
uv venv .venv                                   # add `--python 3.13` to pin another interpreter
uv pip install -r requirements-dev.txt          # runtime + pytest + httpx
cp .env.example .env                            # optional
```

Pinned versions: fastapi 0.163.2, uvicorn 0.54.0, pydantic 2.14.3, pydantic-settings 2.16.3,
sympy 1.14.0, numpy 2.5.5; dev: pytest 9.2.0, httpx 0.28.1 (`pyproject.toml` and
`requirements*.txt` carry the same pins).

## Run

```bash
.venv/bin/uvicorn src.presentation.main:app --port 8000
```

Interactive OpenAPI docs: <http://localhost:8000/docs> (schema at `/openapi.json`).
All endpoints live under `/api/v1`: `GET /health`, `GET /methods`, `POST /expressions/validate`,
`POST /integrals/solve`, `POST /integrals/compare`.

## Tests

```bash
.venv/bin/python -m pytest
```

## Environment variables

| Variable | Default | Meaning |
|---|---|---|
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated browser origins allowed by CORS |
| `SYMBOLIC_TIMEOUT_SECONDS` | `5` | Wall-clock budget of the SymPy job (exact integral + singularity check) |
| `SYMBOLIC_MODE` | `auto` | `process` (killable child process), `thread` (in-process pool) or `auto` (`thread` when `VERCEL` is set, else `process`) |

Read through `pydantic-settings` from the environment or `backend/.env`.

## Architecture

Clean Architecture; dependencies point inward only.

```
src/
  domain/          pure Python (stdlib only; enforced by a test that scans imports)
    entities/        IntegrationProblem, IntegrationResult, PanelResult
    value_objects/   IntegrationBounds, IntegrationConfig (+ Variant), EvaluationPoint
    interfaces/      IntegrationStrategy (contract), FunctionEvaluator type, Family
    strategies/      base.py (template method) + closed/ and open/ (8 classes, data only)
    interpolation.py Lagrange polynomial used for the per-panel approximation curves
    exceptions/      IntegrationError hierarchy, each with a stable API error `code`
  application/     ports (ExpressionParser, NumericEvaluator, SymbolicIntegrator),
                   StrategyFactory (registry dict), use cases, small services
                   (graph builder, Richardson, error metrics, warnings)
  infrastructure/  adapters: safe SymPy parser, NumPy evaluator, SymPy integrator (child process)
  presentation/    FastAPI app, routers, Pydantic DTOs, exception handlers, settings, wiring
tests/             unit/ (domain), application/ (parser, evaluator, use cases, SymPy), integration/ (HTTP)
```

### Design decisions

- **Strategy + factory.** One class per method (`NODES` and `WEIGHTS` as exact `Fraction`s plus
  metadata). `PanelRuleStrategy.integrate` is a template method that does the composite sum for
  *both* variants (simple = 1 panel), so there are no separate simple/composite classes. Adding a
  rule means writing one data class and registering it in `StrategyFactory`; use cases and
  endpoints do not change. The integrand is injected as a callable (`Callable[[Sequence[float]],
  Sequence[float]]`), keeping the domain free of NumPy/SymPy.
- **Geometry.** `W = (b-a)/r`, `h = W/n`, node `x = a + p*W + k*h` computed from integers (never by
  accumulating floats). Panel ends reuse the next panel's start so shared nodes are bit-identical;
  the last end is exactly `b`. Inverted bounds give a negative `W` and the sign falls out.
- **Shared nodes.** In closed composite rules the node between two panels is identified by its
  global integer index and evaluated once (`function_evaluations = r*n + 1`), while `evaluations[]`
  still lists one row per (panel, node) pair, flagged `shared: true`, so each panel sum is
  verifiable. Open rules never touch panel endpoints (`r * nodes_per_panel` evaluations).
  `weight = local_weight * h`, `contribution = weight * f(x)`.
- **Richardson estimate.** Rerun the same rule with `2r` panels: `E = (I_2r - I_r) * 2^p/(2^p - 1)`
  with `p = error_order = degree + 1`. It estimates `exact - I_r` and is only meaningful for smooth
  integrands. `refined_approximation` is `I_2r`. If `2r` exceeds 10000 or the refined run fails, the
  estimate is `null` with an `ESTIMATE_UNAVAILABLE` warning.
- **Safe parser.** `ast.parse(mode="eval")` plus a whitelist visitor that *builds* the SymPy tree by
  hand. `eval`, `exec`, `sympify` and `parse_expr` are never called on user text. Attributes,
  subscripts, lambdas, comprehensions, keywords, starred args, unknown names/functions and wrong
  arity are rejected. Limits: 256 characters, 200 expression nodes, depth 30, `|exponent| <= 100`
  for numeric exponents, and constant powers larger than ~10^300 are rejected before they are
  computed (so `9**9**9` never runs). `^` is rewritten to `**` textually (Python's own `^` is XOR
  with the wrong precedence). Decimal literals become exact rationals (`0.1` -> `1/10`). The
  integration variable is a real symbol. Bounds use the same grammar without a variable.
  A flat chain such as `a+b+c+...` counts as one nesting level (Python parses it left-nested).
- **Numeric engine.** `sympy.lambdify(..., modules="numpy")` on the already whitelisted tree, run
  under `numpy.errstate(all="ignore")`. Non-finite or complex values at a required node raise
  `FUNCTION_EVALUATION_ERROR` with `x` and `reason`; graph sampling maps them to `null` instead.
  The numeric result never depends on `sympy.integrate`.
- **Symbolic timeout.** `sympy.integrate` cannot be interrupted in-process, so the exact integral
  and the singularity check (`continuous_domain`) run in a child process that is killed after
  `SYMBOLIC_TIMEOUT_SECONDS`. The `forkserver` start method is used (`spawn` on Windows): children
  fork from a clean, single-threaded server with SymPy preloaded, so there is no fork-in-threads
  hazard and no per-request SymPy import. Results stream over a pipe, so singularities found before
  a timeout are kept. The result counts as `computed` only if it is free of `Integral` and a finite
  real; otherwise `unavailable` / `timeout` plus a warning. Failures here never block the numeric
  answer. The singularity check always runs (also with `calculate_exact: false`) and only produces
  a `POSSIBLE_SINGULARITY` warning.
- **Symbolic mode.** Some hosts (Vercel) cannot run the child process, so `SYMBOLIC_MODE=thread`
  runs the same job on a shared 2-worker `ThreadPoolExecutor`, bounded by
  `future.result(timeout=...)`. Trade-off: a thread cannot be killed, so a pathological integral
  keeps running after the request got `timeout`. Jobs are never queued: if both workers are still
  busy with earlier timed-out jobs, the call returns immediately (`unavailable`, or `disabled`
  when exact was not requested, with no singularity data). Process mode also fails fast: the child must report
  readiness within 1.5 s or the result is `unavailable` instead of burning the full timeout.
- **Errors.** Every non-2xx response is `{"error": {code, message, details}}`, including Pydantic
  validation (`VALIDATION_ERROR`), unknown routes (`NOT_FOUND`, `METHOD_NOT_ALLOWED`) and
  unexpected failures (`INTERNAL_ERROR`, details never leaked).
- **No quadrature libraries.** SciPy, `numpy.trapz` and `Integral.as_sum` are not used; the rules
  are implemented by hand.

## Known limitations

- Real-valued integrands and finite bounds only (no improper integrals, no complex functions).
- Large `panel_count` produces large `evaluations`/`graph` payloads (up to ~50k rows at 10000
  panels of a 5-node rule).
- `POSSIBLE_SINGULARITY` is best effort (SymPy's `continuous_domain`); a hang there is cut by the
  same timeout and also skips the exact integral for that request.
