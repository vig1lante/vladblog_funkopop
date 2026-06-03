import { apiRequest } from "./client";
import { type Figure } from "../types/figure";

export type UserResponse = {
  id: string;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
  language_code: string | null;
  is_premium: boolean;
  is_channel_member: boolean;
  created_at: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: "bearer";
  user: UserResponse;
  figure: Figure | null;
};

export async function authTelegram(initData: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/telegram", {
    method: "POST",
    body: { init_data: initData },
    withAuth: false,
  });
}

export async function authDev(): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/dev", {
    method: "POST",
    withAuth: false,
  });
}
