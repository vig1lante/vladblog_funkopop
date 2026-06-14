import {
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  type TouchEvent,
  useEffect,
  useRef,
} from "react";

import { appConfig } from "../config/appConfig";

type FigureMotionCardProps = {
  accent: string;
  accent2: string;
  children: ReactNode;
  foilFrame: string;
  foilHue: number;
  foilTextureUrl: string | null;
  foilTintOpacity: number;
  glow: string;
  isFoil: boolean;
};

type PendingMotion = {
  element: HTMLDivElement;
  normalizedX: number;
  normalizedY: number;
};

type MotionBounds = {
  height: number;
  left: number;
  top: number;
  width: number;
};

const motionVariableNames = [
  "--motion-rotate-x",
  "--motion-rotate-y",
  "--motion-translate-x",
  "--motion-translate-y",
  "--foil-bg-x",
  "--foil-bg-y",
  "--foil-bg-shift-x",
  "--foil-bg-shift-y",
  "--foil-bg-scale",
] as const;

export function FigureMotionCard({
  accent,
  accent2,
  children,
  foilFrame,
  foilHue,
  foilTextureUrl,
  foilTintOpacity,
  glow,
  isFoil,
}: FigureMotionCardProps) {
  const frameRef = useRef<number | null>(null);
  const motionBoundsRef = useRef<MotionBounds | null>(null);
  const pendingMotionRef = useRef<PendingMotion | null>(null);
  const foilEffects = appConfig.foilEffects;
  const mobileTextureOpacityMultiplier =
    foilEffects.mobileTextureOpacityMultiplier;
  const foilTextureOpacityIdle =
    foilEffects.textureOpacityIdle * (1 + foilTintOpacity);
  const foilTextureOpacityActive =
    foilEffects.textureOpacityActive * (1 + foilTintOpacity * 0.72);
  const motionStyle = {
    "--motion-accent": accent,
    "--motion-accent-2": accent2,
    "--motion-foil-frame": foilFrame,
    "--motion-foil-hue": `${foilHue}deg`,
    "--motion-foil-texture-opacity-idle": foilTextureOpacityIdle,
    "--motion-foil-texture-opacity-active": foilTextureOpacityActive,
    "--motion-foil-texture-opacity-idle-mobile":
      foilTextureOpacityIdle * mobileTextureOpacityMultiplier,
    "--motion-foil-texture-opacity-active-mobile":
      foilTextureOpacityActive * mobileTextureOpacityMultiplier,
    "--motion-foil-saturation": foilEffects.saturation,
    "--motion-foil-contrast": foilEffects.contrast,
    "--motion-foil-tint-opacity": foilTintOpacity,
    "--motion-foil-texture-url": foilTextureUrl
      ? `url("${foilTextureUrl}")`
      : "none",
    "--motion-glow": glow,
  } as CSSProperties;

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  function scheduleMotion(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") {
      event.preventDefault();
      event.stopPropagation();
    }

    if (isReducedMotionPreferred()) {
      return;
    }

    const element = event.currentTarget;
    const bounds = readMotionBounds(element);
    const normalizedX = clamp(
      (event.clientX - bounds.left) / bounds.width,
      0,
      1,
    );
    const normalizedY = clamp(
      (event.clientY - bounds.top) / bounds.height,
      0,
      1,
    );

    pendingMotionRef.current = {
      element,
      normalizedX,
      normalizedY,
    };

    if (frameRef.current !== null) {
      return;
    }

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      const pendingMotion = pendingMotionRef.current;

      if (!pendingMotion) {
        return;
      }

      applyMotion(pendingMotion, isFoil);
    });
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") {
      event.preventDefault();
      event.stopPropagation();
    }

    if (isReducedMotionPreferred()) {
      return;
    }

    event.currentTarget.classList.add("is-motion-active");
    event.currentTarget.setPointerCapture(event.pointerId);
    motionBoundsRef.current = null;
    scheduleMotion(event);
  }

  function handlePointerReset(event: PointerEvent<HTMLDivElement>) {
    pendingMotionRef.current = null;
    motionBoundsRef.current = null;
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    resetMotion(event.currentTarget);
  }

  function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function readMotionBounds(element: HTMLDivElement): MotionBounds {
    if (motionBoundsRef.current) {
      return motionBoundsRef.current;
    }

    const rect = element.getBoundingClientRect();
    const bounds = {
      height: Math.max(rect.height, 1),
      left: rect.left,
      top: rect.top,
      width: Math.max(rect.width, 1),
    };
    motionBoundsRef.current = bounds;
    return bounds;
  }

  return (
    <div
      className={`figure-motion-card ${isFoil ? "figure-motion-foil" : "figure-motion-normal"}`}
      onPointerCancel={handlePointerReset}
      onPointerDown={handlePointerDown}
      onPointerLeave={handlePointerReset}
      onPointerMove={scheduleMotion}
      onPointerUp={handlePointerReset}
      onTouchMove={handleTouchMove}
      style={motionStyle}
    >
      <div className="figure-motion-shadow" aria-hidden="true" />
      <div className="figure-motion-surface">
        {children}
        <span className="figure-motion-edge" aria-hidden="true" />
      </div>
    </div>
  );
}

function applyMotion(
  { element, normalizedX, normalizedY }: PendingMotion,
  isFoil: boolean,
) {
  const axisX = normalizedX * 2 - 1;
  const axisY = normalizedY * 2 - 1;
  const tilt = isFoil ? 16 : 11;
  const shift = isFoil ? 8 : 3;
  const distance = Math.hypot(axisX, axisY);

  element.style.setProperty(
    "--motion-rotate-x",
    `${(-axisY * tilt).toFixed(2)}deg`,
  );
  element.style.setProperty(
    "--motion-rotate-y",
    `${(axisX * tilt).toFixed(2)}deg`,
  );
  element.style.setProperty(
    "--motion-translate-x",
    `${(axisX * shift).toFixed(2)}px`,
  );
  element.style.setProperty(
    "--motion-translate-y",
    `${(axisY * shift).toFixed(2)}px`,
  );

  if (isFoil) {
    element.style.setProperty(
      "--foil-bg-x",
      `${(50 - axisX * 24).toFixed(2)}%`,
    );
    element.style.setProperty(
      "--foil-bg-y",
      `${(50 - axisY * 18).toFixed(2)}%`,
    );
    element.style.setProperty(
      "--foil-bg-shift-x",
      `${(-axisX * 18).toFixed(2)}px`,
    );
    element.style.setProperty(
      "--foil-bg-shift-y",
      `${(-axisY * 14).toFixed(2)}px`,
    );
    element.style.setProperty(
      "--foil-bg-scale",
      `${(1.12 + distance * 0.035).toFixed(3)}`,
    );
  }
}

function resetMotion(element: HTMLDivElement) {
  element.classList.remove("is-motion-active");
  for (const variableName of motionVariableNames) {
    element.style.removeProperty(variableName);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isReducedMotionPreferred(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
