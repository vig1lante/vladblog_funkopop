export const approvedEpicStyle = {
  rarity: "Epic",
  selectedIndex: 2,
  name: "Arc Chip",
  icon: "△",
  note: "светлая мифриловая грань",
  accent: "#e9d5ff",
  accent2: "#8b5cf6",
  glow: "rgba(139, 92, 246, 0.26)",
  shape: "gem",
  power: "epic",
  selected: true,
} as const;

export const approvedMythicStyle = {
  rarity: "Mythic",
  selectedIndex: 4,
  name: "Blood Plasma",
  icon: "◆",
  note: "алый plasma shine",
  accent: "#ffe4e6",
  accent2: "#e11d48",
  glow: "rgba(225, 29, 72, 0.33)",
  shape: "gem",
  power: "mythic",
  selected: true,
} as const;

export const approvedLegendaryStyle = {
  rarity: "Legendary",
  selectedIndex: 3,
  name: "Sun Relic",
  icon: "⬢",
  note: "теплый shine",
  accent: "#fde68a",
  accent2: "#f59e0b",
  glow: "rgba(245, 158, 11, 0.32)",
  shape: "gem",
  power: "legendary",
  selected: true,
} as const;

export const approvedFounderLegendaryStyle = {
  rarity: "Founder Legendary",
  selectedIndex: 5,
  name: "Legacy Frame",
  icon: "✹",
  note: "рамка-реликвия, анимация founder crest",
  accent: "#f8d56a",
  accent2: "#7a5600",
  glow: "rgba(248, 213, 106, 0.48)",
  shape: "crest",
  power: "founder",
  selected: true,
  useLiveBadge: true,
} as const;

export const approvedFoilStyle = {
  rarity: "Foil",
  selectedIndex: 4,
  name: "Holographic",
  icon: "✹",
  note: "одобренный foil shimmer",
  accent: "#ffffff",
  accent2: "#ffcaf3",
  glow: "rgba(255, 255, 255, 0.56)",
  shape: "foil",
  power: "foil",
  approved: true,
  selected: true,
  useLiveBadge: true,
} as const;

export const approvedFoilEpicStyle = {
  ...approvedEpicStyle,
  rarity: "Foil Epic",
  name: "Foil Arc Chip",
  accent: "#f1d8ff",
  accent2: "#8b5cf6",
  glow: "rgba(216, 180, 254, 0.42)",
  power: "foil-epic",
  useLiveBadge: true,
} as const;

export const approvedFoilMythicStyle = {
  ...approvedMythicStyle,
  rarity: "Foil Mythic",
  name: "Foil Blood Plasma",
  accent: "#ffe4e6",
  accent2: "#e11d48",
  glow: "rgba(251, 113, 133, 0.46)",
  power: "foil-mythic",
  useLiveBadge: true,
} as const;

export const approvedFoilLegendaryStyle = {
  ...approvedLegendaryStyle,
  rarity: "Foil Legendary",
  name: "Foil Sun Relic",
  accent: "#fde68a",
  accent2: "#f59e0b",
  glow: "rgba(253, 230, 138, 0.48)",
  power: "foil-legendary",
  useLiveBadge: true,
} as const;

export const approvedFoilFounderLegendaryStyle = {
  ...approvedFounderLegendaryStyle,
  rarity: "Foil Founder Legendary",
  name: "Foil Legacy Frame",
  accent: "#f8d56a",
  accent2: "#7a5600",
  glow: "rgba(248, 213, 106, 0.56)",
  power: "foil-founder",
  useLiveBadge: true,
} as const;

export const finalRarityStyles = [
  approvedEpicStyle,
  approvedMythicStyle,
  approvedLegendaryStyle,
  approvedFounderLegendaryStyle,
  approvedFoilStyle,
  approvedFoilEpicStyle,
  approvedFoilMythicStyle,
  approvedFoilLegendaryStyle,
  approvedFoilFounderLegendaryStyle,
] as const;

export type ApprovedRarityStyle = (typeof finalRarityStyles)[number];

export function getApprovedRarityStyle(rarity: string): ApprovedRarityStyle {
  const key = rarity.toLowerCase().replaceAll(" ", "-");

  if (key === "rare") {
    return approvedEpicStyle;
  }
  if (key === "epic") {
    return approvedEpicStyle;
  }
  if (key === "mythic") {
    return approvedMythicStyle;
  }
  if (key === "founder-legendary") {
    return approvedFounderLegendaryStyle;
  }
  if (key === "foil") {
    return approvedFoilStyle;
  }
  if (key === "foil-epic") {
    return approvedFoilEpicStyle;
  }
  if (key === "foil-mythic") {
    return approvedFoilMythicStyle;
  }
  if (key === "foil-legendary") {
    return approvedFoilLegendaryStyle;
  }
  if (key === "foil-founder-legendary") {
    return approvedFoilFounderLegendaryStyle;
  }
  return approvedLegendaryStyle;
}
