import { useState } from "react";
import { cn } from "@/lib/utils";
import { setThemeMode, themeMode, type ThemeMode } from "../lib/theme";

/** Trang tải APK của app Android (GitHub Actions build và đính vào bản phát hành mới nhất) */
export const APK_URL = "https://github.com/VuQuynhAnh/MyLunarCalendar/releases/latest";

/** Đang chạy trong app Android (webview, có cầu nối) thì không mời tải app nữa */
const inAndroidApp = () => !!window.AndroidApp || /; wv\)/.test(navigator.userAgent);

const MODES: { value: ThemeMode; label: string; hint: string }[] = [
  { value: "light", label: "Sáng", hint: "" },
  { value: "dark", label: "Tối", hint: "" },
  { value: "system", label: "Theo hệ thống", hint: "Đổi theo chế độ sáng/tối của điện thoại" },
];

/**
 * Tab Cài đặt (CAL-UC02): giao diện Sáng / Tối / Theo hệ thống. Trong app Android, lựa chọn này áp
 * cả cho widget lịch tháng trên màn hình chính. Ngoài app thì có hướng dẫn tải app.
 */
export function SettingsPage() {
  const [mode, setMode] = useState<ThemeMode>(themeMode);
  const choose = (m: ThemeMode) => {
    setMode(m);
    setThemeMode(m);
  };
  return (
    <div>
      <h1 className="mb-3 text-lg font-semibold">Cài đặt</h1>
      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="mb-1 font-semibold">Giao diện</h2>
        <p className="mb-3 text-xs text-muted">Áp cho cả widget lịch trên màn hình chính khi dùng app Android.</p>
        <div role="radiogroup" aria-label="Giao diện" className="grid gap-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={mode === m.value}
              onClick={() => choose(m.value)}
              className={cn(
                "flex min-h-12 flex-col justify-center rounded-xl border px-4 text-left",
                mode === m.value ? "border-gold bg-gold/15 text-gold" : "border-line text-ink",
              )}
            >
              <span className="font-medium">{m.label}</span>
              {m.hint && <span className="text-xs text-muted">{m.hint}</span>}
            </button>
          ))}
        </div>
      </section>

      {!inAndroidApp() && (
        <section aria-label="Tải app Android" className="mt-3 rounded-2xl border border-line bg-surface p-4 text-sm">
          <h2 className="mb-2 font-semibold">App Android</h2>
          <p className="mb-2 text-muted">Mở lịch như app, icon hiện ngày hôm nay, kèm widget lịch tháng trên màn hình chính (chạy không cần mạng).</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              <a href={APK_URL} target="_blank" rel="noreferrer" className="font-medium text-gold underline">
                Tải mylunarcalendar.apk
              </a>{" "}
              ở bản phát hành mới nhất.
            </li>
            <li>Mở file vừa tải, cho phép cài từ nguồn này, rồi Cài đặt.</li>
            <li>Mở app, dán địa chỉ web này: {window.location.origin}</li>
            <li>Menu ⋮ → Thêm widget ra màn hình chính.</li>
          </ol>
          <p className="mt-2 text-xs text-muted">Có bản mới, app tự hỏi cập nhật; không phải gỡ cài lại.</p>
        </section>
      )}
    </div>
  );
}
