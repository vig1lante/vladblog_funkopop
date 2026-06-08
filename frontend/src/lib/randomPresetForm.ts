import {
  type Figure,
  type FigurePresets,
  type FigurePresetsUpdate,
  type PresetOption,
} from "../types/figure";

export function buildInitialPresetForm(
  figure: Figure,
  presets: FigurePresets,
  random: () => number = Math.random,
): FigurePresetsUpdate {
  if (figure.status === "draft") {
    return {
      selected_vibe: pickRandomOption(presets.vibes, random),
      selected_accessory: pickRandomOption(presets.accessories, random),
      selected_background: pickRandomOption(presets.backgrounds, random),
      rarity: pickRandomOption(presets.rarities, random),
    };
  }

  return {
    selected_vibe: figure.selected_vibe,
    selected_accessory: figure.selected_accessory,
    selected_background: figure.selected_background,
    rarity: figure.rarity ?? firstOptionValue(presets.rarities),
  };
}

function pickRandomOption(
  options: PresetOption[],
  random: () => number,
): string | undefined {
  if (options.length === 0) {
    return undefined;
  }

  const index = Math.min(
    options.length - 1,
    Math.floor(random() * options.length),
  );
  return options[index]?.value;
}

function firstOptionValue(options: PresetOption[]): string | undefined {
  return options[0]?.value;
}
