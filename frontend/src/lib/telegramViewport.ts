type TelegramWebApp = NonNullable<NonNullable<Window["Telegram"]>["WebApp"]>;

export function prepareTelegramViewport(webApp?: TelegramWebApp): void {
  if (!webApp) {
    return;
  }

  webApp.ready?.();
  if (isTelegramVersionAtLeast(webApp.version, 7, 7)) {
    webApp.disableVerticalSwipes?.();
  }
  webApp.expand?.();

  if (
    webApp.isFullscreen ||
    !isTelegramVersionAtLeast(webApp.version, 8, 0)
  ) {
    return;
  }

  try {
    void Promise.resolve(webApp.requestFullscreen?.()).catch(() => {
      webApp.expand?.();
    });
  } catch {
    webApp.expand?.();
  }
}

function isTelegramVersionAtLeast(
  version: string | undefined,
  requiredMajor: number,
  requiredMinor: number,
): boolean {
  const [major = 0, minor = 0] = String(version ?? "")
    .split(".")
    .map(Number);

  if (!Number.isFinite(major) || !Number.isFinite(minor)) {
    return false;
  }

  return (
    major > requiredMajor ||
    (major === requiredMajor && minor >= requiredMinor)
  );
}
