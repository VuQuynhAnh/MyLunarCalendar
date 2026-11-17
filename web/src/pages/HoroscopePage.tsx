import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Horoscope, type Profile, type Score } from "../api";
import { useProfiles } from "../profiles-context";
import { useChat } from "../chat-context";
import { LoadError } from "../components/ui";
import { addDays, longDate, today } from "../lib/calendar";
import { cachedReading, saveReading } from "../lib/readings";

/** Xem trước/sau tối đa ngần này ngày, khớp giới hạn của server (HORO-UC01/BR-3) */
const RANGE_DAYS = 30;

const ASPECT_LABEL = { work: "Công việc", money: "Tài chính", love: "Tình cảm", health: "Sức khỏe" } as const;

function Stars({ score, label }: { score: Score; label: string }) {
  return (
    <span aria-label={`${label}: ${score}/5`} className="text-gold">
      {"★".repeat(score)}
      <span className="text-line">{"★".repeat(5 - score)}</span>
    </span>
  );
}

/**
 * Tab Tử vi (HORO-UC01): chọn hồ sơ và ngày, AI viết tử vi dựa trên số liệu code tính (tuổi, mệnh,
 * can chi ngày, hợp xung). Bản đã xem lưu trên máy, mở lại không gọi AI. "Hỏi thêm" mở chat với tóm
 * tắt vừa xem (HORO-UC02).
 */
export function HoroscopePage() {
  const { profiles, selectedId } = useProfiles();
  const { openChat } = useChat();
  const now = today();
  const [date, setDate] = useState(now);
  const [data, setData] = useState<Horoscope | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Kết quả về muộn của hồ sơ/ngày cũ không được ghi đè cái đang xem (R-UI-02)
  const wanted = useRef("");

  const load = useCallback(async (p: Profile, d: string) => {
    const key = `${p.id}|${p.birthDate}|${p.birthTime}|${p.gender}|${d}`;
    wanted.current = key;
    setError(null);
    const cached = cachedReading(p, d);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { id: _id, ...input } = p;
      const res = await api<Horoscope>("/horoscope", { method: "POST", body: { ...input, date: d } });
      saveReading(p, res, today());
      if (wanted.current === key) setData(res);
    } catch (err) {
      if (wanted.current === key) {
        setData(null);
        setError(err instanceof Error ? err.message : "Chưa xem được tử vi");
      }
    } finally {
      if (wanted.current === key) setLoading(false);
    }
  }, []);

  const profile = profiles.find((p) => p.id === selectedId);
  useEffect(() => {
    if (profile) void load(profile, date);
  }, [load, profile, date]);

  if (!profile) {
    return (
      <div className="pt-10 text-center">
        <p className="mb-4 text-muted">Thêm ngày sinh để xem tử vi hằng ngày</p>
        <Link to="/ho-so/them" className="inline-flex min-h-12 items-center rounded-xl bg-gold px-6 font-medium text-bg">
          Thêm hồ sơ
        </Link>
      </div>
    );
  }

  const r = data?.reading;
  const f = data?.facts;
  return (
    <div>
      <h1 className="mb-3 text-lg font-semibold">Tử vi</h1>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Ngày trước"
          disabled={date <= addDays(now, -RANGE_DAYS)}
          onClick={() => setDate(addDays(date, -1))}
          className="min-h-11 min-w-11 text-xl text-gold disabled:opacity-30"
        >
          ‹
        </button>
        <button type="button" onClick={() => setDate(now)} className="min-h-11 px-2 font-medium">
          {date === now ? "Hôm nay, " : ""}
          {longDate(date)}
        </button>
        <button
          type="button"
          aria-label="Ngày sau"
          disabled={date >= addDays(now, RANGE_DAYS)}
          onClick={() => setDate(addDays(date, 1))}
          className="min-h-11 min-w-11 text-xl text-gold disabled:opacity-30"
        >
          ›
        </button>
      </div>

      {error && <LoadError message={error} onRetry={() => void load(profile, date)} />}
      {loading && (
        <p role="status" className="mb-3 text-sm text-muted">
          AI đang xem tử vi…
        </p>
      )}

      {data && r && f && (
        <article className="space-y-3">
          <section className="rounded-2xl border border-line bg-surface p-4 text-sm">
            <p className="text-muted">
              {profile.name} · tuổi {f.person.tuoi} · mệnh {f.person.menh.name}
            </p>
            <p className="mt-1">
              Ngày {f.day.canChi.day} ·{" "}
              <span className={f.day.hoangDao.good ? "text-good" : "text-bad"}>{f.day.hoangDao.good ? "hoàng đạo" : "hắc đạo"}</span>
              {f.relation.chi.length > 0 && <> · {f.relation.chi.join(", ")} với tuổi</>}
            </p>
            <div className="mt-3 flex items-center gap-2 text-lg">
              <Stars score={r.score} label="Điểm ngày" />
            </div>
            <p className="mt-2 text-base">{r.summary}</p>
          </section>

          <section className="grid gap-2">
            {r.aspects.map((a) => (
              <div key={a.key} className="rounded-2xl border border-line bg-surface p-3 text-sm">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium">{ASPECT_LABEL[a.key]}</span>
                  <Stars score={a.score} label={ASPECT_LABEL[a.key]} />
                </div>
                <p className="text-muted">{a.text}</p>
              </div>
            ))}
          </section>

          <section className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-2xl border border-line bg-surface p-3">
              <h2 className="mb-1 font-medium text-good">Nên</h2>
              <ul className="list-disc pl-4 text-muted">
                {r.goodFor.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-3">
              <h2 className="mb-1 font-medium text-bad">Kiêng</h2>
              <ul className="list-disc pl-4 text-muted">
                {r.avoid.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
          </section>

          {r.advice && <p className="rounded-2xl bg-gold/10 p-3 text-sm text-gold-soft">{r.advice}</p>}
          <p className="text-sm text-muted">Giờ tốt: {f.day.gioHoangDao.map((g) => `${g.chi} (${g.hours}h)`).join(", ")}</p>

          <button
            type="button"
            onClick={() => openChat(`Tử vi ${longDate(data.date)} của ${profile.name}: ${r.summary}`)}
            className="min-h-12 w-full rounded-xl border border-gold/60 font-medium text-gold"
          >
            Hỏi thêm AI
          </button>
          <p className="text-xs text-muted">Tham khảo, giải trí; không phải lời khuyên cho quyết định quan trọng</p>
        </article>
      )}
    </div>
  );
}
