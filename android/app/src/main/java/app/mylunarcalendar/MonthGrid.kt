package app.mylunarcalendar

import java.time.LocalDate

/** Một ô trên lịch tháng: ngày dương, ngày âm tương ứng và các ngày lễ */
data class DayCell(
    val solar: SolarDate,
    val jd: Int,
    val lunar: LunarDate,
    /** Ngày thuộc tháng đang xem (ngày của tháng trước/sau thì hiện mờ) */
    val inMonth: Boolean,
    val holidays: List<Holiday>,
) {
    /** Có ngày nghỉ lễ (tô đỏ) */
    val isOff: Boolean get() = holidays.any { it.off }

    /** Chủ nhật: cột cuối, vì tuần bắt đầu từ thứ Hai */
    val isSunday: Boolean get() = MonthGrid.weekdayIndex(jd) == 6
}

/** Dữ liệu lịch tháng dùng chung cho widget và màn hình app */
object MonthGrid {

    /** 6 tuần × 7 ngày: đủ chỗ cho mọi tháng kể cả tháng bắt đầu vào Chủ nhật */
    const val CELLS = 42

    val WEEKDAY_SHORT = listOf("T2", "T3", "T4", "T5", "T6", "T7", "CN")
    private val WEEKDAY_NAME = listOf("Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật")

    /** Thứ trong tuần từ số ngày Julius: 0 = thứ Hai … 6 = Chủ nhật (JD chia 7 dư 0 là thứ Hai) */
    fun weekdayIndex(jd: Int): Int = jd.mod(7)

    fun weekdayName(jd: Int): String = WEEKDAY_NAME[weekdayIndex(jd)]

    /** Số ngày Julius của hôm nay theo giờ máy */
    fun todayJd(): Int {
        val now = LocalDate.now()
        return LunarCalendar.jdFromDate(now.dayOfMonth, now.monthValue, now.year)
    }

    /** Tháng cách tháng (year, month) một số tháng `offset`; trả về (năm, tháng) */
    fun shift(year: Int, month: Int, offset: Int): Pair<Int, Int> {
        val total = year * 12 + (month - 1) + offset
        return Pair(total.floorDiv(12), total.mod(12) + 1)
    }

    /** 42 ô của lịch tháng, bắt đầu từ thứ Hai của tuần chứa ngày 1 */
    fun build(year: Int, month: Int): List<DayCell> {
        val firstJd = LunarCalendar.jdFromDate(1, month, year)
        val start = firstJd - weekdayIndex(firstJd)
        val cells = ArrayList<DayCell>(CELLS)
        for (i in 0 until CELLS) {
            val jd = start + i
            val solar = LunarCalendar.jdToDate(jd)
            val lunar = LunarCalendar.solarToLunar(solar.day, solar.month, solar.year)
            val holidays = Holidays.holidaysOf(solar.day, solar.month, solar.year, lunar)
            cells.add(DayCell(solar, jd, lunar, solar.month == month && solar.year == year, holidays))
        }
        return cells
    }

    /**
     * Chữ ngày âm dưới ngày dương: mùng 1 ghi kèm tháng ("1/10") để biết sang tháng âm mới;
     * tháng nhuận thêm "n" ("1/6n").
     */
    fun lunarLabel(l: LunarDate): String =
        if (l.day == 1) "1/${l.month}${if (l.leap) "n" else ""}" else l.day.toString()

    /** "Ngày 8 tháng 10 năm Bính Ngọ", tháng nhuận ghi "(nhuận)" */
    fun lunarLongText(l: LunarDate): String =
        "Ngày ${l.day} tháng ${l.month}${if (l.leap) " (nhuận)" else ""} năm ${LunarCalendar.yearCanChi(l.year).name}"

    /** "Tý, Sửu, Thìn…" */
    fun gioTotShort(jd: Int): String = LunarCalendar.gioHoangDao(jd).joinToString(", ") { it.chi }

    /** "Tý (23-1), Sửu (1-3)…" */
    fun gioTotLong(jd: Int): String = LunarCalendar.gioHoangDao(jd).joinToString(", ") { "${it.chi} (${it.hours})" }

    fun two(n: Int): String = if (n < 10) "0$n" else n.toString()

    /** "17/11/2026" */
    fun solarText(s: SolarDate): String = "${two(s.day)}/${two(s.month)}/${s.year}"
}
