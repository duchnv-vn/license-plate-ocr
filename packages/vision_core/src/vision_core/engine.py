"""An isolated adapter around pretrained ONNX models. Does not write input images."""
from __future__ import annotations

import re
import statistics
import threading
from dataclasses import dataclass, asdict
from typing import Any

import numpy as np


@dataclass(frozen=True)
class PlateReading:
    text: str
    detection_confidence: float
    ocr_confidence: float | None
    bbox: dict[str, int]
    character_confidences: list[dict[str, Any]]
    region: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class PlateEngine:
    """Thread-safe inference on an in-memory BGR image.

    One model instance is shared within a process. Requests are serialized
    deliberately because model backends are not universally reentrant.
    """

    def __init__(
        self,
        detector_model: str = "yolo-v9-t-384-license-plate-end2end",
        ocr_model: str = "cct-xs-v2-global-model",
        detector_floor: float = 0.2,
        model: Any | None = None,
    ):
        self.detector_model = detector_model
        self.ocr_model = ocr_model
        self.detector_floor = detector_floor
        self._model = model
        self._lock = threading.Lock()

    def warm_up(self) -> None:
        with self._lock:
            self._ensure_model()

    def _ensure_model(self) -> None:
        if self._model is None:
            from fast_alpr import ALPR

            self._model = ALPR(
                detector_model=self.detector_model,
                detector_conf_thresh=self.detector_floor,
                ocr_model=self.ocr_model,
                ocr_device="cpu",
            )

    def predict(
        self,
        frame: np.ndarray,
        detection_threshold: float = 0.4,
        ocr_threshold: float = 0.3,
    ) -> list[PlateReading]:
        if frame.ndim != 3 or frame.shape[2] != 3:
            raise ValueError("A three-channel BGR image is required")
        height, width = frame.shape[:2]
        with self._lock:
            self._ensure_model()
            raw_results = self._model.predict(frame)
        readings: list[PlateReading] = []
        for result in raw_results:
            det = result.detection
            det_score = float(det.confidence)
            if det_score < detection_threshold:
                continue
            raw_box = det.bounding_box
            box = {
                "x": max(0, min(width, int(raw_box.x1))),
                "y": max(0, min(height, int(raw_box.y1))),
                "width": 0,
                "height": 0,
            }
            box["width"] = max(0, min(width, int(raw_box.x2)) - box["x"])
            box["height"] = max(0, min(height, int(raw_box.y2)) - box["y"])
            if not box["width"] or not box["height"]:
                continue
            ocr = result.ocr
            text = re.sub(r"[^A-Z0-9]", "", (ocr.text if ocr else "").upper())
            probabilities = ocr.confidence if ocr and ocr.confidence is not None else []
            scores = [float(v) for v in probabilities] if isinstance(probabilities, list) else ([float(probabilities)] if probabilities is not None else [])
            score = float(statistics.mean(scores)) if scores else None
            if score is not None and score < ocr_threshold:
                text = ""
            char_conf = [
                {"character": c, "confidence": round(max(0.0, min(1.0, s)), 4)}
                for c, s in zip(text, scores)
            ] if len(scores) == len(text) else []
            readings.append(PlateReading(
                text=text,
                detection_confidence=round(det_score, 4),
                ocr_confidence=round(score, 4) if score is not None else None,
                bbox=box,
                character_confidences=char_conf,
                region=ocr.region if ocr else None,
            ))
        return readings
