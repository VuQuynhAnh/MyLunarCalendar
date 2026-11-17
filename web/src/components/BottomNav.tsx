import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

// Icon nét đơn giản, vẽ tay để khỏi thêm thư viện icon
const icons = {
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  tools: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4",
};

// Tiện ích gồm cả trang con Tử vi, Hồ sơ: đang ở đó thì tab Tiện ích vẫn sáng
const tabs = [
  { to: "/", label: "Lịch", icon: icons.calendar, match: (p: string) => p === "/" },
  { to: "/tien-ich", label: "Tiện ích", icon: icons.tools, match: (p: string) => /^\/(tien-ich|tu-vi|ho-so)/.test(p) },
  { to: "/cai-dat", label: "Cài đặt", icon: icons.settings, match: (p: string) => p.startsWith("/cai-dat") },
];

/** Thanh 3 tab cố định đáy, có nhãn chữ, mỗi tab cao ≥ 44px (R-UI-03). */
export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="Điều hướng chính"
      className="safe-bottom fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md border-t border-line bg-surface"
    >
      <div className="grid h-[var(--spacing-tabbar)] grid-cols-3">
        {tabs.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            aria-current={t.match(pathname) ? "page" : undefined}
            className={cn("flex flex-col items-center justify-center gap-0.5 text-xs", t.match(pathname) ? "font-medium text-gold" : "text-muted")}
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d={t.icon} />
            </svg>
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
