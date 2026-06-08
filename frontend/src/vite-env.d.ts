/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly PUBLIC_BACKEND_URL?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_LOG_LEVEL?: string;
}

interface Window {
  Telegram?: {
    WebApp?: {
      initData?: string;
      downloadFile?: (
        params: { url: string; file_name: string },
        callback?: (
          result: boolean | { status?: "downloading" | "cancelled" },
        ) => void,
      ) => void;
      openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
      ready?: () => void;
    };
  };
}
