"""FastAPI application factory. Run with: uvicorn src.presentation.main:app --port 8000"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from src.infrastructure.symbolic.sympy_integrator import SympyIntegrator
from src.presentation.api.v1.router import api_router
from src.presentation.dependencies import Container, build_container
from src.presentation.exception_handlers import register_exception_handlers
from src.presentation.settings import API_VERSION, Settings

logger = logging.getLogger(__name__)


def create_app(settings: Settings | None = None, container: Container | None = None) -> FastAPI:
    settings = settings or Settings()
    container = container or build_container(settings)

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        if isinstance(container.symbolic, SympyIntegrator):
            try:
                container.symbolic.warm_up()
            except Exception:  # warm-up is an optimisation only
                logger.warning("symbolic worker warm-up failed", exc_info=True)
        yield

    app = FastAPI(
        title="Definite Integral Calculator API",
        version=API_VERSION,
        description="Numerical integration with eight Newton-Cotes rules (simple and composite).",
        lifespan=lifespan,
    )
    app.state.container = container
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    # Large composite runs return tens of thousands of evaluation rows; gzip keeps the
    # worst case (Boole, 10000 panels: ~12 MB raw, ~2.9 MB gzipped) under the 4.5 MB
    # response-body limit of serverless hosts such as Vercel.
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    register_exception_handlers(app)
    app.include_router(api_router, prefix="/api/v1")
    return app


app = create_app()
