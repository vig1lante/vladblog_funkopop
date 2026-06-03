import { useState } from "react";

import { createMyFigure } from "../api/figures";
import { type UserResponse } from "../api/auth";
import { type Figure } from "../types/figure";

type CreateFigurePageProps = {
  user: UserResponse;
  onCreated: (figure: Figure) => void;
};

type CreateState =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "error"; message: string };

export function CreateFigurePage({ user, onCreated }: CreateFigurePageProps) {
  const [state, setState] = useState<CreateState>({ type: "idle" });
  const displayName = user.first_name || user.username || `#${user.telegram_id}`;

  async function handleCreateFigure() {
    setState({ type: "loading" });

    try {
      const figure = await createMyFigure();
      onCreated(figure);
    } catch (error) {
      setState({
        type: "error",
        message:
          error instanceof Error ? error.message : "Не удалось создать фигурку",
      });
    }
  }

  return (
    <main className="page-shell game-shell">
      <section className="game-panel create-panel">
        <p className="brand-line">VLADIK COLLECTIBLES</p>
        <h1>У тебя пока нет коллекционной фигурки</h1>
        <p className="lead">
          Создай свою первую фигурку подписчика канала и получи уникальный номер.
        </p>
        <p className="player-line">Authorized as: {displayName}</p>
        <button
          className="primary-button"
          type="button"
          onClick={handleCreateFigure}
          disabled={state.type === "loading"}
        >
          {state.type === "loading" ? "Создаём фигурку..." : "Создать мою фигурку"}
        </button>
        <div className="status-line" aria-live="polite">
          {state.type === "error" && <span>{state.message}</span>}
        </div>
      </section>
    </main>
  );
}
