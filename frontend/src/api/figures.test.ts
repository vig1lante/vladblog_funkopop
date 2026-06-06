import { afterEach, describe, expect, it, vi } from "vitest";

import {
  downloadMyFigureCard,
  getPublicFigureCardUrl,
} from "./figures";
import { clearAccessToken, setAccessToken } from "./client";

describe("figure card downloads", () => {
  afterEach(() => {
    clearAccessToken();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("requests the foil card variant when downloading foil", async () => {
    vi.stubEnv("PUBLIC_BACKEND_URL", "http://localhost:8000/");
    setAccessToken("telegram-session-token");
    const blob = new Blob(["png"], { type: "image/png" });
    const fetchMock = vi.fn().mockResolvedValue({
      blob: async () => blob,
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await downloadMyFigureCard("foil");

    expect(result).toBe(blob);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/figures/me/card.png?variant=foil",
      {
        headers: expect.any(Headers),
      },
    );
    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer telegram-session-token");
  });

  it("builds public card URLs for the selected variant", () => {
    vi.stubEnv("PUBLIC_BACKEND_URL", "http://localhost:8000/");

    expect(getPublicFigureCardUrl("figure id", "normal")).toBe(
      "http://localhost:8000/figures/figure%20id/card.png",
    );
    expect(getPublicFigureCardUrl("figure id", "foil")).toBe(
      "http://localhost:8000/figures/figure%20id/card.png?variant=foil",
    );
  });
});
