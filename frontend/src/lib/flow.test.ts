import { describe, expect, it } from "vitest";

import { getFlowStep } from "./flow";
import { type Figure } from "../types/figure";

const baseFigure: Figure = {
  id: "f1",
  user_id: "u1",
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
  created_at: "2026-06-03T00:00:00Z",
  updated_at: "2026-06-03T00:00:00Z",
};

describe("getFlowStep", () => {
  it("routes by backend next_step and guards completed without image", () => {
    expect(getFlowStep(null)).toBe("welcome");
    expect(getFlowStep({ ...baseFigure, next_step: "photo" })).toBe("photo");
    expect(getFlowStep({ ...baseFigure, next_step: "presets" })).toBe("presets");
    expect(
      getFlowStep({ ...baseFigure, next_step: "ready_to_generate" }),
    ).toBe("ready");
    expect(getFlowStep({ ...baseFigure, next_step: "generating" })).toBe("waiting");
    expect(
      getFlowStep({ ...baseFigure, status: "completed", next_step: "completed" }),
    ).toBe("welcome");
    expect(
      getFlowStep({
        ...baseFigure,
        status: "completed",
        image_url: "/media/mock/generated-figure.png",
        next_step: "completed",
      }),
    ).toBe("result");
  });
});
