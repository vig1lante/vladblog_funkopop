export type HealthResponse = {
  status: string;
};

const ACCESS_TOKEN_STORAGE_KEY = "vladik_collectibles_access_token";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getApiBaseUrl(): string {
  const value = import.meta.env.VITE_API_BASE_URL;

  if (!value) {
    throw new Error("VITE_API_BASE_URL is not configured");
  }

  return value.replace(/\/$/, "");
}

export function getAccessToken(): string | null {
  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function setAccessToken(token: string): void {
  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
}

export function clearAccessToken(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
}

type ApiRequestOptions = {
  method?: string;
  body?: unknown;
  withAuth?: boolean;
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
  });
  const data = await parseJson(response);

  if (!response.ok) {
    throw new ApiError(getErrorMessage(data, response.status), response.status, data);
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
      return detail;
    }
  }

  return `API request failed with status ${status}`;
}
