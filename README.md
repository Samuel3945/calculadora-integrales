# Calculadora de integrales definidas — Métodos numéricos

Aplicación web para aproximar integrales definidas con las ocho reglas de Newton-Cotes (cuatro cerradas y cuatro abiertas), cada una en variante simple y compuesta: 16 variantes en total. Además del resultado, muestra la solución exacta (cuando SymPy puede obtenerla), los errores absoluto, relativo y estimado, la tabla de evaluaciones, las fórmulas paso a paso, la gráfica con los nodos y el polinomio interpolante de cada panel, y una comparación entre métodos.

- **Producción:** https://calculadora-integrales.vercel.app
- **Documentación de la API (local):** http://localhost:8000/docs

## Tecnologías

| Parte | Tecnologías |
|---|---|
| Backend | Python ≥ 3.12, FastAPI, Pydantic, SymPy, NumPy, Pytest |
| Frontend | React 19, TypeScript, Vite, TanStack Query, Axios, MathLive, KaTeX, Plotly.js (basic) |
| Despliegue | Vercel Services (frontend estático + función FastAPI bajo `/api`) |

Las reglas de integración están implementadas a mano. No se usa ninguna función de cuadratura de SciPy, NumPy ni SymPy.

## Arquitectura

```
calculadora-integrales/
├── backend/    Clean Architecture + Strategy + Strategy Factory
│   └── src/{domain, application, infrastructure, presentation}
├── frontend/   Feature-Sliced Design + principios de Clean Architecture
│   └── src/{app, pages, widgets, features, entities, shared}
├── docs/
│   ├── api-contract.md   Contrato de la API (fuente de verdad para ambos proyectos)
│   └── design/           Maquetas del diseño aprobado
└── vercel.json           Configuración de despliegue
```

- **Dominio puro:** `backend/src/domain` no importa FastAPI, SymPy, NumPy ni Pydantic (una prueba lo verifica). Cada método es una estrategia que declara sus nodos y pesos locales; una clase base aplica la suma compuesta por paneles.
- **Strategy Factory:** registro de estrategias por identificador, sin cadenas de `if`.
- **Parser seguro:** las expresiones se analizan con `ast` y una lista blanca, y el árbol de SymPy se construye a mano. Nunca se usan `eval`, `exec` ni `sympify` sobre el texto del usuario.
- **Cálculo simbólico opcional:** SymPy corre aislado con un tiempo límite y nunca bloquea el resultado numérico.
- **Frontend sin matemática:** los componentes no calculan ni llaman a Axios directamente. Todos los números (aproximación, nodos, pesos, curvas) vienen de la API.

## Requisitos

- Python 3.12 o superior (probado con 3.14) y [uv](https://docs.astral.sh/uv/)
- Node.js 22 o superior (probado con 24) y npm

## Instalación y ejecución local

### Backend

```bash
cd backend
uv venv .venv
uv pip install -r requirements-dev.txt
cp .env.example .env            # opcional
.venv/bin/uvicorn src.presentation.main:app --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

## Configuración

| Variable | Proyecto | Valor por defecto | Descripción |
|---|---|---|---|
| `CORS_ORIGINS` | backend | `http://localhost:5173` | Orígenes permitidos, separados por coma |
| `SYMBOLIC_TIMEOUT_SECONDS` | backend | `5` | Tiempo máximo para la integral exacta y la búsqueda de singularidades |
| `SYMBOLIC_MODE` | backend | `auto` | `process` (proceso aislado), `thread` (hilos) o `auto`: `thread` en Vercel, `process` en local |
| `VITE_API_BASE_URL` | frontend | `http://localhost:8000/api/v1` en desarrollo, `/api/v1` en producción | URL base de la API |

## Pruebas

```bash
cd backend && .venv/bin/python -m pytest        # 533 pruebas
cd frontend && npm run typecheck && npm run test # 173 pruebas
cd frontend && npm run test:api                  # contrato contra el backend en :8000
```

Las pruebas del backend verifican, para las 16 variantes, la exactitud contra integrales de referencia (∫₀¹ xⁿ para n = 1…4, ∫₀¹ eˣ, ∫₀^π sin x), el grado de exactitud de cada regla, la distribución de nodos, los pesos, el resultado por panel, la cantidad de evaluaciones, los extremos en reglas abiertas y cerradas, los límites invertidos, la convergencia y la seguridad del parser. También hay pruebas de integración de los cinco endpoints.

## Endpoints (`/api/v1`)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado del servicio |
| GET | `/methods` | Catálogo de métodos: nodos, pesos, grado, fórmula en LaTeX |
| POST | `/expressions/validate` | Valida una expresión y devuelve su forma canónica y su LaTeX |
| POST | `/integrals/solve` | Calcula una integral con un método y una variante |
| POST | `/integrals/compare` | Compara varios métodos sobre la misma integral |

El detalle de cada solicitud y respuesta está en [docs/api-contract.md](docs/api-contract.md).

## Métodos disponibles

| Identificador | Método | Familia | Grado de exactitud | Subintervalos por panel |
|---|---|---|---|---|
| `closed_trapezoid` | Trapecio | Cerrado | 1 | 1 |
| `closed_simpson_13` | Simpson 1/3 | Cerrado | 3 | 2 |
| `closed_simpson_38` | Simpson 3/8 | Cerrado | 3 | 3 |
| `closed_boole` | Regla de Boole | Cerrado | 5 | 4 |
| `open_midpoint` | Punto medio | Abierto | 1 | 2 |
| `open_newton_cotes_2` | Newton-Cotes abierto, 2 puntos | Abierto | 1 | 3 |
| `open_newton_cotes_3` | Newton-Cotes abierto, 3 puntos | Abierto | 3 | 4 |
| `open_newton_cotes_4` | Newton-Cotes abierto, 4 puntos | Abierto | 3 | 5 |

Variantes: `simple` (un panel) y `composite` (de 2 a 10 000 paneles). Con `r` paneles, `W = (b − a)/r` y `h = W / subintervalos por panel`.

## Decisiones técnicas

- **Nodos compartidos:** en las reglas cerradas compuestas, el nodo entre dos paneles se evalúa una sola vez pero aparece en la tabla una vez por panel, marcado como «compartido», para que la suma de cada panel sea verificable.
- **Error estimado:** extrapolación de Richardson comparando `r` y `2r` paneles: `E ≈ (I₂ᵣ − Iᵣ)·2ᵖ/(2ᵖ − 1)`, con `p` = grado de exactitud + 1.
- **Límites iguales:** devuelven 0 con una advertencia. **Límites invertidos:** conservan el signo.
- **Errores en español:** el backend responde con códigos en inglés (`FUNCTION_EVALUATION_ERROR`, etc.) y el frontend los traduce a mensajes comprensibles.
- **Compresión gzip:** el peor caso (Boole con 10 000 paneles, unos 12 MB) viaja en unos 2.9 MB, por debajo del límite de 4.5 MB de Vercel.

## Despliegue en Vercel

```bash
npx vercel@65.17.0 deploy --prod
```

`vercel.json` declara dos servicios: `frontend/` (Vite), servido en `/`, y `backend/` (FastAPI), que recibe las rutas `/api/*`. Al compartir dominio no hace falta configurar CORS en producción.

## Limitaciones conocidas

- Solo funciones reales y límites finitos: no hay integrales impropias ni funciones complejas.
- `log` y `ln` son el logaritmo natural.
- Una discontinuidad que cae entre dos nodos no se detecta numéricamente. SymPy busca singularidades en el intervalo y, si encuentra alguna, la informa como advertencia.
- En Vercel el cálculo simbólico corre en hilos, porque allí no funciona el proceso aislado. Un hilo no se puede detener, así que una integral simbólica patológica sigue ocupándolo después del tiempo límite. El pool está acotado a dos hilos y, si ambos están ocupados, la solicitud responde sin valor exacto en lugar de esperar.
