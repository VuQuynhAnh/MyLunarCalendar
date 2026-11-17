import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { dayInfo } from "@mylunar/shared";
import { cn } from "@/lib/utils";
import { WEEKDAYS, longDate, monthGrid, parseYmd, today } from "../lib/calendar";

/**
 * Tab Lịch (CAL-UC01): lịch tháng dương có ngày âm trong từng ô, ngày lễ tô màu; chạm một ngày để
 * xem chi tiết (can chi, hoàng đạo, tiết khí, giờ hoàng đạo). Tính hoàn toàn trên trình duyệt. Đổi ngày
 * âm ↔ dương nằm ở bảng "Thêm" (nút nổi).
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
  // Đổi ngày ở bảng "Thêm" hay chạm ô ngày trên widget khi trang đang mở: nhảy tới ngày mới
  useEffect(() => {
    if (start !== now) goTo(start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start]);

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
