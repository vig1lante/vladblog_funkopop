import { type Figure } from "../types/figure";

export type FlowStep =
  | "welcome"
  | "photo"
  | "presets"
  | "ready"
  | "waiting"
  | "result";

export function getFlowStep(figure: Figure | null): FlowStep {
  if (!figure) {
    return "welcome";
  }

  if (
    figure.next_step === "completed" &&
    figure.status === "completed" &&
    figure.image_url
  ) {
    return "result";
  }

  if (figure.next_step === "generating") {
    return "waiting";
  }

  if (figure.next_step === "ready_to_generate" || figure.next_step === "failed") {
    return "ready";
  }

  if (figure.next_step === "presets") {
    return "presets";
  }

  if (figure.next_step === "photo") {
    return "photo";
  }

  return "welcome";
}
