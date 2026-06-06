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
});
