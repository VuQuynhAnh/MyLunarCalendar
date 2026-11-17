import { describe, expect, it } from "vitest";
import { birthFacts, dayInfo, gioSinhChi, holidaysOf, horoscopeFacts, solarToLunar } from "../src";

describe("ngày lễ", () => {
  // SC: CAL-UC01-SC4
  it("lễ dương lịch và âm lịch, nghỉ lễ tô đỏ", () => {
    expect(holidaysOf(30, 4, 2026)).toEqual([{ name: "Giải phóng miền Nam", off: true, lunar: false }]);
    expect(holidaysOf(17, 2, 2026)).toEqual([{ name: "Tết Nguyên Đán", off: true, lunar: true }]);
    expect(holidaysOf(6, 10, 2025)).toEqual([{ name: "Tết Trung thu", off: false, lunar: true }]);
    // Nghỉ thêm 1/9 chỉ từ 2021
    expect(holidaysOf(1, 9, 2020)).toEqual([]);
    expect(holidaysOf(1, 9, 2026).map((h) => h.name)).toContain("Nghỉ lễ Quốc khánh");
  });

  it("giao thừa là ngày cuối tháng Chạp; tháng nhuận không có lễ âm", () => {
    // Tết 2026 là 17/02/2026: hôm trước là giao thừa
    expect(holidaysOf(16, 2, 2026)).toEqual([{ name: "Giao thừa", off: true, lunar: true }]);
    // 09/08/2025 là 15/6 nhuận (năm 2025 nhuận tháng 6): không phải lễ
    const l = solarToLunar(8, 8, 2025);
    expect(l.leap).toBe(true);
    expect(holidaysOf(8, 8, 2025, { ...l, day: 15 })).toEqual([]);
  });
});

describe("số liệu tử vi", () => {
  it("giờ sinh theo 12 chi", () => {
    expect(gioSinhChi("23:30")).toBe("Tý");
    expect(gioSinhChi("00:15")).toBe("Tý");
    expect(gioSinhChi("01:00")).toBe("Sửu");
    expect(gioSinhChi("12:00")).toBe("Ngọ");
    expect(gioSinhChi("22:59")).toBe("Hợi");
  });

  // SC: HORO-UC01-SC1
  it("tuổi theo năm âm: sinh trước Tết thuộc năm trước", () => {
    expect(birthFacts({ birthDate: "1990-01-20", birthTime: null, gender: "male" })).toMatchObject({
      tuoi: "Kỷ Tỵ",
      menh: { name: "Đại Lâm Mộc", hanh: "Mộc" },
      lunarBirth: { year: 1989, month: 12 },
      gioSinh: null,
    });
    expect(birthFacts({ birthDate: "1990-03-01", birthTime: "08:30", gender: "female" })).toMatchObject({
      tuoi: "Canh Ngọ",
      menh: { name: "Lộ Bàng Thổ", hanh: "Thổ" },
      gioSinh: "Thìn",
    });
  });

  it("thông tin ngày và quan hệ tuổi với ngày", () => {
    // 01/01/2000: ngày Mậu Ngọ, nạp âm Thiên Thượng Hỏa
    const day = dayInfo("2000-01-01");
    expect(day.canChi.day).toBe("Mậu Ngọ");
    expect(day.napAm).toEqual({ name: "Thiên Thượng Hỏa", hanh: "Hỏa" });
    expect(day.gioHoangDao).toHaveLength(6);
    // Người tuổi Canh Tý (1960, Bích Thượng Thổ) gặp ngày Ngọ: lục xung; Hỏa sinh Thổ
    const f = horoscopeFacts({ birthDate: "1960-06-01", birthTime: null, gender: "male" }, "2000-01-01");
    expect(f.person.tuoi).toBe("Canh Tý");
    expect(f.person.tuoiAm).toBe(1999 - 1960 + 1);
    expect(f.relation).toEqual({ chi: ["lục xung"], nguHanh: "được sinh" });
  });
});

describe("kiểm hồ sơ (HORO-UC01/BR-1)", () => {
  it("lỗi theo từng ô; giờ sinh để trống được", async () => {
    const { checkProfile } = await import("../src");
    expect(checkProfile({ name: " ", birthDate: "1990-02-31", birthTime: "25:00", gender: "x" }, "2026-11-17")).toEqual({
      ok: false,
      fields: { name: "Vui lòng nhập tên", birthDate: "Ngày sinh không hợp lệ", birthTime: "Giờ sinh không hợp lệ", gender: "Vui lòng chọn giới tính" },
    });
    expect(checkProfile({ name: "Anh", birthDate: "2026-11-18", gender: "male" }, "2026-11-17")).toEqual({
      ok: false,
      fields: { birthDate: "Ngày sinh phải từ 31/01/1900 đến hôm nay" },
    });
    expect(checkProfile({ name: " Anh ", birthDate: "1990-03-01", birthTime: "", gender: "male" }, "2026-11-17")).toEqual({
      ok: true,
      value: { name: "Anh", birthDate: "1990-03-01", birthTime: null, gender: "male" },
    });
  });
});
