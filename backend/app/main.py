"""
GOG OMS Backend - FastAPI entry point.

Run: uvicorn app.main:app --reload --port 8000
Docs: http://localhost:8000/docs
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.session import init_db
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    print(f"✓ {settings.APP_NAME} backend started")
    print(f"✓ Database: {settings.DATABASE_URL}")
    print(f"✓ Docs: {settings.BACKEND_URL}/docs")
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="Meeting orchestration with Google Meet + Gemini AI",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "status": "running",
        "docs": "/docs",
        "api_prefix": "/api/v1",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
