import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createApp } from "./app";
import { GeminiModel } from "./ai/gemini";

const port = Number(process.env.PORT ?? 4000);

// AI tử vi và chat: chỉ bật khi có GEMINI_API_KEY; GEMINI_MODEL đổi được model chính,
// GEMINI_FALLBACK_MODEL là model dự phòng khi model chính quá tải/hết lượt
const model = process.env.GEMINI_API_KEY
  ? new GeminiModel(process.env.GEMINI_API_KEY, process.env.GEMINI_MODEL || undefined, process.env.GEMINI_FALLBACK_MODEL || undefined)
  : undefined;
if (!model) console.log("AI tử vi đang tắt (chưa có GEMINI_API_KEY)");
const password = process.env.APP_PASSWORD || undefined;
if (!password) console.log("Chưa đặt APP_PASSWORD: ai biết địa chỉ web cũng dùng được AI");

// Có bản build web (npm run build) thì server trả luôn giao diện, chạy một service trên Render
const webDist = fileURLToPath(new URL("../../web/dist", import.meta.url));
createApp({ model, password, webDist: existsSync(webDist) ? webDist : undefined }).listen(port, () => {
  console.log(`MyLunarCalendar server chạy ở http://localhost:${port}`);
});
