# MyLunarCalendar

Lịch âm Việt Nam và tử vi hằng ngày bằng AI, dùng tốt trên điện thoại. Kèm widget lịch tháng cho màn hình chính Android, chạy offline, không quảng cáo.

- **Lịch:** lịch tháng có ngày âm, ngày lễ/Tết, can chi, ngày hoàng đạo/hắc đạo, tiết khí, giờ hoàng đạo; đổi ngày âm → dương.
- **Tử vi:** nhiều hồ sơ (bản thân, người nhà). Code tính tuổi, mệnh, can chi ngày và hợp xung; AI (Gemini miễn phí) viết lời tử vi dựa trên số liệu đó. Có chat hỏi thêm.
- **Không tài khoản, không database:** hồ sơ và tử vi đã xem lưu trên máy (trình duyệt), xoá dữ liệu trình duyệt là mất. Server chỉ chuyển số liệu tới AI, không lưu gì.
- **App Android:** mở app là web trong app (webview); icon app hiện ngày dương hôm nay; widget lịch tháng 4x4 tính ngay trên máy, không cần mạng, đổi sáng/tối theo lựa chọn trong tab Cài đặt.
- **Chưa có key Gemini** thì web chỉ còn tab Lịch (ẩn tử vi, hồ sơ, chat), không báo lỗi.

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `shared/` | Lịch âm (thuật toán Hồ Ngọc Đức, múi giờ +7), can chi, tiết khí, giờ hoàng đạo, ngày lễ, số liệu tử vi. Dùng chung server + web. Bộ số liệu kiểm tra `shared/test/lunar-cases.json` dùng chung với bản Kotlin |
| `server/` | Express, không database: tính số liệu tử vi rồi gọi AI, chat, mật khẩu chung |
| `web/` | Vite + React + Tailwind 4, mobile-first, giao diện sáng/tối: 3 tab Lịch (vuốt ngang chuyển tháng) / Tiện ích (Tử vi, Hồ sơ, đổi ngày âm ↔ dương) / Cài đặt (sáng, tối, theo hệ thống), nút Hỏi AI |
| `android/` | App Android: web trong app (webview) + widget lịch tháng offline (Kotlin, SDK chuẩn) |

## Chạy

```bash
npm install
cp server/.env.example server/.env   # điền GEMINI_API_KEY, APP_PASSWORD (đều tuỳ chọn)
npm run dev                           # server :4000 + web :5173
npm test                              # shared + server + web
npm run lint                          # kiểm kiểu
npm run build                         # build web vào web/dist
```

### AI và mật khẩu chung

- `GEMINI_API_KEY` (miễn phí ở aistudio.google.com). Không có key thì lịch và hồ sơ vẫn chạy, chỉ phần tử vi/chat báo "Chưa bật AI".
- `APP_PASSWORD`: đặt thì web hỏi mật khẩu một lần rồi nhớ trên máy, để người lạ biết địa chỉ web không dùng hết hạn mức AI miễn phí. Không đặt thì không hỏi.

## Deploy lên Render (một Web Service)

- Build Command: `npm install --include=dev && npm run build`
- Start Command: `npm start`
- Environment: `GEMINI_API_KEY`, `APP_PASSWORD`, tuỳ chọn `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`. Không cần database.

Server trả cả API lẫn giao diện (`web/dist`).

## API

Lỗi trả `{ error, fields? }`, thông báo tiếng Việt. Đặt `APP_PASSWORD` thì các API gọi AI cần header `x-app-password`, sai trả 401.

| Method · path | Việc |
|---|---|
| `GET /api/config` | `{ passwordRequired, aiEnabled }`, không cần mật khẩu |
| `POST /api/horoscope` | `{ name, birthDate, birthTime?, gender, date? }` → `{ date, facts, reading, model, createdAt }`; ngày trong 30 ngày trước/sau hôm nay; server không lưu |
| `POST /api/chat` | `{ messages, profiles?, readings? }` → `{ reply }`; server không lưu nội dung |

## Widget Android

Workflow `.github/workflows/android.yml` chạy test Kotlin rồi build APK khi `android/` (hoặc bộ số liệu lịch âm) đổi trên `main`, đính `mylunarcalendar.apk` vào bản phát hành mới nhất (tag `android-v<số>`).

**Cài:** trên điện thoại mở trang Releases của repo, tải `mylunarcalendar.apk`, mở để cài (cho phép cài từ nguồn này). Mở app, dán địa chỉ web (vd địa chỉ Render) một lần. Thêm widget: menu ⋮ → "Thêm widget ra màn hình chính", hoặc giữ ngón tay ở chỗ trống trên màn hình chính → Tiện ích → Lịch âm. Chạm một ngày trên widget thì app mở đúng ngày đó.

**Khoá ký và cập nhật trong app:** Khoá ký cố định: lần build đầu GitHub Actions tự tạo `android/release-key.p12` và lưu vào repo; mật khẩu là Secret `ANDROID_KEYSTORE_PASSWORD` nếu có, không có thì dùng mật khẩu ghi sẵn trong workflow (app cá nhân, chấp nhận khoá công khai, user chốt 2026-11-18). Từ đó bản mới cài đè được bản cũ: app tự hỏi "Có bản mới" mỗi ngày một lần, hoặc menu ⋮ → "Kiểm tra cập nhật". Chuyển từ bản ký khoá debug cũ sang khoá cố định thì phải gỡ app một lần cuối. **Không** đặt hay đổi Secret sau khi khoá đã tạo (mật khẩu khác thì build lỗi); không xoá file khoá (mọi máy phải gỡ app cài lại).
