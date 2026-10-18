import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from .config import get_config
from .database import engine as db_engine
from .routers import auth, users, settings, ocr, dashboard
from .services import engine as model_engine

logger = logging.getLogger("platevision")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if get_config().load_model_on_startup:
        try:
            await asyncio.to_thread(model_engine.warm_up)
            logger.info("ONNX models initialized")
        except Exception:
            logger.exception("Model initialization failed. OCR requests return 503 until model availability is fixed.")
    yield
    await db_engine.dispose()


app = FastAPI(title="PlateVision API", version="0.1.0", docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)


@app.middleware("http")
async def prevent_caching(request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@app.get("/healthz", include_in_schema=False)
async def health():
    return {"status": "ok"}


for route in [auth.router, users.router, settings.router, ocr.router, dashboard.router]:
    app.include_router(route, prefix="/api")
