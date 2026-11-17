import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
// Font đóng gói cùng app (không tải từ Google), đủ dấu tiếng Việt
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "./index.css";
import { AppRoutes } from "./App";
import { initTheme } from "./lib/theme";

// Áp sáng/tối trước khi vẽ để không nháy màu
initTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </StrictMode>,
);
