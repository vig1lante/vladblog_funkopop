import { afterEach, describe, expect, it, vi } from "vitest";

import { getHealth } from "./client";

describe("getHealth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("calls the health endpoint using VITE_API_BASE_URL", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8000/");
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

  it("fails clearly when VITE_API_BASE_URL is missing", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");

    await expect(getHealth()).rejects.toThrow("VITE_API_BASE_URL is not configured");
  });
});
