import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { horoscopeFacts } from "@mylunar/shared";
import { AppRoutes } from "../src/App";
import { api, type Horoscope, type Profile } from "../src/api";

type Handler = (init?: { method?: string; body?: unknown }) => unknown | Promise<unknown>;

/**
 * Giả lập API theo "METHOD /đường-dẫn" (bỏ query cho khớp, trừ khi khai báo kèm query).
 * Trả về danh sách lời gọi để test kiểm tra.
 */
export function mockApi(handlers: Record<string, Handler>) {
  const calls: { method: string; path: string; body?: unknown }[] = [];
  vi.mocked(api).mockImplementation(async (path: string, init: { method?: string; body?: unknown } = {}) => {
    const method = init.method ?? "GET";
    calls.push({ method, path, body: init.body });
    const h = handlers[`${method} ${path}`] ?? handlers[`${method} ${path.split("?")[0]}`];
    if (!h) throw new Error(`Chưa giả lập ${method} ${path}`);
    return (await h(init)) as never;
  });
  return calls;
}

export function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

const birth = { birthDate: "1990-03-01", birthTime: "08:30", gender: "male" as const };
export const profile: Profile = { id: 1, name: "Anh", ...birth };

/** Đặt sẵn hồ sơ trên "máy" (localStorage) như người dùng đã nhập */
export function seedProfiles(list: Profile[] = [profile]) {
  localStorage.setItem("mlc.profiles", JSON.stringify(list));
}

export function horoscope(date: string, p: Profile = profile): Horoscope {
  return {
    date,
    facts: horoscopeFacts(p, date),
    reading: {
      score: 4,
      summary: `Tóm tắt ngày ${date}`,
      aspects: [
        { key: "work", score: 4, text: "Dễ được ghi nhận." },
        { key: "money", score: 3, text: "Thu chi ổn định." },
        { key: "love", score: 5, text: "Vui vẻ." },
        { key: "health", score: 2, text: "Nên ngủ sớm." },
      ],
      goodFor: ["Gặp đối tác"],
      avoid: ["Tranh cãi"],
      advice: "Giữ bình tĩnh.",
    },
    model: "fake",
    createdAt: "2026-11-17T03:00:00.000Z",
  };
}

export function baseHandlers(passwordRequired = false): Record<string, Handler> {
  return {
    "GET /config": () => ({ passwordRequired, aiEnabled: true }),
  };
}

export function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
