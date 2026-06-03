import { apiRequest } from "./client";
import { type FigureGenerationResponse, type GenerationJob } from "../types/figure";

export async function generateMyFigure(): Promise<FigureGenerationResponse> {
  return apiRequest<FigureGenerationResponse>("/figures/me/generate", {
    method: "POST",
  });
}

export async function getGenerationJob(jobId: string): Promise<GenerationJob> {
  return apiRequest<GenerationJob>(`/generation-jobs/${jobId}`);
}
