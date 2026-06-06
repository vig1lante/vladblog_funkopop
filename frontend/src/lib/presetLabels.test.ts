import { describe, expect, it } from "vitest";

import { getPresetLabel } from "./presetLabels";

describe("getPresetLabel", () => {
  it("localizes English-heavy generation preset labels", () => {
    expect(getPresetLabel("ai_researcher")).toBe("🤖 ИИ-исследователь");
    expect(getPresetLabel("dj")).toBe("🎧 Диджей");
    expect(getPresetLabel("tabletop_rpg")).toBe(
      "🗺️ Фан настольных ролевых игр",
    );
    expect(getPresetLabel("dark_academia")).toBe("🕯️ Тёмная академия");
    expect(getPresetLabel("cottagecore")).toBe("🧺 Коттеджкор");
    expect(getPresetLabel("lofi")).toBe("🎧 Лоу-фай");
    expect(getPresetLabel("k_pop")).toBe("🎶 Кей-поп");
  });
});
