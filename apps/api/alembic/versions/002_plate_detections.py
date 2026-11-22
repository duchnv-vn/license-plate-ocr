"""Store detected plate details and cropped images.

Revision ID: 002
Revises: 001
"""
from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("plate_detections",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("operation_id", sa.Integer, sa.ForeignKey("operations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("text", sa.String(64), nullable=False),
        sa.Column("detection_confidence", sa.Float, nullable=False),
        sa.Column("ocr_confidence", sa.Float, nullable=True),
        sa.Column("bbox", sa.JSON, nullable=False),
        sa.Column("character_confidences", sa.JSON, nullable=False),
        sa.Column("region", sa.String(128), nullable=True),
        sa.Column("image", sa.LargeBinary, nullable=False))
    op.create_index("ix_plate_detections_operation_id", "plate_detections", ["operation_id"])


def downgrade():
    op.drop_table("plate_detections")
