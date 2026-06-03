import { apiRequest } from "./client";
import {
  type Figure,
  type FigurePresets,
  type FigurePresetsUpdate,
} from "../types/figure";

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
