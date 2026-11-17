import { describe, expect, it } from "vitest";
import cases from "./lunar-cases.json";
import {
  dayCanChi,
  gioHoangDao,
  jdFromDate,
  jdToDate,
  lunarToSolar,
  monthCanChi,
  napAm,
  ngayHoangDao,
  quanHeChi,
  quanHeNguHanh,
  solarToLunar,
  tietKhi,
  yearCanChi,
} from "../src/lunar";

const ymd = (s: string) => s.split("-").map(Number) as [number, number, number];
const lunarOf = (s: string) => {
  const [y, m, d] = ymd(s);
  return solarToLunar(d, m, y);
};
// Bỏ các khoá ghi chú "_comment" của file số liệu
const entries = <T>(o: object) => Object.entries(o).filter(([k]) => !k.startsWith("_")) as [string, T][];

describe("ngày Julius", () => {
  it("đổi qua lại không lệch, kể cả năm nhuận", () => {
    expect(jdFromDate(1, 1, 2000)).toBe(2451545);
    for (let jd = jdFromDate(1, 1, 1900); jd <= jdFromDate(31, 12, 2100); jd += 7) {
      const d = jdToDate(jd);
      expect(jdFromDate(d.day, d.month, d.year)).toBe(jd);
    }
  });
});

describe("dương lịch → âm lịch (số liệu thật)", () => {
  // SC: CAL-UC01-SC1
  it("Tết Nguyên Đán theo lịch Việt Nam, kể cả 1985, 2007, 2030 khác lịch Trung Quốc", () => {
    for (const [year, date] of entries<string>(cases.tet)) {
      expect(lunarOf(date), `Tết ${year}`).toMatchObject({ day: 1, month: 1, year: Number(year), leap: false });
      // Hôm trước là ngày cuối tháng Chạp năm trước
      const [y, m, d] = ymd(date);
      const prev = jdToDate(jdFromDate(d, m, y) - 1);
      expect(solarToLunar(prev.day, prev.month, prev.year), `giao thừa ${year}`).toMatchObject({ month: 12, year: Number(year) - 1 });
    }
  });

  // SC: CAL-UC01-SC2
  it("tháng nhuận đúng năm, đúng tháng", () => {
    const leaps = new Map(entries<number>(cases.leapMonths).map(([y, m]) => [Number(y), m]));
    for (let year = 2000; year <= 2030; year++) {
      // Có tháng nhuận thì đổi ngược mùng 1 tháng nhuận ra dương lịch được; năm khác thì không
      const leap = leaps.get(year);
      for (let month = 1; month <= 12; month++) {
        const ok = lunarToSolar(1, month, year, true) !== null;
        expect(ok, `${month} nhuận ${year}`).toBe(month === leap);
      }
    }
  });

  it("ngày lễ, mùng 1 tháng nhuận", () => {
    for (const c of cases.dates) {
      const [day, month, year, leap] = c.lunar as [number, number, number, boolean];
      expect(lunarOf(c.solar), c.note).toMatchObject({ day, month, year, leap });
    }
  });

  it("âm → dương → âm khớp mọi ngày 1900–2100; tháng âm 29 hoặc 30 ngày", () => {
    for (let jd = jdFromDate(1, 2, 1900); jd <= jdFromDate(31, 12, 2100); jd++) {
      const s = jdToDate(jd);
      const l = solarToLunar(s.day, s.month, s.year);
      expect([29, 30]).toContain(l.monthLength);
      expect(l.day).toBeLessThanOrEqual(l.monthLength);
      expect(lunarToSolar(l.day, l.month, l.year, l.leap)).toEqual(s);
    }
  });

  it("ngày âm không tồn tại thì null", () => {
    expect(lunarToSolar(1, 5, 2024, true)).toBeNull(); // 2024 không nhuận
    expect(lunarToSolar(1, 13, 2024, false)).toBeNull();
    expect(lunarToSolar(31, 1, 2024, false)).toBeNull();
  });
});

describe("can chi, tiết khí, giờ hoàng đạo", () => {
  it("can chi năm, ngày, tháng", () => {
    for (const [year, name] of entries<string>(cases.yearCanChi)) expect(yearCanChi(Number(year)).name).toBe(name);
    for (const c of cases.dayCanChi) {
      const [y, m, d] = ymd(c.solar);
      expect(dayCanChi(jdFromDate(d, m, y)).name).toBe(c.name);
    }
    // Tháng Giêng năm Giáp (2024) là Bính Dần; tháng Chạp năm Ất (2025) là Kỷ Sửu
    expect(monthCanChi(1, 2024).name).toBe("Bính Dần");
    expect(monthCanChi(12, 2025).name).toBe("Kỷ Sửu");
  });

  it("nạp âm theo 60 Hoa Giáp", () => {
    expect(napAm(yearCanChi(1984))).toEqual({ name: "Hải Trung Kim", hanh: "Kim" }); // Giáp Tý
    expect(napAm(yearCanChi(2026))).toEqual({ name: "Thiên Hà Thủy", hanh: "Thủy" }); // Bính Ngọ
    expect(napAm(yearCanChi(1990))).toEqual({ name: "Lộ Bàng Thổ", hanh: "Thổ" }); // Canh Ngọ
    expect(napAm(yearCanChi(2043))).toEqual({ name: "Đại Hải Thủy", hanh: "Thủy" }); // Quý Hợi
  });

  // SC: CAL-UC01-SC3
  it("tiết khí bắt đầu đúng ngày", () => {
    for (const c of cases.tietKhiStart) {
      const [y, m, d] = ymd(c.solar);
      const jd = jdFromDate(d, m, y);
      expect(tietKhi(jd), c.solar).toEqual({ name: c.name, startsToday: true });
      expect(tietKhi(jd + 1)).toEqual({ name: c.name, startsToday: false });
    }
  });

  it("giờ hoàng đạo theo chi của ngày", () => {
    // 01/01/2000 là ngày Mậu Ngọ: giờ hoàng đạo Tý, Sửu, Mão, Ngọ, Thân, Dậu
    const jd = jdFromDate(1, 1, 2000);
    expect(gioHoangDao(jd).map((g) => g.chi)).toEqual(["Tý", "Sửu", "Mão", "Ngọ", "Thân", "Dậu"]);
    expect(gioHoangDao(jd)[0]).toEqual({ chi: "Tý", hours: "23-1" });
    // Ngày Dần, Thân: Tý, Sửu, Thìn, Tỵ, Mùi, Tuất
    expect(gioHoangDao(jd + 8).map((g) => g.chi)).toEqual(["Tý", "Sửu", "Thìn", "Tỵ", "Mùi", "Tuất"]);
  });

  it("ngày hoàng đạo theo bảng truyền thống (tháng 2, 8: Dần, Mão, Ngọ, Mùi, Dậu, Tý)", () => {
    const tyDay = jdFromDate(1, 1, 2000) + 6; // Mậu Ngọ + 6 ngày = ngày Tý
    expect(dayCanChi(tyDay).chi).toBe(0);
    expect(ngayHoangDao(tyDay, 1)).toEqual({ name: "Thanh Long", good: true });
    expect(ngayHoangDao(tyDay, 7)).toEqual({ name: "Thanh Long", good: true });
    expect(ngayHoangDao(tyDay, 2)).toEqual({ name: "Tư Mệnh", good: true });
    expect(ngayHoangDao(tyDay + 1, 2)).toEqual({ name: "Câu Trận", good: false }); // ngày Sửu
    const good = Array.from({ length: 12 }, (_, i) => tyDay + i).filter((jd) => ngayHoangDao(jd, 8).good).map((jd) => dayCanChi(jd).chi);
    expect(good.sort((a, b) => a - b)).toEqual([0, 2, 3, 6, 7, 9]);
  });

  it("quan hệ chi và ngũ hành", () => {
    expect(quanHeChi(0, 6)).toEqual(["lục xung"]); // Tý - Ngọ
    expect(quanHeChi(0, 3)).toEqual(["tứ hành xung"]); // Tý - Mão
    expect(quanHeChi(0, 1)).toEqual(["lục hợp"]); // Tý - Sửu
    expect(quanHeChi(0, 4)).toEqual(["tam hợp"]); // Tý - Thìn
    expect(quanHeNguHanh("Kim", "Thủy")).toBe("sinh");
    expect(quanHeNguHanh("Thủy", "Kim")).toBe("được sinh");
    expect(quanHeNguHanh("Kim", "Mộc")).toBe("khắc");
    expect(quanHeNguHanh("Mộc", "Kim")).toBe("bị khắc");
  });
});
