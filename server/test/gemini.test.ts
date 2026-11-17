import { describe, expect, it } from "vitest";
import { ApiError } from "@google/genai";
import { horoscopeFacts } from "@mylunar/shared";
import { GeminiModel } from "../src/ai/gemini";
import { AiError, buildHoroscopePrompt, parseReading, type HoroscopeInput } from "../src/ai/model";
import { reading } from "./helpers";

const input: HoroscopeInput = { name: "Anh", facts: horoscopeFacts({ birthDate: "1990-03-01", birthTime: "08:30", gender: "male" }, "2026-11-17") };
const ok = { text: JSON.stringify(reading) };

/** Gọi API giả: model nào lỗi gì do test đặt, ghi lại model đã gọi */
function fakeGenerate(errors: Record<string, number>) {
  const calls: string[] = [];
  const generate = async ({ model }: { model: string }) => {
    calls.push(model);
    const status = errors[model];
    if (status) throw new ApiError({ status, message: `lỗi ${status}` });
    return ok;
  };
  return { calls, generate };
}

describe("Gemini: model dự phòng khi quá tải (HORO-UC01/BR-5)", () => {
  it("model chính quá tải (503) thì dùng model dự phòng", async () => {
    const { calls, generate } = fakeGenerate({ "gemini-3.6-flash": 503 });
    const model = new GeminiModel("key", "gemini-3.6-flash", "gemini-3.5-flash-lite", generate);
    expect((await model.horoscope(input)).summary).toBe(reading.summary);
    expect(calls).toEqual(["gemini-3.6-flash", "gemini-3.5-flash-lite"]);
    expect(await model.chat({ messages: [{ role: "user", content: "hỏi" }], context: "" })).toContain(reading.summary);
  });

  it("model chính hết lượt (429) cũng thử model dự phòng", async () => {
    const { calls, generate } = fakeGenerate({ "gemini-3.6-flash": 429 });
    await new GeminiModel("key", "gemini-3.6-flash", "gemini-3.5-flash-lite", generate).horoscope(input);
    expect(calls).toEqual(["gemini-3.6-flash", "gemini-3.5-flash-lite"]);
  });

  it("cả hai đều quá tải thì báo busy; đều hết lượt thì báo quota; lỗi khác không thử tiếp", async () => {
    const busy = new GeminiModel("k", "a", "b", fakeGenerate({ a: 503, b: 500 }).generate);
    await expect(busy.horoscope(input)).rejects.toMatchObject({ kind: "busy" });
    const quota = new GeminiModel("k", "a", "b", fakeGenerate({ a: 429, b: 429 }).generate);
    await expect(quota.horoscope(input)).rejects.toMatchObject({ kind: "quota" });
    const bad = fakeGenerate({ a: 400 });
    await expect(new GeminiModel("k", "a", "b", bad.generate).horoscope(input)).rejects.toBeInstanceOf(AiError);
    expect(bad.calls).toEqual(["a"]);
  });

  it("model dự phòng trùng model chính thì chỉ gọi một lần", async () => {
    const { calls, generate } = fakeGenerate({ a: 503 });
    await expect(new GeminiModel("k", "a", "a", generate).horoscope(input)).rejects.toMatchObject({ kind: "busy" });
    expect(calls).toEqual(["a"]);
  });
});

describe("số liệu gửi AI và kiểm kết quả", () => {
  it("prompt có tuổi, mệnh, can chi ngày, hợp xung; không có ngày sinh dương", () => {
    const p = buildHoroscopePrompt(input);
    expect(p).toContain("Người xem: Anh, nam, tuổi Canh Ngọ (37 tuổi âm), mệnh Lộ Bàng Thổ (Thổ), sinh giờ Thìn.");
    expect(p).toContain("Ngày xem: 2026-11-17 dương lịch");
    expect(p).not.toContain("1990-03-01");
  });

  it("thiếu phần chính thì lỗi; điểm ngoài 1..5 thì kẹp lại", () => {
    expect(() => parseReading({ ...reading, summary: "" })).toThrow(AiError);
    expect(() => parseReading({ ...reading, aspects: reading.aspects.slice(1) })).toThrow(AiError);
    expect(parseReading({ ...reading, score: 9, goodFor: ["a", "", 3, "b"] })).toMatchObject({ score: 5, goodFor: ["a", "b"] });
  });
});
