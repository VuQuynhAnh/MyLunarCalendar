import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { lunarToSolar, solarToLunar, yearCanChi } from "@mylunar/shared";
import { Field, inputClass } from "./ui";
import { longDate, pad, parseYmd, today, ymd } from "../lib/calendar";

/** Trang tải APK của app Android (GitHub Actions build và đính vào bản phát hành mới nhất) */
export const APK_URL = "https://github.com/VuQuynhAnh/MyLunarCalendar/releases/latest";

/** Đang chạy trong app Android (webview) thì không mời tải app nữa */
const inAndroidApp = () => /; wv\)/.test(navigator.userAgent);

/**
 * Bảng "Thêm" mở từ nút nổi trên nút Hỏi AI (CAL-UC01/BR-5, user chốt 2026-11-17): đổi ngày âm ↔
 * dương và tải app Android. Đổi xong có nút "Xem trên lịch" mở đúng ngày đó ở tab Lịch.
 */
export function MoreSheet({ onClose }: { onClose(): void }) {
  const navigate = useNavigate();
  const show = (date: string) => {
    onClose();
    navigate(`/?ngay=${date}`);
  };

  // Esc để đóng
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Thêm"
        className="safe-bottom max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-surface px-4 pb-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between bg-surface py-2">
          <h2 className="font-semibold text-gold">Thêm</h2>
          <button type="button" onClick={onClose} className="min-h-11 px-2 text-sm text-muted">
            Đóng
          </button>
        </div>
        <LunarToSolar onShow={show} />
        <SolarToLunar onShow={show} />
        {!inAndroidApp() && (
          <section aria-label="Tải app Android" className="mt-3 rounded-2xl border border-line p-4 text-sm">
            <h3 className="mb-2 font-semibold">App Android</h3>
            <p className="mb-2 text-muted">Mở lịch như app, kèm widget lịch tháng trên màn hình chính (chạy không cần mạng).</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                <a href={APK_URL} target="_blank" rel="noreferrer" className="font-medium text-gold underline">
                  Tải mylunarcalendar.apk
                </a>{" "}
                ở bản phát hành mới nhất.
              </li>
              <li>Mở file vừa tải, cho phép cài từ nguồn này, rồi Cài đặt.</li>
              <li>Mở app, dán địa chỉ web này: {window.location.origin}</li>
              <li>Menu ⋮ → Thêm widget ra màn hình chính.</li>
            </ol>
            <p className="mt-2 text-xs text-muted">Có bản mới, app tự hỏi cập nhật; không phải gỡ cài lại.</p>
          </section>
        )}
      </div>
    </div>
  );
}

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

function LunarToSolar({ onShow }: { onShow(date: string): void }) {
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
    <section aria-label="Đổi ngày âm sang dương" className="rounded-2xl border border-line p-4">
      <h3 className="mb-2 font-semibold">Âm → Dương</h3>
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

function SolarToLunar({ onShow }: { onShow(date: string): void }) {
  const [date, setDate] = useState(today());
  const [result, setResult] = useState<{ text: string; date: string | null } | null>(null);

  const convert = () => {
    const [y, m, d] = parseYmd(date);
    if (!date || !(y >= 1900 && y <= 2100) || date < "1900-01-31") return setResult({ text: "Chọn ngày từ 31/01/1900 đến 31/12/2100", date: null });
    const l = solarToLunar(d, m, y);
    setResult({ text: `${longDate(date)} là ngày ${l.day} tháng ${l.month}${l.leap ? " nhuận" : ""} năm ${yearCanChi(l.year).name} (âm lịch)`, date });
  };

  return (
    <section aria-label="Đổi ngày dương sang âm" className="mt-3 rounded-2xl border border-line p-4">
      <h3 className="mb-2 font-semibold">Dương → Âm</h3>
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
