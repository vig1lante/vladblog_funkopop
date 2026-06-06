# VladBlog Collectibles

Telegram Mini App для создания персональной AI-фигурки подписчика VladBlog.

Текущий scope:

- FastAPI backend, Alembic, PostgreSQL, CORS, health checks.
- Telegram WebApp auth, local preview auth, JWT и `/me`.
- Один collectible slot на пользователя, mint number, rarity и `next_step`.
- Photo-first flow: Telegram photo sync, upload photo или режим без фото.
- Presets, ready-to-generate summary, generation waiting и финальная figure page.
- Mock image generation и optional OpenAI image generation только через backend env.

Не входят в этот этап: daily packs, trades, collection.

## User Flow

```text
Auth/Loading
  -> WelcomePage
  -> PhotoSetupPage
  -> PresetsPage
  -> GenerationReadyPage
  -> GenerationWaitingPage
  -> MyFigurePage
```

`MyFigurePage` показывается только когда `figure.status = completed` и есть
`figure.image_url`.

## Local Docker Run

```bash
cp .env.example .env
docker compose up --build
```

Сервисы:

- backend: [http://localhost:8000](http://localhost:8000)
- frontend: [http://localhost:5173](http://localhost:5173)
- postgres: `localhost:5432`

Outside Telegram используй local preview button.

## Dev Database Reset

Default:

```env
RESET_DATABASE_ON_START=false
```

Опасная dev-only настройка:

```env
RESET_DATABASE_ON_START=true
```

При `APP_ENV != production` backend после migrations очищает `generation_jobs`,
`figures`, `users` через `TRUNCATE ... RESTART IDENTITY CASCADE` и сбрасывает
`figure_mint_number_seq`, поэтому первый новый пользователь снова получает
`#0001`. В `APP_ENV=production` переменная игнорируется.

## Generation

Mock mode работает без ключа и не вызывает OpenAI API:

```env
GENERATION_ENABLED=true
GENERATION_MODE=mock
```

OpenAI mode:

```env
GENERATION_ENABLED=true
GENERATION_MODE=openai
OPENAI_API_KEY=your_key
OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_IMAGE_SIZE=1024x1024
OPENAI_IMAGE_QUALITY=medium
```

Жёсткий kill switch:

```env
GENERATION_ENABLED=false
```

При `GENERATION_ENABLED=false` backend отклоняет `/figures/me/generate`
до создания job и не запускает mock/OpenAI генерацию. `GENERATION_MODE=false`
тоже трактуется как выключенная генерация для защиты от старой конфигурации.

Ключ хранится только в backend env.

## Cloudflare Tunnel Reminder

Для Telegram нужны публичные HTTPS URLs:

```env
PUBLIC_FRONTEND_URL=https://YOUR_FRONTEND_TUNNEL.trycloudflare.com
PUBLIC_BACKEND_URL=https://YOUR_BACKEND_TUNNEL.trycloudflare.com
```

Меняй только эти две строки в корневом `.env`. Frontend, backend CORS,
media URL и bot `/start` подтянутся из них.

BotFather Mini App URL получает `PUBLIC_FRONTEND_URL`. Docker service `bot`
также ставит меню бота и отвечает на `/start` кнопкой Mini App.

## Verify

```bash
docker compose up --build
```

Проверить:

- [http://localhost:8000/health](http://localhost:8000/health)
- [http://localhost:5173](http://localhost:5173)
- Preview auth -> Welcome -> Photo -> Presets -> Ready -> Waiting -> Result.
