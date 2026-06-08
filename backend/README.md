# VladBlog Collectibles Backend

FastAPI backend for the Telegram Mini App MVP.

This stage includes configuration, database connection setup, Alembic, CORS,
health checks, Telegram WebApp auth, user upsert, JWT access tokens, `/me`,
one draft collectible figure per user, local source photo uploads, mock
generation, optional OpenAI image generation, and `next_step` flow status.

## Setup

```bash
uv sync
cp ../.env.example ../.env
```

Backend reads environment variables only from the project root `../.env`.
Do not create `backend/.env`.

Set these values:

```text
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/vladik_collectibles
DOCKER_DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/vladik_collectibles
TELEGRAM_BOT_TOKEN=your_bot_token_here
PUBLIC_FRONTEND_URL=http://localhost:5173
PUBLIC_BACKEND_URL=http://localhost:8000
LOG_LEVEL=INFO
JWT_SECRET_KEY=local_dev_only_jwt_secret_change_me_32
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=10080
DEV_AUTH_ENABLED=true
STORAGE_BACKEND=local
LOCAL_STORAGE_PATH=./project_data/media
PUBLIC_MEDIA_BASE_URL=
RESET_DATABASE_ON_START=false
GENERATION_MODE=mock
GENERATION_AUDIT_LOG_PATH=./project_data/logs/generation-audit.jsonl
OPENAI_API_KEY=
OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_IMAGE_SIZE=1024x1024
OPENAI_IMAGE_QUALITY=medium
OPENAI_IMAGE_MAX_ATTEMPTS=2
```

`PUBLIC_MEDIA_BASE_URL` is derived as `${PUBLIC_BACKEND_URL}/media` when empty.
The Docker `bot` service uses `PUBLIC_FRONTEND_URL` for `/start` and the bot menu.

## PostgreSQL

From the project root:

```bash
docker compose up -d postgres
```

Use `DATABASE_URL` for direct backend runs from the host. Docker compose passes
`DOCKER_DATABASE_URL` to the backend container as `DATABASE_URL`.

Docker Compose stores PostgreSQL data in the project-root `db_data/pgdata/`
folder, so database data survives container rebuilds and is read back from the
same folder. The extra `pgdata/` level keeps the mount root clean for Docker and
placeholder files.

## Migrations

From `backend/`:

```bash
alembic upgrade head
```

The current migrations create the `users` table, the `figures` table, and the
`figure_mint_number_seq` PostgreSQL sequence.

Dev-only reset:

```env
RESET_DATABASE_ON_START=true
```

When `APP_ENV != production`, startup truncates `generation_jobs`, `figures`,
and `users`, then resets `figure_mint_number_seq`. Production never resets from
this flag.

## Run

From `backend/`:

```bash
uvicorn app.main:app --reload
```

## Check Health

```bash
curl http://localhost:8000/health
curl http://localhost:8000/health/db
```

Expected `/health` response:

```json
{
  "status": "ok"
}
```

## Auth

Telegram Mini App frontend sends raw `window.Telegram.WebApp.initData` to:

```bash
curl -X POST http://localhost:8000/auth/telegram \
  -H "Content-Type: application/json" \
  -d '{"init_data":"<raw initData>"}'
```

Use the returned JWT for `/me`:

```bash
curl http://localhost:8000/me \
  -H "Authorization: Bearer <token>"
```

## Figures

Create or return the current user's figure:

```bash
curl -X POST http://localhost:8000/figures/me \
  -H "Authorization: Bearer <token>"
```

Read the current user's figure:

```bash
curl http://localhost:8000/figures/me \
  -H "Authorization: Bearer <token>"
```

The first figure gets `mint_number = 1`, `display_number = #0001`, rarity
`Founder Legendary`, and status `draft`. Later figures use the PostgreSQL
sequence and roll `Rare`, `Epic`, or `Legendary`.

## Source Photos

Upload a JPEG, PNG, or WebP image up to 10 MB and at least 256x256 pixels:

```bash
curl -X POST http://localhost:8000/uploads/figure-photo \
  -H "Authorization: Bearer <token>" \
  -F "file=@figure.png"
```

The response is the updated figure with `source_photo_type = uploaded` and a
`source_photo_url` under `/media/figure-photos/...`.

## Generation

Mock mode needs no key and never calls OpenAI:

```env
GENERATION_ENABLED=true
GENERATION_MODE=mock
```

Real OpenAI generation uses only backend env:

```env
GENERATION_ENABLED=true
GENERATION_MODE=openai
OPENAI_API_KEY=your_key
OPENAI_IMAGE_MODEL=gpt-image-2
```

Hard kill switch:

```env
GENERATION_ENABLED=false
```

When `GENERATION_ENABLED=false`, `/figures/me/generate` is rejected before a job
is created and neither mock nor OpenAI generation can run. `GENERATION_MODE=false`
is also treated as disabled generation for older local configs.

The OpenAI API is billed separately. Do not commit `.env` and do not expose the
key to frontend code.

Generate the current user's ready figure:

```bash
curl -X POST http://localhost:8000/figures/me/generate \
  -H "Authorization: Bearer <token>"
```

Generated files are saved under `/media/generated-figures/...` and persisted on
the host under `../project_data/media/generated-figures/`.

Generation audit logs are saved under `../project_data/logs/`.
