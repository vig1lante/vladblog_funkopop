const rarityDropRates: Record<string, string> = {
  Epic: "55%",
  Mythic: "24%",
  Legendary: "8%",
  "Founder Legendary": "4%",
  "Foil Epic": "5%",
  "Foil Mythic": "2.5%",
  "Foil Legendary": "1%",
  "Foil Founder Legendary": "0.5%",
};

export function getRarityDropRateLabel(rarity: string): string {
  return rarityDropRates[rarity] ?? "Неизвестно";
}
