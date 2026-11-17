import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../src/app";
import { AiError } from "../src/ai/model";
import { FakeModel, reading } from "./helpers";

// "Bây giờ" cố định: 10:00 ngày 17/11/2026 giờ VN
const NOW = new Date("2026-11-17T03:00:00.000Z");

let model: FakeModel;
let app: Express;

beforeEach(() => {
  model = new FakeModel();
  app = createApp({ now: () => NOW, model });
});

const me = { name: "Anh", birthDate: "1990-03-01", birthTime: "08:30", gender: "male" };

describe("tử vi (HORO-UC01)", () => {
  // SC: HORO-UC01-SC3
  it("server tính số liệu từ hồ sơ gửi lên, AI viết; không lưu gì", async () => {
    const res = await request(app).post("/api/horoscope").send({ ...me, date: "2026-11-17" }).expect(200);
    expect(res.body).toMatchObject({
      date: "2026-11-17",
      reading,
      model: "fake-model",
      facts: { person: { tuoi: "Canh Ngọ", tuoiAm: 37, gioSinh: "Thìn", menh: { name: "Lộ Bàng Thổ" } }, day: { date: "2026-11-17" } },
    });
    expect(model.horoscopeInputs[0]).toMatchObject({ name: "Anh", facts: { person: { tuoi: "Canh Ngọ" } } });
    // Không gửi ngày tử vi thì là hôm nay
    expect((await request(app).post("/api/horoscope").send(me).expect(200)).body.date).toBe("2026-11-17");
  });

  it("hồ sơ sai thì 400 theo từng ô; ngày ngoài 30 ngày thì 400", async () => {
    const bad = await request(app).post("/api/horoscope").send({ ...me, name: "", gender: "x" }).expect(400);
    expect(bad.body.fields).toEqual({ name: "Vui lòng nhập tên", gender: "Vui lòng chọn giới tính" });
    await request(app).post("/api/horoscope").send({ ...me, date: "2026-12-17" }).expect(200);
    await request(app).post("/api/horoscope").send({ ...me, date: "2026-10-18" }).expect(200);
    const far = await request(app).post("/api/horoscope").send({ ...me, date: "2026-12-18" }).expect(400);
    expect(far.body.error).toBe("Chỉ xem được tử vi trong 30 ngày trước hoặc sau hôm nay");
    expect(model.horoscopeInputs).toHaveLength(2);
  });

  // SC: HORO-UC01-SC5
  it("AI lỗi thì báo theo loại lỗi; chưa cấu hình AI thì 503", async () => {
    model.fail = new AiError("quota");
    expect((await request(app).post("/api/horoscope").send(me).expect(503)).body.error).toBe("AI đã hết lượt miễn phí, thử lại sau");
    model.fail = new AiError("busy");
    expect((await request(app).post("/api/horoscope").send(me).expect(503)).body.error).toBe("AI đang quá tải, thử lại sau ít phút");
    model.fail = new AiError("failed");
    expect((await request(app).post("/api/horoscope").send(me).expect(502)).body.error).toBe("Chưa xem được tử vi, thử lại sau");
    const noAi = createApp({ now: () => NOW });
    expect((await request(noAi).post("/api/horoscope").send(me).expect(503)).body.error).toBe("Chưa bật AI (thiếu GEMINI_API_KEY)");
    expect((await request(noAi).get("/api/config").expect(200)).body).toEqual({ passwordRequired: false, aiEnabled: false });
  });
});

describe("mật khẩu chung (HORO-UC01/BR-6)", () => {
  // SC: HORO-UC01-SC8
  it("đặt APP_PASSWORD thì API AI đòi đúng mật khẩu; /api/config cho biết có cần nhập", async () => {
    app = createApp({ now: () => NOW, model, password: "bimat" });
    expect((await request(app).get("/api/config").expect(200)).body).toEqual({ passwordRequired: true, aiEnabled: true });
    const no = await request(app).post("/api/horoscope").send(me).expect(401);
    expect(no.body.error).toBe("Sai mật khẩu, nhập lại mật khẩu chung");
    await request(app).post("/api/horoscope").set("x-app-password", "sai").send(me).expect(401);
    await request(app).post("/api/chat").send({ messages: [{ role: "user", content: "a" }] }).expect(401);
    await request(app).post("/api/horoscope").set("x-app-password", "bimat").send(me).expect(200);
    expect(model.horoscopeInputs).toHaveLength(1);
  });
});

describe("chat hỏi AI (HORO-UC02)", () => {
  // SC: HORO-UC02-SC1
  it("gửi kèm thông tin hôm nay, hồ sơ và tóm tắt tử vi; không gửi ngày sinh dương", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({
        messages: [{ role: "user", content: "Hôm nay tôi nên làm gì?" }],
        profiles: [me, { name: "", birthDate: "x", gender: "male" }],
        readings: [{ name: "Anh", score: 4, summary: "Ngày hợp tuổi, công việc thuận lợi." }],
      })
      .expect(200);
    expect(res.body).toEqual({ reply: "Hôm nay hợp tuổi bạn." });
    const ctx = model.chatInputs[0]!.context;
    expect(ctx).toContain("Hôm nay 2026-11-17: ngày 9 tháng 10 âm lịch");
    expect(ctx).toContain('Hồ sơ "Anh": nam, tuổi Canh Ngọ, mệnh Lộ Bàng Thổ, giờ sinh Thìn.');
    expect(ctx).toContain('Tử vi hôm nay của "Anh" (điểm 4/5): Ngày hợp tuổi, công việc thuận lợi.');
    expect(ctx).not.toContain("1990-03-01");
    // Hồ sơ sai bị bỏ qua, không làm hỏng câu hỏi
    expect(ctx.match(/Hồ sơ "/g)).toHaveLength(1);
  });

  // SC: HORO-UC02-SC2
  it("tin nhắn sai thì 400; chỉ gửi 12 tin gần nhất; AI lỗi thì báo", async () => {
    await request(app).post("/api/chat").send({ messages: [] }).expect(400);
    await request(app).post("/api/chat").send({ messages: [{ role: "assistant", content: "x" }] }).expect(400);
    await request(app).post("/api/chat").send({ messages: [{ role: "user", content: "a".repeat(1001) }] }).expect(400);
    const history = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `tin ${i}` }));
    await request(app).post("/api/chat").send({ messages: [...history, { role: "user", content: "cuối" }] }).expect(200);
    expect(model.chatInputs[0]!.messages).toHaveLength(12);
    model.fail = new AiError("failed");
    expect((await request(app).post("/api/chat").send({ messages: [{ role: "user", content: "a" }] }).expect(502)).body.error).toBe("Chưa trả lời được, thử lại sau");
  });

  it("/api lạ trả 404 JSON", async () => {
    expect((await request(app).get("/api/khong-co").expect(404)).body.error).toBe("Không tìm thấy");
  });
});
