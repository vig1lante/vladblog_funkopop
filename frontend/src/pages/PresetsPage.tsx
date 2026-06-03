import { useEffect, useMemo, useState } from "react";

import { getFigurePresets, updateMyFigurePresets } from "../api/figures";
import {
  type Figure,
  type FigurePresets,
  type FigurePresetsUpdate,
  type PresetOption,
  type SourcePhotoType,
} from "../types/figure";

type PresetsPageProps = {
  figure: Figure;
  onSaved: (figure: Figure) => void;
  onBack: () => void;
};

type PresetKey =
  | "selected_color"
  | "selected_vibe"
  | "selected_accessory"
  | "selected_background"
  | "source_photo_type";

const emptyPresets: FigurePresetsUpdate = {
  selected_color: "purple",
  selected_vibe: "cyberpunk",
  selected_accessory: "laptop",
  selected_background: "neon_server_room",
  source_photo_type: "telegram_profile" as SourcePhotoType,
  is_public: true,
};

export function PresetsPage({ figure, onSaved, onBack }: PresetsPageProps) {
  const [presets, setPresets] = useState<FigurePresets | null>(null);
  const [form, setForm] = useState<FigurePresetsUpdate>({
    selected_color: figure.selected_color ?? emptyPresets.selected_color,
    selected_vibe: figure.selected_vibe ?? emptyPresets.selected_vibe,
    selected_accessory:
      figure.selected_accessory ?? emptyPresets.selected_accessory,
    selected_background:
      figure.selected_background ?? emptyPresets.selected_background,
    source_photo_type:
      (figure.source_photo_type as SourcePhotoType | null) ??
      emptyPresets.source_photo_type,
    is_public: figure.is_public,
  });
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    getFigurePresets()
      .then((response) => {
        if (!isActive) {
          return;
        }
        setPresets(response);
        setStatus("ready");
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Не удалось загрузить пресеты",
        );
      });

    return () => {
      isActive = false;
    };
  }, []);

  const sections = useMemo(() => {
    if (!presets) {
      return [];
    }

    return [
      {
        title: "Цвет",
        key: "selected_color" as const,
        options: presets.colors,
      },
      {
        title: "Вайб",
        key: "selected_vibe" as const,
        options: presets.vibes,
      },
      {
        title: "Аксессуар",
        key: "selected_accessory" as const,
        options: presets.accessories,
      },
      {
        title: "Фон",
        key: "selected_background" as const,
        options: presets.backgrounds,
      },
      {
        title: "Источник фото",
        key: "source_photo_type" as const,
        options: presets.source_photo_types,
      },
    ];
  }, [presets]);

  function updateSelection(key: PresetKey, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit() {
    setStatus("saving");
    setErrorMessage(null);

    try {
      const updatedFigure = await updateMyFigurePresets(form);
      onSaved(updatedFigure);
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Не удалось сохранить стиль",
      );
    }
  }

  return (
    <main className="page-shell game-shell">
      <section className="game-panel presets-panel">
        <p className="brand-line">VLADIK COLLECTIBLES</p>
        <h1>Выбери стиль фигурки</h1>
        <p className="lead">
          Собери базовый образ: цвет, вайб, аксессуар, фон и источник фото.
        </p>

        {status === "loading" && <p className="helper-text">Загружаем пресеты...</p>}
        {errorMessage && <p className="error-text">{errorMessage}</p>}

        <div className="preset-sections">
          {sections.map((section) => (
            <PresetSection
              key={section.key}
              title={section.title}
              options={section.options}
              selectedValue={form[section.key] ?? ""}
              onSelect={(value) => updateSelection(section.key, value)}
            />
          ))}
        </div>

        <label className="public-toggle">
          <input
            checked={form.is_public ?? true}
            type="checkbox"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                is_public: event.target.checked,
              }))
            }
          />
          <span>Участвовать публично в будущих паках</span>
        </label>

        <div className="actions-row">
          <button className="secondary-button" type="button" onClick={onBack}>
            Назад
          </button>
          <button
            className="primary-button"
            disabled={status === "loading" || status === "saving"}
            type="button"
            onClick={handleSubmit}
          >
            {status === "saving" ? "Сохраняем..." : "Сохранить стиль"}
          </button>
        </div>
      </section>
    </main>
  );
}

type PresetSectionProps = {
  title: string;
  options: PresetOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
};

function PresetSection({
  title,
  options,
  selectedValue,
  onSelect,
}: PresetSectionProps) {
  return (
    <section className="preset-section">
      <h2>{title}</h2>
      <div className="preset-grid">
        {options.map((option) => (
          <button
            className={
              option.value === selectedValue
                ? "preset-option preset-option-selected"
                : "preset-option"
            }
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}
