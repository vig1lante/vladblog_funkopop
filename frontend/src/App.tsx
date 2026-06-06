import { useCallback, useEffect, useState } from "react";

import { authDev, authTelegram, type AuthResponse, type UserResponse } from "./api/auth";
import { replaceSession } from "./api/client";
import { generateMyFigure } from "./api/generation";
import { createMyFigure, getMyFigure } from "./api/figures";
import { getFlowStep } from "./lib/flow";
import { GenerationReadyPage } from "./pages/GenerationReadyPage";
import { GenerationWaitingPage } from "./pages/GenerationWaitingPage";
import { MyFigurePage } from "./pages/MyFigurePage";
import { PhotoPage } from "./pages/PhotoPage";
import { PresetsPage } from "./pages/PresetsPage";
import { WelcomePage } from "./pages/WelcomePage";
import { Button } from "./components/ui/Button";
import { ErrorMessage } from "./components/ui/ErrorMessage";
import { GlassPanel } from "./components/ui/GlassPanel";
import { PageShell } from "./components/ui/PageShell";
import { Spinner } from "./components/ui/Spinner";
import { type Figure } from "./types/figure";

type AuthState =
  | { type: "loading" }
  | { type: "authorized"; user: UserResponse; figure: Figure | null }
  | { type: "dev" }
  | { type: "error"; message: string };

export default function App() {
  const [authState, setAuthState] = useState<AuthState>({ type: "loading" });
  const [isCreatingFigure, setIsCreatingFigure] = useState(false);
  const [isStartingGeneration, setIsStartingGeneration] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [welcomeError, setWelcomeError] = useState<string | null>(null);
  const [forcedStep, setForcedStep] = useState<"photo" | "presets" | null>(null);
  const [welcomeCompleted, setWelcomeCompleted] = useState(false);
  const [isDevAuthenticating, setIsDevAuthenticating] = useState(false);

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
        applyAuthResponse(response);
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

  function applyAuthResponse(response: AuthResponse) {
    replaceSession(response.access_token, response.user.telegram_id);
    setAuthState({
      type: "authorized",
      user: response.user,
      figure: response.figure,
    });
    setActiveJobId(null);
    setForcedStep(null);
    setWelcomeCompleted(false);
    setWelcomeError(null);
  }

  const refreshFigure = useCallback(async () => {
    const figure = await getMyFigure();
    setAuthState((current) =>
      current.type === "authorized" ? { ...current, figure } : current,
    );
    return figure;
  }, []);

  const updateFigure = useCallback((figure: Figure) => {
    setAuthState((current) =>
      current.type === "authorized" ? { ...current, figure } : current,
    );
  }, []);

  const updateUser = useCallback((user: UserResponse) => {
    setAuthState((current) =>
      current.type === "authorized" ? { ...current, user } : current,
    );
  }, []);

  async function continueFromWelcome() {
    if (authState.type !== "authorized" || isCreatingFigure) {
      return;
    }
    if (authState.figure) {
      setWelcomeCompleted(true);
      return;
    }

    setIsCreatingFigure(true);
    setWelcomeError(null);
    try {
      updateFigure(await createMyFigure());
      setWelcomeCompleted(true);
    } catch (error) {
      setWelcomeError(
        error instanceof Error ? error.message : "Не удалось создать фигурку",
      );
    } finally {
      setIsCreatingFigure(false);
    }
  }

  async function enterPreviewMode() {
    if (isDevAuthenticating) {
      return;
    }
    setIsDevAuthenticating(true);
    setAuthState({ type: "loading" });
    try {
      applyAuthResponse(await authDev());
    } catch (error) {
      setAuthState({
        type: "error",
        message:
          error instanceof Error ? error.message : "Не удалось войти в preview",
      });
    } finally {
      setIsDevAuthenticating(false);
    }
  }

  async function startGeneration() {
    if (isStartingGeneration) {
      return;
    }
    setIsStartingGeneration(true);
    setGenerationError(null);
    try {
      const response = await generateMyFigure();
      updateFigure(response.figure);
      setActiveJobId(response.job.id);
      setForcedStep(null);
    } catch (error) {
      setGenerationError(
        error instanceof Error
          ? error.message
          : "Не удалось сгенерировать фигурку",
      );
    } finally {
      setIsStartingGeneration(false);
    }
  }

  if (authState.type === "authorized") {
    const resolvedStep = getFlowStep(authState.figure);
    const step = activeJobId
      ? "waiting"
      : !welcomeCompleted && resolvedStep !== "result"
      ? "welcome"
      : forcedStep ?? resolvedStep;

    if (step === "photo" && authState.figure) {
      return (
        <PhotoPage
          figure={authState.figure}
          user={authState.user}
          onUserUpdated={updateUser}
          onFigureUpdated={(figure) => {
            updateFigure(figure);
            setForcedStep("photo");
          }}
          onSaved={(figure) => {
            updateFigure(figure);
            setForcedStep(null);
          }}
        />
      );
    }

    if (step === "presets" && authState.figure) {
      return (
        <PresetsPage
          figure={authState.figure}
          user={authState.user}
          onBack={() => setForcedStep("photo")}
          onSaved={(figure) => {
            updateFigure(figure);
            setForcedStep(null);
          }}
        />
      );
    }

    if (step === "ready" && authState.figure) {
      return (
        <GenerationReadyPage
          figure={authState.figure}
          user={authState.user}
          isStarting={isStartingGeneration}
          errorMessage={generationError}
          onBack={() => setForcedStep("presets")}
          onStart={startGeneration}
        />
      );
    }

    if (step === "waiting" && authState.figure) {
      return (
        <GenerationWaitingPage
          figure={authState.figure}
          initialJobId={activeJobId}
          onChoosePhoto={() => {
            setActiveJobId(null);
            setForcedStep("photo");
          }}
          onCompleted={(figure) => {
            setActiveJobId(null);
            updateFigure(figure);
          }}
          onFigureUpdated={updateFigure}
          refreshFigure={refreshFigure}
        />
      );
    }

    if (step === "result" && authState.figure) {
      return <MyFigurePage figure={authState.figure} user={authState.user} />;
    }

    return (
      <WelcomePage
        user={authState.user}
        isLoading={isCreatingFigure}
        errorMessage={welcomeError}
        onContinue={continueFromWelcome}
      />
    );
  }

  return (
    <PageShell>
      <GlassPanel className="game-panel">
        <div className="hero-content">
          <p className="brand-line">VLADBLOG COLLECTIBLES</p>
          <h1>VladBlog Collectibles</h1>
          {authState.type === "loading" && (
            <p className="helper-text inline-loader">
              <Spinner /> Проверяем Telegram-сессию...
            </p>
          )}
          {authState.type === "dev" && (
            <>
              <p>
                Telegram-сессия не найдена. Для локальной проверки можно открыть
                аккуратный preview-режим.
              </p>
              <Button
                isLoading={isDevAuthenticating}
                loadingText="Входим..."
                onClick={enterPreviewMode}
              >
                Войти в preview
              </Button>
            </>
          )}
          {authState.type === "error" && (
            <ErrorMessage
              message="Не удалось авторизоваться. Попробуй открыть Mini App заново."
              details={authState.message}
              action={
                <Button
                  isLoading={isDevAuthenticating}
                  loadingText="Проверяем..."
                  onClick={enterPreviewMode}
                >
                  Войти в preview
                </Button>
              }
            />
          )}
        </div>
      </GlassPanel>
    </PageShell>
  );
}
