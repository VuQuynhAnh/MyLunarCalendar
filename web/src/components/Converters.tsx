import { useState } from "react";
import { lunarToSolar, solarToLunar, yearCanChi } from "@mylunar/shared";
import { inputClass } from "./ui";
import { longDate, parseYmd, today, ymd } from "../lib/calendar";

type Result = { text: string; date: string | null };

/**
 * Đổi ngày âm ↔ dương gọn trong một khung (CAL-UC01/BR-5, user chốt 2026-11-18): đầu khung
 * "Dương ⇄ Âm", nút mũi tên 2 chiều đảo chiều đổi; ô nhập đổi theo chiều. Đổi xong có "Xem trên lịch".
 */
export function DateConverter({ onShow }: { onShow(date: string): void }) {
  const [toLunar, setToLunar] = useState(true);
  const [solar, setSolar] = useState(today());
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState(() => String(parseYmd(today())[0]));
  const [leap, setLeap] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const swap = () => {
    setToLunar((v) => !v);
    setResult(null);
  };

  const convert = () => {
    if (toLunar) {
      const [y, m, d] = parseYmd(solar);
      if (!solar || !(y >= 1900 && y <= 2100) || solar < "1900-01-31") return setResult({ text: "Chọn ngày từ 31/01/1900 đến 31/12/2100", date: null });
      const l = solarToLunar(d, m, y);
      return setResult({ text: `Ngày ${l.day} tháng ${l.month}${l.leap ? " nhuận" : ""} năm ${yearCanChi(l.year).name} (âm lịch)`, date: solar });
    }
    const [d, m, y] = [Number(day), Number(month), Number(year)];
    const s = Number.isInteger(d) && Number.isInteger(m) && y >= 1900 && y <= 2100 ? lunarToSolar(d, m, y, leap) : null;
    if (!s) return setResult({ text: "Ngày âm không tồn tại", date: null });
    const date = ymd(s.year, s.month, s.day);
    setResult({ text: `${longDate(date)} (dương lịch)`, date });
  };

  const from = toLunar ? "Dương" : "Âm";
  const to = toLunar ? "Âm" : "Dương";
  return (
    <section aria-label="Đổi ngày âm dương" className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Đổi ngày</h2>
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="w-12 text-right">{from}</span>
          <button
            type="button"
            onClick={swap}
            aria-label={`Đảo chiều, đang đổi ${from} sang ${to}`}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/60 text-gold active:bg-gold/15"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8h15l-4-4M20 16H5l4 4" />
            </svg>
          </button>
          <span className="w-12">{to}</span>
        </div>
      </div>

      <div className="flex items-end gap-2">
        {toLunar ? (
          <input
            aria-label="Ngày dương"
            className={inputClass}
            type="date"
            min="1900-01-31"
            max="2100-12-31"
            value={solar}
            onChange={(e) => setSolar(e.target.value)}
          />
        ) : (
          <div className="grid flex-1 grid-cols-[1fr_1fr_1.4fr] gap-1">
            <input aria-label="Ngày âm" placeholder="Ngày" className={inputClass} inputMode="numeric" value={day} onChange={(e) => setDay(e.target.value)} />
            <input aria-label="Tháng âm" placeholder="Tháng" className={inputClass} inputMode="numeric" value={month} onChange={(e) => setMonth(e.target.value)} />
            <input aria-label="Năm âm" placeholder="Năm" className={inputClass} inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
        )}
        <button type="button" onClick={convert} className="h-12 shrink-0 rounded-xl bg-gold px-4 font-medium text-bg active:bg-gold-deep">
          Đổi
        </button>
      </div>
      {!toLunar && (
        <label className="mt-1 flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={leap} onChange={(e) => setLeap(e.target.checked)} className="h-5 w-5 accent-gold" />
          Tháng nhuận
        </label>
      )}

      {result && (
        <div role="status" className="mt-2 flex items-center justify-between gap-2 text-sm">
          <span>{result.text}</span>
          {result.date && (
            <button type="button" onClick={() => onShow(result.date!)} className="min-h-11 shrink-0 px-2 font-medium text-gold underline">
              Xem trên lịch
            </button>
          )}
        </div>
      )}
    </section>
  );
}
