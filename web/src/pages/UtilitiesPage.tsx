import { Link, useNavigate } from "react-router-dom";
import { birthFacts } from "@mylunar/shared";
import { useAiEnabled } from "../config-context";
import { useProfiles } from "../profiles-context";
import { DateConverter } from "../components/Converters";
import { pad, parseYmd } from "../lib/calendar";

const dmy = (s: string) => {
  const [y, m, d] = parseYmd(s);
  return `${pad(d)}/${pad(m)}/${y}`;
};

/**
 * Tab Tiện ích: hồ sơ của chủ máy và lối vào Tử vi (chỉ khi AI bật), đổi ngày âm ↔ dương.
 * Mỗi máy một hồ sơ (user chốt 2026-11-18): chưa có thì mời thêm, có rồi thì hiện thẻ hồ sơ.
 */
export function UtilitiesPage() {
  const ai = useAiEnabled();
  const { profiles } = useProfiles();
  const navigate = useNavigate();
  const me = profiles[0];
  const facts = me ? birthFacts(me) : null;
  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Tiện ích</h1>
      {ai &&
        (me && facts ? (
          <section aria-label="Hồ sơ của bạn" className="rounded-2xl border border-gold/40 bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-lg font-semibold">{me.name}</p>
                <p className="text-sm text-muted">
                  {dmy(me.birthDate)}
                  {me.birthTime ? ` · ${me.birthTime} (giờ ${facts.gioSinh})` : ""} · {me.gender === "male" ? "Nam" : "Nữ"}
                </p>
                <p className="mt-1 text-sm">
                  Tuổi <span className="font-medium text-gold">{facts.tuoi}</span> · mệnh <span className="font-medium text-gold">{facts.menh.name}</span>
                </p>
              </div>
              <Link to={`/ho-so/${me.id}`} className="flex min-h-11 items-center px-2 text-sm text-muted underline">
                Sửa
              </Link>
            </div>
            <Link to="/tu-vi" className="mt-3 flex min-h-12 items-center justify-center rounded-xl bg-gold font-medium text-bg">
              Xem tử vi hôm nay
            </Link>
          </section>
        ) : (
          <section aria-label="Hồ sơ của bạn" className="rounded-2xl border border-dashed border-line bg-surface p-4 text-center">
            <p className="mb-3 text-sm text-muted">Thêm ngày giờ sinh của bạn để xem tử vi hằng ngày</p>
            <Link to="/ho-so/them" className="inline-flex min-h-12 items-center rounded-xl bg-gold px-6 font-medium text-bg">
              Thêm hồ sơ
            </Link>
          </section>
        ))}
      <DateConverter onShow={(date) => navigate(`/?ngay=${date}`)} />
    </div>
  );
}
