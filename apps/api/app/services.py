from vision_core import PlateEngine
from .config import get_config

cfg = get_config()
engine = PlateEngine(cfg.detector_model, cfg.ocr_model)
