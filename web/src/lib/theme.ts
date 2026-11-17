import { KEYS, load, save } from "./storage";

export type ThemeMode = "light" | "dark" | "system";

declare global {
  interface Window {
    /** Cầu nối do app Android gắn vào webview; không có khi mở bằng trình duyệt */
    AndroidApp?: { setTheme(mode: string): void };
  }
}

const media = () => (typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)") : null);

export const themeMode = (): ThemeMode => load<ThemeMode>(KEYS.theme, "system");

/** Gắn sáng/tối vào <html data-theme>; token màu trong index.css đổi theo */
function apply(mode: ThemeMode): void {
  const dark = mode === "dark" || (mode === "system" && !!media()?.matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

/**
 * Giao diện sáng/tối (CAL-UC02): lưu trên máy, áp ngay, và báo xuống app Android (nếu đang chạy
 * trong app) để widget màn hình chính đổi theo.
 */
export function setThemeMode(mode: ThemeMode): void {
  save(KEYS.theme, mode);
  apply(mode);
  try {
    window.AndroidApp?.setTheme(mode);
  } catch {
    // Bản app cũ chưa có cầu nối: bỏ qua
  }
}

/** Gọi một lần khi mở trang: áp lựa chọn đã lưu, theo dõi máy đổi sáng/tối khi chọn "Theo hệ thống" */
export function initTheme(): void {
  const mode = themeMode();
  apply(mode);
  // Đồng bộ xuống app: lựa chọn có thể đã đổi khi mở bằng trình duyệt trên cùng máy
  try {
    window.AndroidApp?.setTheme(mode);
  } catch {
    // bỏ qua
  }
  media()?.addEventListener?.("change", () => {
    if (themeMode() === "system") apply("system");
  });
}
