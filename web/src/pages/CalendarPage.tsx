import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { dayInfo, lunarToSolar } from "@mylunar/shared";
import { cn } from "@/lib/utils";
import { WEEKDAYS, longDate, monthGrid, pad, parseYmd, today, ymd } from "../lib/calendar";
import { Field, inputClass } from "../components/ui";

/**
 * Tab Lịch (CAL-UC01): lịch tháng dương có ngày âm trong từng ô, ngày lễ tô màu; chạm một ngày để
 * xem chi tiết (can chi, hoàng đạo, tiết khí, giờ hoàng đạo). Tính hoàn toàn trên trình duyệt.
 */
export function CalendarPage() {
  const now = today();
  // `?ngay=YYYY-MM-DD`: mở thẳng một ngày (app Android mở từ ô ngày trên widget)
  const [params] = useSearchParams();
  const asked = params.get("ngay");
  const start = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) && asked >= "1900-02-01" && asked <= "2100-12-31" ? asked : now;
  const [selected, setSelected] = useState(start);
  const [[year, month], setView] = useState(() => parseYmd(start).slice(0, 2) as [number, number]);
  const cells = useMemo(() => monthGrid(year, month), [year, month]);

  const shift = (n: number) => {
    const m = month - 1 + n;
    setView([year + Math.floor(m / 12), ((m % 12) + 12) % 12 + 1]);
  };
  const goTo = (date: string) => {
    setSelected(date);
    const [y, m] = parseYmd(date);
    setView([y, m]);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" aria-label="Tháng trước" onClick={() => shift(-1)} className="min-h-11 min-w-11 rounded-xl text-xl text-gold">
          ‹
        </button>
        <button type="button" onClick={() => goTo(now)} className="min-h-11 px-2 text-lg font-semibold" title="Về hôm nay">
          Tháng {month} · {year}
        </button>
        <button type="button" aria-label="Tháng sau" onClick={() => shift(1)} className="min-h-11 min-w-11 rounded-xl text-xl text-gold">
          ›
        </button>
      </div>

      <div role="grid" aria-label={`Lịch tháng ${month} năm ${year}`} className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <div key={w} className={cn("py-1 text-xs text-muted", w === "CN" && "text-bad")}>
            {w}
          </div>
        ))}
        {cells.map((c) => (
          <button
            key={c.date}
            type="button"
            role="gridcell"
            aria-selected={c.date === selected}
            aria-label={`${longDate(c.date)}, âm ${c.lunarText}${c.holiday ? `, ${c.holiday.name}` : ""}`}
            onClick={() => setSelected(c.date)}
            className={cn(
              "num flex min-h-12 flex-col items-center justify-center rounded-xl leading-tight",
              !c.inMonth && "opacity-35",
              c.date === selected ? "bg-gold/20 ring-1 ring-gold" : c.date === now && "ring-1 ring-gold/60",
            )}
          >
            <span className={cn("text-base font-medium", c.holiday?.off || c.sunday ? "text-bad" : c.holiday ? "text-gold" : "text-ink")}>{c.day}</span>
            <span className={cn("text-[11px]", c.lunarFirst ? "font-medium text-gold" : "text-muted")}>{c.lunarText}</span>
          </button>
        ))}
      </div>

      <DayDetail date={selected} />
      <Converter onPick={goTo} />
    </div>
  );
}

/** Chi tiết một ngày */
function DayDetail({ date }: { date: string }) {
  const d = dayInfo(date);
  const l = d.lunar;
  return (
    <section aria-label="Chi tiết ngày" className="mt-4 rounded-2xl border border-line bg-surface p-4 text-sm">
      <h2 className="text-base font-semibold">{longDate(date)}</h2>
      <p className="mt-1 text-gold">
        Ngày {l.day} tháng {l.month}
        {l.leap ? " (nhuận)" : ""} năm {d.canChi.year}
      </p>
      {d.holidays.length > 0 && (
        <p className="mt-1 font-medium text-bad">{d.holidays.map((h) => h.name).join(" · ")}</p>
      )}
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="text-muted">Can chi</dt>
        <dd>
          Ngày {d.canChi.day}, tháng {d.canChi.month}
        </dd>
        <dt className="text-muted">Ngày</dt>
        <dd className={d.hoangDao.good ? "text-good" : "text-bad"}>
          {d.hoangDao.good ? "Hoàng đạo" : "Hắc đạo"} ({d.hoangDao.name})
        </dd>
        <dt className="text-muted">Ngũ hành</dt>
        <dd>{d.napAm.name}</dd>
        <dt className="text-muted">Tiết khí</dt>
        <dd>
          {d.tietKhi.name}
          {d.tietKhi.startsToday ? " (bắt đầu hôm nay)" : ""}
        </dd>
        <dt className="text-muted">Giờ tốt</dt>
        <dd>{d.gioHoangDao.map((g) => `${g.chi} (${g.hours}h)`).join(", ")}</dd>
      </dl>
    </section>
  );
}

/** Đổi ngày âm → dương (CAL-UC01/BR-5) */
function Converter({ onPick }: { onPick(date: string): void }) {
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState(() => String(parseYmd(today())[0]));
  const [leap, setLeap] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const convert = () => {
    const [d, m, y] = [Number(day), Number(month), Number(year)];
    const s = Number.isInteger(d) && Number.isInteger(m) && y >= 1900 && y <= 2100 ? lunarToSolar(d, m, y, leap) : null;
    if (!s) {
      setResult("Ngày âm không tồn tại");
      return;
    }
    const date = ymd(s.year, s.month, s.day);
    setResult(`${pad(d)}/${pad(m)}${leap ? " nhuận" : ""} âm lịch năm ${y} là ${longDate(date)}`);
    onPick(date);
  };

  return (
    <section aria-label="Đổi ngày âm sang dương" className="mt-4 rounded-2xl border border-line bg-surface p-4">
      <h2 className="mb-2 font-semibold">Đổi ngày âm → dương</h2>
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
        Đổi
      </button>
      {result && (
        <p role="status" className="mt-3 text-sm">
          {result}
        </p>
      )}
    </section>
  );
}
