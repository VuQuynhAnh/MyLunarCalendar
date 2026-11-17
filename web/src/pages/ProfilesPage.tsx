import { Link } from "react-router-dom";
import { birthFacts } from "@mylunar/shared";
import { useProfiles } from "../profiles-context";
import { parseYmd, pad } from "../lib/calendar";

const dmy = (s: string) => {
  const [y, m, d] = parseYmd(s);
  return `${pad(d)}/${pad(m)}/${y}`;
};

/** Tab Hồ sơ (HORO-UC01/BR-1): danh sách người xem tử vi kèm tuổi, mệnh */
export function ProfilesPage() {
  const { profiles } = useProfiles();
  return (
    <div>
      <h1 className="mb-3 text-lg font-semibold">Hồ sơ</h1>
      {profiles.length === 0 ? (
        <p className="py-6 text-center text-muted">Chưa có hồ sơ nào</p>
      ) : (
        <ul className="space-y-2">
          {profiles.map((p) => {
            const f = birthFacts(p);
            return (
            <li key={p.id}>
              <Link to={`/ho-so/${p.id}`} className="block rounded-2xl border border-line bg-surface p-4">
                <span className="font-medium">{p.name}</span>
                <span className="mt-1 block text-sm text-muted">
                  {dmy(p.birthDate)}
                  {p.birthTime ? ` · ${p.birthTime} (giờ ${f.gioSinh})` : ""} · tuổi {f.tuoi} · mệnh {f.menh.name}
                </span>
              </Link>
            </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted">Hồ sơ chỉ lưu trên máy này; xoá dữ liệu trình duyệt là mất.</p>
      <Link to="/ho-so/them" className="mt-3 flex min-h-12 items-center justify-center rounded-xl bg-gold font-medium text-bg">
        Thêm hồ sơ
      </Link>
    </div>
  );
}
