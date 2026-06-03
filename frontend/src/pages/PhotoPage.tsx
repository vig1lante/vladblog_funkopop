import { useEffect, useState } from "react";

import { type UserResponse } from "../api/auth";
import { updateMyFigurePresets } from "../api/figures";
import { uploadFigurePhoto } from "../api/uploads";
import { type Figure } from "../types/figure";

type PhotoPageProps = {
  figure: Figure;
  user: UserResponse;
  onBack: () => void;
  onSaved: (figure: Figure) => void;
};

export function PhotoPage({ figure, user, onBack, onSaved }: PhotoPageProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"ready" | "saving">("ready");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  async function selectTelegramPhoto() {
    setStatus("saving");
    setErrorMessage(null);

    try {
      const updatedFigure = await updateMyFigurePresets({
        source_photo_type: "telegram_profile",
      });
      onSaved(updatedFigure);
    } catch (error) {
      setStatus("ready");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Не удалось выбрать фото Telegram",
      );
    }
  }

  async function uploadSelectedPhoto() {
    if (!file) {
      return;
    }

    setStatus("saving");
    setErrorMessage(null);

    try {
      const updatedFigure = await uploadFigurePhoto(file);
      onSaved(updatedFigure);
    } catch (error) {
      setStatus("ready");
      setErrorMessage(
        error instanceof Error ? error.message : "Не удалось загрузить фото",
      );
    }
  }

  async function selectNoPhoto() {
    setStatus("saving");
    setErrorMessage(null);

    try {
      const updatedFigure = await updateMyFigurePresets({
        source_photo_type: "none",
      });
      onSaved(updatedFigure);
    } catch (error) {
      setStatus("ready");
      setErrorMessage(
        error instanceof Error ? error.message : "Не удалось выбрать режим без фото",
      );
    }
  }

  return (
    <main className="page-shell game-shell">
      <section className="game-panel photo-panel">
        <p className="brand-line">VLADIK COLLECTIBLES</p>
        <h1>Выбери фото для фигурки</h1>
        <p className="helper-text">Фигурка {figure.display_number}</p>
        {errorMessage && <p className="error-text">{errorMessage}</p>}

        <div className="photo-options">
          <section className="photo-option">
            <div className="photo-preview">
              {user.photo_url ? (
                <img alt="Telegram profile" src={user.photo_url} />
              ) : (
                <span>Telegram не дал фото профиля</span>
              )}
            </div>
            <h2>Использовать фото Telegram</h2>
            <button
              className="secondary-button"
              disabled={!user.photo_url || status === "saving"}
              type="button"
              onClick={selectTelegramPhoto}
            >
              Выбрать Telegram photo
            </button>
          </section>

          <section className="photo-option">
            <div className="photo-preview">
              {previewUrl ? (
                <img alt="Выбранное фото" src={previewUrl} />
              ) : (
                <span>JPEG, PNG или WebP от 256×256</span>
              )}
            </div>
            <h2>Загрузить своё фото</h2>
            <input
              accept="image/jpeg,image/png,image/webp"
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <button
              className="primary-button"
              disabled={!file || status === "saving"}
              type="button"
              onClick={uploadSelectedPhoto}
            >
              {status === "saving" ? "Сохраняем..." : "Загрузить фото"}
            </button>
          </section>

          <section className="photo-option">
            <div className="photo-preview no-photo-preview">
              <span>Без исходного фото</span>
            </div>
            <h2>Создать без фото</h2>
            <button
              className="secondary-button"
              disabled={status === "saving"}
              type="button"
              onClick={selectNoPhoto}
            >
              Создать без фото
            </button>
          </section>
        </div>

        <button
          className="secondary-button"
          disabled={status === "saving"}
          type="button"
          onClick={onBack}
        >
          Назад
        </button>
      </section>
    </main>
  );
}
