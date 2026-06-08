import { clientLogger } from "../lib/logger";

export type HealthResponse = {
  status: string;
};

const ACCESS_TOKEN_STORAGE_KEY = "vladblog_collectibles_access_token";
const CURRENT_TELEGRAM_ID_STORAGE_KEY = "vladblog_collectibles_current_telegram_id";
let memoryAccessToken: string | null = null;
let memoryTelegramId: string | null = null;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data: unknown,
    public readonly requestId: string | null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getApiBaseUrl(): string {
  const value =
    import.meta.env.PUBLIC_BACKEND_URL || import.meta.env.VITE_API_BASE_URL;

  if (!value) {
    throw new Error("PUBLIC_BACKEND_URL is not configured");
  }

  return value.replace(/\/$/, "");
}

export function getAccessToken(): string | null {
  return readStorage(ACCESS_TOKEN_STORAGE_KEY) ?? memoryAccessToken;
}

export function setAccessToken(token: string): void {
  memoryAccessToken = token;
  writeStorage(ACCESS_TOKEN_STORAGE_KEY, token);
}

export function replaceSession(token: string, telegramId: number): void {
  const currentTelegramId =
    readStorage(CURRENT_TELEGRAM_ID_STORAGE_KEY) ?? memoryTelegramId;
  const nextTelegramId = String(telegramId);

  if (currentTelegramId !== nextTelegramId) {
    clearAccessToken();
  }

  memoryTelegramId = nextTelegramId;
  writeStorage(CURRENT_TELEGRAM_ID_STORAGE_KEY, nextTelegramId);
  setAccessToken(token);
}

export function clearAccessToken(): void {
  memoryAccessToken = null;
  removeStorage(ACCESS_TOKEN_STORAGE_KEY);
}

function getStorage(): Storage | null {
  try {
    return globalThis.window?.localStorage ?? null;
  } catch {
    return null;
  }
}

function readStorage(key: string): string | null {
  try {
    return getStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    getStorage()?.setItem(key, value);
  } catch {
    // Telegram WebViews can occasionally expose blocked storage; memory keeps
    // the active launch usable until the user closes the Mini App.
  }
}

function removeStorage(key: string): void {
  try {
    getStorage()?.removeItem(key);
  } catch {
    // Ignore blocked storage cleanup; in-memory state is already cleared.
  }
}

type ApiRequestOptions = {
  method?: string;
  body?: unknown;
  withAuth?: boolean;
  signal?: AbortSignal;
};

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");

  if (options.withAuth !== false) {
    const token = getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });
  const data = await parseJson(response);

  if (!response.ok) {
    const requestId = response.headers.get("x-request-id");
    if (response.status === 401 && options.withAuth !== false) {
      clearAccessToken();
    }
    clientLogger.warn("API request failed", {
      path,
      method: options.method ?? "GET",
      status: response.status,
      requestId,
    });
    clientLogger.debug("API error payload", { path, requestId, data });
    throw new ApiError(
      getErrorMessage(data, response.status),
      response.status,
      data,
      requestId,
    );
  }

  return data as T;
}

export async function getHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>("/health", { withAuth: false });
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function getErrorMessage(data: unknown, status: number): string {
  if (typeof data === "object" && data !== null && "detail" in data) {
    const detail = (data as { detail: unknown }).detail;
    if (typeof detail === "string") {
      return normalizeErrorMessage(detail);
    }
  }

  return `API request failed with status ${status}`;
}

export function normalizeErrorMessage(message: string): string {
  const messages: Record<string, string> = {
    "Unsupported image type": "Не удалось загрузить фото",
    "Image must be at least 256x256": "Фото слишком маленькое",
    "Invalid image file": "Не удалось загрузить фото",
    "Uploaded source photo is missing": "Не удалось загрузить фото",
    "Telegram profile source photo is missing":
      "Не удалось получить фото из Telegram. Загрузи своё фото или создай фигурку без фото.",
    "Missing bearer token": "Сессия Telegram устарела. Открой Mini App заново.",
    "Invalid bearer token": "Сессия Telegram устарела. Открой Mini App заново.",
    "User not found": "Сессия Telegram устарела. Открой Mini App заново.",
  };

  return messages[message] ?? message;
}
