/**
 * Đọc/ghi localStorage an toàn: chế độ riêng tư, bị chặn lưu hay dữ liệu hỏng thì trả giá trị mặc
 * định, không làm sập trang. Hồ sơ và tử vi đã xem chỉ nằm ở đây (user chốt 2026-11-17: không có
 * database, không sao lưu); xoá dữ liệu trình duyệt là mất.
 */
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Hết chỗ hoặc bị chặn: chỉ giữ trong phiên
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Bị chặn: bỏ qua
  }
}

export const KEYS = {
  profiles: "mlc.profiles",
  selected: "mlc.selectedProfile",
  readings: "mlc.readings",
  password: "mlc.password",
  config: "mlc.config",
  theme: "mlc.theme",
} as const;
