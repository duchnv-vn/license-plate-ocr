import io
import pytest
from PIL import Image
from app.image_processing import decode_image, encode_plate_crop


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


def test_plate_crop_contains_only_the_detection_and_is_bounded():
    import cv2
    import numpy as np
    frame = np.zeros((800, 1200, 3), dtype=np.uint8)
    frame[100:300, 200:1000] = (40, 120, 220)
    encoded = encode_plate_crop(frame, {"x": 200, "y": 100, "width": 800, "height": 200})
    crop = cv2.imdecode(np.frombuffer(encoded, dtype=np.uint8), cv2.IMREAD_COLOR)
    assert crop.shape[:2] == (128, 512)
    assert np.allclose(crop[20, 20], (40, 120, 220), atol=3)


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
