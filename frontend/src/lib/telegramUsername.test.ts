import { describe, expect, it } from "vitest";

import {
  getTelegramProfileUrl,
  getTelegramUsernameLabel,
} from "./telegramUsername";
import { type UserResponse } from "../api/auth";

function makeUser(username: string | null): UserResponse {
  return {
    id: "user-id",
    telegram_id: 123,
    username,
    first_name: "Vlad",
    last_name: "Blog",
    photo_url: null,
    language_code: "ru",
    is_premium: false,
    is_channel_member: true,
    created_at: "2026-06-06T00:00:00Z",
  };
}

describe("telegram username helpers", () => {
  it("formats username as a public handle", () => {
    expect(getTelegramUsernameLabel(makeUser("vladblog"))).toBe("@vladblog");
  });

  it("builds a t.me profile link from username", () => {
    expect(getTelegramProfileUrl(makeUser("vladblog"))).toBe(
      "https://t.me/vladblog",
    );
  });

  it("returns null when Telegram username is missing", () => {
    expect(getTelegramUsernameLabel(makeUser(null))).toBeNull();
    expect(getTelegramProfileUrl(makeUser(null))).toBeNull();
  });
});
