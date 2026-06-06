import { describe, expect, it } from "vitest";

import { getRarityDropRateLabel } from "./rarityDropRates";

describe("getRarityDropRateLabel", () => {
  it.each([
    ["Epic", "55%"],
    ["Mythic", "24%"],
    ["Legendary", "8%"],
    ["Founder Legendary", "4%"],
    ["Foil Epic", "5%"],
    ["Foil Mythic", "2.5%"],
    ["Foil Legendary", "1%"],
    ["Foil Founder Legendary", "0.5%"],
  ])("maps %s to %s", (rarity, label) => {
    expect(getRarityDropRateLabel(rarity)).toBe(label);
  });
});
