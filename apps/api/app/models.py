from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Float, Boolean, ForeignKey, Integer, JSON, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(160))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(16), default="operator")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AppSetting(Base):
    __tablename__ = "app_settings"
    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    detection_threshold: Mapped[float] = mapped_column(Float, default=0.4)
    ocr_threshold: Mapped[float] = mapped_column(Float, default=0.3)
    max_upload_mb: Mapped[int] = mapped_column(Integer, default=8)
    save_operation_metadata: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Operation(Base):
    """Recognition request metrics. Individual detections are stored separately."""
    __tablename__ = "operations"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    duration_ms: Mapped[int] = mapped_column(Integer)
    plate_count: Mapped[int] = mapped_column(Integer)
    average_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    success: Mapped[bool] = mapped_column(Boolean, default=True)


class PlateDetection(Base):
    __tablename__ = "plate_detections"
    id: Mapped[int] = mapped_column(primary_key=True)
    operation_id: Mapped[int] = mapped_column(ForeignKey("operations.id", ondelete="CASCADE"), index=True)
    text: Mapped[str] = mapped_column(String(64))
    detection_confidence: Mapped[float] = mapped_column(Float)
    ocr_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    bbox: Mapped[dict] = mapped_column(JSON)
    character_confidences: Mapped[list] = mapped_column(JSON)
    region: Mapped[str | None] = mapped_column(String(128), nullable=True)
    image: Mapped[bytes] = mapped_column(LargeBinary, deferred=True)
