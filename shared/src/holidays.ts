import { lunarToSolar, solarToLunar, type LunarDate } from "./lunar";

/**
 * Ngày lễ Việt Nam. `off` = ngày nghỉ lễ theo Bộ luật Lao động (tô đỏ trên lịch); còn lại là ngày
 * kỷ niệm hoặc lễ truyền thống. Lễ âm lịch chỉ tính trong tháng thường, không tính tháng nhuận.
 */
export interface Holiday {
  name: string;
  off: boolean;
  lunar: boolean;
}

const SOLAR: Record<string, [string, boolean]> = {
  "1-1": ["Tết Dương lịch", true],
  "3-2": ["Thành lập Đảng Cộng sản Việt Nam", false],
  "14-2": ["Lễ Tình nhân", false],
  "8-3": ["Quốc tế Phụ nữ", false],
  "30-4": ["Giải phóng miền Nam", true],
  "1-5": ["Quốc tế Lao động", true],
  "19-5": ["Ngày sinh Chủ tịch Hồ Chí Minh", false],
  "1-6": ["Quốc tế Thiếu nhi", false],
  "27-7": ["Thương binh Liệt sĩ", false],
  // Từ 2021 được nghỉ thêm một ngày liền kề Quốc khánh; luật cho chọn 1/9 hoặc 3/9, đa số năm là 1/9
  "1-9": ["Nghỉ lễ Quốc khánh", true],
  "2-9": ["Quốc khánh", true],
  "20-10": ["Phụ nữ Việt Nam", false],
  "20-11": ["Nhà giáo Việt Nam", false],
  "22-12": ["Quân đội Nhân dân Việt Nam", false],
  "24-12": ["Đêm Giáng sinh", false],
  "25-12": ["Giáng sinh", false],
};

const LUNAR: Record<string, [string, boolean]> = {
  "1-1": ["Tết Nguyên Đán", true],
  "2-1": ["Mùng 2 Tết", true],
  "3-1": ["Mùng 3 Tết", true],
  "15-1": ["Rằm tháng Giêng", false],
  "3-3": ["Tết Hàn thực", false],
  "10-3": ["Giỗ Tổ Hùng Vương", true],
  "15-4": ["Lễ Phật đản", false],
  "5-5": ["Tết Đoan ngọ", false],
  "15-7": ["Lễ Vu Lan", false],
  "15-8": ["Tết Trung thu", false],
  "23-12": ["Ông Công Ông Táo", false],
};

/** Ngày lễ của một ngày dương lịch (có thể có cả lễ dương và lễ âm) */
export function holidaysOf(day: number, month: number, year: number, lunar: LunarDate = solarToLunar(day, month, year)): Holiday[] {
  const result: Holiday[] = [];
  const s = SOLAR[`${day}-${month}`];
  if (s && !(day === 1 && month === 9 && year < 2021)) result.push({ name: s[0], off: s[1], lunar: false });
  if (!lunar.leap) {
    const l = LUNAR[`${lunar.day}-${lunar.month}`];
    if (l) result.push({ name: l[0], off: l[1], lunar: true });
    // Giao thừa: ngày cuối tháng Chạp (29 hoặc 30 tuỳ năm), cũng là ngày nghỉ Tết
    if (lunar.month === 12 && lunar.day === lunar.monthLength) result.push({ name: "Giao thừa", off: true, lunar: true });
  }
  return result;
}

/** Ngày dương của Tết Nguyên Đán năm âm `year` */
export function tetOf(year: number) {
  return lunarToSolar(1, 1, year, false)!;
}

