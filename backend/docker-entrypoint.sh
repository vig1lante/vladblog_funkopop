#!/usr/bin/env sh
set -e

uv run alembic upgrade head

exec uv run uvicorn app.main:app \
  --host "${BACKEND_HOST:-0.0.0.0}" \
  --port "${BACKEND_PORT:-8000}" \
  --reload
