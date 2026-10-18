from dataclasses import dataclass
import numpy as np
from vision_core import PlateEngine


@dataclass
class Box:
    x1: int = 10
    y1: int = 20
    x2: int = 200
    y2: int = 90


@dataclass
class Detection:
    confidence: float = 0.93
    bounding_box: Box = None


@dataclass
class OCR:
    text: str = "59A-123.45"
    confidence: list[float] = None
    region: str | None = None


@dataclass
class Result:
    detection: Detection
    ocr: OCR


class MockALPR:
    def predict(self, frame):
        return [Result(Detection(bounding_box=Box()), OCR(confidence=[0.92] * 8))]


def test_plate_result_contains_real_box_and_ocr_scores():
    engine = PlateEngine(model=MockALPR())
    readings = engine.predict(np.zeros((150, 250, 3), np.uint8))
    assert readings[0].text == "59A12345"
    assert readings[0].bbox == {"x": 10, "y": 20, "width": 190, "height": 70}
    assert len(readings[0].character_confidences) == 8
    assert readings[0].ocr_confidence == .92


def test_detector_threshold_discards_low_confidence_plate():
    engine = PlateEngine(model=MockALPR())
    assert engine.predict(np.zeros((150, 250, 3), np.uint8), detection_threshold=.96) == []


def test_invalid_image_shape_is_rejected():
    engine = PlateEngine(model=MockALPR())
    try:
        engine.predict(np.zeros((80, 50), np.uint8))
    except ValueError:
        pass
    else:
        raise AssertionError("must validate image dimensions")
