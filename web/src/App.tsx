import { useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { api, handleUnauthorized, hasPassword, setPassword } from "./api";
import { KEYS, load, save } from "./lib/storage";
import { ConfigContext, useConfig, type Config } from "./config-context";
import { ProfilesProvider } from "./profiles-context";
import { ChatProvider } from "./chat-context";
import { AppShell } from "./components/AppShell";
import { PasswordPage } from "./pages/PasswordPage";
import { CalendarPage } from "./pages/CalendarPage";
import { HoroscopePage } from "./pages/HoroscopePage";
import { ProfilesPage } from "./pages/ProfilesPage";
import { ProfileFormPage } from "./pages/ProfileFormPage";

/**
 * Không có tài khoản (user chốt 2026-11-17). Lịch mở ngay, không chờ server (server miễn phí có thể
 * đang ngủ cả phút): dùng cấu hình lần trước nhớ trên máy, hỏi server xong thì cập nhật.
 * - Server chưa có key Gemini, hoặc không gọi được: ẩn phần AI, không báo lỗi (HORO-UC01/BR-8).
 * - Server đặt mật khẩu chung: hỏi một lần rồi nhớ; server báo sai (401) thì hỏi lại.
 */
function Gate() {
  // Cấu hình lần trước (null = máy chưa từng hỏi server)
  const [config, setConfig] = useState<Config | null>(() => load<Config | null>(KEYS.config, null));
  const [ready, setReady] = useState(config !== null);
  const [ask, setAsk] = useState<"no" | "ask" | "wrong">("no");

  useEffect(() => {
    handleUnauthorized(() => setAsk("wrong"));
    api<Config>("/config")
      .then((c) => {
        setConfig(c);
        setReady(true);
        save(KEYS.config, c);
        if (c.aiEnabled && c.passwordRequired && !hasPassword()) setAsk("ask");
      })
      .catch(() => {
        setConfig((c) => ({ passwordRequired: c?.passwordRequired ?? false, aiEnabled: false }));
        setReady(true);
      });
    return () => handleUnauthorized(null);
  }, []);

  if (ask !== "no") {
    return (
      <PasswordPage
        wrong={ask === "wrong"}
        onSubmit={(p) => {
          setPassword(p);
          setAsk("no");
        }}
      />
    );
  }
  return (
    <ConfigContext.Provider value={{ passwordRequired: false, aiEnabled: false, ...config, ready }}>
      <ProfilesProvider>
        <ChatProvider>
          <Outlet />
        </ChatProvider>
      </ProfilesProvider>
    </ConfigContext.Provider>
  );
}

/** Trang chỉ có khi AI bật; tắt thì về tab Lịch. Chưa biết (lần đầu, đang hỏi server) thì chờ, không chuyển vội */
function AiOnly() {
  const { aiEnabled, ready } = useConfig();
  if (!ready) return <p className="p-4 text-muted">Đang tải…</p>;
  return aiEnabled ? <Outlet /> : <Navigate to="/" replace />;
}

/**
 * 3 tab (Lịch / Tử vi / Hồ sơ) nằm trong AppShell có thanh tab dưới; form hồ sơ là trang riêng
 * toàn màn hình, nên nút back của điện thoại quay về tab trước.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Gate />}>
        <Route element={<AppShell />}>
          <Route index element={<CalendarPage />} />
          <Route element={<AiOnly />}>
            <Route path="tu-vi" element={<HoroscopePage />} />
            <Route path="ho-so" element={<ProfilesPage />} />
          </Route>
        </Route>
        <Route element={<AiOnly />}>
          <Route path="ho-so/them" element={<ProfileFormPage />} />
          <Route path="ho-so/:id" element={<ProfileFormPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
