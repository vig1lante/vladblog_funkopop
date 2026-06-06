import { type UserResponse } from "../api/auth";
import { Button } from "../components/ui/Button";
import { ErrorMessage } from "../components/ui/ErrorMessage";
import { GlassPanel } from "../components/ui/GlassPanel";
import { PageShell } from "../components/ui/PageShell";
import { StepIndicator } from "../components/ui/StepIndicator";
import { getPresetLabel } from "../lib/presetLabels";
import { getTelegramDisplayName } from "../lib/telegramDisplayName";
import { type Figure } from "../types/figure";

type GenerationReadyPageProps = {
  figure: Figure;
  user: UserResponse;
  isStarting: boolean;
  errorMessage: string | null;
  onBack: () => void;
  onStart: () => void;
};

export function GenerationReadyPage({
  figure,
  user,
  isStarting,
  errorMessage,
  onBack,
  onStart,
}: GenerationReadyPageProps) {
  const telegramName = getTelegramDisplayName(user);
  const displayedError =
    errorMessage ||
    (figure.status === "failed"
      ? "Не удалось сгенерировать фигурку. Попробуй другое фото или режим без фото."
      : null);

  return (
    <PageShell>
      <GlassPanel className="game-panel ready-panel">
        <StepIndicator current={4} total={5} />
        <p className="brand-line">VLADBLOG COLLECTIBLES</p>
        <h1>Всё готово для генерации</h1>
        {figure.source_photo_url && (
          <img
            className="summary-photo"
            alt="Фото для генерации"
            src={figure.source_photo_url}
          />
        )}
        <div className="identity-chip">
          <span>Имя из Telegram</span>
          <strong>{telegramName}</strong>
        </div>
        <dl className="summary-list">
          <SummaryItem title="Вайб" value={getPresetLabel(figure.selected_vibe)} />
          <SummaryItem
            title="Аксессуар"
            value={getPresetLabel(figure.selected_accessory)}
          />
          <SummaryItem title="Фон" value={getPresetLabel(figure.selected_background)} />
        </dl>
        <p className="helper-text">Генерация может занять немного времени.</p>
        {displayedError && <ErrorMessage message={displayedError} />}
        <div className="actions-row">
          <Button
            disabled={isStarting}
            variant="secondary"
            onClick={onBack}
          >
            Назад к настройке
          </Button>
          <Button
            isLoading={isStarting}
            loadingText="Генерируем..."
            onClick={onStart}
          >
            Сгенерировать фигурку
          </Button>
        </div>
      </GlassPanel>
    </PageShell>
  );
}

function SummaryItem({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <dt>{title}</dt>
      <dd>{value}</dd>
    </div>
  );
}
