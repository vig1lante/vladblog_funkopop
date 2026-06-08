import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

describe("Telegram bootstrap", () => {
  it("signals WebApp ready before the React bundle loads", () => {
    const readyIndex = html.indexOf("Telegram?.WebApp?.ready?.()");
    const bundleIndex = html.indexOf('/src/main.tsx');

    expect(readyIndex).toBeGreaterThan(-1);
    expect(bundleIndex).toBeGreaterThan(readyIndex);
  });

  it("requests fullscreen and expanded viewport before the React bundle loads", () => {
    const fullscreenIndex = html.indexOf("requestFullscreen?.()");
    const expandIndex = html.indexOf("expand?.()");
    const disableSwipesIndex = html.indexOf("disableVerticalSwipes?.()");
    const bundleIndex = html.indexOf('/src/main.tsx');

    expect(html).toContain("supportsTelegramVersion(7, 7)");
    expect(html).toContain("supportsTelegramVersion(8, 0)");
    expect(fullscreenIndex).toBeGreaterThan(-1);
    expect(expandIndex).toBeGreaterThan(-1);
    expect(disableSwipesIndex).toBeGreaterThan(-1);
    expect(fullscreenIndex).toBeLessThan(bundleIndex);
    expect(expandIndex).toBeLessThan(bundleIndex);
    expect(disableSwipesIndex).toBeLessThan(bundleIndex);
  });
});
