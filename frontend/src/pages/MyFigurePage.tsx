import { useState } from "react";

import { FigureCard } from "../components/FigureCard";
import { type UserResponse } from "../api/auth";
import { downloadMyFigureCard, getPublicFigureCardUrl } from "../api/figures";
import { Button } from "../components/ui/Button";
import { ErrorMessage } from "../components/ui/ErrorMessage";
import { GlassPanel } from "../components/ui/GlassPanel";
import { PageShell } from "../components/ui/PageShell";
import {
  getTelegramProfileUrl,
  getTelegramUsernameLabel,
} from "../lib/telegramUsername";
import { type Figure } from "../types/figure";

type MyFigurePageProps = {
  figure: Figure;
  user: UserResponse;
};

export function MyFigurePage({ figure, user }: MyFigurePageProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadComplete, setIsDownloadComplete] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const modelUsername = getTelegramUsernameLabel(user);
  const modelProfileUrl = getTelegramProfileUrl(user);
  const showPrompt = Boolean(
    figure.prompt && (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === "local"),
  );

  async function handleDownload(): Promise<void> {
    if (isDownloadComplete || isDownloading) {
      return;
    }

    setIsDownloading(true);
    setIsDownloadComplete(false);
    setDownloadError(null);

    try {
      const fileName = buildDownloadFileName(figure.display_number);
      if (requestTelegramDownload(getPublicFigureCardUrl(figure.id), fileName)) {
        setIsDownloadComplete(true);
        return;
      }

      triggerDownload(
        await downloadMyFigureCard(),
        fileName,
      );
      setIsDownloadComplete(true);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Failed to download figure card", error);
      }
      setIsDownloadComplete(false);
      setDownloadError(
        "Не удалось скачать карточку. Обнови экран и попробуй ещё раз.",
      );
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <PageShell>
      <GlassPanel className="game-panel figure-panel">
        <p className="brand-line">VLADBLOG COLLECTIBLES</p>
        <h1>Фигурка готова</h1>
        <div className="figure-result-card">
          <FigureCard
            figure={figure}
            modelProfileUrl={modelProfileUrl}
            modelUsername={modelUsername}
          />
        </div>
        <p className="lead">
          {figure.display_number} уже в коллекции VladBlog Collectibles.
        </p>
        <div className="actions-row">
          <Button
            aria-disabled={isDownloadComplete}
            aria-label={isDownloadComplete ? "Скачано" : "Скачать результат"}
            className={`download-button ${
              isDownloadComplete ? "download-complete" : ""
            }`}
            disabled={isDownloading || isDownloadComplete}
            onClick={isDownloadComplete ? undefined : handleDownload}
            title={isDownloadComplete ? "Скачано" : "Скачать результат"}
          >
            {isDownloadComplete ? (
              <CheckIcon />
            ) : isDownloading ? (
              <DownloadSpinnerIcon />
            ) : (
              <DownloadIcon />
            )}
          </Button>
        </div>
        {downloadError && <ErrorMessage message={downloadError} />}
        {showPrompt && (
          <details className="prompt-details">
            <summary>Технические детали</summary>
            <pre>{figure.prompt}</pre>
          </details>
        )}
      </GlassPanel>
    </PageShell>
  );
}

function DownloadIcon() {
  return (
    <svg
      aria-hidden="true"
      className="download-icon"
      fill="none"
      focusable="false"
      viewBox="0 0 24 24"
    >
      <path
        className="download-glyph"
        d="M12 4.5v8.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      <path
        className="download-glyph"
        d="m8.5 9.9 3.5 3.5 3.5-3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      <path
        className="download-glyph"
        d="M6 17.25v1.15c0 .75.6 1.35 1.35 1.35h9.3c.75 0 1.35-.6 1.35-1.35v-1.15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="download-icon check-icon"
      fill="none"
      focusable="false"
      viewBox="0 0 24 24"
    >
      <path
        d="m5 12.5 4.2 4.2L19 6.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.8"
      />
    </svg>
  );
}

function DownloadSpinnerIcon() {
  return (
    <span
      aria-hidden="true"
      className="download-icon download-spinner-icon"
    />
  );
}

function buildDownloadFileName(displayNumber: string): string {
  const normalizedNumber = displayNumber.replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]+/g, "");
  return `vladblog-collectible-${normalizedNumber || "figure"}.png`;
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function requestTelegramDownload(url: string, fileName: string): boolean {
  const webApp = window.Telegram?.WebApp;
  if (!webApp || !url.startsWith("https://")) {
    return false;
  }

  try {
    if (webApp.downloadFile) {
      webApp.downloadFile({ url, file_name: fileName }, (accepted) => {
        if (!accepted) {
          webApp.openLink?.(url, { try_instant_view: false });
        }
      });
      return true;
    }

    webApp.openLink?.(url, { try_instant_view: false });
    return Boolean(webApp.openLink);
  } catch {
    return false;
  }
}
