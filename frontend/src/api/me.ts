import { type UserResponse } from "./auth";
import { apiRequest } from "./client";

export type TelegramPhotoDebugResponse = {
  telegram_id: number;
  stored_user_photo_url: boolean;
  status: string;
  message?: string;
  get_user_profile_photos?: {
    ok?: boolean;
    description?: string;
    total_count?: number;
    photo_sets_count?: number;
    first_file_id_present?: boolean;
  } | null;
  get_file?: {
    ok?: boolean;
    description?: string;
    file_path_present?: boolean;
  } | null;
};

export async function getMe(): Promise<UserResponse> {
  return apiRequest<UserResponse>("/me");
}

export async function syncTelegramPhoto(signal?: AbortSignal): Promise<UserResponse> {
  return apiRequest<UserResponse>("/me/sync-telegram-photo", {
    method: "POST",
    signal,
  });
}

export async function getTelegramPhotoDebug(): Promise<TelegramPhotoDebugResponse> {
  return apiRequest<TelegramPhotoDebugResponse>("/me/telegram-photo-debug");
}
