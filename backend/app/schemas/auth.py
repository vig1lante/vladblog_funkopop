from pydantic import BaseModel

from app.schemas.figure import FigureResponse
from app.schemas.user import UserResponse


class TelegramAuthRequest(BaseModel):
    init_data: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    figure: FigureResponse | None = None
