import { Link, useNavigate } from "react-router-dom";
import { useAiEnabled } from "../config-context";
import { LunarToSolar, SolarToLunar } from "../components/Converters";

/**
 * Tab Tiện ích (user chốt 2026-11-17): lối vào Tử vi và Hồ sơ (chỉ khi AI bật), đổi ngày âm ↔ dương.
 * Đổi xong bấm "Xem trên lịch" thì sang tab Lịch ở đúng ngày đó.
 */
export function UtilitiesPage() {
  const ai = useAiEnabled();
  const navigate = useNavigate();
  const show = (date: string) => navigate(`/?ngay=${date}`);
  return (
    <div>
      <h1 className="mb-3 text-lg font-semibold">Tiện ích</h1>
      {ai && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <Link to="/tu-vi" className="flex min-h-20 flex-col justify-center rounded-2xl border border-line bg-surface p-4">
            <span className="font-semibold text-gold">Tử vi</span>
            <span className="text-xs text-muted">Hôm nay của bạn và người nhà</span>
          </Link>
          <Link to="/ho-so" className="flex min-h-20 flex-col justify-center rounded-2xl border border-line bg-surface p-4">
            <span className="font-semibold text-gold">Hồ sơ</span>
            <span className="text-xs text-muted">Ngày giờ sinh để xem tử vi</span>
          </Link>
        </div>
      )}
      <LunarToSolar onShow={show} />
      <SolarToLunar onShow={show} />
    </div>
  );
}
