import { FigureCard } from "../components/FigureCard";
import { type Figure } from "../types/figure";

type MyFigurePageProps = {
  figure: Figure;
  onConfigure: () => void;
  onChoosePhoto: () => void;
  onGenerate: () => void;
};

export function MyFigurePage({
  figure,
  onConfigure,
  onChoosePhoto,
  onGenerate,
}: MyFigurePageProps) {
  const isFounder = figure.rarity === "Founder Legendary";
  const isReady = figure.status === "ready_for_generation";
  const isCompleted = figure.status === "completed";
  const canGenerate = isReady || figure.status === "failed";
  const photoLabel = getPhotoLabel(figure.source_photo_type);
  const showPrompt = Boolean(
    figure.prompt && (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === "local"),
  );

  return (
    <main className="page-shell game-shell">
      <section className="game-panel figure-panel">
        <p className="brand-line">VLADIK COLLECTIBLES</p>
        <h1>Твоя фигурка</h1>
        <FigureCard figure={figure} />
        <p className="lead">
          {isCompleted
            ? "Фигурка готова."
            : isReady
            ? "Стиль выбран. Следующий шаг — генерация AI Funko Pop фигурки."
            : isFounder
            ? "Ты получил первую фигурку коллекции. Это Founder Legendary."
            : "Это твой первый коллекционный слот. В следующем шаге ты выберешь стиль и создашь AI-фигурку."}
        </p>
        <section className="source-photo-summary">
          <div>
            <span>Фото для генерации:</span>
            <strong>{photoLabel}</strong>
          </div>
          {figure.source_photo_url && (
            <img alt="Фото для генерации" src={figure.source_photo_url} />
          )}
        </section>
        <div className="actions-row">
          <button className="secondary-button" type="button" onClick={onConfigure}>
            Продолжить настройку
          </button>
          <button className="secondary-button" type="button" onClick={onChoosePhoto}>
            Выбрать фото
          </button>
          <button
            className="primary-button"
            disabled={!canGenerate}
            type="button"
            onClick={onGenerate}
          >
            Сгенерировать фигурку
          </button>
        </div>
        {showPrompt && (
          <details className="prompt-details">
            <summary>Generated prompt</summary>
            <pre>{figure.prompt}</pre>
          </details>
        )}
        <p className="helper-text">
          {isCompleted
            ? "Mock generation завершена."
            : isReady
            ? "Можно изменить стиль до генерации."
            : "Выбор пресетов уже доступен."}
        </p>
      </section>
    </main>
  );
}

function getPhotoLabel(sourcePhotoType: string | null): string {
  if (sourcePhotoType === "telegram_profile") {
    return "Telegram profile";
  }

  if (sourcePhotoType === "uploaded") {
    return "Uploaded";
  }

  if (sourcePhotoType === "none") {
    return "Без фото";
  }

  return "Не выбрано";
}
