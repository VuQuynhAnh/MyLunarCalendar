import type { Horoscope, Profile } from "../api";
import { KEYS, load, save } from "./storage";
import { addDays } from "./calendar";

/**
 * Tử vi đã xem, lưu trên máy để mở lại không gọi AI lần nữa (HORO-UC01/BR-5). Khoá gồm cả ngày giờ
 * sinh và giới tính: sửa các ô này thì tự xem lại; đổi tên thì giữ bản cũ.
 */
type Store = Record<string, Horoscope>;

const keyOf = (p: Profile, date: string) => `${p.id}|${p.birthDate}|${p.birthTime ?? ""}|${p.gender}|${date}`;

export function cachedReading(p: Profile, date: string): Horoscope | undefined {
  return load<Store>(KEYS.readings, {})[keyOf(p, date)];
}

/** Lưu một bản; bỏ các bản cũ hơn khoảng xem được (31 ngày) để không đầy bộ nhớ trình duyệt */
export function saveReading(p: Profile, h: Horoscope, today: string): void {
  const oldest = addDays(today, -31);
  const store = Object.fromEntries(Object.entries(load<Store>(KEYS.readings, {})).filter(([, v]) => v.date >= oldest));
  store[keyOf(p, h.date)] = h;
  save(KEYS.readings, store);
}

/** Xoá mọi bản của một hồ sơ (khi xoá hồ sơ) */
export function forgetReadings(profileId: number): void {
  const store = load<Store>(KEYS.readings, {});
  save(KEYS.readings, Object.fromEntries(Object.entries(store).filter(([k]) => !k.startsWith(`${profileId}|`))));
}
