import { useEffect, useState } from "react";

import { FigureCard } from "../components/FigureCard";
import { FigureMotionCard } from "../components/FigureMotionCard";
import { type UserResponse } from "../api/auth";
import {
  downloadMyFigureCard,
  getPublicFigureCardUrl,
  type FigureCardVariant,
} from "../api/figures";
import { Button } from "../components/ui/Button";
import { ErrorMessage } from "../components/ui/ErrorMessage";
import { GlassPanel } from "../components/ui/GlassPanel";
import { PageShell } from "../components/ui/PageShell";
import {
  getTelegramProfileUrl,
  getTelegramUsernameLabel,
} from "../lib/telegramUsername";
import { getApprovedRarityStyle } from "../lib/approvedRarityStyles";
import { clientLogger } from "../lib/logger";
import { requestTelegramDownload } from "../lib/telegramDownload";
import { type Figure } from "../types/figure";

type MyFigurePageProps = {
  figure: Figure;
  user: UserResponse;
};

type DownloadStatus = {
  isComplete: boolean;
  isDownloading: boolean;
};

type DownloadStatusByVariant = Record<FigureCardVariant, DownloadStatus>;

const initialDownloadStatusByVariant: DownloadStatusByVariant = {
  normal: {
    isComplete: false,
    isDownloading: false,
  },
  foil: {
    isComplete: false,
    isDownloading: false,
  },
};

export function MyFigurePage({ figure, user }: MyFigurePageProps) {
  const [showFoilVersion, setShowFoilVersion] = useState(false);
  const [downloadStatusByVariant, setDownloadStatusByVariant] = useState(
    initialDownloadStatusByVariant,
  );
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const modelUsername = getTelegramUsernameLabel(user);
  const modelProfileUrl = getTelegramProfileUrl(user);
  const foilFigure = getFoilFigure(figure);
  const displayedVariant = showFoilVersion && foilFigure ? "foil" : "normal";
  const displayedFigure = showFoilVersion && foilFigure ? foilFigure : figure;
  const displayedRarityStyle = getApprovedRarityStyle(displayedFigure.rarity);
  const displayedIsFoilRarity = displayedRarityStyle.power.startsWith("foil");
  const currentDownloadStatus = downloadStatusByVariant[displayedVariant];
  const isDownloading = currentDownloadStatus.isDownloading;
  const isDownloadComplete = currentDownloadStatus.isComplete;
  const showPrompt = Boolean(
    displayedFigure.prompt &&
      (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === "local"),
  );

  useEffect(() => {
    if (!figure.foil_image_url) {
      setShowFoilVersion(false);
    }
  }, [figure.foil_image_url]);

  useEffect(() => {
    setDownloadStatusByVariant(initialDownloadStatusByVariant);
  }, [figure.id, figure.image_url, figure.foil_image_url]);

  async function handleDownload(): Promise<void> {
    const downloadVariant = displayedVariant;
    const downloadStatus = downloadStatusByVariant[downloadVariant];

    if (downloadStatus.isComplete || downloadStatus.isDownloading) {
      return;
    }

    setVariantDownloadStatus(downloadVariant, {
      isComplete: false,
      isDownloading: true,
    });
    setDownloadError(null);

    try {
      const fileName = buildDownloadFileName(
        figure.display_number,
        downloadVariant,
      );
      const telegramDownloadResult = await requestTelegramDownload(
        getPublicFigureCardUrl(figure.id, downloadVariant),
        fileName,
      );

      if (telegramDownloadResult !== "unsupported") {
        setVariantDownloadStatus(downloadVariant, {
          isComplete: telegramDownloadResult !== "cancelled",
          isDownloading: false,
        });
        return;
      }

      triggerDownload(
        await downloadMyFigureCard(downloadVariant),
        fileName,
      );
      setVariantDownloadStatus(downloadVariant, {
        isComplete: true,
        isDownloading: false,
      });
    } catch (error) {
      clientLogger.error(
        "Failed to download figure card",
        { figureId: figure.id, variant: downloadVariant },
        error,
      );
      setVariantDownloadStatus(downloadVariant, {
        isComplete: false,
        isDownloading: false,
      });
      setDownloadError(
        "Не удалось скачать карточку. Обнови экран и попробуй ещё раз.",
      );
    } finally {
      setVariantDownloadStatus(downloadVariant, { isDownloading: false });
    }
  }

  function setVariantDownloadStatus(
    variant: FigureCardVariant,
    status: Partial<DownloadStatus>,
  ): void {
    setDownloadStatusByVariant((current) => ({
      ...current,
      [variant]: {
        ...current[variant],
        ...status,
      },
    }));
  }

  return (
    <PageShell>
      <GlassPanel className="game-panel figure-panel">
        <p className="brand-line">VLADBLOG COLLECTIBLES</p>
        <h1>Фигурка готова</h1>
        <div className="figure-result-card">
          <FigureMotionCard
            accent={displayedRarityStyle.accent}
            accent2={displayedRarityStyle.accent2}
            glow={displayedRarityStyle.glow}
            isFoil={displayedIsFoilRarity}
          >
            <FigureCard
              key={`${displayedFigure.rarity}-${displayedFigure.image_url ?? ""}`}
              figure={displayedFigure}
              modelProfileUrl={modelProfileUrl}
              modelUsername={modelUsername}
            />
          </FigureMotionCard>
        </div>
        {foilFigure && (
          <label className="foil-version-toggle">
            <span className="foil-version-label">Foil версия</span>
            <input
              className="foil-version-checkbox"
              type="checkbox"
              checked={showFoilVersion}
              onChange={(event) => setShowFoilVersion(event.target.checked)}
            />
            <span className="foil-version-switch" aria-hidden="true">
              <span className="foil-version-switch-thumb" />
            </span>
          </label>
        )}
        <p className="lead">
          {displayedFigure.display_number} уже в коллекции VladBlog Collectibles.
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
            <pre>{displayedFigure.prompt}</pre>
          </details>
        )}
      </GlassPanel>
    </PageShell>
  );
}

function getFoilFigure(figure: Figure): Figure | null {
  if (!figure.foil_image_url) {
    return null;
  }

  return {
    ...figure,
    rarity: figure.foil_rarity ?? `Foil ${figure.rarity}`,
    image_url: figure.foil_image_url,
    prompt: figure.foil_prompt ?? figure.prompt,
  };
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

function buildDownloadFileName(
  displayNumber: string,
  variant: FigureCardVariant = "normal",
): string {
  const normalizedNumber = displayNumber.replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]+/g, "");
  const variantSuffix = variant === "foil" ? "-foil" : "";
  return `vladblog-collectible-${normalizedNumber || "figure"}${variantSuffix}.png`;
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
