export type ClientLogLevel = "debug" | "info" | "warn" | "error" | "silent";
type WritableLogLevel = Exclude<ClientLogLevel, "silent">;
type LogLevelProvider = () => ClientLogLevel;

const DEFAULT_LOG_LEVEL: ClientLogLevel = "warn";
const LOG_LEVEL_PRIORITY: Record<ClientLogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 50,
};

export function normalizeClientLogLevel(
  value: string | undefined,
): ClientLogLevel {
  const level = value?.trim().toLowerCase();
  if (
    level === "debug" ||
    level === "info" ||
    level === "warn" ||
    level === "error" ||
    level === "silent"
  ) {
    return level;
  }
  return DEFAULT_LOG_LEVEL;
}

export function getClientLogLevel(): ClientLogLevel {
  return normalizeClientLogLevel(import.meta.env.VITE_LOG_LEVEL);
}

export function isLogLevelEnabled(
  messageLevel: WritableLogLevel,
  configuredLevel: ClientLogLevel = getClientLogLevel(),
): boolean {
  return (
    configuredLevel !== "silent" &&
    LOG_LEVEL_PRIORITY[messageLevel] >= LOG_LEVEL_PRIORITY[configuredLevel]
  );
}

export function createClientLogger(getLevel: LogLevelProvider = getClientLogLevel) {
  function write(
    level: WritableLogLevel,
    method: (...data: unknown[]) => void,
    message: string,
    context?: unknown,
    error?: unknown,
  ): void {
    if (!isLogLevelEnabled(level, getLevel())) {
      return;
    }

    const args: unknown[] = [message];
    if (context !== undefined) {
      args.push(context);
    }
    if (error !== undefined) {
      args.push(error);
    }
    method(...args);
  }

  return {
    debug: (message: string, context?: unknown) =>
      write("debug", console.debug, message, context),
    info: (message: string, context?: unknown) =>
      write("info", console.info, message, context),
    warn: (message: string, context?: unknown) =>
      write("warn", console.warn, message, context),
    error: (message: string, context?: unknown, error?: unknown) =>
      write("error", console.error, message, context, error),
  };
}

export const clientLogger = createClientLogger();
