import { useEffect, useRef, useState } from "react";

import { generateMyFigure, getGenerationJob } from "../api/generation";
import { Button } from "../components/ui/Button";
import { ErrorMessage } from "../components/ui/ErrorMessage";
import { GlassPanel } from "../components/ui/GlassPanel";
import { PageShell } from "../components/ui/PageShell";
import { StepIndicator } from "../components/ui/StepIndicator";
import { type Figure, type GenerationJob } from "../types/figure";

type GenerationWaitingPageProps = {
  figure: Figure;
  initialJobId: string | null;
  onChoosePhoto: () => void;
  onCompleted: (figure: Figure) => void;
  onFigureUpdated: (figure: Figure) => void;
  refreshFigure: () => Promise<Figure>;
};

const friendlyGenerationError =
  "Не удалось сгенерировать фигурку. Попробуй другое фото или режим без фото.";

const waitingCopyLines = [
  "Собираем образ и сохраняем детали",
  "Подбираем позу для коллекционной полки",
  "Наводим мягкий блеск на упаковку",
  "Проверяем, чтобы фигурка выглядела как лимитка",
  "Почти готово, финальные штрихи уже внутри",
];

export function GenerationWaitingPage({
  figure,
  initialJobId,
  onChoosePhoto,
  onCompleted,
  onFigureUpdated,
  refreshFigure,
}: GenerationWaitingPageProps) {
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [jobId, setJobId] = useState<string | null>(initialJobId);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isStartingJob, setIsStartingJob] = useState(false);
  const [copyIndex, setCopyIndex] = useState(0);
  const startingRef = useRef(false);
  const completedRef = useRef(false);
  const onCompletedRef = useRef(onCompleted);
  const onFigureUpdatedRef = useRef(onFigureUpdated);
  const refreshFigureRef = useRef(refreshFigure);

  useEffect(() => {
    onCompletedRef.current = onCompleted;
    onFigureUpdatedRef.current = onFigureUpdated;
    refreshFigureRef.current = refreshFigure;
  }, [onCompleted, onFigureUpdated, refreshFigure]);

  useEffect(() => {
    if (error || job?.status === "completed" || job?.status === "failed") {
      return;
    }

    const timer = window.setInterval(() => {
      setCopyIndex((current) => (current + 1) % waitingCopyLines.length);
    }, 2600);
    return () => window.clearInterval(timer);
  }, [error, job?.status]);

  useEffect(() => {
    if (jobId || startingRef.current) {
      return;
    }

    let isActive = true;
    startingRef.current = true;
    setIsStartingJob(true);
    generateMyFigure()
      .then((response) => {
        if (!isActive) {
          return;
        }
        setJob(response.job);
        setJobId(response.job.id);
        onFigureUpdatedRef.current(response.figure);
      })
      .catch((reason) => {
        if (isActive) {
          setError(normalizeGenerationError(reason));
        }
      })
      .finally(() => {
        startingRef.current = false;
        if (isActive) {
          setIsStartingJob(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [jobId]);

  useEffect(() => {
    if (!jobId || completedRef.current) {
      return;
    }

    let isActive = true;
    let requestInFlight = false;
    const pollingJobId = jobId;

    async function poll() {
      if (requestInFlight || completedRef.current) {
        return;
      }
      requestInFlight = true;
      setIsChecking(true);
      try {
        const [updatedJob, updatedFigure] = await Promise.all([
          getGenerationJob(pollingJobId),
          refreshFigureRef.current(),
        ]);
        if (!isActive) {
          return;
        }
        setJob(updatedJob);
        onFigureUpdatedRef.current(updatedFigure);
        if (isCompleted(updatedJob, updatedFigure)) {
          completedRef.current = true;
          onCompletedRef.current(updatedFigure);
          return;
        }
        if (updatedJob.status === "failed") {
          setError(updatedJob.error_message || friendlyGenerationError);
        }
      } catch {
        if (isActive) {
          setError("Не удалось проверить статус генерации.");
        }
      } finally {
        requestInFlight = false;
        if (isActive) {
          setIsChecking(false);
        }
      }
    }

    poll();
    const timer = window.setInterval(poll, 2500);
    return () => {
      isActive = false;
      window.clearInterval(timer);
    };
  }, [jobId]);

  function retry() {
    if (startingRef.current || isChecking) {
      return;
    }
    completedRef.current = false;
    setError(null);
    setJob(null);
    setJobId(null);
    setCopyIndex(0);
  }

  const waitingCopy = getWaitingCopy(job?.status, copyIndex);

  return (
    <PageShell>
      <GlassPanel className="game-panel generation-panel">
        <StepIndicator current={5} total={5} />
        <p className="brand-line">VLADBLOG COLLECTIBLES</p>
        <h1>Создаём коллекционную фигурку</h1>
        {!error && (
          <div className="generation-waiting" aria-label="Статус создания">
            <div className="calm-loader" aria-hidden="true">
              <span className="generation-pulse-ring" />
              <span className="generation-pulse-ring generation-pulse-ring-delay" />
              <span className="collector-orbit collector-orbit-slow">
                <span className="collector-dot collector-dot-primary" />
              </span>
              <span className="collector-orbit collector-orbit-soft">
                <span className="collector-dot collector-dot-soft" />
              </span>
              <span className="collector-core">
                <span />
              </span>
            </div>
            <p
              key={waitingCopy}
              className="generation-waiting-copy"
              role="status"
              aria-live="polite"
            >
              {waitingCopy}
            </p>
          </div>
        )}
        {error && (
          <>
            <ErrorMessage message={error} />
            <div className="action-stack">
              <Button
                isLoading={isStartingJob}
                loadingText="Генерируем..."
                onClick={retry}
              >
                Попробовать снова
              </Button>
              <Button
                disabled={isStartingJob || isChecking}
                variant="secondary"
                onClick={onChoosePhoto}
              >
                Изменить фото
              </Button>
            </div>
          </>
        )}
      </GlassPanel>
    </PageShell>
  );
}

function getWaitingCopy(status: string | undefined, index: number): string {
  if (status === "failed") {
    return "Создание остановилось";
  }
  if (status === "completed") {
    return "Готовим результат";
  }
  return waitingCopyLines[index % waitingCopyLines.length];
}

function isCompleted(job: GenerationJob, figure: Figure): boolean {
  return (
    job.status === "completed" &&
    figure.status === "completed" &&
    Boolean(figure.image_url)
  );
}

function normalizeGenerationError(reason: unknown): string {
  if (reason instanceof Error && reason.message.includes("OPENAI_API_KEY")) {
    return reason.message;
  }
  return friendlyGenerationError;
}
