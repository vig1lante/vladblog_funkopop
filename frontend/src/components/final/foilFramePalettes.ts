export type FoilFramePalette = {
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
  shadow: string;
};

const foilFramePalettes: Record<string, FoilFramePalette> = {
  "foil-epic": {
    primary: "#4C1D95",
    secondary: "#6D28D9",
    accent: "#A855F7",
    glow: "rgba(76, 29, 149, 0.48)",
    shadow: "rgba(168, 85, 247, 0.2)",
  },
  "foil-mythic": {
    primary: "#7F1D1D",
    secondary: "#B91C1C",
    accent: "#F97316",
    glow: "rgba(127, 29, 29, 0.5)",
    shadow: "rgba(249, 115, 22, 0.22)",
  },
  "foil-legendary": {
    primary: "#7C5200",
    secondary: "#B7791F",
    accent: "#F5C451",
    glow: "rgba(124, 82, 0, 0.52)",
    shadow: "rgba(245, 196, 81, 0.24)",
  },
  "foil-founder-legendary": {
    primary: "#010414",
    secondary: "#020A3A",
    accent: "#1D4ED8",
    glow: "rgba(1, 4, 20, 0.56)",
    shadow: "rgba(29, 78, 216, 0.26)",
  },
};

export function isFoilRarity(rarity: string): boolean {
  return normalizeFoilRarity(rarity) in foilFramePalettes;
}

export function getFoilFramePalette(
  rarity: string,
): FoilFramePalette | null {
  return foilFramePalettes[normalizeFoilRarity(rarity)] ?? null;
}

function normalizeFoilRarity(rarity: string): string {
  return rarity.trim().toLowerCase().replaceAll("_", "-").replaceAll(" ", "-");
}
