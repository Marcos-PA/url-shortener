from fastapi import APIRouter

from app.api.routes import health, task

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(task.router)
