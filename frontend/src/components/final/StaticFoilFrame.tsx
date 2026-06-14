import { type CSSProperties, type ReactNode } from "react";

import { appConfig } from "../../config/appConfig";
import { getFoilFramePalette } from "./foilFramePalettes";

type StaticFoilFrameProps = {
  active?: boolean;
  children: ReactNode;
  rarity: string;
};

export function StaticFoilFrame({
  active = true,
  children,
  rarity,
}: StaticFoilFrameProps) {
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
  } as CSSProperties;

  return (
    <div className="static-foil-frame-shell" style={frameStyle}>
      <div className="static-foil-frame-glow" aria-hidden="true" />
      <div className="static-foil-frame-border" aria-hidden="true" />
      <div className="static-foil-frame-inner">{children}</div>
    </div>
  );
}
