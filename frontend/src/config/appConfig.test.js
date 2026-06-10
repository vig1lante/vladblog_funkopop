import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  appConfig,
  clampOpacity,
  DEFAULT_FOIL_EFFECT_IMAGE_OPACITY,
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
  it("loads foil effect opacity through Vite config without client-side parent imports", () => {
    expect(appConfig.foilEffects.imageOpacity).toBe(
      rootConfig.foilEffects.imageOpacity,
    );
    expect(appConfigSource).toContain("__APP_CONFIG__");
    expect(appConfigSource).not.toContain("../../../config.json");
    expect(viteConfigSource).toContain("__APP_CONFIG__");
    expect(dockerCompose).toContain(
      "APP_CONFIG_PATH: /project_config/config.json",
    );
    expect(dockerCompose).toContain(
      "./config.json:/project_config/config.json:ro",
    );
  });

  it("clamps foil effect opacity and falls back for invalid values", () => {
    expect(clampOpacity(0.42)).toBe(0.42);
    expect(clampOpacity(-0.5)).toBe(0);
    expect(clampOpacity(1.4)).toBe(1);
    expect(clampOpacity(null)).toBe(DEFAULT_FOIL_EFFECT_IMAGE_OPACITY);
    expect(clampOpacity(Number.NaN)).toBe(DEFAULT_FOIL_EFFECT_IMAGE_OPACITY);
  });
});
