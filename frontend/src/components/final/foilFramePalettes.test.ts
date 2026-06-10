import { describe, expect, it } from "vitest";

import { getFoilFramePalette, isFoilRarity } from "./foilFramePalettes";

describe("foilFramePalettes", () => {
  it.each([
    ["Foil Epic", "#4C1D95"],
    ["Foil Mythic", "#7F1D1D"],
    ["Foil Legendary", "#7C5200"],
    ["Foil Founder Legendary", "#010414"],
    ["foil_epic", "#4C1D95"],
    ["foil-founder-legendary", "#010414"],
  ])("detects %s as an animated foil frame rarity", (rarity, primary) => {
    expect(isFoilRarity(rarity)).toBe(true);
    expect(getFoilFramePalette(rarity)?.primary).toBe(primary);
  });

  it.each(["Epic", "Mythic", "Legendary", "Founder Legendary", "Foil", ""])(
    "does not apply animated foil frames to %s",
    (rarity) => {
      expect(isFoilRarity(rarity)).toBe(false);
      expect(getFoilFramePalette(rarity)).toBeNull();
    },
  );
});
