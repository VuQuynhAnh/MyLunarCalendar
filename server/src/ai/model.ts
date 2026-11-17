import type { HoroscopeFacts } from "@mylunar/shared";
import { HttpError } from "../http";

/** Lỗi gọi AI: hết lượt miễn phí, quá tải tạm thời, hay lỗi khác (trả sai định dạng…) */
export class AiError extends Error {
  constructor(
    public kind: "quota" | "busy" | "failed",
    message: string = kind,
  ) {
    super(message);
  }
}

export type Score = 1 | 2 | 3 | 4 | 5;

/** Bài tử vi một ngày do AI viết, dựa trên số liệu code đã tính */
export interface Reading {
  /** Điểm chung của ngày, 1 (xấu) .. 5 (rất tốt) */
  score: Score;
  summary: string;
  aspects: { key: "work" | "money" | "love" | "health"; score: Score; text: string }[];
  goodFor: string[];
  avoid: string[];
  advice: string;
}

export interface HoroscopeInput {
  name: string;
  facts: HoroscopeFacts;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiModel {
  name: string;
  horoscope(input: HoroscopeInput): Promise<Reading>;
  /** `context` = số liệu của người dùng (hồ sơ, ngày hôm nay) ghép vào system prompt */
  chat(input: { messages: ChatMessage[]; context: string }): Promise<string>;
}

export const DISCLAIMER = "Nội dung mang tính tham khảo, giải trí; không phải lời khuyên cho quyết định quan trọng.";

export const HOROSCOPE_SYSTEM_PROMPT = `Bạn là người xem tử vi theo lịch âm Việt Nam (can chi, ngũ hành, ngày hoàng đạo).
Viết tử vi trong ngày cho một người, tiếng Việt, giọng nhẹ nhàng, tích cực nhưng thật.
Quy tắc:
- CHỈ dựa trên số liệu được cung cấp (tuổi, mệnh, can chi ngày, ngũ hành, hợp/xung, ngày hoàng đạo/hắc đạo, tiết khí). Không tự tính lại hay bịa can chi, ngày âm.
- Ngày xung với tuổi (lục xung, tứ hành xung) hoặc ngũ hành ngày khắc mệnh thì điểm thấp hơn; hợp (lục hợp, tam hợp) hoặc được sinh thì cao hơn; ngày hắc đạo trừ điểm, hoàng đạo cộng điểm.
- Không phán chắc chắn về bệnh tật, tai nạn, chết chóc, kiện tụng; không khuyên đầu tư, vay mượn số tiền cụ thể.
- summary 2–3 câu; mỗi mặt (công việc, tài chính, tình cảm, sức khỏe) 1–2 câu; goodFor và avoid mỗi danh sách 2–4 việc ngắn; advice 1 câu.`;

export const HOROSCOPE_JSON_SCHEMA = {
  type: "object",
  properties: {
    score: { type: "integer", minimum: 1, maximum: 5 },
    summary: { type: "string" },
    aspects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: { type: "string", enum: ["work", "money", "love", "health"] },
          score: { type: "integer", minimum: 1, maximum: 5 },
          text: { type: "string" },
        },
        required: ["key", "score", "text"],
      },
    },
    goodFor: { type: "array", items: { type: "string" } },
    avoid: { type: "array", items: { type: "string" } },
    advice: { type: "string" },
  },
  required: ["score", "summary", "aspects", "goodFor", "avoid", "advice"],
} as const;

const GENDER = { male: "nam", female: "nữ" } as const;

/** Số liệu gửi AI: chỉ tên gọi, giới tính và số liệu lịch, không gửi email hay ngày sinh dương đầy đủ */
export function buildHoroscopePrompt({ name, facts }: HoroscopeInput): string {
  const { person, day, relation } = facts;
  const l = day.lunar;
  return [
    `Người xem: ${name}, ${GENDER[person.gender]}, tuổi ${person.tuoi} (${person.tuoiAm} tuổi âm), mệnh ${person.menh.name} (${person.menh.hanh})` +
      (person.gioSinh ? `, sinh giờ ${person.gioSinh}` : ", không rõ giờ sinh") +
      ".",
    `Ngày xem: ${day.date} dương lịch, tức ngày ${l.day} tháng ${l.month}${l.leap ? " nhuận" : ""} năm ${day.canChi.year}.`,
    `Can chi: ngày ${day.canChi.day}, tháng ${day.canChi.month}. Ngũ hành ngày: ${day.napAm.name} (${day.napAm.hanh}).`,
    `Ngày ${day.hoangDao.good ? "hoàng đạo" : "hắc đạo"} (${day.hoangDao.name}). Tiết ${day.tietKhi.name}.`,
    `Giờ hoàng đạo: ${day.gioHoangDao.map((g) => `${g.chi} (${g.hours}h)`).join(", ")}.`,
    `Quan hệ tuổi với ngày: ${relation.chi.length ? relation.chi.join(", ") : "không hợp không xung"}; mệnh ${relation.nguHanh} ngũ hành của ngày.`,
    day.holidays.length ? `Ngày lễ: ${day.holidays.map((h) => h.name).join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const ASPECT_KEYS = ["work", "money", "love", "health"] as const;

function score(v: unknown): Score {
  const n = Math.round(Number(v));
  return (Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : 3) as Score;
}

const strings = (v: unknown, max: number) =>
  (Array.isArray(v) ? v : [])
    .filter((x): x is string => typeof x === "string" && x.trim() !== "")
    .map((x) => x.trim())
    .slice(0, max);

/** Kiểm kết quả AI: thiếu phần chính thì coi là lỗi, điểm ngoài 1..5 thì kẹp lại */
export function parseReading(raw: unknown): Reading {
  const r = (raw ?? {}) as Record<string, unknown>;
  const summary = typeof r.summary === "string" ? r.summary.trim() : "";
  if (!summary) throw new AiError("failed", "Thiếu phần tóm tắt");
  const aspects = ASPECT_KEYS.map((key) => {
    const a = (Array.isArray(r.aspects) ? r.aspects : []).find((x) => (x as { key?: string })?.key === key) as
      | { score?: unknown; text?: unknown }
      | undefined;
    const text = typeof a?.text === "string" ? a.text.trim() : "";
    if (!text) throw new AiError("failed", `Thiếu phần ${key}`);
    return { key, score: score(a?.score), text };
  });
  return {
    score: score(r.score),
    summary,
    aspects,
    goodFor: strings(r.goodFor, 4),
    avoid: strings(r.avoid, 4),
    advice: typeof r.advice === "string" ? r.advice.trim() : "",
  };
}

export const CHAT_SYSTEM_PROMPT = `Bạn là trợ lý trong MyLunarCalendar, ứng dụng lịch âm và tử vi cá nhân.
Trả lời bằng tiếng Việt, ngắn gọn (khoảng 150 chữ), về lịch âm, ngày tốt xấu, can chi, ngũ hành, tử vi.
Dựa vào số liệu được cung cấp (hồ sơ, ngày hôm nay, tử vi đã xem); cần ngày khác thì nói người dùng xem trong tab Lịch, không tự tính can chi của ngày không có trong số liệu.
Không phán chắc chắn về bệnh tật, tai nạn, chết chóc; không khuyên tài chính cụ thể. Câu hỏi ngoài phạm vi thì từ chối nhẹ nhàng.`;

/** Đổi lỗi AI thành thông báo cho người dùng (R-AI-03) */
export function aiHttpError(err: unknown, modelName: string, failedMessage: string): never {
  if (err instanceof AiError) {
    console.warn(`[AI ${modelName}] ${err.kind}: ${err.message}`);
    if (err.kind === "quota") throw new HttpError(503, "AI đã hết lượt miễn phí, thử lại sau");
    if (err.kind === "busy") throw new HttpError(503, "AI đang quá tải, thử lại sau ít phút");
    throw new HttpError(502, failedMessage);
  }
  throw err;
}
