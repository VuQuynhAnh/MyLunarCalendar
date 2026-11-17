package app.mylunarcalendar

/**
 * Ngày lễ Việt Nam, dịch 1-1 từ `shared/src/holidays.ts`. `off` = ngày nghỉ lễ theo Bộ luật Lao
 * động (tô đỏ trên lịch); còn lại là ngày kỷ niệm hoặc lễ truyền thống. Lễ âm lịch chỉ tính trong
 * tháng thường, không tính tháng nhuận.
 */
data class Holiday(val name: String, val off: Boolean, val lunar: Boolean)

object Holidays {

    private val SOLAR: Map<String, Pair<String, Boolean>> = mapOf(
        "1-1" to ("Tết Dương lịch" to true),
        "3-2" to ("Thành lập Đảng Cộng sản Việt Nam" to false),
        "14-2" to ("Lễ Tình nhân" to false),
        "8-3" to ("Quốc tế Phụ nữ" to false),
        "30-4" to ("Giải phóng miền Nam" to true),
        "1-5" to ("Quốc tế Lao động" to true),
        "19-5" to ("Ngày sinh Chủ tịch Hồ Chí Minh" to false),
        "1-6" to ("Quốc tế Thiếu nhi" to false),
        "27-7" to ("Thương binh Liệt sĩ" to false),
        // Từ 2021 được nghỉ thêm một ngày liền kề Quốc khánh; luật cho chọn 1/9 hoặc 3/9, đa số năm là 1/9
        "1-9" to ("Nghỉ lễ Quốc khánh" to true),
        "2-9" to ("Quốc khánh" to true),
        "20-10" to ("Phụ nữ Việt Nam" to false),
        "20-11" to ("Nhà giáo Việt Nam" to false),
        "22-12" to ("Quân đội Nhân dân Việt Nam" to false),
        "24-12" to ("Đêm Giáng sinh" to false),
        "25-12" to ("Giáng sinh" to false),
    )

    private val LUNAR: Map<String, Pair<String, Boolean>> = mapOf(
        "1-1" to ("Tết Nguyên Đán" to true),
        "2-1" to ("Mùng 2 Tết" to true),
        "3-1" to ("Mùng 3 Tết" to true),
        "15-1" to ("Rằm tháng Giêng" to false),
        "3-3" to ("Tết Hàn thực" to false),
        "10-3" to ("Giỗ Tổ Hùng Vương" to true),
        "15-4" to ("Lễ Phật đản" to false),
        "5-5" to ("Tết Đoan ngọ" to false),
        "15-7" to ("Lễ Vu Lan" to false),
        "15-8" to ("Tết Trung thu" to false),
        "23-12" to ("Ông Công Ông Táo" to false),
    )

    /** Ngày lễ của một ngày dương lịch (có thể có cả lễ dương và lễ âm) */
    fun holidaysOf(
        day: Int,
        month: Int,
        year: Int,
        lunar: LunarDate = LunarCalendar.solarToLunar(day, month, year),
    ): List<Holiday> {
        val result = ArrayList<Holiday>()
        val s = SOLAR["$day-$month"]
        if (s != null && !(day == 1 && month == 9 && year < 2021)) result.add(Holiday(s.first, s.second, false))
        if (!lunar.leap) {
            val l = LUNAR["${lunar.day}-${lunar.month}"]
            if (l != null) result.add(Holiday(l.first, l.second, true))
            // Giao thừa: ngày cuối tháng Chạp (29 hoặc 30 tuỳ năm), cũng là ngày nghỉ Tết
            if (lunar.month == 12 && lunar.day == lunar.monthLength) result.add(Holiday("Giao thừa", true, true))
        }
        return result
    }

    /** Ngày dương của Tết Nguyên Đán năm âm `year` */
    fun tetOf(year: Int): SolarDate = LunarCalendar.lunarToSolar(1, 1, year, false)!!
}
