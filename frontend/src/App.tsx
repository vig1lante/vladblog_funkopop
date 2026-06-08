import { useCallback, useEffect, useState } from "react";

import { authDev, authTelegram, type AuthResponse, type UserResponse } from "./api/auth";
import { replaceSession } from "./api/client";
import { generateMyFigure } from "./api/generation";
import { createMyFigure, getMyFigure } from "./api/figures";
import { getFlowStep } from "./lib/flow";
import { clientLogger } from "./lib/logger";
import { prepareTelegramViewport } from "./lib/telegramViewport";
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
    prepareTelegramViewport(webApp);

    const initData = webApp?.initData;
    if (!initData) {
      clientLogger.info("Telegram initData missing, switching to preview auth");
      setAuthState({ type: "dev" });
      return;
    }

    let isActive = true;
    clientLogger.debug("Telegram auth started");

    authTelegram(initData)
      .then((response) => {
        if (!isActive) {
          return;
        }
        clientLogger.info("Telegram auth completed", {
          userId: response.user.id,
          telegramId: response.user.telegram_id,
          hasFigure: Boolean(response.figure),
        });
        applyAuthResponse(response);
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }
        clientLogger.warn("Telegram auth failed", {
          message: error instanceof Error ? error.message : String(error),
        });
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
      clientLogger.info("Figure creation completed");
      setWelcomeCompleted(true);
    } catch (error) {
      clientLogger.warn("Figure creation failed", {
        message: error instanceof Error ? error.message : String(error),
      });
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
      const response = await authDev();
      clientLogger.info("Preview auth completed", {
        userId: response.user.id,
        telegramId: response.user.telegram_id,
      });
      applyAuthResponse(response);
    } catch (error) {
      clientLogger.warn("Preview auth failed", {
        message: error instanceof Error ? error.message : String(error),
      });
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
      clientLogger.info("Figure generation start requested");
      const response = await generateMyFigure();
      updateFigure(response.figure);
      setActiveJobId(response.job.id);
      setForcedStep(null);
      clientLogger.info("Figure generation job accepted", {
        jobId: response.job.id,
        status: response.job.status,
      });
    } catch (error) {
      clientLogger.warn("Figure generation start failed", {
        message: error instanceof Error ? error.message : String(error),
      });
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
