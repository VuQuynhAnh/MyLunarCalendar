import { holidaysOf, jdFromDate, jdToDate, solarToLunar, vnDate } from "@mylunar/shared";

export const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const WEEKDAY_NAMES = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

export const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
export const parseYmd = (s: string) => s.split("-").map(Number) as [number, number, number];

/** "Thứ Ba, 17/11/2026" */
export function longDate(date: string): string {
  const [y, m, d] = parseYmd(date);
  // Số ngày Julius + 1 chia 7 ra thứ trong tuần (0 = Chủ nhật)
  return `${WEEKDAY_NAMES[(jdFromDate(d, m, y) + 1) % 7]}, ${pad(d)}/${pad(m)}/${y}`;
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = parseYmd(date);
  const s = jdToDate(jdFromDate(d, m, y) + n);
  return ymd(s.year, s.month, s.day);
}

export interface Cell {
  date: string;
  day: number;
  inMonth: boolean;
  /** Ngày âm hiện trong ô: "8"; mùng 1 thì kèm tháng "1/10", tháng nhuận "1/6n" */
  lunarText: string;
  lunarFirst: boolean;
  holiday: { name: string; off: boolean } | null;
  sunday: boolean;
}

/** 6 tuần (42 ô) của một tháng dương, tuần bắt đầu thứ Hai như lịch treo tường Việt Nam */
export function monthGrid(year: number, month: number): Cell[] {
  const first = jdFromDate(1, month, year);
  // (jd + 1) % 7: 0 = Chủ nhật; lùi về thứ Hai gần nhất
  const start = first - (((first + 1) % 7) + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => {
    const jd = start + i;
    const s = jdToDate(jd);
    const lunar = solarToLunar(s.day, s.month, s.year);
    const holidays = holidaysOf(s.day, s.month, s.year, lunar);
    // Ô nhỏ chỉ hiện một tên lễ; ưu tiên ngày nghỉ
    const holiday = holidays.find((h) => h.off) ?? holidays[0] ?? null;
    return {
      date: ymd(s.year, s.month, s.day),
      day: s.day,
      inMonth: s.month === month,
      lunarText: lunar.day === 1 ? `${lunar.day}/${lunar.month}${lunar.leap ? "n" : ""}` : String(lunar.day),
      lunarFirst: lunar.day === 1 || lunar.day === 15,
      holiday: holiday ? { name: holiday.name, off: holiday.off } : null,
      sunday: (jd + 1) % 7 === 0,
    };
  });
}

export const today = () => vnDate();
