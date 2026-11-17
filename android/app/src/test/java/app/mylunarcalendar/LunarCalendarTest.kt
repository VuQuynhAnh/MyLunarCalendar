package app.mylunarcalendar

import app.mylunarcalendar.LunarCalendar.dayCanChi
import app.mylunarcalendar.LunarCalendar.gioHoangDao
import app.mylunarcalendar.LunarCalendar.jdFromDate
import app.mylunarcalendar.LunarCalendar.jdToDate
import app.mylunarcalendar.LunarCalendar.lunarToSolar
import app.mylunarcalendar.LunarCalendar.monthCanChi
import app.mylunarcalendar.LunarCalendar.napAm
import app.mylunarcalendar.LunarCalendar.ngayHoangDao
import app.mylunarcalendar.LunarCalendar.solarToLunar
import app.mylunarcalendar.LunarCalendar.tietKhi
import app.mylunarcalendar.LunarCalendar.yearCanChi
import java.io.File
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Kiểm tra bản Kotlin bằng đúng bộ số liệu thật mà bản TypeScript dùng (`shared/test/lunar-cases.json`),
 * cùng các khẳng định như `shared/test/lunar.test.ts`, để hai bản luôn cho cùng kết quả.
 */
class LunarCalendarTest {

    /** Test chạy với thư mục làm việc là `android/app` */
    private val cases: JSONObject = JSONObject(File("../../shared/test/lunar-cases.json").readText(Charsets.UTF_8))

    /** Các khoá của object, bỏ khoá ghi chú bắt đầu bằng "_" */
    private fun keys(o: JSONObject): List<String> = o.keys().asSequence().filter { !it.startsWith("_") }.toList()

    private fun objects(a: JSONArray): List<JSONObject> = (0 until a.length()).map { a.getJSONObject(it) }

    /** "YYYY-MM-DD" → (năm, tháng, ngày) */
    private fun ymd(s: String): Triple<Int, Int, Int> {
        val p = s.split("-").map { it.toInt() }
        return Triple(p[0], p[1], p[2])
    }

    private fun lunarOf(s: String): LunarDate {
        val (y, m, d) = ymd(s)
        return solarToLunar(d, m, y)
    }

    @Test
    fun ngayJulius_doiQuaLaiKhongLech() {
        assertEquals(2451545, jdFromDate(1, 1, 2000))
        var jd = jdFromDate(1, 1, 1900)
        val end = jdFromDate(31, 12, 2100)
        while (jd <= end) {
            val d = jdToDate(jd)
            assertEquals(jd, jdFromDate(d.day, d.month, d.year))
            jd += 7
        }
    }

    @Test
    fun tetNguyenDan_theoLichVietNam() {
        val tet = cases.getJSONObject("tet")
        for (year in keys(tet)) {
            val date = tet.getString(year)
            val l = lunarOf(date)
            assertEquals("Tết $year ngày", 1, l.day)
            assertEquals("Tết $year tháng", 1, l.month)
            assertEquals("Tết $year năm", year.toInt(), l.year)
            assertEquals("Tết $year nhuận", false, l.leap)
            // Hôm trước là ngày cuối tháng Chạp năm trước
            val (y, m, d) = ymd(date)
            val prev = jdToDate(jdFromDate(d, m, y) - 1)
            val p = solarToLunar(prev.day, prev.month, prev.year)
            assertEquals("giao thừa $year tháng", 12, p.month)
            assertEquals("giao thừa $year năm", year.toInt() - 1, p.year)
        }
    }

    @Test
    fun thangNhuan_dungNamDungThang() {
        val o = cases.getJSONObject("leapMonths")
        val leaps = keys(o).associate { it.toInt() to o.getInt(it) }
        for (year in 2000..2030) {
            // Có tháng nhuận thì đổi ngược mùng 1 tháng nhuận ra dương lịch được; năm khác thì không
            val leap = leaps[year]
            for (month in 1..12) {
                val ok = lunarToSolar(1, month, year, true) != null
                assertEquals("$month nhuận $year", month == leap, ok)
            }
        }
    }

    @Test
    fun ngayLe_mung1ThangNhuan() {
        for (c in objects(cases.getJSONArray("dates"))) {
            val lunar = c.getJSONArray("lunar")
            val note = c.optString("note")
            val l = lunarOf(c.getString("solar"))
            assertEquals("$note ngày", lunar.getInt(0), l.day)
            assertEquals("$note tháng", lunar.getInt(1), l.month)
            assertEquals("$note năm", lunar.getInt(2), l.year)
            assertEquals("$note nhuận", lunar.getBoolean(3), l.leap)
        }
    }

    @Test
    fun amDuongAm_khopMoiNgay1900Den2100() {
        val end = jdFromDate(31, 12, 2100)
        for (jd in jdFromDate(1, 2, 1900)..end) {
            val s = jdToDate(jd)
            val l = solarToLunar(s.day, s.month, s.year)
            assertTrue("độ dài tháng âm ở $s: ${l.monthLength}", l.monthLength == 29 || l.monthLength == 30)
            assertTrue("ngày âm ở $s: ${l.day}", l.day >= 1 && l.day <= l.monthLength)
            assertEquals("đổi ngược $s ($l)", s, lunarToSolar(l.day, l.month, l.year, l.leap))
        }
    }

    @Test
    fun ngayAmKhongTonTai_null() {
        assertNull(lunarToSolar(1, 5, 2024, true)) // 2024 không nhuận
        assertNull(lunarToSolar(1, 13, 2024, false))
        assertNull(lunarToSolar(31, 1, 2024, false))
        assertNotNull(lunarToSolar(1, 6, 2025, true))
    }

    @Test
    fun canChi_namNgayThang() {
        val years = cases.getJSONObject("yearCanChi")
        for (year in keys(years)) assertEquals(years.getString(year), yearCanChi(year.toInt()).name)
        for (c in objects(cases.getJSONArray("dayCanChi"))) {
            val (y, m, d) = ymd(c.getString("solar"))
            assertEquals(c.getString("name"), dayCanChi(jdFromDate(d, m, y)).name)
        }
        // Tháng Giêng năm Giáp (2024) là Bính Dần; tháng Chạp năm Ất (2025) là Kỷ Sửu
        assertEquals("Bính Dần", monthCanChi(1, 2024).name)
        assertEquals("Kỷ Sửu", monthCanChi(12, 2025).name)
    }

    @Test
    fun napAm_theo60HoaGiap() {
        assertEquals(NapAm("Hải Trung Kim", "Kim"), napAm(yearCanChi(1984))) // Giáp Tý
        assertEquals(NapAm("Thiên Hà Thủy", "Thủy"), napAm(yearCanChi(2026))) // Bính Ngọ
        assertEquals(NapAm("Lộ Bàng Thổ", "Thổ"), napAm(yearCanChi(1990))) // Canh Ngọ
        assertEquals(NapAm("Đại Hải Thủy", "Thủy"), napAm(yearCanChi(2043))) // Quý Hợi
    }

    @Test
    fun tietKhi_batDauDungNgay() {
        for (c in objects(cases.getJSONArray("tietKhiStart"))) {
            val solar = c.getString("solar")
            val (y, m, d) = ymd(solar)
            val jd = jdFromDate(d, m, y)
            assertEquals(solar, TietKhi(c.getString("name"), true), tietKhi(jd))
            assertEquals(solar, TietKhi(c.getString("name"), false), tietKhi(jd + 1))
        }
    }

    @Test
    fun gioHoangDao_theoChiCuaNgay() {
        // 01/01/2000 là ngày Mậu Ngọ: giờ hoàng đạo Tý, Sửu, Mão, Ngọ, Thân, Dậu
        val jd = jdFromDate(1, 1, 2000)
        assertEquals(listOf("Tý", "Sửu", "Mão", "Ngọ", "Thân", "Dậu"), gioHoangDao(jd).map { it.chi })
        assertEquals(GioHoangDao("Tý", "23-1"), gioHoangDao(jd)[0])
        // Ngày Dần, Thân: Tý, Sửu, Thìn, Tỵ, Mùi, Tuất
        assertEquals(listOf("Tý", "Sửu", "Thìn", "Tỵ", "Mùi", "Tuất"), gioHoangDao(jd + 8).map { it.chi })
    }

    @Test
    fun ngayHoangDao_theoBangTruyenThong() {
        val tyDay = jdFromDate(1, 1, 2000) + 6 // Mậu Ngọ + 6 ngày = ngày Tý
        assertEquals(0, dayCanChi(tyDay).chi)
        assertEquals(Than("Thanh Long", true), ngayHoangDao(tyDay, 1))
        assertEquals(Than("Thanh Long", true), ngayHoangDao(tyDay, 7))
        assertEquals(Than("Tư Mệnh", true), ngayHoangDao(tyDay, 2))
        assertEquals(Than("Câu Trận", false), ngayHoangDao(tyDay + 1, 2)) // ngày Sửu
        // Tháng 2, 8: hoàng đạo là các ngày Tý, Dần, Mão, Ngọ, Mùi, Dậu
        val good = (0 until 12).map { tyDay + it }.filter { ngayHoangDao(it, 8).good }.map { dayCanChi(it).chi }.sorted()
        assertEquals(listOf(0, 2, 3, 6, 7, 9), good)
    }

    @Test
    fun ngayLe_vaTet() {
        // Tết 2026: 17/02/2026; hôm trước là Giao thừa (nghỉ lễ)
        assertEquals(SolarDate(17, 2, 2026), Holidays.tetOf(2026))
        assertTrue(Holidays.holidaysOf(17, 2, 2026).any { it.name == "Tết Nguyên Đán" && it.off })
        assertTrue(Holidays.holidaysOf(16, 2, 2026).any { it.name == "Giao thừa" && it.off })
        // Nghỉ 1/9 chỉ có từ 2021
        assertTrue(Holidays.holidaysOf(1, 9, 2020).isEmpty())
        assertTrue(Holidays.holidaysOf(1, 9, 2021).any { it.off })
    }

    @Test
    fun lichThang_42OBatDauTuThuHai() {
        // Tháng 11/2026 bắt đầu vào Chủ nhật: ô đầu là thứ Hai 26/10/2026
        val cells = MonthGrid.build(2026, 11)
        assertEquals(42, cells.size)
        assertEquals(SolarDate(26, 10, 2026), cells[0].solar)
        assertEquals(SolarDate(1, 11, 2026), cells[6].solar)
        assertTrue(cells[6].isSunday)
        assertEquals(Pair(2027, 1), MonthGrid.shift(2026, 12, 1))
        assertEquals(Pair(2025, 12), MonthGrid.shift(2026, 1, -1))
        assertEquals("1/6n", MonthGrid.lunarLabel(lunarOf("2025-07-25")))
    }
}
