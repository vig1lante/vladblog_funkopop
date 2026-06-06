export type TelegramDownloadResult =
  | "unsupported"
  | "downloading"
  | "cancelled"
  | "opened";

type TelegramDownloadCallbackPayload =
  | boolean
  | {
      status?: "downloading" | "cancelled";
    };

export async function requestTelegramDownload(
  url: string,
  fileName: string,
): Promise<TelegramDownloadResult> {
  const webApp = globalThis.window?.Telegram?.WebApp;
  if (!webApp || !url.startsWith("https://")) {
    return "unsupported";
  }

  try {
    if (webApp.downloadFile) {
      return await new Promise<TelegramDownloadResult>((resolve) => {
        webApp.downloadFile?.(
          { url, file_name: fileName },
          (payload: TelegramDownloadCallbackPayload) => {
            resolve(normalizeTelegramDownloadResult(payload));
          },
        );
      });
    }

    if (webApp.openLink) {
      webApp.openLink(url, { try_instant_view: false });
      return "opened";
    }
  } catch {
    return "unsupported";
  }

  return "unsupported";
}

function normalizeTelegramDownloadResult(
  payload: TelegramDownloadCallbackPayload,
): TelegramDownloadResult {
  if (typeof payload === "boolean") {
    return payload ? "downloading" : "cancelled";
  }

  return payload.status === "downloading" ? "downloading" : "cancelled";
}
