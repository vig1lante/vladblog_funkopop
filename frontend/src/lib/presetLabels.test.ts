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

  it("uses emoji labels that are safe across Android and iOS Telegram WebViews", () => {
    expect(getPresetLabel("software_engineer")).toBe("💻 Разработчик");
    expect(getPresetLabel("poet")).toBe("✍️ Поэт");
    expect(getPresetLabel("doctor")).toBe("💊 Врач");
    expect(getPresetLabel("chef")).toBe("🍳 Шеф-повар");
    expect(getPresetLabel("astronaut")).toBe("🚀 Астронавт");
    expect(getPresetLabel("meditation")).toBe("🧘 Медитация");
    expect(getPresetLabel("cosplay")).toBe("🎭 Косплей");
    expect(getPresetLabel("woodworker")).toBe("🛠️ Столяр");
    expect(getPresetLabel("plant_parent")).toBe("🌱 Домашний ботаник");
    expect(getPresetLabel("bitcoin_coin")).toBe("₿ Биткоин-монета");
  });
});
