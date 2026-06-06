import { afterEach, describe, expect, it, vi } from "vitest";

import { requestTelegramDownload } from "./telegramDownload";

describe("requestTelegramDownload", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("marks Telegram native downloads complete only after they start", async () => {
    const downloadFile = vi.fn((_params, callback?: (accepted: boolean) => void) => {
      callback?.(true);
    });

    vi.stubGlobal("window", {
      Telegram: {
        WebApp: {
          downloadFile,
        },
      },
    });

    await expect(
      requestTelegramDownload("https://cdn.example/card.png", "card.png"),
    ).resolves.toBe("downloading");
  });

  it("does not mark Telegram native downloads complete when the user cancels", async () => {
    const openLink = vi.fn();
    const downloadFile = vi.fn((_params, callback?: (accepted: boolean) => void) => {
      callback?.(false);
    });

    vi.stubGlobal("window", {
      Telegram: {
        WebApp: {
          downloadFile,
          openLink,
        },
      },
    });

    await expect(
      requestTelegramDownload("https://cdn.example/card.png", "card.png"),
    ).resolves.toBe("cancelled");
    expect(openLink).not.toHaveBeenCalled();
  });

  it("falls back to opening the file when native Telegram downloads are unavailable", async () => {
    const openLink = vi.fn();

    vi.stubGlobal("window", {
      Telegram: {
        WebApp: {
          openLink,
        },
      },
    });

    await expect(
      requestTelegramDownload("https://cdn.example/card.png", "card.png"),
    ).resolves.toBe("opened");
    expect(openLink).toHaveBeenCalledWith("https://cdn.example/card.png", {
      try_instant_view: false,
    });
  });

  it("lets the caller use the browser fallback outside HTTPS Telegram downloads", async () => {
    await expect(
      requestTelegramDownload("http://localhost:8000/card.png", "card.png"),
    ).resolves.toBe("unsupported");
  });
});
