import { useEffect, useState } from "react";

import { authDev, authTelegram, type UserResponse } from "./api/auth";
import { getApiBaseUrl, setAccessToken } from "./api/client";
import { CreateFigurePage } from "./pages/CreateFigurePage";
import { GenerationPage } from "./pages/GenerationPage";
import { MyFigurePage } from "./pages/MyFigurePage";
import { PhotoPage } from "./pages/PhotoPage";
import { PresetsPage } from "./pages/PresetsPage";
import { type Figure } from "./types/figure";

type AuthState =
  | { type: "loading" }
  | { type: "authorized"; user: UserResponse; figure: Figure | null }
  | { type: "dev" }
  | { type: "error"; message: string };

export default function App() {
  const [authState, setAuthState] = useState<AuthState>({ type: "loading" });
  const [view, setView] = useState<"figure" | "presets" | "photo" | "generation">(
    "figure",
  );

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.ready?.();

    const initData = webApp?.initData;
    if (!initData) {
      setAuthState({ type: "dev" });
      return;
    }

    let isActive = true;

    authTelegram(initData)
      .then((response) => {
        if (!isActive) {
          return;
        }
        setAccessToken(response.access_token);
        setAuthState({
          type: "authorized",
          user: response.user,
          figure: response.figure,
        });
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }
        setAuthState({
          type: "error",
          message:
            error instanceof Error ? error.message : "Telegram authorization failed",
        });
      });

    return () => {
      isActive = false;
    };
  }, []);

  if (authState.type === "authorized") {
    if (authState.figure && view === "presets") {
      return (
        <PresetsPage
          figure={authState.figure}
          onBack={() => setView("figure")}
          onSaved={(figure) => {
            setAuthState({ ...authState, figure });
            setView("figure");
          }}
        />
      );
    }

    if (authState.figure && view === "photo") {
      return (
        <PhotoPage
          figure={authState.figure}
          user={authState.user}
          onBack={() => setView("figure")}
          onSaved={(figure) => {
            setAuthState({ ...authState, figure });
            setView("figure");
          }}
        />
      );
    }

    if (authState.figure && view === "generation") {
      return (
        <GenerationPage
          onBack={() => setView("figure")}
          onGenerated={(figure) => {
            setAuthState({ ...authState, figure });
            setView("figure");
          }}
        />
      );
    }

    if (authState.figure) {
      return (
        <MyFigurePage
          figure={authState.figure}
          onConfigure={() => setView("presets")}
          onChoosePhoto={() => setView("photo")}
          onGenerate={() => setView("generation")}
        />
      );
    }

    return (
      <CreateFigurePage
        user={authState.user}
        onCreated={(figure) =>
          setAuthState({ ...authState, figure })
        }
      />
    );
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-content">
          <h1>Vladik Collectibles</h1>
          {authState.type === "loading" && <p>Authorizing...</p>}
          {authState.type === "dev" && (
            <>
              <p>
                Telegram initData не найден. Можно войти в локальный preview-режим.
              </p>
              <button
                className="primary-button"
                type="button"
                onClick={() => {
                  setAuthState({ type: "loading" });
                  authDev()
                    .then((response) => {
                      setAccessToken(response.access_token);
                      setAuthState({
                        type: "authorized",
                        user: response.user,
                        figure: response.figure,
                      });
                    })
                    .catch((error) => {
                      setAuthState({
                        type: "error",
                        message:
                          error instanceof Error
                            ? error.message
                            : "Local preview auth failed",
                      });
                    });
                }}
              >
                Войти в preview
              </button>
            </>
          )}
          {authState.type === "error" && <p>{authState.message}</p>}
          <p className="api-url">API URL: {getApiBaseUrl()}</p>
        </div>
      </section>
    </main>
  );
}
