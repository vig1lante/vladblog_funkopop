type RarityBadgeProps = {
  rarity: string;
};

export function RarityBadge({ rarity }: RarityBadgeProps) {
  const className = `rarity-badge rarity-${rarity
    .toLowerCase()
    .replaceAll(" ", "-")}`;

  return <span className={className}>{rarity}</span>;
}
