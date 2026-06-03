import { useState } from "react";

import { type UserResponse } from "../api/auth";
import { getMe } from "../api/me";

type MeState =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; user: UserResponse }
  | { type: "error"; message: string };

type HomePageProps = {
  user: UserResponse;
};

export function HomePage({ user }: HomePageProps) {
  const [meState, setMeState] = useState<MeState>({ type: "idle" });

  async function handleCheckMe() {
    setMeState({ type: "loading" });

    try {
      const result = await getMe();
      setMeState({ type: "success", user: result });
    } catch (error) {
      setMeState({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to check /me",
      });
    }
  }

  const displayName = user.first_name || user.username || `#${user.telegram_id}`;

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-content">
          <h1>Vladik Collectibles</h1>
          <p>Authorized as: {displayName}</p>
          <p>Telegram ID: {user.telegram_id}</p>
          <button
            className="primary-button"
            type="button"
            onClick={handleCheckMe}
            disabled={meState.type === "loading"}
          >
            {meState.type === "loading" ? "Checking..." : "Check /me"}
          </button>

          <div className="status-line" aria-live="polite">
            {meState.type === "success" && (
              <span>Current user: {meState.user.telegram_id}</span>
            )}
            {meState.type === "error" && <span>{meState.message}</span>}
          </div>
        </div>
      </section>
    </main>
  );
}
