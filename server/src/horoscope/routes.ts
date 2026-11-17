import { Router } from "express";
import { checkProfile, horoscopeFacts, vnDate } from "@mylunar/shared";
import { HttpError, asyncHandler } from "../http";
import { aiHttpError, type AiModel } from "../ai/model";

/** Xem tử vi được cho ngày cách hôm nay tối đa ngần này ngày (trước hoặc sau) */
export const HOROSCOPE_RANGE_DAYS = 30;

function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + n)).toISOString().slice(0, 10);
}

/**
 * `POST /api/horoscope` `{ name, birthDate, birthTime, gender, date }` (HORO-UC01). Hồ sơ lưu trên
 * máy người dùng nên gửi kèm mỗi lần; server tính số liệu, nhờ AI viết rồi trả về, không lưu gì.
 * Web tự lưu kết quả để mở lại không gọi AI lần nữa.
 */
export function horoscopeRouter(model: AiModel | undefined, now: () => Date): Router {
  const router = Router();
  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const today = vnDate(now());
      const checked = checkProfile(req.body, today);
      if (!checked.ok) throw new HttpError(400, Object.values(checked.fields)[0]!, checked.fields);
      const date = (req.body as { date?: unknown }).date ?? today;
      if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date < addDays(today, -HOROSCOPE_RANGE_DAYS) || date > addDays(today, HOROSCOPE_RANGE_DAYS)) {
        throw new HttpError(400, `Chỉ xem được tử vi trong ${HOROSCOPE_RANGE_DAYS} ngày trước hoặc sau hôm nay`);
      }
      if (!model) throw new HttpError(503, "Chưa bật AI (thiếu GEMINI_API_KEY)");
      const p = checked.value;
      const facts = horoscopeFacts(p, date);
      try {
        const reading = await model.horoscope({ name: p.name, facts });
        res.json({ date, facts, reading, model: model.name, createdAt: now().toISOString() });
      } catch (err) {
        aiHttpError(err, model.name, "Chưa xem được tử vi, thử lại sau");
      }
    }),
  );
  return router;
}
