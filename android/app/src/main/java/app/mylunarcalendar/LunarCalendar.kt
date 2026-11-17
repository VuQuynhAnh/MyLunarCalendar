package app.mylunarcalendar

import kotlin.math.PI
import kotlin.math.floor
import kotlin.math.sin

/**
 * Lịch âm Việt Nam theo thuật toán thiên văn của Hồ Ngọc Đức, dịch 1-1 từ `shared/src/lunar.ts`.
 * Tính theo múi giờ +7: lịch Việt Nam khác lịch Trung Quốc (+8) ở vài năm (vd Tết 1985).
 * Hai bản dùng chung bộ số liệu kiểm tra `shared/test/lunar-cases.json`; sửa công thức ở bản
 * TypeScript thì sửa cả ở đây.
 *
 * Bản gốc làm tròn xuống (Math.floor) trên số thực; ở đây dùng [floor] trên Double và
 * [floorDiv] cho phép chia số nguyên để không bị lệch khi gặp số âm.
 */
object LunarCalendar {

    /** Múi giờ của lịch âm Việt Nam */
    const val VN_TIMEZONE = 7

    private fun int(x: Double): Int = floor(x).toInt()

    /** Số ngày Julius của một ngày dương lịch */
    fun jdFromDate(dd: Int, mm: Int, yy: Int): Int {
        val a = (14 - mm).floorDiv(12)
        val y = yy + 4800 - a
        val m = mm + 12 * a - 3
        var jd = dd + (153 * m + 2).floorDiv(5) + 365 * y + y.floorDiv(4) - y.floorDiv(100) + y.floorDiv(400) - 32045
        if (jd < 2299161) jd = dd + (153 * m + 2).floorDiv(5) + 365 * y + y.floorDiv(4) - 32083
        return jd
    }

    /** Ngày dương lịch của một số ngày Julius */
    fun jdToDate(jd: Int): SolarDate {
        val b: Int
        val c: Int
        if (jd > 2299160) {
            val a = jd + 32044
            b = (4 * a + 3).floorDiv(146097)
            c = a - (b * 146097).floorDiv(4)
        } else {
            b = 0
            c = jd + 32082
        }
        val d = (4 * c + 3).floorDiv(1461)
        val e = c - (1461 * d).floorDiv(4)
        val m = (5 * e + 2).floorDiv(153)
        return SolarDate(
            day = e - (153 * m + 2).floorDiv(5) + 1,
            month = m + 3 - 12 * m.floorDiv(10),
            year = b * 100 + d - 4800 + m.floorDiv(10),
        )
    }

    /** Thời điểm (ngày Julius, giờ UT) của lần sóc thứ k tính từ 1/1/1900 */
    private fun newMoon(k: Int): Double {
        val t = k / 1236.85
        val t2 = t * t
        val t3 = t2 * t
        val dr = PI / 180
        var jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * t2 - 0.000000155 * t3
        jd1 += 0.00033 * sin((166.56 + 132.87 * t - 0.009173 * t2) * dr)
        val m = 359.2242 + 29.10535608 * k - 0.0000333 * t2 - 0.00000347 * t3
        val mpr = 306.0253 + 385.81691806 * k + 0.0107306 * t2 + 0.00001236 * t3
        val f = 21.2964 + 390.67050646 * k - 0.0016528 * t2 - 0.00000239 * t3
        var c1 = (0.1734 - 0.000393 * t) * sin(m * dr) + 0.0021 * sin(2 * dr * m)
        c1 = c1 - 0.4068 * sin(mpr * dr) + 0.0161 * sin(dr * 2 * mpr)
        c1 = c1 - 0.0004 * sin(dr * 3 * mpr)
        c1 = c1 + 0.0104 * sin(dr * 2 * f) - 0.0051 * sin(dr * (m + mpr))
        c1 = c1 - 0.0074 * sin(dr * (m - mpr)) + 0.0004 * sin(dr * (2 * f + m))
        c1 = c1 - 0.0004 * sin(dr * (2 * f - m)) - 0.0006 * sin(dr * (2 * f + mpr))
        c1 = c1 + 0.001 * sin(dr * (2 * f - mpr)) + 0.0005 * sin(dr * (2 * mpr + m))
        val deltat = if (t < -11) {
            0.001 + 0.000839 * t + 0.0002261 * t2 - 0.00000845 * t3 - 0.000000081 * t * t3
        } else {
            -0.000278 + 0.000265 * t + 0.000262 * t2
        }
        return jd1 + c1 - deltat
    }

    /** Kinh độ mặt trời (radian, 0..2π) tại thời điểm jdn (ngày Julius, giờ UT) */
    private fun sunLongitude(jdn: Double): Double {
        val t = (jdn - 2451545.0) / 36525
        val t2 = t * t
        val dr = PI / 180
        val m = 357.5291 + 35999.0503 * t - 0.0001559 * t2 - 0.00000048 * t * t2
        val l0 = 280.46645 + 36000.76983 * t + 0.0003032 * t2
        var dl = (1.9146 - 0.004817 * t - 0.000014 * t2) * sin(dr * m)
        dl = dl + (0.019993 - 0.000101 * t) * sin(dr * 2 * m) + 0.00029 * sin(dr * 3 * m)
        var l = (l0 + dl) * dr
        l = l - PI * 2 * floor(l / (PI * 2))
        return l
    }

    /** Ngày (số Julius) bắt đầu tháng âm có lần sóc thứ k, theo giờ địa phương */
    private fun newMoonDay(k: Int, tz: Int): Int = int(newMoon(k) + 0.5 + tz / 24.0)

    /** Cung hoàng đạo 30° (0..11) của mặt trời lúc 0 giờ địa phương ngày dayNumber */
    private fun sunSector12(dayNumber: Int, tz: Int): Int =
        int(sunLongitude(dayNumber - 0.5 - tz / 24.0) / PI * 6)

    /** Đoạn 15° (0..23) của mặt trời lúc 0 giờ địa phương ngày dayNumber; 0 = Xuân phân */
    private fun sunSector24(dayNumber: Int, tz: Int): Int =
        int(sunLongitude(dayNumber - 0.5 - tz / 24.0) / PI * 12)

    /** Ngày bắt đầu tháng 11 âm (tháng có Đông chí) của năm yy */
    private fun lunarMonth11(yy: Int, tz: Int): Int {
        val off = jdFromDate(31, 12, yy) - 2415021
        val k = int(off / 29.530588853)
        var nm = newMoonDay(k, tz)
        if (sunSector12(nm, tz) >= 9) nm = newMoonDay(k - 1, tz)
        return nm
    }

    /** Vị trí tháng nhuận tính từ tháng 11 âm a11 (năm có 13 tháng) */
    private fun leapMonthOffset(a11: Int, tz: Int): Int {
        val k = int((a11 - 2415021.076998695) / 29.530588853 + 0.5)
        var last: Int
        var i = 1
        var arc = sunSector12(newMoonDay(k + i, tz), tz)
        do {
            last = arc
            i++
            arc = sunSector12(newMoonDay(k + i, tz), tz)
        } while (arc != last && i < 14)
        return i - 1
    }

    /** Dương lịch → âm lịch */
    fun solarToLunar(dd: Int, mm: Int, yy: Int, tz: Int = VN_TIMEZONE): LunarDate {
        val dayNumber = jdFromDate(dd, mm, yy)
        val k = int((dayNumber - 2415021.076998695) / 29.530588853)
        // Lần sóc mở đầu tháng chứa ngày này: k chỉ là ước lượng theo chu kỳ trăng trung bình, sóc
        // thật lệch được gần một ngày, nên lùi tới khi gặp lần sóc không sau ngày này. Thuật toán gốc
        // chỉ lùi một bước và ra ngày âm "0" ở vài ngày sát sóc (vd 07/05/2054).
        var mk = k + 1
        while (newMoonDay(mk, tz) > dayNumber) mk--
        val monthStart = newMoonDay(mk, tz)
        val nextStart = newMoonDay(mk + 1, tz)
        var a11 = lunarMonth11(yy, tz)
        var b11 = a11
        var lunarYear: Int
        if (a11 >= monthStart) {
            lunarYear = yy
            a11 = lunarMonth11(yy - 1, tz)
        } else {
            lunarYear = yy + 1
            b11 = lunarMonth11(yy + 1, tz)
        }
        val lunarDay = dayNumber - monthStart + 1
        val diff = int((monthStart - a11) / 29.0)
        var leap = false
        var lunarMonth = diff + 11
        if (b11 - a11 > 365) {
            val leapDiff = leapMonthOffset(a11, tz)
            if (diff >= leapDiff) {
                lunarMonth = diff + 10
                if (diff == leapDiff) leap = true
            }
        }
        if (lunarMonth > 12) lunarMonth -= 12
        if (lunarMonth >= 11 && diff < 4) lunarYear -= 1
        return LunarDate(lunarDay, lunarMonth, lunarYear, leap, dayNumber, nextStart - monthStart)
    }

    /** Âm lịch → dương lịch; ngày không tồn tại (vd tháng nhuận sai, ngày 30 của tháng thiếu) thì null */
    fun lunarToSolar(day: Int, month: Int, year: Int, leap: Boolean, tz: Int = VN_TIMEZONE): SolarDate? {
        if (month < 1 || month > 12 || day < 1 || day > 30) return null
        val a11: Int
        val b11: Int
        if (month < 11) {
            a11 = lunarMonth11(year - 1, tz)
            b11 = lunarMonth11(year, tz)
        } else {
            a11 = lunarMonth11(year, tz)
            b11 = lunarMonth11(year + 1, tz)
        }
        val k = int(0.5 + (a11 - 2415021.076998695) / 29.530588853)
        var off = month - 11
        if (off < 0) off += 12
        if (b11 - a11 > 365) {
            val leapOff = leapMonthOffset(a11, tz)
            var leapMonth = leapOff - 2
            if (leapMonth < 0) leapMonth += 12
            if (leap && month != leapMonth) return null
            if (leap || off >= leapOff) off += 1
        } else if (leap) {
            return null
        }
        val monthStart = newMoonDay(k + off, tz)
        val nextStart = newMoonDay(k + off + 1, tz)
        if (day > nextStart - monthStart) return null
        return jdToDate(monthStart + day - 1)
    }

    // -----------------------------------------------------------------------------------------
    // Can chi, tiết khí, giờ hoàng đạo

    val CAN = listOf("Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý")
    val CHI = listOf("Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi")

    /** 24 tiết khí, bắt đầu từ Xuân phân (kinh độ mặt trời 0°), mỗi tiết 15° */
    val TIET_KHI = listOf(
        "Xuân phân", "Thanh minh", "Cốc vũ", "Lập hạ", "Tiểu mãn", "Mang chủng",
        "Hạ chí", "Tiểu thử", "Đại thử", "Lập thu", "Xử thử", "Bạch lộ",
        "Thu phân", "Hàn lộ", "Sương giáng", "Lập đông", "Tiểu tuyết", "Đại tuyết",
        "Đông chí", "Tiểu hàn", "Đại hàn", "Lập xuân", "Vũ thủy", "Kinh trập",
    )

    private fun canChi(can: Int, chi: Int): CanChi {
        // Hoa Giáp: số n (0..59) có can = n % 10, chi = n % 12; tìm n từ can và chi
        val index = (6 * can - 5 * chi + 60) % 60
        return CanChi(can, chi, index, "${CAN[can]} ${CHI[chi]}")
    }

    fun yearCanChi(lunarYear: Int): CanChi = canChi((lunarYear + 6) % 10, (lunarYear + 8) % 12)
    fun dayCanChi(jd: Int): CanChi = canChi((jd + 9) % 10, (jd + 1) % 12)

    /** Can chi tháng âm: tháng Giêng là tháng Dần; can theo can của năm */
    fun monthCanChi(lunarMonth: Int, lunarYear: Int): CanChi =
        canChi((lunarYear * 12 + lunarMonth + 3) % 10, (lunarMonth + 1) % 12)

    /** Tiết khí mà ngày jd thuộc về, và ngày đó có phải ngày bắt đầu tiết không */
    fun tietKhi(jd: Int, tz: Int = VN_TIMEZONE): TietKhi {
        // Đoạn của mặt trời lúc cuối ngày (0 giờ hôm sau): tiết bắt đầu trong ngày thì tính cho ngày đó
        val end = sunSector24(jd + 1, tz)
        return TietKhi(TIET_KHI[end], sunSector24(jd, tz) != end)
    }

    // Giờ hoàng đạo theo chi của ngày; ngày cách nhau 6 chi dùng chung một bảng (Tý-Ngọ, Sửu-Mùi…)
    private val GIO_HOANG_DAO = listOf("110100101100", "001101001011", "110011010010", "101100110100", "001011001101", "010010110011")

    fun gioHoangDao(jd: Int): List<GioHoangDao> {
        val pattern = GIO_HOANG_DAO[((jd + 1) % 12) % 6]
        val result = ArrayList<GioHoangDao>()
        for (i in 0 until 12) {
            if (pattern[i] == '1') result.add(GioHoangDao(CHI[i], "${(i * 2 + 23) % 24}-${(i * 2 + 1) % 24}"))
        }
        return result
    }

    /**
     * 12 thần trực ngày (Thanh Long, Minh Đường…): 6 thần hoàng đạo (ngày tốt), 6 thần hắc đạo.
     * Thanh Long của tháng Giêng và tháng 7 rơi vào ngày Tý, mỗi cặp tháng sau lùi 2 chi
     * (tháng 2, 8: Dần; 3, 9: Thìn…). Dùng tháng âm, cách tính phổ biến của lịch vạn niên.
     */
    private val THAN = listOf(
        Than("Thanh Long", true),
        Than("Minh Đường", true),
        Than("Thiên Hình", false),
        Than("Chu Tước", false),
        Than("Kim Quỹ", true),
        Than("Kim Đường", true),
        Than("Bạch Hổ", false),
        Than("Ngọc Đường", true),
        Than("Thiên Lao", false),
        Than("Huyền Vũ", false),
        Than("Tư Mệnh", true),
        Than("Câu Trận", false),
    )

    fun ngayHoangDao(jd: Int, lunarMonth: Int): Than {
        val start = (((lunarMonth - 1) % 6) * 2) % 12
        val dayChi = (jd + 1) % 12
        return THAN[(dayChi - start + 12) % 12]
    }

    // -----------------------------------------------------------------------------------------
    // Ngũ hành nạp âm (60 Hoa Giáp, mỗi cặp can chi liền nhau chung một nạp âm)

    private val NAP_AM = listOf(
        NapAm("Hải Trung Kim", "Kim"), NapAm("Lư Trung Hỏa", "Hỏa"), NapAm("Đại Lâm Mộc", "Mộc"), NapAm("Lộ Bàng Thổ", "Thổ"), NapAm("Kiếm Phong Kim", "Kim"),
        NapAm("Sơn Đầu Hỏa", "Hỏa"), NapAm("Giản Hạ Thủy", "Thủy"), NapAm("Thành Đầu Thổ", "Thổ"), NapAm("Bạch Lạp Kim", "Kim"), NapAm("Dương Liễu Mộc", "Mộc"),
        NapAm("Tuyền Trung Thủy", "Thủy"), NapAm("Ốc Thượng Thổ", "Thổ"), NapAm("Tích Lịch Hỏa", "Hỏa"), NapAm("Tùng Bách Mộc", "Mộc"), NapAm("Trường Lưu Thủy", "Thủy"),
        NapAm("Sa Trung Kim", "Kim"), NapAm("Sơn Hạ Hỏa", "Hỏa"), NapAm("Bình Địa Mộc", "Mộc"), NapAm("Bích Thượng Thổ", "Thổ"), NapAm("Kim Bạch Kim", "Kim"),
        NapAm("Phú Đăng Hỏa", "Hỏa"), NapAm("Thiên Hà Thủy", "Thủy"), NapAm("Đại Dịch Thổ", "Thổ"), NapAm("Thoa Xuyến Kim", "Kim"), NapAm("Tang Đố Mộc", "Mộc"),
        NapAm("Đại Khê Thủy", "Thủy"), NapAm("Sa Trung Thổ", "Thổ"), NapAm("Thiên Thượng Hỏa", "Hỏa"), NapAm("Thạch Lựu Mộc", "Mộc"), NapAm("Đại Hải Thủy", "Thủy"),
    )

    fun napAm(cc: CanChi): NapAm = NAP_AM[cc.index / 2]
}

data class SolarDate(val day: Int, val month: Int, val year: Int)

data class LunarDate(
    val day: Int,
    val month: Int,
    val year: Int,
    /** Tháng nhuận */
    val leap: Boolean,
    /** Số ngày Julius của ngày dương tương ứng */
    val jd: Int,
    /** Số ngày của tháng âm này (29 hoặc 30) */
    val monthLength: Int,
)

data class CanChi(
    val can: Int,
    val chi: Int,
    /** Vị trí trong 60 Hoa Giáp (0 = Giáp Tý) */
    val index: Int,
    val name: String,
)

data class TietKhi(val name: String, val startsToday: Boolean)

/** Giờ hoàng đạo: tên chi và khung giờ đồng hồ ("23-1", "1-3"…) */
data class GioHoangDao(val chi: String, val hours: String)

/** Thần trực ngày; good = hoàng đạo (ngày tốt), ngược lại là hắc đạo */
data class Than(val name: String, val good: Boolean)

/** Nạp âm và ngũ hành (Kim, Mộc, Thủy, Hỏa, Thổ) */
data class NapAm(val name: String, val hanh: String)
