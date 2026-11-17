import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useChat } from "../chat-context";

// Gợi ý câu hỏi khi khung chat còn trống
const SUGGESTIONS = ["Hôm nay tôi nên làm gì?", "Ngày mai có hợp để khai trương không?", "Tuổi của tôi hợp màu gì?"];

/**
 * Khung chat hỏi AI trượt từ đáy, gần toàn màn hình điện thoại (HORO-UC02, R-UI-03). AI trả lời dựa
 * trên hồ sơ, thông tin hôm nay và tử vi đã xem do server gửi kèm; luôn ghi đây chỉ là tham khảo.
 */
export function ChatSheet() {
  const { open, messages, sending, error, close, send } = useChat();
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  // Tin mới thì cuộn xuống cuối
  useEffect(() => {
    bottom.current?.scrollIntoView?.({ block: "end" });
  }, [messages.length, sending, open]);

  // Esc để đóng
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  // Xoá ô nhập ngay khi gửi như các app chat; AI không trả lời được thì trả chữ lại để gửi lại
  const submit = async () => {
    const question = text;
    setText("");
    if (!(await send(question))) setText(question);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Hỏi AI"
        className="safe-bottom flex h-[85dvh] w-full max-w-md flex-col rounded-t-2xl bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-2">
          <h2 className="font-semibold text-gold">Hỏi AI</h2>
          <button type="button" onClick={close} className="min-h-11 px-2 text-sm text-muted">
            Đóng
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3 text-sm">
          {messages.length === 0 && (
            <div className="space-y-2">
              <p className="text-muted">Hỏi về ngày tốt xấu, tuổi, mệnh và tử vi của bạn.</p>
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => setText(s)} className="block min-h-11 rounded-xl border border-line px-3 text-left text-ink">
                  {s}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <p
              key={i}
              className={cn(
                "max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2",
                m.role === "user" ? "ml-auto bg-gold text-bg" : "bg-surface-2 text-ink",
              )}
            >
              {m.content}
            </p>
          ))}
          {sending && (
            <p className="text-muted" role="status">
              AI đang trả lời…
            </p>
          )}
          {error && (
            <p role="alert" className="text-bad">
              {error}
            </p>
          )}
          <div ref={bottom} />
        </div>

        <form
          className="border-t border-line px-4 pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="flex items-end gap-2">
            <textarea
              aria-label="Câu hỏi"
              rows={2}
              maxLength={1000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nhập câu hỏi…"
              className="min-h-12 flex-1 resize-none rounded-xl border border-line bg-bg px-3 py-2 text-base text-ink outline-none focus:border-gold"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="min-h-12 rounded-xl bg-gold px-4 font-medium text-bg disabled:opacity-50"
            >
              Gửi
            </button>
          </div>
          <div className="flex justify-between gap-2 py-2 text-xs text-muted">
            <span>Tham khảo, giải trí</span>
          </div>
        </form>
      </div>
    </div>
  );
}
