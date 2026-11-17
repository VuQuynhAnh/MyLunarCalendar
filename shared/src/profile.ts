import type { BirthInfo, Gender } from "./tuvi";

/** Mỗi máy tối đa ngần này hồ sơ (bản thân và người nhà) */
export const MAX_PROFILES = 10;
export const MAX_NAME = 50;
/** Lịch âm tính đúng từ 1900; Tết 1900 là 31/01/1900 */
export const MIN_BIRTH_DATE = "1900-01-31";

/** Hồ sơ xem tử vi: tên gọi + ngày giờ sinh + giới tính */
export interface ProfileInput extends BirthInfo {
  name: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Ngày "YYYY-MM-DD" có thật (không phải 31/02) */
export function isRealDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m! - 1 && dt.getUTCDate() === d;
}

export type ProfileCheck = { ok: true; value: ProfileInput } | { ok: false; fields: Record<string, string> };

/**
 * Kiểm hồ sơ (HORO-UC01/BR-1). Web kiểm trước khi lưu trên máy, server kiểm lại số liệu gửi lên
 * trước khi tính tử vi. Lỗi trả theo từng ô.
 */
export function checkProfile(raw: unknown, today: string): ProfileCheck {
  const b = (raw ?? {}) as Record<string, unknown>;
  const fields: Record<string, string> = {};
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) fields.name = "Vui lòng nhập tên";
  else if (name.length > MAX_NAME) fields.name = `Tên tối đa ${MAX_NAME} ký tự`;
  const birthDate = typeof b.birthDate === "string" ? b.birthDate : "";
  if (!isRealDate(birthDate)) fields.birthDate = "Ngày sinh không hợp lệ";
  else if (birthDate < MIN_BIRTH_DATE || birthDate > today) fields.birthDate = "Ngày sinh phải từ 31/01/1900 đến hôm nay";
  const birthTime = typeof b.birthTime === "string" && b.birthTime !== "" ? b.birthTime : null;
  if (birthTime !== null && !TIME_RE.test(birthTime)) fields.birthTime = "Giờ sinh không hợp lệ";
  const gender = b.gender;
  if (gender !== "male" && gender !== "female") fields.gender = "Vui lòng chọn giới tính";
  if (Object.keys(fields).length) return { ok: false, fields };
  return { ok: true, value: { name, birthDate, birthTime, gender: gender as Gender } };
}
