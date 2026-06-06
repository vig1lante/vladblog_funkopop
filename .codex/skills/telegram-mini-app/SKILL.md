---
name: telegram-mini-app
description: Use when working on Telegram Mini Apps, Telegram WebApp initData, WebAppUser/photo_url, Bot API profile photos, Cloudflare tunnel setup, Telegram auth debugging, or BotFather Mini App URL configuration.
---

# Telegram Mini App

Use current official docs before changing Telegram-specific behavior:

1. Context7 resolve/query:
   - `Telegram Mini Apps` for `window.Telegram.WebApp`, `initData`, `WebAppUser`.
   - `Telegram Bot API` for `getUserProfilePhotos`, `getFile`, file download.
2. Prefer signed `initData.user.photo_url` after backend validation.
3. Treat `photo_url` as optional. It may be absent because of Telegram privacy settings, client/version behavior, or launch context.
4. Bot API fallback:
   - call `getUserProfilePhotos(user_id, limit=1)`;
   - if photos is empty, return a friendly “photo unavailable” state, not an exception;
   - call `getFile(file_id)`;
   - download `https://api.telegram.org/file/bot<TOKEN>/<file_path>`;
   - store locally and expose through `PUBLIC_MEDIA_BASE_URL`.
5. Add short frontend/backend timeouts. Never let photo sync block the photo step.
6. For Cloudflare:
   - BotFather Mini App URL = frontend tunnel (`localhost:5173`);
   - `VITE_API_BASE_URL` and `PUBLIC_MEDIA_BASE_URL` = backend tunnel (`localhost:8000`);
   - `BACKEND_CORS_ORIGINS` must include frontend tunnel.
7. Debug checklist:
   - verify Mini App is opened from the same bot whose `TELEGRAM_BOT_TOKEN` is configured;
   - inspect validated initData user object for `photo_url`;
   - log Bot API `ok`, `description`, `total_count`, and first `file_id`;
   - confirm user profile photo privacy allows access;
   - confirm backend tunnel can reach `api.telegram.org`;
   - do not show raw Telegram/Bot API errors to users.
