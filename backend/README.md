# Vladik Collectibles Backend

FastAPI backend for the Telegram Mini App MVP.

This stage includes configuration, database connection setup, Alembic, CORS,
health checks, Telegram WebApp auth, user upsert, JWT access tokens, `/me`,
one draft collectible figure per user, and local source photo uploads.

## Setup

```bash
uv sync
cp .env.example .env
```

Set these values in `.env`:

```text
TELEGRAM_BOT_TOKEN=your_bot_token_here
JWT_SECRET_KEY=change_me
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=10080
STORAGE_BACKEND=local
LOCAL_STORAGE_PATH=./media
PUBLIC_MEDIA_BASE_URL=http://localhost:8000/media
```

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
