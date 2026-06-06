# VladBlog Collectibles Backend

FastAPI backend for the Telegram Mini App MVP.

This stage includes configuration, database connection setup, Alembic, CORS,
health checks, Telegram WebApp auth, user upsert, JWT access tokens, `/me`,
one draft collectible figure per user, local source photo uploads, mock
generation, optional OpenAI image generation, and `next_step` flow status.

## Setup

```bash
uv sync
cp .env.example .env
```

For local project runs, prefer the root `../.env`. Backend also accepts
`backend/.env` as a fallback.

Set these values:

```text
TELEGRAM_BOT_TOKEN=your_bot_token_here
PUBLIC_FRONTEND_URL=http://localhost:5173
PUBLIC_BACKEND_URL=http://localhost:8000
JWT_SECRET_KEY=change_me
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=10080
STORAGE_BACKEND=local
LOCAL_STORAGE_PATH=./media
PUBLIC_MEDIA_BASE_URL=
RESET_DATABASE_ON_START=false
GENERATION_MODE=mock
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

Generated files are saved under `/media/generated-figures/...`.
