# On-prem deployment, privacy and operations

## Prerequisites

- Docker Engine 25+ and Docker Compose v2 on a Linux x86_64 machine.
- >= 8 GB memory recommended for CPU-only ONNX inference; physical cores and image resolution affect throughput.
- One-time access to Docker/PyPI and upstream model download endpoints; **no Internet required during inference after model weights and images are cached**.
- Dedicated internal HTTPS reverse proxy for workstations accessing the UI from another machine.
- Backups for PostgreSQL and `model-cache` Docker volumes. `model-cache` contains **model weights only**.

## Startup

1. `cp .env.example .env && python3 scripts/configure_env.py` and record bootstrap credentials securely.
2. `docker compose build`
3. `docker compose run --rm api python -m app.model_prefetch` (optional warm-up, requires network if cache empty)
4. `docker compose up -d`
5. Check `docker compose ps` and `docker compose logs --tail=100 api`.
6. Authenticate on `http://localhost:8080` (by default only the Docker host can connect).
7. If local users need LAN access, change `WEB_BIND` and use a TLS proxy with a trusted internal certificate.

A startup may be slow for the first model download, but model cache persists independently from containers. For an air-gapped host, export the Docker images with `docker save`, and transfer the populated Docker volume (`model-cache`) using a tar archive from the **staging** host. Verify weight licenses before transferring and keep model versions controlled. The prefetch command is intended to initialize the same cache paths as the API runtime.

## Upload privacy guarantee in this codebase

1. Angular uses `URL.createObjectURL(file)` for client-side preview and revokes it on removal and component destruction. It neither writes images to browser storage nor persists filenames.
2. Angular POSTs **raw file bytes** to `/api/ocr/predict`. It never uses multipart uploads (which commonly spool to temporary files in Starlette).
3. Nginx has `proxy_request_buffering off`, `client_body_buffer_size 32m`, `client_max_body_size 25m`, and a `tmpfs` for `/tmp`, preventing disk-backed temp uploads. Note: under abnormal memory pressure OS swap may still expose transient memory pages to encrypted/unencrypted swap. For strict media-free operation, disable or encrypt swap and prevent host-side request-body logging or packet capture.
4. FastAPI consumes request chunks using `Request.stream()` into a bounded `bytearray`. PIL/OpenCV process pixels in RAM; model receives a NumPy BGR array.
5. No filesystem image writes occur, and neither PostgreSQL nor model-cache have image columns. The API response contains only text, scores and geometry. No server-generated annotated images.
6. `Operation` records contain: `timestamp`, user ID, duration, count, mean OCR score, success. These records may be disabled in admin settings. **License plate text is never recorded**.
7. API `Cache-Control: no-store`, Nginx `Cache-Control: no-store` and `--no-access-log` limit accidental response and URL logging. Do not enable request-body logs in proxies or WAFs.

## Security considerations

- Keep Postgres and API internal. Only web port 8080 is published on Docker host by default.
- Generate unique DB/JWT/admin secrets, use a host secrets manager for production. A compromised `.env` can reveal secrets, and bootstrap password remains present until changed or removed from configuration.
- Authentication: HS256 JWT, 60-minute expiry, Argon2 password hashes. Tokens in `sessionStorage` on the web client, so require HTTPS and protect against XSS. No refresh-token mechanism in MVP.
- The administrator cannot delete themself, deactivate themself, or remove the last active admin. For heavily concurrent administrator actions, deploy additional transaction-level locking and centralized audit controls.
- Login rate limiting is per-IP, in memory, per process. Install an edge rate limiter for multi-instance deployment.
- Model bytes are imported via trusted upstream providers; pin hashes of model weights if operating in regulated environments.
- Build & vulnerability-scan images before moving to production. Docker images and Python/Angular dependencies should be pinned to immutable digests/lockfiles during production release engineering.
- Use dedicated local network, HTTPS reverse proxy, access control, firewall and incident logging. Ensure legal basis for processing license plate numbers.

## Retention and dashboard behavior

Operation history has no plate text, media, original filenames, or bounding boxes. Metadata is stored only if `save_operation_metadata=true`. Disabling it stops **new** metadata records, but does not delete old records. To remove stored history, truncate `operations` explicitly during a maintenance window after appropriate retention approval.

```bash
# Example: backup database before changing history
# docker compose exec -T db pg_dump -U platevision platevision > backup.sql
# docker compose exec db psql -U platevision -d platevision -c 'TRUNCATE operations;'
```

## Model choice

Default detector: `yolo-v9-t-384-license-plate-end2end` (pretrained plate-region localization); default OCR: `cct-xs-v2-global-model` (pretrained OCR) via FastALPR and ONNX Runtime. Both names are set via `.env`. Inference is CPU-only by default. Test the model on actual target-country plate formats; motorcycle and two-line plates often need different OCR/geometric normalization.

## Known capacity limits

- Single Uvicorn worker + an inference lock is intentionally used to prevent unsafe concurrent ONNX operations; requests can queue under load. For high throughput, add bounded async concurrency, worker processes, GPU routing and timeouts rather than lifting limits blindly.
- No GPU acceleration wiring included. Benchmark representative 1080p/4K images on your target hardware and record p50/p95 duration and accuracy.
- In-memory uploads consume RAM equal to compressed input plus decoded image tensors. Tune `MAX_UPLOAD_MB`, `MAX_IMAGE_PIXELS` and server memory limits accordingly.
