from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session

router = APIRouter(tags=["health"])
AsyncSessionDep = Annotated[AsyncSession, Depends(get_async_session)]


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/db")
async def health_db(session: AsyncSessionDep) -> dict[str, str]:
    try:
        statement: Any = text("SELECT 1")
        await session.execute(statement)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database health check failed",
        ) from exc

    return {"status": "ok", "database": "ok"}
