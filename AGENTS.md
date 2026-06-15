# AGENTS.md

## Context7

Use Context7 MCP to fetch current documentation whenever the user asks about a
library, framework, SDK, API, CLI tool, or cloud service, even well-known ones
like React, Next.js, Prisma, Express, Tailwind, Django, or Spring Boot. This
includes API syntax, configuration, version migration, library-specific
debugging, setup instructions, and CLI tool usage. Use even when you think you
know the answer because training data may not reflect recent changes. Prefer
this over web search for library docs.

Do not use Context7 for refactoring, writing scripts from scratch, debugging
business logic, code review, or general programming concepts.

Steps:

1. Always start with `resolve-library-id` using the library name and the user's
   question, unless the user provides an exact library ID in `/org/project`
   format.
2. Pick the best match by exact name match, description relevance, code snippet
   count, source reputation, and benchmark score. Use version-specific IDs when
   the user mentions a version.
3. Call `query-docs` with the selected library ID and the user's full question.
4. Answer using the fetched docs.

## Project Shape

- This repository is a Telegram Mini App with a FastAPI backend in `backend/`
  and a React + TypeScript + Vite frontend in `frontend/`.
- The backend is the source of truth for figure state. Frontend routing should
  follow `figure.next_step`; show the final result only when
  `figure.status === "completed"` and `figure.image_url` is present.
- Keep API schemas, frontend types, and flow tests in sync when changing figure
  fields, generation jobs, rarity, presets, or `next_step` values.
- The app intentionally supports local preview auth outside Telegram. Preserve
  that path when changing auth, onboarding, or startup behavior.

## Environment And Runtime Data

- Backend settings read environment variables from the project-root `.env`.
  Do not add `backend/.env`; keep frontend/backend public URLs in the root env.
- `PUBLIC_FRONTEND_URL` and `PUBLIC_BACKEND_URL` are the two values to change for
  Cloudflare/Telegram tunnel runs. `PUBLIC_MEDIA_BASE_URL` derives from
  `PUBLIC_BACKEND_URL` when empty.
- Keep OpenAI secrets backend-only. Never expose `OPENAI_API_KEY` or generation
  secrets to frontend code or Vite public env.
- Runtime state lives in root folders: `db_data/pgdata/` for Postgres and
  `project_data/` for media/logs. Do not delete or rewrite them unless the user
  explicitly asks for a reset.

## Verification Commands

- For frontend changes, run from `frontend/`: `npm run test` and
  `npm run build`.
- For backend changes, run from `backend/`: `uv run pytest`; also run
  `uv run ruff check .` when changing Python code.
- For migration or database-shape changes, run from `backend/`:
  `uv run alembic upgrade head`.
- For cross-stack changes, smoke test with root `docker compose up --build`,
  then check `http://localhost:8000/health`, `http://localhost:5173`, and the
  Preview auth flow through Welcome -> Photo -> Presets -> Ready -> Waiting ->
  Result.

## Frontend UI Notes

- Preserve the app's existing button geometry for icon-only actions. In this app
  that means compact rounded-rect controls based on `.ui-button`: about 50px
  high with an 18px radius. Do not switch to circular or tall pill buttons unless
  the user explicitly asks for that shape.
- For icon-only buttons, keep the hit target fixed with a selector specific
  enough to survive mobile `.ui-button { width: 100%; }` overrides.
- Successful one-shot actions should change to a check icon and remove repeat
  click behavior with both `disabled` state and a handler guard.
- Prefer the shared UI components under `frontend/src/components/ui/` and keep
  CSS contracts covered by `frontend/src/styles.test.js` when changing visual
  behavior.
- Preserve Telegram WebView handling in `prepareTelegramViewport`: fullscreen
  request where supported, expand, disable vertical swipes, and `ready()`.
- Native file upload controls should stay label/input based; avoid
  programmatic `input.click()` flows that are fragile in Telegram WebViews.
- The current visual direction is a dark, compact collectible interface. Do not
  reintroduce noisy orb/shimmer decorations, theme toggles, or debug/status
  badges unless the user asks for them.
- After visual UI changes, run the relevant frontend tests and `npm run build`.
