import {
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  type TouchEvent,
  useEffect,
  useRef,
} from "react";

type FigureMotionCardProps = {
  accent: string;
  accent2: string;
  children: ReactNode;
  glow: string;
  isFoil: boolean;
};

type PendingMotion = {
  element: HTMLDivElement;
  normalizedX: number;
  normalizedY: number;
};

const motionVariableNames = [
  "--motion-rotate-x",
  "--motion-rotate-y",
  "--motion-translate-x",
  "--motion-translate-y",
  "--motion-pointer-x",
  "--motion-pointer-y",
  "--motion-angle",
] as const;

export function FigureMotionCard({
  accent,
  accent2,
  children,
  glow,
  isFoil,
}: FigureMotionCardProps) {
  const frameRef = useRef<number | null>(null);
  const pendingMotionRef = useRef<PendingMotion | null>(null);
  const motionStyle = {
    "--motion-accent": accent,
    "--motion-accent-2": accent2,
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

    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    const normalizedX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const normalizedY = clamp((event.clientY - rect.top) / rect.height, 0, 1);

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

    event.currentTarget.classList.add("is-motion-active");
    event.currentTarget.setPointerCapture(event.pointerId);
    scheduleMotion(event);
  }

  function handlePointerReset(event: PointerEvent<HTMLDivElement>) {
    pendingMotionRef.current = null;
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
        <span className="figure-motion-prism" aria-hidden="true" />
        <span className="figure-motion-glare" aria-hidden="true" />
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
  element.style.setProperty(
    "--motion-pointer-x",
    `${(normalizedX * 100).toFixed(1)}%`,
  );
  element.style.setProperty(
    "--motion-pointer-y",
    `${(normalizedY * 100).toFixed(1)}%`,
  );
  element.style.setProperty(
    "--motion-angle",
    `${(115 + axisX * 90).toFixed(1)}deg`,
  );
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
