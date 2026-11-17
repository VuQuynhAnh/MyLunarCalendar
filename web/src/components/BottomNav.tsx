import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

// Icon nét đơn giản, vẽ tay để khỏi thêm thư viện icon
const icons = {
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  stars: "M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z",
  people: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3 3-5 6-5s6 2 6 5M17 11a2.5 2.5 0 1 0 0-5M18 15c2 .5 3 2 3 5",
};

const tabs = [
  { to: "/", end: true, label: "Lịch", icon: icons.calendar },
  { to: "/tu-vi", end: false, label: "Tử vi", icon: icons.stars },
  { to: "/ho-so", end: false, label: "Hồ sơ", icon: icons.people },
];

/** Thanh 3 tab cố định đáy, có nhãn chữ, mỗi tab cao ≥ 44px (R-UI-03). */
export function BottomNav() {
  return (
    <nav
      aria-label="Điều hướng chính"
      className="safe-bottom fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md border-t border-line bg-surface"
    >
      <div className="grid h-[var(--spacing-tabbar)] grid-cols-3">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              cn("flex flex-col items-center justify-center gap-0.5 text-xs", isActive ? "font-medium text-gold" : "text-muted")
            }
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d={t.icon} />
            </svg>
            {t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
