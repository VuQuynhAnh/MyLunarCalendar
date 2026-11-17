import type { HoroscopeFacts, ProfileInput, birthFacts } from "@mylunar/shared";
import { KEYS, load, remove, save } from "./lib/storage";

/** Lỗi từ server: thông báo tiếng Việt + lỗi theo từng ô của form. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

// Mật khẩu chung (HORO-UC01/BR-6) nhớ trên máy, gửi kèm mọi lời gọi API
let password: string | null = load<string | null>(KEYS.password, null);
let onUnauthorized: (() => void) | null = null;

export const hasPassword = () => password !== null;
export function setPassword(p: string): void {
  password = p;
  save(KEYS.password, p);
}
/** Trang chính đăng ký để hiện lại màn nhập mật khẩu khi server báo sai */
export function handleUnauthorized(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (password !== null) headers["x-app-password"] = password;
  const res = await fetch(`/api${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    // Mật khẩu đổi trên server hoặc nhập sai: quên mật khẩu cũ, hỏi lại
    password = null;
    remove(KEYS.password);
    onUnauthorized?.();
  }
  if (!res.ok) throw new ApiError(res.status, data.error ?? "Có lỗi xảy ra, vui lòng thử lại", data.fields ?? {});
  return data as T;
}

/** Hồ sơ xem tử vi, lưu trên máy */
export interface Profile extends ProfileInput {
  id: number;
}
export type ProfileFacts = ReturnType<typeof birthFacts>;

export type Score = 1 | 2 | 3 | 4 | 5;

/** Tử vi một ngày (HORO-UC01), server trả về và web lưu lại trên máy */
export interface Horoscope {
  date: string;
  facts: HoroscopeFacts;
  reading: {
    score: Score;
    summary: string;
    aspects: { key: "work" | "money" | "love" | "health"; score: Score; text: string }[];
    goodFor: string[];
    avoid: string[];
    advice: string;
  };
  model: string;
  createdAt: string;
}
