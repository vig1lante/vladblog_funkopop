# MVP Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify the Part 1 technical scaffold for the Vladik Collectibles Telegram Mini App MVP.

**Architecture:** Keep backend, frontend, and infrastructure separated. The backend exposes only health checks and shared foundation modules; the frontend renders a single health-check page; Docker Compose provides PostgreSQL only.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2 async, asyncpg, Alembic, Pydantic v2, pydantic-settings, React, TypeScript, Vite, PostgreSQL 16, Docker Compose.

---

## File Structure

- `backend/app/main.py`: FastAPI app factory, CORS, router registration.
- `backend/app/core/config.py`: `.env` settings and CORS origin parsing.
- `backend/app/core/database.py`: async engine, sessionmaker, dependency, declarative base.
- `backend/app/api/routes/health.py`: `/health` and `/health/db`.
- `backend/alembic/env.py`: async Alembic integration using backend settings.
- `backend/alembic/versions/20260602_0001_init_empty.py`: initial empty migration.
- `backend/tests/test_health.py`: backend health route tests.
- `backend/tests/test_config.py`: settings parsing tests.
- `frontend/src/api/client.ts`: Vite env-based backend client.
- `frontend/src/pages/HomePage.tsx`: minimal MVP page and health-check interaction.
- `docker-compose.yml`: PostgreSQL service and volume.
- `README.md`, `backend/README.md`, `frontend/README.md`: setup and verification instructions.

### Task 1: Backend Scaffold Verification

**Files:**
- Inspect: `backend/app/main.py`
- Inspect: `backend/app/core/config.py`
- Inspect: `backend/app/core/database.py`
- Inspect: `backend/app/api/routes/health.py`
- Test: `backend/tests/test_health.py`
- Test: `backend/tests/test_config.py`

- [x] **Step 1: Run backend tests**

Run:

```bash
cd backend
uv run pytest
```

Expected: tests pass, including `/health`, `/health/db`, and CORS origin parsing.

- [x] **Step 2: Fix only acceptance-related failures**

If tests fail, make the smallest edit needed in the relevant backend file. Do not add Telegram auth, users, figures, rarity, image generation, packs, trades, or OpenAI integration.

- [x] **Step 3: Re-run backend tests**

Run:

```bash
cd backend
uv run pytest
```

Expected: all backend tests pass.

### Task 2: Alembic and Database Verification

**Files:**
- Inspect: `backend/alembic.ini`
- Inspect: `backend/alembic/env.py`
- Inspect: `backend/alembic/versions/20260602_0001_init_empty.py`
- Inspect: `docker-compose.yml`

- [x] **Step 1: Start PostgreSQL**

Run from the repo root:

```bash
docker compose up -d postgres
```

Expected: PostgreSQL 16 starts with database `vladik_collectibles`.

- [x] **Step 2: Apply migrations**

Run:

```bash
cd backend
uv run alembic upgrade head
```

Expected: Alembic applies the empty initial migration without errors.

- [x] **Step 3: Check database health route manually**

Run:

```bash
cd backend
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Then request:

```bash
curl http://127.0.0.1:8000/health/db
```

Expected:

```json
{"status":"ok","database":"ok"}
```

### Task 3: Frontend Scaffold Verification

**Files:**
- Inspect: `frontend/src/api/client.ts`
- Inspect: `frontend/src/pages/HomePage.tsx`
- Inspect: `frontend/src/App.tsx`
- Test: `frontend/src/api/client.test.ts`

- [x] **Step 1: Run frontend tests**

Run:

```bash
cd frontend
npm test
```

Expected: API client tests pass and confirm `VITE_API_BASE_URL` is used.

- [x] **Step 2: Build frontend**

Run:

```bash
cd frontend
npm run build
```

Expected: TypeScript and Vite build successfully.

- [x] **Step 3: Verify UI interaction**

Run:

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`, click `Check API health`, and confirm the page shows:

```text
API status: ok
```

### Task 4: Documentation and Scope Check

**Files:**
- Inspect: `README.md`
- Inspect: `backend/README.md`
- Inspect: `frontend/README.md`
- Inspect: `.gitignore`

- [x] **Step 1: Confirm README commands**

Verify that the root and package READMEs include commands for PostgreSQL, backend setup, migrations, backend run, frontend setup, frontend run, and health checks.

- [x] **Step 2: Confirm no extra business logic**

Search for out-of-scope terms:

```bash
rg -i "telegram auth|jwt|user|figure|mint|rarity|photo|openai|pack|trade" backend frontend
```

Expected: no implementation of those features. Mentions in README scope exclusions are allowed.

- [x] **Step 3: Final status check**

Run:

```bash
git status --short
```

Expected: changes are limited to the requested scaffold and supporting docs.
