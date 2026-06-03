import { type UserResponse } from "./auth";
import { apiRequest } from "./client";

export async function getMe(): Promise<UserResponse> {
  return apiRequest<UserResponse>("/me");
}
