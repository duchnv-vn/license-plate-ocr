"""Create users, settings and private operation metrics.

Revision ID: 001
Revises:
"""
from alembic import op
import sqlalchemy as sa

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(160), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(16), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_table("app_settings",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("detection_threshold", sa.Float, nullable=False),
        sa.Column("ocr_threshold", sa.Float, nullable=False),
        sa.Column("max_upload_mb", sa.Integer, nullable=False),
        sa.Column("save_operation_metadata", sa.Boolean, nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False))
    op.create_table("operations",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_ms", sa.Integer, nullable=False),
        sa.Column("plate_count", sa.Integer, nullable=False),
        sa.Column("average_confidence", sa.Float, nullable=True),
        sa.Column("success", sa.Boolean, nullable=False))
    op.create_index("ix_operations_timestamp", "operations", ["timestamp"])


def downgrade():
    op.drop_table("operations")
    op.drop_table("app_settings")
    op.drop_table("users")
