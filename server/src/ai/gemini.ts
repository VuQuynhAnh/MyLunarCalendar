import { ApiError, GoogleGenAI, type GenerateContentParameters } from "@google/genai";
import {
  AiError,
  CHAT_SYSTEM_PROMPT,
  HOROSCOPE_JSON_SCHEMA,
  HOROSCOPE_SYSTEM_PROMPT,
  buildHoroscopePrompt,
  parseReading,
  type AiModel,
  type ChatMessage,
  type HoroscopeInput,
} from "./model";

export const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";
// Model dự phòng khi model chính quá tải/hết lượt: bản nhẹ, hạn mức miễn phí riêng
export const DEFAULT_GEMINI_FALLBACK = "gemini-3.5-flash-lite";

/** Gọi API sinh nội dung; tách ra để test thay bằng bản giả, không gọi mạng */
type Generate = (params: GenerateContentParameters) => Promise<{ text?: string }>;

/**
 * Tử vi và chat bằng Gemini qua gói miễn phí của Google AI Studio. Gói miễn phí giới hạn lượt
 * theo phút/ngày và Google có thể dùng dữ liệu gửi lên để cải thiện sản phẩm, nên chỉ gửi tên gọi
 * và số liệu lịch, không gửi email hay ngày sinh dương lịch đầy đủ (R-AI-02).
 * Model chính quá tải (503 "high demand", 500) hoặc hết lượt (429) thì thử model dự phòng.
 */
export class GeminiModel implements AiModel {
  private generate: Generate;
  private models: string[];

  constructor(
    apiKey: string,
    public name = DEFAULT_GEMINI_MODEL,
    fallback = DEFAULT_GEMINI_FALLBACK,
    generate?: Generate,
  ) {
    this.models = [...new Set([name, fallback].filter(Boolean))];
    if (generate) this.generate = generate;
    else {
      const ai = new GoogleGenAI({ apiKey });
      this.generate = (params) => ai.models.generateContent(params);
    }
  }

  /** Gọi lần lượt model chính rồi model dự phòng; chỉ chuyển model khi lỗi tạm thời hoặc hết lượt */
  private async call(params: Omit<GenerateContentParameters, "model">): Promise<string | undefined> {
    let busy = false;
    let lastMessage = "";
    for (const model of this.models) {
      try {
        return (await this.generate({ ...params, model })).text;
      } catch (err) {
        if (!(err instanceof ApiError)) throw new AiError("failed", err instanceof Error ? err.message : String(err));
        lastMessage = `${model}: ${err.message}`;
        if (err.status === 503 || err.status === 500) busy = true;
        else if (err.status !== 429) throw new AiError("failed", lastMessage);
        console.warn(`[AI ${model}] ${err.status}, thử model tiếp theo`);
      }
    }
    // Hết model để thử: quá tải là lỗi tạm thời, khác với hết lượt miễn phí
    throw new AiError(busy ? "busy" : "quota", lastMessage);
  }

  async horoscope(input: HoroscopeInput) {
    const text = await this.call({
      contents: buildHoroscopePrompt(input),
      config: {
        systemInstruction: HOROSCOPE_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseJsonSchema: HOROSCOPE_JSON_SCHEMA,
        maxOutputTokens: 2048,
        // Người dùng đang chờ trên màn hình: quá 45 giây thì báo lỗi, không treo
        httpOptions: { timeout: 45_000 },
      },
    });
    let raw: unknown;
    try {
      raw = JSON.parse(text ?? "");
    } catch {
      throw new AiError("failed", "Kết quả không phải JSON");
    }
    return parseReading(raw);
  }

  /** Chat: số liệu của người dùng nằm trong system prompt, lịch sử là các lượt user/model */
  async chat({ messages, context }: { messages: ChatMessage[]; context: string }): Promise<string> {
    const text = await this.call({
      contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      config: {
        systemInstruction: `${CHAT_SYSTEM_PROMPT}\n\nSố liệu của người dùng:\n${context}`,
        maxOutputTokens: 1024,
        httpOptions: { timeout: 45_000 },
      },
    });
    return text ?? "";
  }
}
