import { useEffect, useMemo, useState } from "react";

import { type UserResponse } from "../api/auth";
import { getFigurePresets, updateMyFigurePresets } from "../api/figures";
import { Button } from "../components/ui/Button";
import { ErrorMessage } from "../components/ui/ErrorMessage";
import { GlassPanel } from "../components/ui/GlassPanel";
import { PageShell } from "../components/ui/PageShell";
import { Select } from "../components/ui/Select";
import { Spinner } from "../components/ui/Spinner";
import { StepIndicator } from "../components/ui/StepIndicator";
import { clientLogger } from "../lib/logger";
import { getPresetLabel } from "../lib/presetLabels";
import { buildInitialPresetForm } from "../lib/randomPresetForm";
import { getTelegramDisplayName } from "../lib/telegramDisplayName";
import {
  type Figure,
  type FigurePresets,
  type FigurePresetsUpdate,
  type PresetOption,
} from "../types/figure";

type PresetsPageProps = {
  figure: Figure;
  user: UserResponse;
  onSaved: (figure: Figure) => void;
  onBack: () => void;
};

type PresetKey =
  | "selected_vibe"
  | "selected_accessory"
  | "selected_background"
  | "rarity";

const EMPTY_PRESET_VALUE = "__empty__";
const EMPTY_PRESET_OPTION: PresetOption = {
  value: EMPTY_PRESET_VALUE,
  label: "Пусто",
};

export function PresetsPage({ figure, user, onSaved, onBack }: PresetsPageProps) {
  const telegramName = getTelegramDisplayName(user);
  const [presets, setPresets] = useState<FigurePresets | null>(null);
  const [form, setForm] = useState<FigurePresetsUpdate>({});
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
        setForm(buildInitialPresetForm(figure, response));
        setStatus("ready");
        clientLogger.debug("Figure presets loaded", {
          colors: response.colors.length,
          vibes: response.vibes.length,
          accessories: response.accessories.length,
          backgrounds: response.backgrounds.length,
        });
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }
        clientLogger.warn("Figure presets load failed", {
          message: error instanceof Error ? error.message : String(error),
        });
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
        title: "Вайб",
        key: "selected_vibe" as const,
        options: presets.vibes,
        allowEmpty: true,
      },
      {
        title: "Аксессуар",
        key: "selected_accessory" as const,
        options: presets.accessories,
        allowEmpty: true,
      },
      {
        title: "Фон",
        key: "selected_background" as const,
        options: presets.backgrounds,
        allowEmpty: true,
      },
      {
        title: "Редкость",
        key: "rarity" as const,
        options: presets.rarities,
        allowEmpty: false,
      },
    ];
  }, [presets]);

  function updateSelection(key: PresetKey, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value === EMPTY_PRESET_VALUE ? null : value,
    }));
  }

  async function handleSubmit() {
    if (status === "saving" || status === "loading") {
      return;
    }
    setStatus("saving");
    setErrorMessage(null);

    try {
      const updatedFigure = await updateMyFigurePresets(form);
      clientLogger.info("Figure presets saved", {
        figureId: updatedFigure.id,
        status: updatedFigure.status,
      });
      onSaved(updatedFigure);
    } catch (error) {
      clientLogger.warn("Figure presets save failed", {
        message: error instanceof Error ? error.message : String(error),
      });
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Не удалось сохранить стиль",
      );
    }
  }

  return (
    <PageShell>
      <GlassPanel className="game-panel presets-panel">
        <StepIndicator current={3} total={5} />
        <p className="brand-line">VLADBLOG COLLECTIBLES</p>
        <h1>Настрой стиль фигурки</h1>
        <p className="lead">
          Собери базовый образ: вайб, аксессуар, фон и палитру редкости.
        </p>
        <div className="identity-chip">
          <span>Имя из Telegram</span>
          <strong>{telegramName}</strong>
        </div>

        {status === "loading" && (
          <div className="skeleton-stack" aria-label="Загружаем пресеты">
            <span />
            <span />
            <span />
          </div>
        )}
        {errorMessage && <ErrorMessage message={errorMessage} />}

        <div className="preset-sections">
          {sections.map((section) => (
            <PresetSelect
              key={section.key}
              title={section.title}
              options={
                section.allowEmpty
                  ? [EMPTY_PRESET_OPTION, ...section.options]
                  : section.options
              }
              selectedValue={
                section.allowEmpty
                  ? form[section.key] ?? EMPTY_PRESET_VALUE
                  : form[section.key] ?? ""
              }
              onSelect={(value) => updateSelection(section.key, value)}
            />
          ))}
        </div>

        <p className="style-summary">
          Твой стиль: {getPresetLabel(form.selected_vibe)} ·{" "}
          {getPresetLabel(form.selected_accessory)} ·{" "}
          {getPresetLabel(form.selected_background)} ·{" "}
          {getPresetLabel(form.rarity)}
        </p>

        <div className="actions-row">
          <Button disabled={status === "saving"} variant="secondary" onClick={onBack}>
            Назад
          </Button>
          <Button
            disabled={status === "loading" || status === "saving"}
            isLoading={status === "saving"}
            loadingText="Сохраняем..."
            onClick={handleSubmit}
          >
            Продолжить
          </Button>
        </div>
      </GlassPanel>
    </PageShell>
  );
}

type PresetSelectProps = {
  title: string;
  options: PresetOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
};

function PresetSelect({
  title,
  options,
  selectedValue,
  onSelect,
}: PresetSelectProps) {
  return (
    <section className="preset-section">
      <Select
        label={title}
        options={options.map((option) => ({
          ...option,
          label:
            option.value === EMPTY_PRESET_VALUE
              ? option.label
              : getPresetLabel(option.value),
        }))}
        value={selectedValue}
        onChange={(event) => onSelect(event.target.value)}
      />
    </section>
  );
}
