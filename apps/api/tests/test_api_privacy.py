import io
import pytest
from PIL import Image
from app.image_processing import decode_image


def test_image_decoding_from_bytes_without_filesystem(tmp_path):
    image = Image.new("RGB", (120, 80), "white")
    stream = io.BytesIO()
    image.save(stream, format="PNG")
    array = decode_image(stream.getvalue(), 1000000)
    assert array.shape == (80, 120, 3)
    assert list(tmp_path.iterdir()) == []


def test_invalid_image_rejected():
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as error:
        decode_image(b"not an image", 1000000)
    assert error.value.status_code == 422


def test_operation_model_has_no_sensitive_fields():
    from pathlib import Path
    source = (Path(__file__).parents[1] / "app/models.py").read_text()
    fields = source[source.index("class Operation(Base):"):]
    assert "Mapped[bytes]" not in fields
    assert "plate_text:" not in fields
    assert "filename:" not in fields
    assert "image:" not in fields


@pytest.mark.asyncio
async def test_streamed_binary_upload_is_bounded_in_memory():
    from fastapi import HTTPException
    from starlette.requests import Request
    from app.image_processing import read_memory_only

    chunks = iter([
        {"type": "http.request", "body": b"abc", "more_body": True},
        {"type": "http.request", "body": b"def", "more_body": False},
    ])

    async def receive():
        return next(chunks)

    request = Request({"type": "http", "method": "POST", "headers": []}, receive)
    assert await read_memory_only(request, max_bytes=10) == b"abcdef"

    chunks = iter([
        {"type": "http.request", "body": b"12345", "more_body": True},
        {"type": "http.request", "body": b"67890", "more_body": False},
    ])

    request = Request({"type": "http", "method": "POST", "headers": []}, receive)
    with pytest.raises(HTTPException) as error:
        await read_memory_only(request, max_bytes=8)
    assert error.value.status_code == 413
