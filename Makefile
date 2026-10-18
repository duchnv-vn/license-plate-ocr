.PHONY: up down logs build prefetch test
up:
	docker compose up -d --build
build:
	docker compose build
prefetch:
	docker compose run --rm api python -m app.model_prefetch
down:
	docker compose down
logs:
	docker compose logs -f --tail=100
test:
	PYTHONPATH=packages/vision_core/src:apps/api pytest packages/vision_core/tests apps/api/tests -q
