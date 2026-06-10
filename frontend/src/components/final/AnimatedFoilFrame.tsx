import { type CSSProperties, type ReactNode } from "react";

import { appConfig } from "../../config/appConfig";
import { getFoilFramePalette } from "./foilFramePalettes";

type AnimatedFoilFrameProps = {
  active?: boolean;
  children: ReactNode;
  rarity: string;
};

export function AnimatedFoilFrame({
  active = true,
  children,
  rarity,
}: AnimatedFoilFrameProps) {
  const palette = active && appConfig.foilFrame.enabled
    ? getFoilFramePalette(rarity)
    : null;

  if (!palette) {
    return <>{children}</>;
  }

  const frameStyle = {
    "--foil-frame-primary": palette.primary,
    "--foil-frame-secondary": palette.secondary,
    "--foil-frame-accent": palette.accent,
    "--foil-frame-glow": palette.glow,
    "--foil-frame-shadow": palette.shadow,
    "--foil-frame-width": `${appConfig.foilFrame.borderWidth}px`,
    "--foil-frame-glow-opacity": appConfig.foilFrame.glowOpacity,
    "--foil-frame-glow-opacity-mobile": appConfig.foilFrame.glowOpacity * 0.72,
    "--foil-frame-glow-opacity-reduced": appConfig.foilFrame.glowOpacity * 0.56,
    "--foil-frame-duration": `${appConfig.foilFrame.animationDurationSeconds}s`,
    "--foil-frame-mobile-duration": `${appConfig.foilFrame.mobileAnimationDurationSeconds}s`,
  } as CSSProperties;

  return (
    <div className="animated-foil-frame-shell" style={frameStyle}>
      <div className="animated-foil-frame-glow" aria-hidden="true" />
      <div className="animated-foil-frame-border" aria-hidden="true" />
      <div className="animated-foil-frame-inner">{children}</div>
    </div>
  );
}
