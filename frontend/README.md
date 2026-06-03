# Vladik Collectibles Frontend

React + TypeScript + Vite frontend for the Telegram Mini App MVP.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

The frontend reads the backend URL from `VITE_API_BASE_URL`.

## Telegram Auth

Inside Telegram, the app sends raw `window.Telegram.WebApp.initData` to
`POST /auth/telegram`, stores the returned access token in `localStorage`, and
uses it for authenticated API calls.

If auth returns no figure, the app shows `CreateFigurePage`. Clicking
`Создать мою фигурку` calls `POST /figures/me` and then shows `MyFigurePage`
with the display number, rarity, draft status, and image placeholder.

In a normal browser, Telegram initData is absent, so the app shows a dev fallback
message instead of crashing.
