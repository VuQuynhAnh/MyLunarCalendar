import express, { type Express } from "express";
import { join } from "node:path";
import { errorHandler } from "./http";
import { requirePassword } from "./access";
import { horoscopeRouter } from "./horoscope/routes";
import { chatRouter } from "./chat/routes";
import type { AiModel } from "./ai/model";

export interface AppDeps {
  /** Đồng hồ, tiêm vào để test "hôm nay" */
  now?: () => Date;
  /** AI viết tử vi và trả lời chat; không có (thiếu API key) thì các API AI trả 503, lịch vẫn chạy */
  model?: AiModel;
  /** Mật khẩu chung cho các API gọi AI; không có thì không hỏi */
  password?: string;
  /** Thư mục bản build của web (web/dist). Có thì server trả luôn giao diện, để deploy một service duy nhất */
  webDist?: string;
}

/**
 * Tạo app Express (không listen) để server và test dùng chung. Không có database: hồ sơ và tử vi
 * đã xem lưu trên máy người dùng (user chốt 2026-11-17), server chỉ chuyển số liệu tới AI.
 */
export function createApp({ now = () => new Date(), model, password, webDist }: AppDeps): Express {
  const app = express();
  app.use(express.json({ limit: "100kb" }));

  // Web hỏi trước để biết có cần nhập mật khẩu không, và AI có đang bật không
  app.get("/api/config", (_req, res) => {
    res.json({ passwordRequired: !!password, aiEnabled: !!model });
  });
  const gate = requirePassword(password);
  app.use("/api/horoscope", gate, horoscopeRouter(model, now));
  app.use("/api/chat", gate, chatRouter(model, now));
  // /api lạ trả lỗi JSON, không rơi xuống trang web phía dưới
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Không tìm thấy" });
  });

  if (webDist) {
    app.use(express.static(webDist));
    // Web dùng route phía trình duyệt (/tu-vi, /ho-so…): mở thẳng hoặc tải lại trang thì trả index.html
    app.get("*", (_req, res) => {
      res.sendFile(join(webDist, "index.html"));
    });
  }

  app.use(errorHandler);
  return app;
}
