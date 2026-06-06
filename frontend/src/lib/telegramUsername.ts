import { type UserResponse } from "../api/auth";

export function getTelegramUsernameLabel(user: UserResponse): string | null {
  const username = normalizeTelegramUsername(user.username);
  return username ? `@${username}` : null;
}

export function getTelegramProfileUrl(user: UserResponse): string | null {
  const username = normalizeTelegramUsername(user.username);
  return username ? `https://t.me/${username}` : null;
}

function normalizeTelegramUsername(username: string | null): string | null {
  const normalized = username?.trim().replace(/^@/, "");
  return normalized || null;
}
