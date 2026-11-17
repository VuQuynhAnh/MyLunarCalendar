import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { dayInfo } from "@mylunar/shared";
import { cn } from "@/lib/utils";
import { WEEKDAYS, longDate, monthGrid, parseYmd, today } from "../lib/calendar";

/**
 * Tab Lịch (CAL-UC01): lịch tháng dương có ngày âm trong từng ô, ngày lễ tô màu; chạm một ngày để
 * xem chi tiết (can chi, hoàng đạo, tiết khí, giờ hoàng đạo). Tính hoàn toàn trên trình duyệt. Chạm
 * tiêu đề để chọn tháng/năm; vuốt ngang hoặc ‹ › để sang tháng. Đổi ngày âm ↔ dương ở tab Tiện ích.
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
  const [picking, setPicking] = useState(false);
  // Đổi ngày ở tab Tiện ích hay chạm ô ngày trên widget khi trang đang mở: nhảy tới ngày mới
  useEffect(() => {
    if (start !== now) goTo(start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start]);

  // Vuốt ngang trên lưới lịch để chuyển tháng: vuốt sang trái là tháng sau. Chỉ tính khi vuốt ngang
  // rõ ràng (≥ 50px, ngang nhiều hơn dọc) để không lẫn với cuộn trang
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = t ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start0 = touch.current;
    const t = e.changedTouches[0];
    touch.current = null;
    if (!start0 || !t) return;
    const dx = t.clientX - start0.x;
    const dy = t.clientY - start0.y;
    if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.5) shift(dx < 0 ? 1 : -1);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" aria-label="Tháng trước" onClick={() => shift(-1)} className="min-h-11 min-w-11 rounded-xl text-xl text-gold">
          ‹
        </button>
        <button
          type="button"
          aria-expanded={picking}
          aria-label={`Chọn tháng, năm (đang xem tháng ${month} năm ${year})`}
          onClick={() => setPicking((p) => !p)}
          className="min-h-11 px-2 text-lg font-semibold"
        >
          Tháng {month} · {year} <span className="text-sm text-muted">▾</span>
        </button>
        <button type="button" aria-label="Tháng sau" onClick={() => shift(1)} className="min-h-11 min-w-11 rounded-xl text-xl text-gold">
          ›
        </button>
      </div>
      {picking && (
        <MonthPicker
          year={year}
          month={month}
          onPick={(y, m) => {
            setView([y, m]);
            setPicking(false);
          }}
          onToday={() => {
            goTo(now);
            setPicking(false);
          }}
        />
      )}
      {!picking && (selected !== now || year !== parseYmd(now)[0] || month !== parseYmd(now)[1]) && (
        <div className="mb-2 text-center">
          <button type="button" onClick={() => goTo(now)} className="min-h-11 rounded-full border border-line px-4 text-sm text-gold">
            Về hôm nay
          </button>
        </div>
      )}

      <div
        role="grid"
        aria-label={`Lịch tháng ${month} năm ${year}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="grid touch-pan-y grid-cols-7 gap-1 text-center"
      >
        {WEEKDAYS.map((w) => (
          <div key={w} className={cn("py-1 text-xs font-medium text-muted", w === "CN" && "text-bad", w === "T7" && "text-sat")}>
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
              // Hôm nay nổi nhất (nền vàng đặc); ngày nghỉ lễ nền đỏ nhạt; ngày đang chọn có viền
              c.date === now ? "bg-gold" : c.holiday?.off && "bg-bad/15",
              c.date === selected && "ring-2 ring-ink",
            )}
          >
            <span
              className={cn(
                "text-base font-semibold",
                c.date === now
                  ? "text-bg"
                  : c.holiday?.off || c.sunday
                    ? "text-bad"
                    : c.holiday
                      ? "text-gold"
                      : c.saturday
                        ? "text-sat"
                        : "text-ink",
              )}
            >
              {c.day}
            </span>
            {/* Mùng 1 và rằm: ngày âm đỏ đậm để thấy ngay ngày cúng */}
            <span className={cn("text-[11px]", c.date === now ? "font-medium text-bg" : c.lunarFirst ? "font-semibold text-bad" : "text-muted")}>
              {c.lunarText}
            </span>
          </button>
        ))}
      </div>

      <DayDetail date={selected} />
    </div>
  );
}

const YEARS = Array.from({ length: 201 }, (_, i) => 1900 + i);

/** Chọn nhanh tháng/năm (CAL-UC01/BR-12): năm dạng danh sách, tháng 12 ô */
function MonthPicker({ year, month, onPick, onToday }: { year: number; month: number; onPick(y: number, m: number): void; onToday(): void }) {
  const [y, setY] = useState(year);
  return (
    <div role="dialog" aria-label="Chọn tháng, năm" className="mb-3 rounded-2xl border border-line bg-surface p-3">
      <div className="mb-2 flex items-center gap-2">
        <label className="flex flex-1 items-center gap-2 text-sm">
          <span className="text-muted">Năm</span>
          <select
            aria-label="Năm"
            value={y}
            onChange={(e) => setY(Number(e.target.value))}
            className="h-11 flex-1 rounded-xl border border-line bg-bg px-2 text-base text-ink"
          >
            {YEARS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={onToday} className="min-h-11 rounded-xl border border-gold/60 px-3 text-sm font-medium text-gold">
          Hôm nay
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onPick(y, m)}
            className={cn("min-h-11 rounded-xl text-sm", m === month && y === year ? "bg-gold font-semibold text-bg" : "bg-surface-2 text-ink")}
          >
            Th {m}
          </button>
        ))}
      </div>
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
