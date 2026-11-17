import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { ChatSheet } from "./ChatSheet";
import { useChat } from "../chat-context";
import { useAiEnabled } from "../config-context";

/**
 * Khung 3 tab: header gọn, nội dung cuộn, thanh tab cố định đáy và nút "Hỏi AI" nổi trong tầm
 * ngón cái (R-UI-03). Màn rộng thì nội dung căn giữa, vẫn giữ bố cục điện thoại.
 */
export function AppShell() {
  const { openChat } = useChat();
  // Chưa bật AI: chỉ có tab Lịch, không cần thanh tab và nút Hỏi AI
  const ai = useAiEnabled();

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-bg">
      <header className="safe-top sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
        <div className="flex h-12 items-center px-4">
          <span className="font-semibold text-gold">MyLunarCalendar</span>
        </div>
      </header>

      <main className={ai ? "px-4 pb-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom)+5rem)] pt-4" : "safe-bottom px-4 pb-6 pt-4"}>
        <Outlet />
      </main>

      {/* Nút hỏi AI (HORO-UC02), 48px, ngay trên thanh tab */}
      {ai && (
      <button
        type="button"
        aria-label="Hỏi AI"
        onClick={() => openChat()}
        className="fixed bottom-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom)+1rem)] right-[max(1rem,calc(50vw-14rem+1rem))] z-20 flex h-12 w-12 items-center justify-center rounded-full border border-gold/60 bg-surface-2 text-gold shadow-lg active:bg-surface"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 5h16v11H9l-5 4z" />
          <path d="M8 10h8M8 13h5" />
        </svg>
      </button>
      )}
      {ai && <ChatSheet />}
      {ai && <BottomNav />}
    </div>
  );
}
