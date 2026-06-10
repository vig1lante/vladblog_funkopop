import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  appConfig,
  clampOpacity,
  clampRange,
  DEFAULT_FOIL_EFFECTS,
} from "./appConfig";

const appConfigSource = readFileSync(
  resolve(import.meta.dirname, "appConfig.ts"),
  "utf8",
);
const dockerCompose = readFileSync(
  resolve(import.meta.dirname, "../../../docker-compose.yml"),
  "utf8",
);
const rootConfig = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../../../config.json"), "utf8"),
);
const viteConfigSource = readFileSync(
  resolve(import.meta.dirname, "../../vite.config.ts"),
  "utf8",
);

describe("appConfig", () => {
  it("loads foil effect settings through Vite config without client-side parent imports", () => {
    expect(appConfig.foilEffects.textureOpacityIdle).toBe(
      rootConfig.foilEffects.textureOpacityIdle,
    );
    expect(appConfig.foilEffects.glareOpacityActive).toBe(
      rootConfig.foilEffects.glareOpacityActive,
    );
    expect(appConfig.foilEffects.blendMode).toBe("screen");
    expect(appConfigSource).toContain("__APP_CONFIG__");
    expect(appConfigSource).not.toContain("../../../config.json");
    expect(viteConfigSource).toContain("__APP_CONFIG__");
    expect(viteConfigSource).toContain("try");
    expect(viteConfigSource).toContain("catch");
    expect(dockerCompose).toContain(
      "APP_CONFIG_PATH: /project_config/config.json",
    );
    expect(dockerCompose).toContain(
      "./config.json:/project_config/config.json:ro",
    );
  });

  it("clamps foil effect values and falls back for invalid values", () => {
    expect(clampOpacity(0.42)).toBe(0.42);
    expect(clampOpacity(-0.5)).toBe(0);
    expect(clampOpacity(1.4)).toBe(1);
    expect(clampOpacity(null, DEFAULT_FOIL_EFFECTS.textureOpacityIdle)).toBe(
      DEFAULT_FOIL_EFFECTS.textureOpacityIdle,
    );
    expect(clampOpacity(Number.NaN, DEFAULT_FOIL_EFFECTS.glareOpacityIdle)).toBe(
      DEFAULT_FOIL_EFFECTS.glareOpacityIdle,
    );
    expect(clampRange(20, 42, 24, 58)).toBe(24);
    expect(clampRange(90, 42, 24, 58)).toBe(58);
    expect(clampRange("broken", 1.18, 0.5, 2)).toBe(1.18);
  });
});
