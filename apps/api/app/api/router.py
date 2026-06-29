import sys

from fastapi import APIRouter

from app.api.routes import auth, health, words

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router, prefix="/api")
api_router.include_router(words.router, prefix="/api")

if sys.platform == "win32":
    from app.api.routes import system_words

    api_router.include_router(system_words.router, prefix="/api/system")
