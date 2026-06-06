# VladBlog Collectibles Frontend

React + TypeScript + Vite frontend for the Telegram Mini App MVP.

## Setup

```bash
npm install
npm run dev
```

The frontend reads `PUBLIC_BACKEND_URL` from the root `../.env`.

## Flow

Auth renders the current step from backend `figure.next_step`:

```text
Welcome -> Photo -> Presets -> Ready -> Waiting -> Result
```

`MyFigurePage` renders only after `completed + image_url`.

Photo step syncs Telegram profile photo once, supports custom upload through a
hidden native file input, and allows creating without a photo.
