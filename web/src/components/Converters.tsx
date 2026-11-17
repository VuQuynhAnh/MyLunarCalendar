import { useState } from "react";
import { lunarToSolar, solarToLunar, yearCanChi } from "@mylunar/shared";
import { Field, inputClass } from "./ui";
import { longDate, pad, parseYmd, today, ymd } from "../lib/calendar";

/** Đổi ngày âm ↔ dương (CAL-UC01/BR-5), nằm trong tab Tiện ích. Đổi xong có "Xem trên lịch". */
function Result({ text, date, onShow }: { text: string; date: string | null; onShow(date: string): void }) {
  return (
    <div role="status" className="mt-3 text-sm">
      <p>{text}</p>
      {date && (
        <button type="button" onClick={() => onShow(date)} className="mt-2 min-h-11 rounded-xl border border-gold/60 px-4 font-medium text-gold">
          Xem trên lịch
        </button>
      )}
    </div>
  );
}

export function LunarToSolar({ onShow }: { onShow(date: string): void }) {
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState(() => String(parseYmd(today())[0]));
  const [leap, setLeap] = useState(false);
  const [result, setResult] = useState<{ text: string; date: string | null } | null>(null);

  const convert = () => {
    const [d, m, y] = [Number(day), Number(month), Number(year)];
    const s = Number.isInteger(d) && Number.isInteger(m) && y >= 1900 && y <= 2100 ? lunarToSolar(d, m, y, leap) : null;
    if (!s) return setResult({ text: "Ngày âm không tồn tại", date: null });
    const date = ymd(s.year, s.month, s.day);
    setResult({ text: `${pad(d)}/${pad(m)}${leap ? " nhuận" : ""} âm lịch năm ${y} là ${longDate(date)}`, date });
  };

  return (
    <section aria-label="Đổi ngày âm sang dương" className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="mb-2 font-semibold">Âm → Dương</h2>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Ngày">
          <input className={inputClass} inputMode="numeric" value={day} onChange={(e) => setDay(e.target.value)} />
        </Field>
        <Field label="Tháng">
          <input className={inputClass} inputMode="numeric" value={month} onChange={(e) => setMonth(e.target.value)} />
        </Field>
        <Field label="Năm">
          <input className={inputClass} inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} />
        </Field>
      </div>
      <label className="mb-3 flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={leap} onChange={(e) => setLeap(e.target.checked)} className="h-5 w-5 accent-gold" />
        Tháng nhuận
      </label>
      <button type="button" onClick={convert} className="min-h-12 w-full rounded-xl bg-gold font-medium text-bg active:bg-gold-deep">
        Đổi sang dương
      </button>
      {result && <Result {...result} onShow={onShow} />}
    </section>
  );
}

export function SolarToLunar({ onShow }: { onShow(date: string): void }) {
  const [date, setDate] = useState(today());
  const [result, setResult] = useState<{ text: string; date: string | null } | null>(null);

  const convert = () => {
    const [y, m, d] = parseYmd(date);
    if (!date || !(y >= 1900 && y <= 2100) || date < "1900-01-31") return setResult({ text: "Chọn ngày từ 31/01/1900 đến 31/12/2100", date: null });
    const l = solarToLunar(d, m, y);
    setResult({ text: `${longDate(date)} là ngày ${l.day} tháng ${l.month}${l.leap ? " nhuận" : ""} năm ${yearCanChi(l.year).name} (âm lịch)`, date });
  };

  return (
    <section aria-label="Đổi ngày dương sang âm" className="mt-3 rounded-2xl border border-line bg-surface p-4">
      <h2 className="mb-2 font-semibold">Dương → Âm</h2>
      <Field label="Ngày dương">
        <input className={inputClass} type="date" min="1900-01-31" max="2100-12-31" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <button type="button" onClick={convert} className="min-h-12 w-full rounded-xl bg-gold font-medium text-bg active:bg-gold-deep">
        Đổi sang âm
      </button>
      {result && <Result {...result} onShow={onShow} />}
    </section>
  );
}
