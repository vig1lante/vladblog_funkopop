import { type CSSProperties, useState } from "react";

import { RarityBadge } from "./RarityBadge";
import { getApprovedRarityStyle } from "../lib/approvedRarityStyles";
import { getPresetLabel } from "../lib/presetLabels";
import { getRarityDropRateLabel } from "../lib/rarityDropRates";
import { type Figure } from "../types/figure";

type FigureCardProps = {
  figure: Figure;
  modelProfileUrl?: string | null;
  modelUsername?: string | null;
};

export function FigureCard({
  figure,
  modelProfileUrl,
  modelUsername,
}: FigureCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(figure.image_url && !imageFailed);
  const rarityStyle = getApprovedRarityStyle(figure.rarity);
  const isFoilRarity = rarityStyle.power.startsWith("foil");
  const cardStyle = {
    "--style-accent": rarityStyle.accent,
    "--style-accent-2": rarityStyle.accent2,
    "--style-glow": rarityStyle.glow,
  } as CSSProperties;

  return (
    <article
      className={`figure-card figure-rarity-card rarity-style-${rarityStyle.shape} rarity-power-${rarityStyle.power}`}
      style={cardStyle}
    >
      <div className="figure-image-stage">
        {showImage ? (
          <>
            {isFoilRarity && (
              <img
                aria-hidden="true"
                className="figure-image figure-foil-underlay"
                alt=""
                src={figure.image_url ?? ""}
              />
            )}
            <img
              className="figure-image"
              alt="Готовая фигурка"
              src={figure.image_url ?? ""}
              onError={() => setImageFailed(true)}
            />
          </>
        ) : (
          <div className="figure-image-placeholder">
            <span>
              {figure.image_url
                ? "Изображение готово, но не загрузилось. Попробуй обновить экран."
                : "Здесь скоро появится твоя AI Funko Pop фигурка"}
            </span>
          </div>
        )}
      </div>
      <div className="figure-card-body">
        <div className="figure-number">{figure.display_number}</div>
        <RarityBadge rarity={figure.rarity} />
        <dl className="figure-presets">
          <div>
            <dt>Модель</dt>
            <dd>
              {modelUsername && modelProfileUrl ? (
                <a
                  href={modelProfileUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {modelUsername}
                </a>
              ) : (
                "Юзернейм не указан"
              )}
            </dd>
          </div>
          <div>
            <dt>Редкость</dt>
            <dd>{getRarityDropRateLabel(figure.rarity)}</dd>
          </div>
          <div>
            <dt>Вайб</dt>
            <dd>{getPresetLabel(figure.selected_vibe)}</dd>
          </div>
          <div>
            <dt>Аксессуар</dt>
            <dd>{getPresetLabel(figure.selected_accessory)}</dd>
          </div>
          <div>
            <dt>Фон</dt>
            <dd>{getPresetLabel(figure.selected_background)}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
