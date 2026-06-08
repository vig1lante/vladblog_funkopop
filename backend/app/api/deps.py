import logging
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.security import InvalidTokenError, decode_access_token
from app.models.user import User
from app.repositories.users import UsersRepository

bearer_scheme = HTTPBearer(auto_error=False)
logger = logging.getLogger(__name__)


async def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        logger.debug("auth rejected reason=missing_bearer_token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )

    try:
        payload = decode_access_token(credentials.credentials)
        user_id = UUID(str(payload["sub"]))
    except (InvalidTokenError, ValueError, KeyError) as exc:
        logger.warning("auth rejected reason=invalid_bearer_token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bearer token",
        ) from exc

    user = await UsersRepository().get_by_id(session, user_id)
    if user is None:
        logger.warning("auth rejected reason=user_not_found user_id=%s", user_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if user.is_banned:
        logger.warning("auth rejected reason=user_banned user_id=%s", user.id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is banned",
        )

    return user
