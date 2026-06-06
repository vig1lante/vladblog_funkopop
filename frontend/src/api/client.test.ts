import { afterEach, describe, expect, it, vi } from "vitest";

import {
  apiRequest,
  clearAccessToken,
  getAccessToken,
  getHealth,
  setAccessToken,
} from "./client";

describe("getHealth", () => {
  afterEach(() => {
    clearAccessToken();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("calls the health endpoint using PUBLIC_BACKEND_URL", async () => {
    vi.stubEnv("PUBLIC_BACKEND_URL", "http://localhost:8000/");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ status: "ok" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getHealth();

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/health", {
      body: undefined,
      headers: expect.any(Headers),
      method: "GET",
    });
    expect(result).toEqual({ status: "ok" });
  });

  it("falls back to legacy VITE_API_BASE_URL", async () => {
    vi.stubEnv("PUBLIC_BACKEND_URL", "");
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8001/");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ status: "ok" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await getHealth();

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8001/health", {
      body: undefined,
      headers: expect.any(Headers),
      method: "GET",
    });
  });

  it("fails clearly when PUBLIC_BACKEND_URL is missing", async () => {
    vi.stubEnv("PUBLIC_BACKEND_URL", "");
    vi.stubEnv("VITE_API_BASE_URL", "");

    await expect(getHealth()).rejects.toThrow(
      "PUBLIC_BACKEND_URL is not configured",
    );
  });
});

describe("auth token storage", () => {
  afterEach(() => {
    clearAccessToken();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("keeps the access token in memory when localStorage is unavailable", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn(() => {
          throw new Error("storage blocked");
        }),
        removeItem: vi.fn(() => {
          throw new Error("storage blocked");
        }),
        setItem: vi.fn(() => {
          throw new Error("storage blocked");
        }),
      },
    });

    setAccessToken("telegram-session-token");

    expect(getAccessToken()).toBe("telegram-session-token");
  });

  it("clears a rejected bearer token after a 401 response", async () => {
    vi.stubEnv("PUBLIC_BACKEND_URL", "http://localhost:8000");
    setAccessToken("bad-token");
    const fetchMock = vi.fn().mockResolvedValue({
      headers: new Headers(),
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ detail: "Invalid bearer token" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest("/figures/me")).rejects.toThrow(
      "Сессия Telegram устарела. Открой Mini App заново.",
    );

    expect(getAccessToken()).toBeNull();
  });
});
