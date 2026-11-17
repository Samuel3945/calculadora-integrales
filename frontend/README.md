# Integral calculator — frontend

React + TypeScript single-page app for the definite-integral calculator. It consumes the FastAPI backend
described in [`../docs/api-contract.md`](../docs/api-contract.md); the approved visual design lives in
`../docs/design/`. All user-facing text is Spanish; code, comments and this file are English.

The UI performs **no numerical work**: approximation, errors, nodes, weights, curves, `W`, `h` and panel sums
all come from the API. Only display formatting happens here.

## Setup

Requirements: Node 20.19+ (developed on Node 24), npm.

```bash
cd frontend
npm install
cp .env.example .env.local   # optional; .env.development already targets http://localhost:8000/api/v1
npm run dev                  # http://localhost:5173 (the backend CORS allows this origin)
```

Start the backend in another terminal: `cd ../backend && .venv/bin/uvicorn src.presentation.main:app --port 8000`.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server on port 5173 |
| `npm run build` | `tsc` strict typecheck, then `vite build` into `dist/` |
| `npm run preview` | Serves `dist/` locally (port 4173) |
| `npm run typecheck` | `tsc --noEmit` for `src` and `vite.config.ts` (strict; there is no ESLint) |
| `npm run test` | Vitest unit tests (pure logic: converter, formatting, messages, reducers, figure builder) |
| `npm run test:api` | Contract check against a running backend on :8000 (skipped by `npm run test`) |

## Environment

| Variable | Meaning |
|---|---|
| `VITE_API_BASE_URL` | Base URL including `/api/v1`. Read only in `src/shared/config`. Unset in a production build → relative `/api/v1` (same-domain deployment, e.g. Vercel serving FastAPI under `/api`). |

## Structure (Feature-Sliced Design + Clean Architecture)

```
src/
  app/            providers (QueryClient + integral store), App.tsx (view switch), global styles / tokens
  pages/          calculator, comparison            (compose widgets; no logic)
  widgets/        app-header, calculator-workspace, calculation-results,
                  integral-visualization, method-comparison
  features/       edit-integral, configure-method, solve-integral, compare-methods
                  (UI + TanStack Query hooks; components never call axios)
  entities/       integral: contract types, the single state store, method catalogue (Spanish copy),
                  request builders, error/warning i18n
  shared/         api (axios + typed endpoints + ApiError), config, lib (math-input converter, format,
                  hooks), ui (Card, Button, Segmented, KatexMath, lazy Plotly wrapper, ...)
```

Import rule: upper layers import lower ones only; slices never import siblings (pages/widgets receive
navigation callbacks as props). Each slice exposes its public API through `index.ts`.

## Key decisions

- **No router.** The app has two views (`Calcular` / `Comparar métodos`) held in `useState` in `App.tsx`;
  there is no URL routing requirement and no router dependency, so `app/router/` is intentionally omitted
  (it would be an empty shell). Both views read the same integral store, so switching keeps every input and
  the last results. If deep links become necessary, introduce a router at that point.
- **Single source of truth.** `entities/integral` owns the inputs (expression, variable, bounds, method,
  variant, panels, options) plus the last solve/compare snapshots. The two bound inputs («Integral definida»
  card and configuration panel) bind to the same `lower`/`upper` strings, so they are always identical.
  A snapshot stores the serialised request that produced it; the yellow «La configuración cambió…» banner
  appears when the current request key differs (display-only options such as «aproximación geométrica» are
  not part of the key).
- **LaTeX → canonical converter is a whitelist** (`shared/lib/math-input/latexToCanonical.ts`). MathLive's
  LaTeX is tokenised and parsed by a small recursive-descent parser that knows only: digits, the variable,
  `\pi`, `e`, `+ - * / \cdot \times \div`, `^`, `\frac`, `\sqrt`, parentheses, `|x|`, `\sin \cos \tan \sinh
  \cosh \tanh`, `\arcsin \arccos \arctan` (and `\sin^{-1}`…), `\ln`, `\log`, `\exp`, function powers. Anything
  else is rejected with a Spanish message; raw LaTeX is never forwarded. Implicit multiplication becomes `*`,
  `e^{…}` becomes `exp(…)`, a bare `e` becomes `E`. MathJSON was not used to avoid pulling MathLive's compute
  engine. Conventions: `\ln` **and** `\log` both mean the natural log (the contract's `log`), the UI says so;
  a function without parentheses takes the following implicit-product run (`\sin 2x` → `sin(2*x)`).
  Bounds are plain text normalised by `normalizeBound` (`π`→`pi`, standalone `e`→`E`, …); the server validates.
- **Custom keypad instead of MathLive's keyboard.** The field uses `mathVirtualKeyboardPolicy = 'manual'` and
  no menu, so only the app's keypad (matching the design) is visible. The keypad inserts via MathLive's API
  (`insert`, `executeCommand`). The keypad has no digit keys (as in the design): digits come from the physical
  or OS keyboard.
- **Error i18n in one place** (`entities/integral/lib/messages.ts`). Every contract error code, `NOT_FOUND`,
  `METHOD_NOT_ALLOWED`, network failures and timeouts, plus all warning codes, map to Spanish. Server
  `message` strings are dropped at the HTTP boundary (`ApiError` keeps only `code` and `details`).
  `FUNCTION_EVALUATION_ERROR` includes `x` and a Spanish reason.
- **Lazy heavy libraries.** `plotly.js-basic-dist-min` (~4.6 MB minified) and `mathlive` are loaded with dynamic
  `import()` (the chart through `React.lazy`), so first paint only needs React, TanStack Query, axios and KaTeX.
  The Plotly wrapper is ~70 lines (`shared/ui/PlotlyChart.tsx`); `react-plotly.js` is not used.
- **Chart details.** Curve gaps (`null`) are preserved; the area uses `fill: tozeroy`; node markers are
  distinct from curve samples; per-panel approximation curves are merged into one dashed trace with `null`
  separators; open methods show only the nodes the API returns; panel dividers are drawn for ≤ 60 panels and
  «Panel i» labels for ≤ 8. If the curve has asymptote spikes, the y-range is clipped to the bulk of the data
  (always including 0 and the nodes) so the plot stays readable.
- **Vitest** is the only extra dev dependency (unit tests of pure logic; Vite-native, no extra config).
- **Large responses.** The evaluations table renders 200 rows at a time («Mostrar más») and the step-by-step view
  12 panels at a time, to keep 10 000-panel results responsive.

## Responsive behaviour

≥ 961 px: two columns (editor, integral, result, graph, procedure | configuration). ≤ 960 px: one column, with
the configuration right after «Integral definida» (as in the mobile design). ≤ 640 px: compact header (API
status becomes a dot), 4-column keypad, 2-column metric tiles, scrollable tables. Touch targets are ≥ 44 px.
