import { RarityBadge } from "./RarityBadge";
import { type Figure } from "../types/figure";

type FigureCardProps = {
  figure: Figure;
};

export function FigureCard({ figure }: FigureCardProps) {
  return (
    <article className="figure-card">
      {figure.image_url ? (
        <img className="figure-image" alt="Готовая фигурка" src={figure.image_url} />
      ) : (
        <div className="figure-image-placeholder">
          <span>Здесь скоро появится твоя AI Funko Pop фигурка</span>
        </div>
      )}
      <div className="figure-card-body">
        <div className="figure-number">{figure.display_number}</div>
        <RarityBadge rarity={figure.rarity} />
        <div className="figure-status">Status: {figure.status}</div>
        <dl className="figure-presets">
          <div>
            <dt>Цвет</dt>
            <dd>{figure.selected_color ?? "Не выбран"}</dd>
          </div>
          <div>
            <dt>Вайб</dt>
            <dd>{figure.selected_vibe ?? "Не выбран"}</dd>
          </div>
          <div>
            <dt>Аксессуар</dt>
            <dd>{figure.selected_accessory ?? "Не выбран"}</dd>
          </div>
          <div>
            <dt>Фон</dt>
            <dd>{figure.selected_background ?? "Не выбран"}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
