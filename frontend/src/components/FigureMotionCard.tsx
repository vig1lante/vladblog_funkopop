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
  height: number;
  normalizedX: number;
  normalizedY: number;
  width: number;
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
  "--motion-texture-x",
  "--motion-texture-y",
  "--motion-texture-scale",
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
  const motionStyle = {
    "--motion-accent": accent,
    "--motion-accent-2": accent2,
    "--motion-foil-frame": foilFrame,
    "--motion-foil-hue": `${foilHue}deg`,
    "--motion-foil-texture-opacity": appConfig.foilEffects.imageOpacity,
    "--motion-tint-opacity": foilTintOpacity,
    "--motion-glow": glow,
  } as CSSProperties;
  const shouldShowFoilTexture = isFoil && Boolean(foilTextureUrl);

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
      height: bounds.height,
      normalizedX,
      normalizedY,
      width: bounds.width,
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
        {isFoil && (
          <span className="figure-motion-foil-effects" aria-hidden="true">
            {shouldShowFoilTexture && (
              <span className="figure-motion-foil-texture">
                <img src={foilTextureUrl ?? ""} alt="" />
              </span>
            )}
            <span className="figure-motion-rarity-tint" />
            <span className="figure-motion-glare" />
            <span className="figure-motion-prism" />
          </span>
        )}
        {!isFoil && (
          <span className="figure-motion-glare" aria-hidden="true" />
        )}
        <span className="figure-motion-edge" aria-hidden="true" />
      </div>
    </div>
  );
}

function applyMotion(
  { element, height, normalizedX, normalizedY, width }: PendingMotion,
  isFoil: boolean,
) {
  const axisX = normalizedX * 2 - 1;
  const axisY = normalizedY * 2 - 1;
  const tilt = isFoil ? 16 : 11;
  const shift = isFoil ? 8 : 3;
  const distance = Math.hypot(axisX, axisY);
  const logDistance = Math.log1p(distance * 10);
  const textureRange = clamp(width / 340, 0.84, 1.36);

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
      "--motion-texture-x",
      `${(axisX * 70 * textureRange).toFixed(2)}px`,
    );
    element.style.setProperty(
      "--motion-texture-y",
      `${(axisY * 110 * textureRange * clamp(height / 500, 0.82, 1.2)).toFixed(2)}px`,
    );
    element.style.setProperty(
      "--motion-texture-scale",
      `${(1 + logDistance / 10).toFixed(3)}`,
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
