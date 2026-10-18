from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Literal

Role = Literal["admin", "operator", "viewer"]


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    full_name: str
    role: Role
    is_active: bool
    created_at: datetime


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=160)
    password: str = Field(min_length=12, max_length=128)
    role: Role = "operator"
    is_active: bool = True


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = Field(default=None, min_length=2, max_length=160)
    password: str | None = Field(default=None, min_length=12, max_length=128)
    role: Role | None = None
    is_active: bool | None = None


class SettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    detection_threshold: float
    ocr_threshold: float
    max_upload_mb: int
    save_operation_metadata: bool


class SettingsUpdate(BaseModel):
    detection_threshold: float = Field(ge=0.2, le=0.99)
    ocr_threshold: float = Field(ge=0, le=0.99)
    max_upload_mb: int = Field(ge=1, le=25)
    save_operation_metadata: bool
