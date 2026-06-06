import { type Figure } from "../types/figure";
import {
  ApiError,
  getAccessToken,
  getApiBaseUrl,
  normalizeErrorMessage,
} from "./client";

export async function uploadFigurePhoto(file: File): Promise<Figure> {
  const formData = new FormData();
  formData.set("file", file);

  const headers = new Headers();
  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${getApiBaseUrl()}/uploads/figure-photo`, {
    method: "POST",
    headers,
    body: formData,
  });
  const data = await parseJson(response);

  if (!response.ok) {
    const requestId = response.headers.get("x-request-id");
    if (import.meta.env.DEV) {
      console.warn("API upload failed", {
        path: "/uploads/figure-photo",
        method: "POST",
        status: response.status,
        requestId,
        data,
      });
    }
    throw new ApiError(
      getErrorMessage(data, response.status),
      response.status,
      data,
      requestId,
    );
  }

  return data as Figure;
}

async function parseJson(response: Response): Promise<unknown> {
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

function getErrorMessage(data: unknown, status: number): string {
  if (typeof data === "object" && data !== null && "detail" in data) {
    const detail = (data as { detail: unknown }).detail;
    if (typeof detail === "string") {
      return normalizeErrorMessage(detail);
    }
  }

  return `API request failed with status ${status}`;
}
