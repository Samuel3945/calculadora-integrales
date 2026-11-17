from fastapi import APIRouter

from src.presentation.api.v1.endpoints import comparison, expressions, integration, meta

api_router = APIRouter()
for module in (meta, expressions, integration, comparison):
    api_router.include_router(module.router)
