"""Aggregate all v1 routes"""
from fastapi import APIRouter
from app.api.v1 import auth, meetings, transcripts

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(meetings.router)
api_router.include_router(transcripts.router)
