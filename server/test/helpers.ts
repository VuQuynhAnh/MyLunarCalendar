import { AiError, type AiModel, type ChatMessage, type HoroscopeInput, type Reading } from "../src/ai/model";

export const reading: Reading = {
  score: 4,
  summary: "Ngày hợp tuổi, công việc thuận lợi.",
  aspects: [
    { key: "work", score: 4, text: "Dễ được ghi nhận." },
    { key: "money", score: 3, text: "Thu chi ổn định." },
    { key: "love", score: 4, text: "Vui vẻ, hòa thuận." },
    { key: "health", score: 3, text: "Nên ngủ sớm." },
  ],
  goodFor: ["Gặp đối tác"],
  avoid: ["Tranh cãi"],
  advice: "Giữ bình tĩnh.",
};

/** AI giả: ghi lại số liệu được gửi, trả kết quả cố định hoặc ném lỗi do test đặt */
export class FakeModel implements AiModel {
  name = "fake-model";
  horoscopeInputs: HoroscopeInput[] = [];
  chatInputs: { messages: ChatMessage[]; context: string }[] = [];
  fail: AiError | null = null;
  async horoscope(input: HoroscopeInput) {
    this.horoscopeInputs.push(input);
    if (this.fail) throw this.fail;
    return reading;
  }
  async chat(input: { messages: ChatMessage[]; context: string }) {
    this.chatInputs.push(input);
    if (this.fail) throw this.fail;
    return "Hôm nay hợp tuổi bạn.";
  }
}
