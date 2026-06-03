import { useEffect, useState } from "react";

import { generateMyFigure } from "../api/generation";
import { type Figure } from "../types/figure";

type GenerationPageProps = {
  onBack: () => void;
  onGenerated: (figure: Figure) => void;
};

const loadingLines = [
  "Собираем коробку...",
  "Добавляем редкость...",
  "Генерируем Funko Pop style фигурку...",
];

export function GenerationPage({ onBack, onGenerated }: GenerationPageProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLineIndex((current) => Math.min(current + 1, loadingLines.length - 1));
    }, 650);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let isActive = true;
    let redirectTimer: number | undefined;
    generateMyFigure()
      .then((response) => {
        if (isActive) {
          redirectTimer = window.setTimeout(() => {
            if (isActive) {
              onGenerated(response.figure);
            }
          }, 1200);
        }
      })
      .catch((reason) => {
        if (isActive) {
          setError(reason instanceof Error ? reason.message : "Generation failed");
        }
      });
    return () => {
      isActive = false;
      window.clearTimeout(redirectTimer);
    };
  }, [onGenerated]);

  return (
    <main className="page-shell game-shell">
      <section className="game-panel generation-panel">
        <p className="brand-line">VLADIK COLLECTIBLES</p>
        <h1>Генерация фигурки</h1>
        <div className="generation-status">
          {loadingLines.map((line, index) => (
            <div className={index <= lineIndex ? "active" : ""} key={line}>
              {line}
            </div>
          ))}
        </div>
        {error && (
          <>
            <p className="error-text">{error}</p>
            <button className="secondary-button" type="button" onClick={onBack}>
              Назад
            </button>
          </>
        )}
      </section>
    </main>
  );
}
