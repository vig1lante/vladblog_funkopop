export const DEFAULT_FOIL_EFFECTS = {
  textureOpacityIdle: 0.07,
  textureOpacityActive: 0.13,
  glareOpacityIdle: 0.1,
  glareOpacityActive: 0.42,
  edgeShineOpacity: 0.24,
  centerMaskRadius: 42,
  blendMode: "screen",
  saturation: 1.18,
  contrast: 1.06,
  mobileTextureOpacityMultiplier: 0.75,
} as const;

export const DEFAULT_FOIL_FRAME = {
  enabled: true,
  borderWidth: 3,
  glowOpacity: 0.72,
  animationDurationSeconds: 9,
  mobileAnimationDurationSeconds: 14,
} as const;

type RawAppConfig = {
  foilEffects?: {
    textureOpacityIdle?: unknown;
    textureOpacityActive?: unknown;
    glareOpacityIdle?: unknown;
    glareOpacityActive?: unknown;
    edgeShineOpacity?: unknown;
    centerMaskRadius?: unknown;
    blendMode?: unknown;
    saturation?: unknown;
    contrast?: unknown;
    mobileTextureOpacityMultiplier?: unknown;
  };
  foilFrame?: {
    enabled?: unknown;
    borderWidth?: unknown;
    glowOpacity?: unknown;
    animationDurationSeconds?: unknown;
    mobileAnimationDurationSeconds?: unknown;
  };
};

declare const __APP_CONFIG__: RawAppConfig | undefined;

export function clampOpacity(
  value: unknown,
  fallback: number = DEFAULT_FOIL_EFFECTS.textureOpacityIdle,
): number {
  return clampRange(value, fallback, 0, 1);
}

export function clampRange(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(value, min), max);
}

const config =
  typeof __APP_CONFIG__ === "object" && __APP_CONFIG__ !== null
    ? __APP_CONFIG__
    : {};

export const appConfig = {
  foilEffects: {
    textureOpacityIdle: clampOpacity(
      config.foilEffects?.textureOpacityIdle,
      DEFAULT_FOIL_EFFECTS.textureOpacityIdle,
    ),
    textureOpacityActive: clampOpacity(
      config.foilEffects?.textureOpacityActive,
      DEFAULT_FOIL_EFFECTS.textureOpacityActive,
    ),
    glareOpacityIdle: clampOpacity(
      config.foilEffects?.glareOpacityIdle,
      DEFAULT_FOIL_EFFECTS.glareOpacityIdle,
    ),
    glareOpacityActive: clampOpacity(
      config.foilEffects?.glareOpacityActive,
      DEFAULT_FOIL_EFFECTS.glareOpacityActive,
    ),
    edgeShineOpacity: clampOpacity(
      config.foilEffects?.edgeShineOpacity,
      DEFAULT_FOIL_EFFECTS.edgeShineOpacity,
    ),
    centerMaskRadius: clampRange(
      config.foilEffects?.centerMaskRadius,
      DEFAULT_FOIL_EFFECTS.centerMaskRadius,
      24,
      58,
    ),
    blendMode:
      config.foilEffects?.blendMode === "screen"
        ? config.foilEffects.blendMode
        : DEFAULT_FOIL_EFFECTS.blendMode,
    saturation: clampRange(
      config.foilEffects?.saturation,
      DEFAULT_FOIL_EFFECTS.saturation,
      0.5,
      2,
    ),
    contrast: clampRange(
      config.foilEffects?.contrast,
      DEFAULT_FOIL_EFFECTS.contrast,
      0.5,
      2,
    ),
    mobileTextureOpacityMultiplier: clampOpacity(
      config.foilEffects?.mobileTextureOpacityMultiplier,
      DEFAULT_FOIL_EFFECTS.mobileTextureOpacityMultiplier,
    ),
  },
  foilFrame: {
    enabled:
      typeof config.foilFrame?.enabled === "boolean"
        ? config.foilFrame.enabled
        : DEFAULT_FOIL_FRAME.enabled,
    borderWidth: clampRange(
      config.foilFrame?.borderWidth,
      DEFAULT_FOIL_FRAME.borderWidth,
      1,
      6,
    ),
    glowOpacity: clampOpacity(
      config.foilFrame?.glowOpacity,
      DEFAULT_FOIL_FRAME.glowOpacity,
    ),
    animationDurationSeconds: clampRange(
      config.foilFrame?.animationDurationSeconds,
      DEFAULT_FOIL_FRAME.animationDurationSeconds,
      4,
      30,
    ),
    mobileAnimationDurationSeconds: clampRange(
      config.foilFrame?.mobileAnimationDurationSeconds,
      DEFAULT_FOIL_FRAME.mobileAnimationDurationSeconds,
      6,
      40,
    ),
  },
} as const;
