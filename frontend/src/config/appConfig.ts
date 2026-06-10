export const DEFAULT_FOIL_EFFECT_IMAGE_OPACITY = 0.24;

type RawAppConfig = {
  foilEffects?: {
    imageOpacity?: unknown;
  };
};

declare const __APP_CONFIG__: RawAppConfig | undefined;

export function clampOpacity(
  value: unknown,
  fallback = DEFAULT_FOIL_EFFECT_IMAGE_OPACITY,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(value, 0), 1);
}

const config =
  typeof __APP_CONFIG__ === "object" && __APP_CONFIG__ !== null
    ? __APP_CONFIG__
    : {};

export const appConfig = {
  foilEffects: {
    imageOpacity: clampOpacity(config.foilEffects?.imageOpacity),
  },
} as const;
