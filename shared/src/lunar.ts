/**
 * Lịch âm Việt Nam theo thuật toán thiên văn của Hồ Ngọc Đức (công khai, là cách tính các
 * trang lịch âm Việt Nam đang dùng). Tính theo múi giờ +7: lịch Việt Nam khác lịch Trung Quốc
 * (+8) ở vài năm, vd Tết 1985 là 21/01/1985 ở Việt Nam nhưng 20/02/1985 ở Trung Quốc.
 *
 * Bản Kotlin trong `android/` là bản dịch 1-1 của file này; hai bản dùng chung bộ số liệu kiểm
 * tra `shared/test/lunar-cases.json`. Sửa công thức ở đây thì sửa cả bên Kotlin.
 */

/** Múi giờ của lịch âm Việt Nam */
export const VN_TIMEZONE = 7;

const PI = Math.PI;
const INT = Math.floor;

/** Số ngày Julius của một ngày dương lịch */
export function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = INT((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
  if (jd < 2299161) jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
  return jd;
}

export interface SolarDate {
  day: number;
  month: number;
  year: number;
}

/** Ngày dương lịch của một số ngày Julius */
export function jdToDate(jd: number): SolarDate {
  let b: number;
  let c: number;
  if (jd > 2299160) {
    const a = jd + 32044;
    b = INT((4 * a + 3) / 146097);
    c = a - INT((b * 146097) / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }
  const d = INT((4 * c + 3) / 1461);
  const e = c - INT((1461 * d) / 4);
  const m = INT((5 * e + 2) / 153);
  return {
    day: e - INT((153 * m + 2) / 5) + 1,
    month: m + 3 - 12 * INT(m / 10),
    year: b * 100 + d - 4800 + INT(m / 10),
  };
}

/** Thời điểm (ngày Julius, giờ UT) của lần sóc thứ k tính từ 1/1/1900 */
function newMoon(k: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = PI / 180;
  let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
  C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
  C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
  C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
  C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
  C1 = C1 + 0.001 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
  const deltat =
    T < -11
      ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
      : -0.000278 + 0.000265 * T + 0.000262 * T2;
  return jd1 + C1 - deltat;
}

/** Kinh độ mặt trời (radian, 0..2π) tại thời điểm jdn (ngày Julius, giờ UT) */
function sunLongitude(jdn: number): number {
  const T = (jdn - 2451545.0) / 36525;
  const T2 = T * T;
  const dr = PI / 180;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  DL = DL + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);
  let L = (L0 + DL) * dr;
  L = L - PI * 2 * INT(L / (PI * 2));
  return L;
}

/** Ngày (số Julius) bắt đầu tháng âm có lần sóc thứ k, theo giờ địa phương */
function newMoonDay(k: number, tz: number): number {
  return INT(newMoon(k) + 0.5 + tz / 24);
}

/** Cung hoàng đạo 30° (0..11) của mặt trời lúc 0 giờ địa phương ngày dayNumber */
function sunSector12(dayNumber: number, tz: number): number {
  return INT((sunLongitude(dayNumber - 0.5 - tz / 24) / PI) * 6);
}

/** Đoạn 15° (0..23) của mặt trời lúc 0 giờ địa phương ngày dayNumber; 0 = Xuân phân */
function sunSector24(dayNumber: number, tz: number): number {
  return INT((sunLongitude(dayNumber - 0.5 - tz / 24) / PI) * 12);
}

/** Ngày bắt đầu tháng 11 âm (tháng có Đông chí) của năm yy */
function lunarMonth11(yy: number, tz: number): number {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = INT(off / 29.530588853);
  let nm = newMoonDay(k, tz);
  if (sunSector12(nm, tz) >= 9) nm = newMoonDay(k - 1, tz);
  return nm;
}

/** Vị trí tháng nhuận tính từ tháng 11 âm a11 (năm có 13 tháng) */
function leapMonthOffset(a11: number, tz: number): number {
  const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last: number;
  let i = 1;
  let arc = sunSector12(newMoonDay(k + i, tz), tz);
  do {
    last = arc;
    i++;
    arc = sunSector12(newMoonDay(k + i, tz), tz);
  } while (arc !== last && i < 14);
  return i - 1;
}

export interface LunarDate {
  day: number;
  month: number;
  year: number;
  /** Tháng nhuận */
  leap: boolean;
  /** Số ngày Julius của ngày dương tương ứng */
  jd: number;
  /** Số ngày của tháng âm này (29 hoặc 30) */
  monthLength: number;
}

/** Dương lịch → âm lịch */
export function solarToLunar(dd: number, mm: number, yy: number, tz = VN_TIMEZONE): LunarDate {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = INT((dayNumber - 2415021.076998695) / 29.530588853);
  // Lần sóc mở đầu tháng chứa ngày này: k chỉ là ước lượng theo chu kỳ trăng trung bình, sóc thật
  // lệch được gần một ngày, nên lùi tới khi gặp lần sóc không sau ngày này. Thuật toán gốc chỉ lùi
  // một bước và ra ngày âm "0" ở vài ngày sát sóc (vd 07/05/2054).
  let mk = k + 1;
  while (newMoonDay(mk, tz) > dayNumber) mk--;
  const monthStart = newMoonDay(mk, tz);
  const nextStart = newMoonDay(mk + 1, tz);
  let a11 = lunarMonth11(yy, tz);
  let b11 = a11;
  let lunarYear: number;
  if (a11 >= monthStart) {
    lunarYear = yy;
    a11 = lunarMonth11(yy - 1, tz);
  } else {
    lunarYear = yy + 1;
    b11 = lunarMonth11(yy + 1, tz);
  }
  const lunarDay = dayNumber - monthStart + 1;
  const diff = INT((monthStart - a11) / 29);
  let leap = false;
  let lunarMonth = diff + 11;
  if (b11 - a11 > 365) {
    const leapDiff = leapMonthOffset(a11, tz);
    if (diff >= leapDiff) {
      lunarMonth = diff + 10;
      if (diff === leapDiff) leap = true;
    }
  }
  if (lunarMonth > 12) lunarMonth -= 12;
  if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;
  return { day: lunarDay, month: lunarMonth, year: lunarYear, leap, jd: dayNumber, monthLength: nextStart - monthStart };
}

/** Âm lịch → dương lịch; ngày không tồn tại (vd tháng nhuận sai, ngày 30 của tháng thiếu) thì null */
export function lunarToSolar(day: number, month: number, year: number, leap: boolean, tz = VN_TIMEZONE): SolarDate | null {
  if (month < 1 || month > 12 || day < 1 || day > 30) return null;
  let a11: number;
  let b11: number;
  if (month < 11) {
    a11 = lunarMonth11(year - 1, tz);
    b11 = lunarMonth11(year, tz);
  } else {
    a11 = lunarMonth11(year, tz);
    b11 = lunarMonth11(year + 1, tz);
  }
  const k = INT(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  let off = month - 11;
  if (off < 0) off += 12;
  if (b11 - a11 > 365) {
    const leapOff = leapMonthOffset(a11, tz);
    let leapMonth = leapOff - 2;
    if (leapMonth < 0) leapMonth += 12;
    if (leap && month !== leapMonth) return null;
    if (leap || off >= leapOff) off += 1;
  } else if (leap) {
    return null;
  }
  const monthStart = newMoonDay(k + off, tz);
  const nextStart = newMoonDay(k + off + 1, tz);
  if (day > nextStart - monthStart) return null;
  return jdToDate(monthStart + day - 1);
}

// ---------------------------------------------------------------------------
// Can chi, tiết khí, giờ hoàng đạo

export const CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"] as const;
export const CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"] as const;

/** 24 tiết khí, bắt đầu từ Xuân phân (kinh độ mặt trời 0°), mỗi tiết 15° */
export const TIET_KHI = [
  "Xuân phân", "Thanh minh", "Cốc vũ", "Lập hạ", "Tiểu mãn", "Mang chủng",
  "Hạ chí", "Tiểu thử", "Đại thử", "Lập thu", "Xử thử", "Bạch lộ",
  "Thu phân", "Hàn lộ", "Sương giáng", "Lập đông", "Tiểu tuyết", "Đại tuyết",
  "Đông chí", "Tiểu hàn", "Đại hàn", "Lập xuân", "Vũ thủy", "Kinh trập",
] as const;

export interface CanChi {
  can: number;
  chi: number;
  /** Vị trí trong 60 Hoa Giáp (0 = Giáp Tý) */
  index: number;
  name: string;
}

function canChi(can: number, chi: number): CanChi {
  // Hoa Giáp: số n (0..59) có can = n % 10, chi = n % 12; tìm n từ can và chi
  const index = (6 * can - 5 * chi + 60) % 60;
  return { can, chi, index, name: `${CAN[can]} ${CHI[chi]}` };
}

export const yearCanChi = (lunarYear: number) => canChi((lunarYear + 6) % 10, (lunarYear + 8) % 12);
export const dayCanChi = (jd: number) => canChi((jd + 9) % 10, (jd + 1) % 12);
/** Can chi tháng âm: tháng Giêng là tháng Dần; can theo can của năm */
export const monthCanChi = (lunarMonth: number, lunarYear: number) => canChi((lunarYear * 12 + lunarMonth + 3) % 10, (lunarMonth + 1) % 12);

/** Tiết khí mà ngày jd thuộc về, và ngày đó có phải ngày bắt đầu tiết không */
export function tietKhi(jd: number, tz = VN_TIMEZONE): { name: string; startsToday: boolean } {
  // Đoạn của mặt trời lúc cuối ngày (0 giờ hôm sau): tiết bắt đầu trong ngày thì tính cho ngày đó
  const end = sunSector24(jd + 1, tz);
  return { name: TIET_KHI[end]!, startsToday: sunSector24(jd, tz) !== end };
}

// Giờ hoàng đạo theo chi của ngày; ngày cách nhau 6 chi dùng chung một bảng (Tý-Ngọ, Sửu-Mùi…)
const GIO_HOANG_DAO = ["110100101100", "001101001011", "110011010010", "101100110100", "001011001101", "010010110011"];

export interface GioHoangDao {
  chi: string;
  /** "23-1", "1-3"… giờ đồng hồ */
  hours: string;
}

export function gioHoangDao(jd: number): GioHoangDao[] {
  const pattern = GIO_HOANG_DAO[((jd + 1) % 12) % 6]!;
  const result: GioHoangDao[] = [];
  for (let i = 0; i < 12; i++) {
    if (pattern[i] === "1") result.push({ chi: CHI[i]!, hours: `${(i * 2 + 23) % 24}-${(i * 2 + 1) % 24}` });
  }
  return result;
}

/**
 * 12 thần trực ngày (Thanh Long, Minh Đường…): 6 thần hoàng đạo (ngày tốt), 6 thần hắc đạo.
 * Thanh Long của tháng Giêng và tháng 7 rơi vào ngày Tý, mỗi cặp tháng sau lùi 2 chi
 * (tháng 2, 8: Dần; 3, 9: Thìn…). Dùng tháng âm, cách tính phổ biến của lịch vạn niên.
 */
const THAN = [
  { name: "Thanh Long", good: true },
  { name: "Minh Đường", good: true },
  { name: "Thiên Hình", good: false },
  { name: "Chu Tước", good: false },
  { name: "Kim Quỹ", good: true },
  { name: "Kim Đường", good: true },
  { name: "Bạch Hổ", good: false },
  { name: "Ngọc Đường", good: true },
  { name: "Thiên Lao", good: false },
  { name: "Huyền Vũ", good: false },
  { name: "Tư Mệnh", good: true },
  { name: "Câu Trận", good: false },
] as const;

export function ngayHoangDao(jd: number, lunarMonth: number): { name: string; good: boolean } {
  const start = (((lunarMonth - 1) % 6) * 2) % 12;
  const dayChi = (jd + 1) % 12;
  return THAN[(dayChi - start + 12) % 12]!;
}

// ---------------------------------------------------------------------------
// Ngũ hành nạp âm (60 Hoa Giáp, mỗi cặp can chi liền nhau chung một nạp âm)

export type NguHanh = "Kim" | "Mộc" | "Thủy" | "Hỏa" | "Thổ";

const NAP_AM: [string, NguHanh][] = [
  ["Hải Trung Kim", "Kim"], ["Lư Trung Hỏa", "Hỏa"], ["Đại Lâm Mộc", "Mộc"], ["Lộ Bàng Thổ", "Thổ"], ["Kiếm Phong Kim", "Kim"],
  ["Sơn Đầu Hỏa", "Hỏa"], ["Giản Hạ Thủy", "Thủy"], ["Thành Đầu Thổ", "Thổ"], ["Bạch Lạp Kim", "Kim"], ["Dương Liễu Mộc", "Mộc"],
  ["Tuyền Trung Thủy", "Thủy"], ["Ốc Thượng Thổ", "Thổ"], ["Tích Lịch Hỏa", "Hỏa"], ["Tùng Bách Mộc", "Mộc"], ["Trường Lưu Thủy", "Thủy"],
  ["Sa Trung Kim", "Kim"], ["Sơn Hạ Hỏa", "Hỏa"], ["Bình Địa Mộc", "Mộc"], ["Bích Thượng Thổ", "Thổ"], ["Kim Bạch Kim", "Kim"],
  ["Phú Đăng Hỏa", "Hỏa"], ["Thiên Hà Thủy", "Thủy"], ["Đại Dịch Thổ", "Thổ"], ["Thoa Xuyến Kim", "Kim"], ["Tang Đố Mộc", "Mộc"],
  ["Đại Khê Thủy", "Thủy"], ["Sa Trung Thổ", "Thổ"], ["Thiên Thượng Hỏa", "Hỏa"], ["Thạch Lựu Mộc", "Mộc"], ["Đại Hải Thủy", "Thủy"],
];

export function napAm(cc: CanChi): { name: string; hanh: NguHanh } {
  const [name, hanh] = NAP_AM[INT(cc.index / 2)]!;
  return { name, hanh };
}

// Ngũ hành tương sinh: Kim → Thủy → Mộc → Hỏa → Thổ → Kim; tương khắc: Kim → Mộc → Thổ → Thủy → Hỏa → Kim
const SINH: Record<NguHanh, NguHanh> = { Kim: "Thủy", Thủy: "Mộc", Mộc: "Hỏa", Hỏa: "Thổ", Thổ: "Kim" };
const KHAC: Record<NguHanh, NguHanh> = { Kim: "Mộc", Mộc: "Thổ", Thổ: "Thủy", Thủy: "Hỏa", Hỏa: "Kim" };

/** Quan hệ ngũ hành của a đối với b */
export function quanHeNguHanh(a: NguHanh, b: NguHanh): "bình hòa" | "sinh" | "được sinh" | "khắc" | "bị khắc" {
  if (a === b) return "bình hòa";
  if (SINH[a] === b) return "sinh";
  if (SINH[b] === a) return "được sinh";
  if (KHAC[a] === b) return "khắc";
  return "bị khắc";
}

/** Quan hệ giữa hai địa chi (vd chi năm sinh và chi của ngày) */
export function quanHeChi(a: number, b: number): string[] {
  const result: string[] = [];
  if (a === b) result.push("trùng chi");
  if ((a + b) % 12 === 1) result.push("lục hợp");
  if (a !== b && a % 4 === b % 4) result.push("tam hợp");
  if ((a - b + 12) % 12 === 6) result.push("lục xung");
  else if (a !== b && a % 3 === b % 3) result.push("tứ hành xung");
  return result;
}
