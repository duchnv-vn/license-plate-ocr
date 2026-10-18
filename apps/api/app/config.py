from pathlib import Path
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, model_validator

ROOT_DIR = Path(__file__).resolve().parents[3]


class Config(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT_DIR / ".env", env_file_encoding="utf-8", extra="ignore")
    database_url: str = "postgresql+asyncpg://platevision:platevision@localhost:5432/platevision"
    jwt_secret: str = ""
    jwt_expire_minutes: int = Field(default=60, ge=5, le=1440)
    bootstrap_admin_email: str = ""
    bootstrap_admin_password: str = ""
    max_upload_mb: int = Field(default=10, ge=1, le=25)
    max_image_pixels: int = Field(default=20000000, ge=1000000)
    detector_model: str = "yolo-v9-t-384-license-plate-end2end"
    ocr_model: str = "cct-xs-v2-global-model"
    load_model_on_startup: bool = True

    @model_validator(mode="after")
    def validate_secret(self):
        if len(self.jwt_secret) < 32:
            raise ValueError("JWT_SECRET must contain at least 32 characters")
        return self


@lru_cache
def get_config() -> Config:
    return Config()
