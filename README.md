# Vladik Collectibles

MVP Telegram Mini App for AI collectible figures for channel subscribers.

Current scope contains the stable technical scaffold plus Telegram WebApp auth,
figure creation, preset selection, and source photo selection:

- FastAPI backend with settings, CORS, database session setup, Alembic, and health checks.
- Telegram WebApp initData validation, user upsert, JWT access tokens, and `/me`.
- Figure creation with unique mint numbers, rarity roll, preset saving, and
  source photo selection.
- React + TypeScript + Vite frontend with Telegram auth bootstrap, local preview
  auth, first figure flow, preset selection, and photo selection.
- PostgreSQL, backend, and frontend through Docker Compose.

There is no image generation, daily packs, collection screen, trades, or OpenAI
integration in this stage.

## Local Docker Run

Create local env:

```bash
cp .env.example .env
```

Start everything:

```bash
docker compose up --build
```

Docker Compose starts:

- `postgres` on `localhost:5432`
- `backend` on `localhost:8000`
- `frontend` on `localhost:5173`

The backend container waits for PostgreSQL and applies Alembic migrations before
starting FastAPI.

## Verify

Backend:

- [http://localhost:8000/health](http://localhost:8000/health)
- [http://localhost:8000/health/db](http://localhost:8000/health/db)
- `POST /auth/telegram`
- `GET /me` with `Authorization: Bearer <token>`
- `GET /figures/me` with `Authorization: Bearer <token>`
- `POST /figures/me` with `Authorization: Bearer <token>`
- `PATCH /figures/me/presets` with `Authorization: Bearer <token>`
- `POST /uploads/figure-photo` multipart upload with `Authorization: Bearer <token>`
- `/media/...` local media files

Frontend:

- [http://localhost:5173](http://localhost:5173)

Outside Telegram, use the local preview button. It calls the local-only
`POST /auth/dev` endpoint, then lets you create a figure, open preset selection,
save style, and return to the figure page.

Inside Telegram, the frontend sends raw `window.Telegram.WebApp.initData` to the
backend. If the user has no figure, it shows the create screen. After creating,
it shows the figure card with display number, rarity, status, and image
placeholder. The active "Продолжить настройку" button opens preset selection,
and "Выбрать фото" opens source photo selection. After saving all presets, the
figure status becomes `ready_for_generation`.

## Cloudflare Tunnel Dev Flow

Telegram needs a public HTTPS frontend URL. When testing through Telegram, use
two tunnels: one for backend and one for frontend.

Start the app:

```bash
docker compose up --build
```

In another terminal, start the backend tunnel:

```bash
cloudflared tunnel --url http://localhost:8000
```

Copy the backend tunnel URL into `.env`:

```env
VITE_API_BASE_URL=https://YOUR_BACKEND_TUNNEL.trycloudflare.com
PUBLIC_MEDIA_BASE_URL=https://YOUR_BACKEND_TUNNEL.trycloudflare.com/media
```

In another terminal, start the frontend tunnel:

```bash
cloudflared tunnel --url http://localhost:5173
```

Copy the frontend tunnel URL into `.env`:

```env
BACKEND_CORS_ORIGINS=http://localhost:5173,https://YOUR_FRONTEND_TUNNEL.trycloudflare.com
PUBLIC_FRONTEND_URL=https://YOUR_FRONTEND_TUNNEL.trycloudflare.com
PUBLIC_BACKEND_URL=https://YOUR_BACKEND_TUNNEL.trycloudflare.com
```

Restart Compose so Vite and FastAPI reread env:

```bash
docker compose down
docker compose up --build
```

In BotFather, set the Mini App URL to the frontend tunnel URL:

```text
https://YOUR_FRONTEND_TUNNEL.trycloudflare.com
```

Important: BotFather gets the frontend tunnel URL, while the frontend calls the
backend tunnel URL through `VITE_API_BASE_URL`. Do not leave
`VITE_API_BASE_URL=http://localhost:8000` when opening the Mini App inside
Telegram.
