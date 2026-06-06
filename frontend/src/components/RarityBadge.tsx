import { Badge } from "./ui/Badge";

type RarityBadgeProps = {
  rarity: string;
};

const foilPreviewRarities = [
  "Foil Epic",
  "Foil Mythic",
  "Foil Legendary",
  "Foil Founder Legendary",
];

const rarityLabels: Record<string, string> = {
  rare: "Epic",
};

export function RarityBadge({ rarity }: RarityBadgeProps) {
  const rawKey = rarity.toLowerCase().replaceAll(" ", "-");
  const rarityKey = rawKey === "rare" ? "epic" : rawKey;
  const className = `rarity-badge rarity-${rarityKey}`;
  const label = rarityLabels[rawKey] ?? rarity;

  return (
    <Badge className={className}>
      <span className="rarity-badge-icon" aria-hidden="true" />
      <span className="rarity-badge-text">{label}</span>
    </Badge>
  );
}

export function FoilRarityPreview() {
  return (
    <div className="foil-rarity-preview" aria-label="Новые foil редкости">
      {foilPreviewRarities.map((rarity) => (
        <RarityBadge key={rarity} rarity={rarity} />
      ))}
    </div>
  );
}
