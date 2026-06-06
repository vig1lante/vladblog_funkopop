import { describe, expect, it } from "vitest";

import { buildInitialPresetForm } from "./randomPresetForm";
import { type Figure, type FigurePresets } from "../types/figure";

const presets: FigurePresets = {
  colors: [],
  vibes: [
    { value: "cyberpunk", label: "Cyberpunk" },
    { value: "magic", label: "Magic" },
    { value: "gamer", label: "Gamer" },
  ],
  accessories: [
    { value: "laptop", label: "Laptop" },
    { value: "coffee", label: "Coffee" },
  ],
  backgrounds: [
    { value: "neon_server_room", label: "Server" },
    { value: "space", label: "Space" },
  ],
  rarities: [
    { value: "Epic", label: "Epic" },
    { value: "Mythic", label: "Mythic" },
    { value: "Legendary", label: "Legendary" },
  ],
  source_photo_types: [],
};

const draftFigure: Figure = {
  id: "figure-id",
  user_id: "user-id",
  mint_number: 1,
  display_number: "#0001",
  rarity: "Founder Legendary",
  status: "draft",
  selected_color: null,
  selected_vibe: null,
  selected_accessory: null,
  selected_background: null,
  source_photo_type: null,
  source_photo_url: null,
  image_url: null,
  thumbnail_url: null,
  share_image_url: null,
  prompt: null,
  description: null,
  traits_json: null,
  is_public: true,
  created_at: "2026-06-06T00:00:00Z",
  updated_at: "2026-06-06T00:00:00Z",
};

describe("buildInitialPresetForm", () => {
  it("uses random initial values for a draft figure when presets open", () => {
    const randomValues = [0.65, 0.8, 0.2, 0.9];
    const form = buildInitialPresetForm(
      draftFigure,
      presets,
      () => randomValues.shift() ?? 0,
    );

    expect(form).toEqual({
      selected_vibe: "magic",
      selected_accessory: "coffee",
      selected_background: "neon_server_room",
      rarity: "Legendary",
    });
  });

  it("keeps saved values for a non-draft figure", () => {
    const form = buildInitialPresetForm(
      {
        ...draftFigure,
        status: "ready_for_generation",
        rarity: "Mythic",
        selected_vibe: "gamer",
        selected_accessory: "laptop",
        selected_background: "space",
      },
      presets,
      () => 0,
    );

    expect(form).toEqual({
      selected_vibe: "gamer",
      selected_accessory: "laptop",
      selected_background: "space",
      rarity: "Mythic",
    });
  });
});
