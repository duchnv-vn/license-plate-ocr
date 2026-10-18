FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 \
    HF_HOME=/models/hf XDG_CACHE_HOME=/models/cache HOME=/models
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY apps/api/requirements.txt /app/requirements.txt
COPY packages/vision_core /opt/vision_core
RUN pip install -r /app/requirements.txt && pip install /opt/vision_core
COPY apps/api /app
RUN groupadd -g 10001 app && useradd -u 10001 -g app -d /models -M app \
    && mkdir -p /models && chown -R app:app /models
USER app
EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && python -m app.bootstrap && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 --no-access-log"]
