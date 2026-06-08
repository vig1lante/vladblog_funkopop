import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";

import { type UserResponse } from "../api/auth";
import { updateMyFigurePresets } from "../api/figures";
import {
  getTelegramPhotoDebug,
  syncTelegramPhoto,
  type TelegramPhotoDebugResponse,
} from "../api/me";
import { uploadFigurePhoto } from "../api/uploads";
import { Button } from "../components/ui/Button";
import { ErrorMessage } from "../components/ui/ErrorMessage";
import { GlassPanel } from "../components/ui/GlassPanel";
import { PageShell } from "../components/ui/PageShell";
import { Spinner } from "../components/ui/Spinner";
import { StepIndicator } from "../components/ui/StepIndicator";
import {
  getPhotoTooLargeMessage,
  isPhotoTooLargeForQuickUpload,
} from "../lib/uploadLimits";
import { clientLogger } from "../lib/logger";
import { type Figure } from "../types/figure";

type PhotoPageProps = {
  figure: Figure;
  user: UserResponse;
  onUserUpdated: (user: UserResponse) => void;
  onFigureUpdated: (figure: Figure) => void;
  onSaved: (figure: Figure) => void;
};

export function PhotoPage({
  figure,
  user,
  onUserUpdated,
  onFigureUpdated,
  onSaved,
}: PhotoPageProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "ready" | "saving" | "uploading" | "syncing"
  >("ready");
  const [activeAction, setActiveAction] = useState<
    "continue" | "upload" | "none" | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [photoSyncAttempted, setPhotoSyncAttempted] = useState(false);
  const [debugInfo, setDebugInfo] = useState<TelegramPhotoDebugResponse | null>(
    null,
  );
  const syncAttemptedRef = useRef(false);
  const fileInputId = useId();
  const [fileInputVersion, setFileInputVersion] = useState(0);
  const oversizedPhotoMessage = getPhotoTooLargeMessage();
  const isLocalPreviewUser =
    user.telegram_id === 100000001 || user.username === "local_preview";
  const currentPhotoUrl = previewUrl || figure.source_photo_url || user.photo_url;
  const currentPhotoType =
    figure.source_photo_type === "uploaded" && figure.source_photo_url
      ? "uploaded"
      : user.photo_url
      ? "telegram_profile"
      : null;

  useEffect(() => {
    if (user.photo_url || syncAttemptedRef.current) {
      return;
    }
    if (isLocalPreviewUser) {
      syncAttemptedRef.current = true;
      setPhotoSyncAttempted(true);
      return;
    }

    let isActive = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 9000);
    syncAttemptedRef.current = true;
    setStatus("syncing");
    clientLogger.info("Telegram photo sync started", { userId: user.id });
    syncTelegramPhoto(controller.signal)
      .then((updatedUser) => {
        if (isActive) {
          clientLogger.info("Telegram photo sync completed", {
            userId: updatedUser.id,
            hasPhoto: Boolean(updatedUser.photo_url),
          });
          setPhotoSyncAttempted(true);
          setStatus("ready");
          onUserUpdated(updatedUser);
        }
      })
      .catch((error) => {
        if (isActive) {
          clientLogger.warn("Telegram photo sync failed", {
            userId: user.id,
            message: error instanceof Error ? error.message : String(error),
          });
          setPhotoSyncAttempted(true);
          setStatus("ready");
        }
      })
      .finally(() => {
        window.clearTimeout(timeout);
      });

    return () => {
      isActive = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [isLocalPreviewUser, onUserUpdated, user.photo_url]);

  async function continueWithCurrentPhoto() {
    if (status !== "ready") {
      return;
    }
    if (!currentPhotoType) {
      setErrorMessage("Сначала загрузи фото или выбери вариант без фото.");
      return;
    }

    setActiveAction("continue");
    setStatus("saving");
    setErrorMessage(null);

    try {
      const updatedFigure = await updateMyFigurePresets({
        source_photo_type: currentPhotoType,
      });
      clientLogger.info("Source photo choice saved", {
        figureId: updatedFigure.id,
        sourcePhotoType: updatedFigure.source_photo_type,
      });
      onSaved(updatedFigure);
    } catch (error) {
      clientLogger.warn("Source photo choice save failed", {
        sourcePhotoType: currentPhotoType,
        message: error instanceof Error ? error.message : String(error),
      });
      setStatus("ready");
      setActiveAction(null);
      setErrorMessage(
        error instanceof Error ? error.message : "Не удалось сохранить фото",
      );
    }
  }

  async function uploadSelectedPhoto(file: File) {
    if (status !== "ready") {
      return;
    }
    if (isPhotoTooLargeForQuickUpload(file)) {
      clientLogger.warn("Photo upload blocked locally", {
        reason: "too_large",
        sizeBytes: file.size,
      });
      setActiveAction(null);
      setStatus("ready");
      setErrorMessage(oversizedPhotoMessage);
      return;
    }

    setActiveAction("upload");
    setStatus("uploading");
    setErrorMessage(null);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    try {
      const updatedFigure = await uploadFigurePhoto(file);
      clientLogger.info("Photo upload completed", {
        figureId: updatedFigure.id,
        sizeBytes: file.size,
        contentType: file.type,
      });
      setPreviewUrl(updatedFigure.source_photo_url);
      onFigureUpdated(updatedFigure);
      setStatus("ready");
      setActiveAction(null);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      clientLogger.warn("Photo upload failed", {
        sizeBytes: file.size,
        contentType: file.type,
        message: error instanceof Error ? error.message : String(error),
      });
      setStatus("ready");
      setActiveAction(null);
      setErrorMessage(
        error instanceof Error ? error.message : "Не удалось загрузить фото",
      );
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function selectNoPhoto() {
    if (status !== "ready") {
      return;
    }
    setActiveAction("none");
    setStatus("saving");
    setErrorMessage(null);

    try {
      const updatedFigure = await updateMyFigurePresets({
        source_photo_type: "none",
      });
      clientLogger.info("No-photo mode saved", { figureId: updatedFigure.id });
      onSaved(updatedFigure);
    } catch (error) {
      clientLogger.warn("No-photo mode save failed", {
        message: error instanceof Error ? error.message : String(error),
      });
      setStatus("ready");
      setActiveAction(null);
      setErrorMessage(
        error instanceof Error ? error.message : "Не удалось выбрать режим без фото",
      );
    }
  }

  function refreshFileInput() {
    if (status === "ready") {
      setFileInputVersion((version) => version + 1);
    }
  }

  function openFileInputFromKeyboard(event: KeyboardEvent<HTMLLabelElement>) {
    if (status !== "ready" || !["Enter", " "].includes(event.key)) {
      return;
    }

    event.preventDefault();
    refreshFileInput();
    window.setTimeout(() => document.getElementById(fileInputId)?.click(), 0);
  }

  async function loadTelegramDebug() {
    try {
      setDebugInfo(await getTelegramPhotoDebug());
    } catch (error) {
      clientLogger.warn("Telegram photo debug load failed", {
        message: error instanceof Error ? error.message : String(error),
      });
      setErrorMessage(
        error instanceof Error ? error.message : "Не удалось проверить Telegram",
      );
    }
  }

  return (
    <PageShell>
      <GlassPanel className="game-panel photo-panel">
        <StepIndicator current={2} total={5} />
        <p className="brand-line">VLADBLOG COLLECTIBLES</p>
        <h1>Твоё фото</h1>
        <p className="lead">
          Если хочешь, можешь заменить его на свое лучшее из галереи. Но крайне
          желательно, чтобы фото было с одним человеком. Тобой;)
        </p>
        {errorMessage && (
          <ErrorMessage message={errorMessage} />
        )}

        <div className="photo-first-layout">
          <div className="photo-preview main-photo-preview">
            {currentPhotoUrl ? (
              <img alt="Фото для фигурки" src={currentPhotoUrl} />
            ) : (
              <span>VB</span>
            )}
          </div>
          {!currentPhotoUrl && photoSyncAttempted && (
            <p className="helper-text">
              {isLocalPreviewUser
                ? "В preview-режиме фото Telegram недоступно. Открой Mini App внутри Telegram или загрузи фото вручную."
                : "Не удалось получить фото из Telegram. Загрузи своё фото или создай фигурку без фото."}
            </p>
          )}
          {status === "syncing" && (
            <p className="helper-text inline-loader">
              <Spinner /> Проверяем фото Telegram...
            </p>
          )}
          <input
            key={fileInputVersion}
            accept="image/jpeg,image/png,image/webp"
            disabled={status !== "ready"}
            id={fileInputId}
            type="file"
            onChange={(event) => {
              const selectedFile = event.target.files?.[0];
              if (selectedFile) {
                uploadSelectedPhoto(selectedFile);
              }
              event.target.value = "";
            }}
          />
          <div className="actions-row">
            <Button
              disabled={!currentPhotoUrl || status !== "ready"}
              isLoading={activeAction === "continue"}
              loadingText="Сохраняем..."
              onClick={continueWithCurrentPhoto}
            >
              Продолжить с этим фото
            </Button>
            <label
              aria-disabled={status !== "ready"}
              className={`ui-button ui-button-secondary file-upload-control ${
                status !== "ready" ? "is-disabled" : ""
              }`.trim()}
              htmlFor={status === "ready" ? fileInputId : undefined}
              role="button"
              tabIndex={status === "ready" ? 0 : -1}
              onKeyDown={openFileInputFromKeyboard}
              onPointerDown={refreshFileInput}
            >
              {activeAction === "upload" && <Spinner />}
              <span>
                {activeAction === "upload" ? "Загружаем..." : "Загрузить другое фото"}
              </span>
            </label>
            <Button
              disabled={status !== "ready"}
              isLoading={activeAction === "none"}
              loadingText="Сохраняем..."
              variant="secondary"
              onClick={selectNoPhoto}
            >
              Создать без фото
            </Button>
          </div>
          {import.meta.env.DEV && (
            <details className="prompt-details">
              <summary>Технические детали фото</summary>
              <Button variant="secondary" onClick={loadTelegramDebug}>
                Проверить Telegram API
              </Button>
              {debugInfo && (
                <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
              )}
            </details>
          )}
        </div>
      </GlassPanel>
    </PageShell>
  );
}
