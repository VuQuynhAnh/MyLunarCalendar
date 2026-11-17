import { MAX_PROFILES, birthFacts, checkProfile, dayInfo, vnDate, type ProfileInput } from "@mylunar/shared";
import { HttpError } from "../http";
import { AiError, aiHttpError, type AiModel, type ChatMessage } from "../ai/model";

/** Chỉ gửi các tin gần nhất, đủ ngữ cảnh mà không tốn token */
export const CHAT_HISTORY_LIMIT = 12;
export const MAX_MESSAGE_LENGTH = 1000;
const MAX_SUMMARY_LENGTH = 600;

/** Tóm tắt tử vi hôm nay web đã lưu trên máy, gửi kèm để AI trả lời khớp */
export interface ReadingNote {
  name: string;
  score: number;
  summary: string;
}

/** Kiểm lịch sử chat do trình duyệt gửi lên: tin cuối phải là câu hỏi của người dùng */
export function validateMessages(body: unknown): ChatMessage[] {
  const raw = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(raw) || raw.length === 0) throw new HttpError(400, "Vui lòng nhập câu hỏi");
  const messages = raw.map((m): ChatMessage => {
    const role = (m as ChatMessage)?.role;
    const content = typeof (m as ChatMessage)?.content === "string" ? (m as ChatMessage).content.trim() : "";
    if ((role !== "user" && role !== "assistant") || !content) throw new HttpError(400, "Tin nhắn không hợp lệ");
    if (content.length > MAX_MESSAGE_LENGTH) throw new HttpError(400, `Câu hỏi tối đa ${MAX_MESSAGE_LENGTH} ký tự`);
    return { role, content };
  });
  if (messages.at(-1)!.role !== "user") throw new HttpError(400, "Vui lòng nhập câu hỏi");
  return messages.slice(-CHAT_HISTORY_LIMIT);
}

/** Hồ sơ và tóm tắt tử vi web gửi kèm; sai thì bỏ qua phần đó, không chặn câu hỏi */
function readExtras(body: unknown, today: string): { profiles: ProfileInput[]; readings: ReadingNote[] } {
  const b = (body ?? {}) as { profiles?: unknown; readings?: unknown };
  const profiles = (Array.isArray(b.profiles) ? b.profiles : [])
    .slice(0, MAX_PROFILES)
    .map((p) => checkProfile(p, today))
    .flatMap((c) => (c.ok ? [c.value] : []));
  const readings = (Array.isArray(b.readings) ? b.readings : []).slice(0, MAX_PROFILES).flatMap((r): ReadingNote[] => {
    const x = r as Partial<ReadingNote>;
    if (typeof x?.name !== "string" || typeof x.summary !== "string" || typeof x.score !== "number") return [];
    return [{ name: x.name.slice(0, 50), score: Math.min(5, Math.max(1, Math.round(x.score))), summary: x.summary.slice(0, MAX_SUMMARY_LENGTH) }];
  });
  return { profiles, readings };
}

/**
 * Số liệu gửi kèm câu hỏi (HORO-UC02/BR-2): thông tin hôm nay do server tính, các hồ sơ (tên gọi,
 * tuổi, mệnh, giờ sinh) và tóm tắt tử vi hôm nay. Không gửi ngày sinh dương lịch đầy đủ (R-AI-02).
 */
export function buildChatContext(today: string, profiles: ProfileInput[], readings: ReadingNote[]): string {
  const d = dayInfo(today);
  const holidays = d.holidays.length ? `; ${d.holidays.map((h) => h.name).join(", ")}` : "";
  const lines = [
    `Hôm nay ${today}: ngày ${d.lunar.day} tháng ${d.lunar.month}${d.lunar.leap ? " nhuận" : ""} âm lịch, ngày ${d.canChi.day}, ` +
      `tháng ${d.canChi.month}, năm ${d.canChi.year}; ${d.hoangDao.good ? "hoàng đạo" : "hắc đạo"} (${d.hoangDao.name}); ` +
      `tiết ${d.tietKhi.name}; giờ hoàng đạo ${d.gioHoangDao.map((g) => g.chi).join(", ")}${holidays}.`,
  ];
  if (profiles.length === 0) lines.push("Người dùng chưa tạo hồ sơ ngày sinh.");
  for (const p of profiles) {
    const f = birthFacts(p);
    const gio = f.gioSinh ? `, giờ sinh ${f.gioSinh}` : "";
    lines.push(`Hồ sơ "${p.name}": ${p.gender === "male" ? "nam" : "nữ"}, tuổi ${f.tuoi}, mệnh ${f.menh.name}${gio}.`);
  }
  for (const r of readings) lines.push(`Tử vi hôm nay của "${r.name}" (điểm ${r.score}/5): ${r.summary}`);
  return lines.join("\n");
}

/** Trả lời một câu hỏi (HORO-UC02). Server không lưu nội dung. */
export async function answer(deps: { model?: AiModel; now: () => Date }, body: unknown) {
  const { model } = deps;
  if (!model) throw new HttpError(503, "Chưa bật AI (thiếu GEMINI_API_KEY)");
  const messages = validateMessages(body);
  const today = vnDate(deps.now());
  const { profiles, readings } = readExtras(body, today);
  let reply: string;
  try {
    reply = (await model.chat({ messages, context: buildChatContext(today, profiles, readings) })).trim();
    if (!reply) throw new AiError("failed", "Câu trả lời rỗng");
  } catch (err) {
    aiHttpError(err, model.name, "Chưa trả lời được, thử lại sau");
  }
  return { reply };
}
