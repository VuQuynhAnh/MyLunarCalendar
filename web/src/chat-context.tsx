import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { vnDate } from "@mylunar/shared";
import { api } from "./api";
import { useProfiles } from "./profiles-context";
import { cachedReading } from "./lib/readings";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatState {
  open: boolean;
  messages: ChatMessage[];
  sending: boolean;
  error: string | null;
  /** Mở khung chat; `seed` = tin mở đầu của AI (vd tử vi vừa xem) */
  openChat(seed?: string): void;
  close(): void;
  /** Gửi câu hỏi; true = AI đã trả lời */
  send(text: string): Promise<boolean>;
}

const ChatContext = createContext<ChatState | null>(null);

/**
 * Chat hỏi AI (HORO-UC02). Lịch sử chỉ giữ trong phiên (user chốt): chuyển tab hay mở form
 * vẫn còn, tải lại trang là mất; server không lưu nội dung.
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { profiles } = useProfiles();
  // Hồ sơ mới nhất cho lần gửi (callback giữ nguyên giữa các lần render)
  const profilesNow = useRef(profiles);
  profilesNow.current = profiles;
  // Lịch sử hiện tại cho lần gửi: tin vừa thêm chưa kịp vào state khi gọi API
  const history = useRef<ChatMessage[]>([]);
  history.current = messages;

  const openChat = useCallback((seed?: string) => {
    setOpen(true);
    setError(null);
    if (seed) setMessages((ms) => (ms.at(-1)?.content === seed ? ms : [...ms, { role: "assistant", content: seed }]));
  }, []);

  const send = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content) return false;
    const next = [...history.current, { role: "user" as const, content }];
    setMessages(next);
    setSending(true);
    setError(null);
    try {
      // Hồ sơ và tử vi hôm nay chỉ có trên máy: gửi kèm để AI trả lời đúng người (HORO-UC02/BR-2)
      const today = vnDate();
      const list = profilesNow.current;
      const readings = list.flatMap((p) => {
        const h = cachedReading(p, today);
        return h ? [{ name: p.name, score: h.reading.score, summary: h.reading.summary }] : [];
      });
      const body = { messages: next, profiles: list.map(({ id: _id, ...p }) => p), readings };
      const r = await api<{ reply: string }>("/chat", { method: "POST", body });
      setMessages((ms) => [...ms, { role: "assistant", content: r.reply }]);
      return true;
    } catch (err) {
      // Không trả lời được: bỏ câu hỏi khỏi danh sách, chữ vẫn còn trong ô để gửi lại
      setMessages((ms) => (ms.at(-1) === next.at(-1) ? ms.slice(0, -1) : ms));
      setError(err instanceof Error ? err.message : "Chưa trả lời được, thử lại sau");
      return false;
    } finally {
      setSending(false);
    }
  }, []);

  return (
    <ChatContext.Provider value={{ open, messages, sending, error, openChat, close: () => setOpen(false), send }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatState {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat phải nằm trong ChatProvider");
  return ctx;
}
