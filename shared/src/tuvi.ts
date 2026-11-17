import { holidaysOf } from "./holidays";
import {
  CHI,
  dayCanChi,
  gioHoangDao,
  monthCanChi,
  napAm,
  ngayHoangDao,
  quanHeChi,
  quanHeNguHanh,
  solarToLunar,
  tietKhi,
  yearCanChi,
  type NguHanh,
} from "./lunar";

export type Gender = "male" | "female";

export interface BirthInfo {
  /** "YYYY-MM-DD" dương lịch */
  birthDate: string;
  /** "HH:mm", không bắt buộc */
  birthTime: string | null;
  gender: Gender;
}

const ymd = (s: string) => s.split("-").map(Number) as [number, number, number];

/** Chi của giờ sinh: giờ Tý từ 23h đến trước 1h, mỗi giờ âm 2 tiếng */
export function gioSinhChi(time: string): string {
  const [h] = time.split(":").map(Number);
  return CHI[Math.floor(((h! + 1) % 24) / 2)]!;
}

/** Thông tin một ngày (dùng cho lịch và cho tử vi) */
export function dayInfo(date: string) {
  const [y, m, d] = ymd(date);
  const lunar = solarToLunar(d, m, y);
  const day = dayCanChi(lunar.jd);
  return {
    date,
    lunar: { day: lunar.day, month: lunar.month, year: lunar.year, leap: lunar.leap },
    canChi: { day: day.name, month: monthCanChi(lunar.month, lunar.year).name, year: yearCanChi(lunar.year).name },
    napAm: napAm(day),
    hoangDao: ngayHoangDao(lunar.jd, lunar.month),
    tietKhi: tietKhi(lunar.jd),
    gioHoangDao: gioHoangDao(lunar.jd),
    holidays: holidaysOf(d, m, y, lunar),
  };
}

/** Thông tin bản mệnh của một người, tính từ ngày giờ sinh */
export function birthFacts(b: BirthInfo) {
  const [y, m, d] = ymd(b.birthDate);
  const lunar = solarToLunar(d, m, y);
  // Tuổi tính theo năm âm: sinh trước Tết thuộc năm âm trước (vd 20/01/1990 là tuổi Kỷ Tỵ)
  const year = yearCanChi(lunar.year);
  return {
    lunarBirth: { day: lunar.day, month: lunar.month, year: lunar.year, leap: lunar.leap },
    tuoi: year.name,
    chi: year.chi,
    menh: napAm(year),
    gioSinh: b.birthTime ? gioSinhChi(b.birthTime) : null,
    gender: b.gender,
  };
}

/**
 * Số liệu tử vi một ngày cho một người: do code tính, AI chỉ luận giải dựa trên số liệu này để
 * không tự bịa can chi hay ngày âm. Gồm tuổi, mệnh, tuổi âm, quan hệ chi năm sinh với chi ngày
 * (hợp, xung) và ngũ hành mệnh với ngũ hành ngày.
 */
export function horoscopeFacts(b: BirthInfo, date: string) {
  const person = birthFacts(b);
  const day = dayInfo(date);
  const dayChi = CHI.indexOf(day.canChi.day.split(" ")[1] as (typeof CHI)[number]);
  return {
    person: { ...person, tuoiAm: day.lunar.year - person.lunarBirth.year + 1 },
    day,
    relation: {
      chi: quanHeChi(person.chi, dayChi),
      nguHanh: quanHeNguHanh(person.menh.hanh as NguHanh, day.napAm.hanh),
    },
  };
}

export type HoroscopeFacts = ReturnType<typeof horoscopeFacts>;
export type DayInfo = ReturnType<typeof dayInfo>;
