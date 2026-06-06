import {
  ApiError,
  apiRequest,
  clearAccessToken,
  getAccessToken,
  getApiBaseUrl,
  normalizeErrorMessage,
} from "./client";
import {
  type Figure,
  type FigurePresets,
  type FigurePresetsUpdate,
} from "../types/figure";

export type FigureCardVariant = "normal" | "foil";

export async function getMyFigure(): Promise<Figure> {
  return apiRequest<Figure>("/figures/me");
}

export async function createMyFigure(): Promise<Figure> {
  return apiRequest<Figure>("/figures/me", { method: "POST" });
}

export async function getFigurePresets(): Promise<FigurePresets> {
  return apiRequest<FigurePresets>("/figures/presets", { withAuth: false });
}

export async function updateMyFigurePresets(
  presets: FigurePresetsUpdate,
): Promise<Figure> {
  return apiRequest<Figure>("/figures/me/presets", {
    method: "PATCH",
    body: presets,
  });
}

export async function downloadMyFigureCard(
  variant: FigureCardVariant = "normal",
): Promise<Blob> {
  const headers = new Headers();
  const token = getAccessToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(
    `${getApiBaseUrl()}/figures/me/card.png${getCardVariantQuery(variant)}`,
    {
      headers,
    },
  );

  if (!response.ok) {
    const data = await parseDownloadError(response);
    const requestId = response.headers.get("x-request-id");
    if (response.status === 401) {
      clearAccessToken();
    }
    throw new ApiError(
      getDownloadErrorMessage(data, response.status),
      response.status,
      data,
      requestId,
    );
  }

  return response.blob();
}

export function getPublicFigureCardUrl(
  figureId: string,
  variant: FigureCardVariant = "normal",
): string {
  return (
    `${getApiBaseUrl()}/figures/${encodeURIComponent(figureId)}/card.png` +
    getCardVariantQuery(variant)
  );
}

function getCardVariantQuery(variant: FigureCardVariant): string {
  return variant === "foil" ? "?variant=foil" : "";
}

async function parseDownloadError(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function getDownloadErrorMessage(data: unknown, status: number): string {
  if (typeof data === "object" && data !== null && "detail" in data) {
    const detail = (data as { detail: unknown }).detail;
    if (typeof detail === "string") {
      return normalizeErrorMessage(detail);
    }
  }

  return `API request failed with status ${status}`;
}
