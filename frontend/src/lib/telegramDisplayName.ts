import { type UserResponse } from "../api/auth";

export function getTelegramDisplayName(user: UserResponse): string {
  const fullName = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (fullName) {
    return fullName;
  }
  return user.username ? `@${user.username}` : "Имя не найдено";
}
