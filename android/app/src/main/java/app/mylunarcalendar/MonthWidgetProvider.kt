package app.mylunarcalendar

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import java.util.Calendar

/**
 * Widget 4x4 lịch tháng: ngày dương, ngày âm, ngày lễ, ô hôm nay; dòng cuối là ngày âm hôm nay,
 * tiết khí và giờ hoàng đạo. Tính hoàn toàn trên máy, không cần mạng.
 *
 * Mỗi widget nhớ riêng đang xem lệch bao nhiêu tháng so với tháng hiện tại; sang ngày mới thì
 * quay về tháng hiện tại để widget luôn mở ra đúng hôm nay.
 */
class MonthWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(ctx: Context, manager: AppWidgetManager, ids: IntArray) {
        for (id in ids) render(ctx, manager, id)
        scheduleMidnight(ctx)
    }

    override fun onDeleted(ctx: Context, ids: IntArray) {
        val edit = prefs(ctx).edit()
        for (id in ids) edit.remove(KEY_OFFSET + id).remove(KEY_DAY + id)
        edit.apply()
    }

    override fun onDisabled(ctx: Context) {
        // Không còn widget nào trên màn hình chính: bỏ báo thức nửa đêm
        ctx.getSystemService(AlarmManager::class.java)?.cancel(midnightIntent(ctx))
    }

    override fun onReceive(ctx: Context, intent: Intent) {
        super.onReceive(ctx, intent)
        when (intent.action) {
            ACTION_PREV, ACTION_NEXT, ACTION_RESET -> {
                val id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
                if (id == AppWidgetManager.INVALID_APPWIDGET_ID) return
                val offset = when (intent.action) {
                    ACTION_PREV -> currentOffset(ctx, id) - 1
                    ACTION_NEXT -> currentOffset(ctx, id) + 1
                    else -> 0
                }
                prefs(ctx).edit()
                    .putInt(KEY_OFFSET + id, offset)
                    .putInt(KEY_DAY + id, MonthGrid.todayJd())
                    .apply()
                render(ctx, AppWidgetManager.getInstance(ctx), id)
            }
            ACTION_MIDNIGHT,
            Intent.ACTION_TIME_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED,
            Intent.ACTION_DATE_CHANGED -> {
                renderAll(ctx)
                scheduleMidnight(ctx)
            }
        }
    }

    companion object {
        private const val ACTION_PREV = "app.mylunarcalendar.widget.PREV"
        private const val ACTION_NEXT = "app.mylunarcalendar.widget.NEXT"
        private const val ACTION_RESET = "app.mylunarcalendar.widget.RESET"
        private const val ACTION_MIDNIGHT = "app.mylunarcalendar.widget.MIDNIGHT"

        private const val PREFS = "widget"
        private const val KEY_OFFSET = "offset_"
        /** Ngày (số Julius) lúc chọn tháng; khác hôm nay nghĩa là đã sang ngày mới */
        private const val KEY_DAY = "day_"

        private const val TEXT = 0xFFF4F1EA.toInt()
        private const val MUTED = 0xFFA8A29E.toInt()
        private const val GOLD = 0xFFD4AF37.toInt()
        private const val RED = 0xFFF87171.toInt()
        /** Chủ nhật: đỏ nhạt hơn ngày nghỉ lễ */
        private const val SUNDAY = 0xFFFCA5A5.toInt()
        /** Ngày của tháng trước/sau: cùng màu nhưng mờ */
        private const val DIM_ALPHA = 0x55

        private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

        /** Số tháng đang lệch; sang ngày mới thì coi như 0 (về tháng hiện tại) */
        private fun currentOffset(ctx: Context, id: Int): Int {
            val p = prefs(ctx)
            if (p.getInt(KEY_DAY + id, 0) != MonthGrid.todayJd()) return 0
            return p.getInt(KEY_OFFSET + id, 0)
        }

        /** Vẽ lại mọi widget đang có trên màn hình chính */
        fun renderAll(ctx: Context) {
            val manager = AppWidgetManager.getInstance(ctx)
            val ids = manager.getAppWidgetIds(ComponentName(ctx, MonthWidgetProvider::class.java))
            for (id in ids) render(ctx, manager, id)
        }

        private fun dim(color: Int): Int = (color and 0x00FFFFFF) or (DIM_ALPHA shl 24)

        /** Vẽ một widget: tiêu đề tháng, 42 ô ngày, dòng thông tin hôm nay */
        fun render(ctx: Context, manager: AppWidgetManager, id: Int) {
            val views = RemoteViews(ctx.packageName, R.layout.widget)
            val todayJd = MonthGrid.todayJd()
            val today = LunarCalendar.jdToDate(todayJd)
            val (year, month) = MonthGrid.shift(today.year, today.month, currentOffset(ctx, id))

            views.setTextViewText(R.id.title, "Tháng $month · $year")
            views.setOnClickPendingIntent(R.id.prev, navIntent(ctx, id, ACTION_PREV))
            views.setOnClickPendingIntent(R.id.next, navIntent(ctx, id, ACTION_NEXT))
            views.setOnClickPendingIntent(R.id.title, navIntent(ctx, id, ACTION_RESET))

            val cells = MonthGrid.build(year, month)
            for (i in 0 until MonthGrid.CELLS) {
                val cell = cells[i]
                val dayColor = when {
                    cell.isOff -> RED
                    cell.holidays.isNotEmpty() -> GOLD
                    cell.isSunday -> SUNDAY
                    else -> TEXT
                }
                // Mùng 1 tô vàng để dễ thấy chỗ sang tháng âm mới
                val lunarColor = if (cell.lunar.day == 1) GOLD else MUTED
                views.setTextViewText(WidgetCells.DAY[i], cell.solar.day.toString())
                views.setTextColor(WidgetCells.DAY[i], if (cell.inMonth) dayColor else dim(dayColor))
                views.setTextViewText(WidgetCells.LUNAR[i], MonthGrid.lunarLabel(cell.lunar))
                views.setTextColor(WidgetCells.LUNAR[i], if (cell.inMonth) lunarColor else dim(lunarColor))
                views.setInt(WidgetCells.CELL[i], "setBackgroundResource", if (cell.jd == todayJd) R.drawable.cell_today else 0)
                views.setOnClickPendingIntent(WidgetCells.CELL[i], dayIntent(ctx, id, i, cell.solar))
            }

            val lunar = LunarCalendar.solarToLunar(today.day, today.month, today.year)
            val tiet = LunarCalendar.tietKhi(todayJd)
            val holidays = Holidays.holidaysOf(today.day, today.month, today.year, lunar)
            val line1 = StringBuilder("Hôm nay ${lunar.day}/${lunar.month}${if (lunar.leap) " nhuận" else ""} âm · ${tiet.name}")
            if (holidays.isNotEmpty()) line1.append(" · ").append(holidays.joinToString(", ") { it.name })
            views.setTextViewText(R.id.footer1, line1.toString())
            views.setTextViewText(R.id.footer2, "Giờ tốt: ${MonthGrid.gioTotShort(todayJd)}")

            manager.updateAppWidget(id, views)
        }

        /** Nút ‹ › và tiêu đề; data riêng cho từng widget để PendingIntent không bị dùng chung */
        private fun navIntent(ctx: Context, id: Int, action: String): PendingIntent {
            val intent = Intent(ctx, MonthWidgetProvider::class.java)
                .setAction(action)
                .setData(Uri.parse("mylunarcalendar://widget/$id/$action"))
                .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)
            return PendingIntent.getBroadcast(ctx, id, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        }

        /** Bấm một ô: mở app ở đúng ngày đó. Mỗi ô một requestCode và data riêng */
        private fun dayIntent(ctx: Context, id: Int, index: Int, date: SolarDate): PendingIntent {
            val intent = Intent(ctx, MainActivity::class.java)
                .setData(Uri.parse("mylunarcalendar://day/$id/$index"))
                .putExtra(MainActivity.EXTRA_YEAR, date.year)
                .putExtra(MainActivity.EXTRA_MONTH, date.month)
                .putExtra(MainActivity.EXTRA_DAY, date.day)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            return PendingIntent.getActivity(
                ctx, id * 100 + index, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
        }

        private fun midnightIntent(ctx: Context): PendingIntent = PendingIntent.getBroadcast(
            ctx, 0,
            Intent(ctx, MonthWidgetProvider::class.java).setAction(ACTION_MIDNIGHT),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        /**
         * Hẹn vẽ lại lúc 0 giờ 1 phút đêm nay (giờ máy) để ô "hôm nay" và dòng giờ tốt sang ngày mới.
         * Dùng báo thức không chính xác (cho lệch tối đa 15 phút) nên không cần quyền báo thức
         * chính xác; khi máy ngủ sâu, báo thức chạy ngay lúc máy thức dậy.
         */
        fun scheduleMidnight(ctx: Context) {
            val alarm = ctx.getSystemService(AlarmManager::class.java) ?: return
            val next = Calendar.getInstance().apply {
                add(Calendar.DAY_OF_MONTH, 1)
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 1)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }
            alarm.setWindow(AlarmManager.RTC, next.timeInMillis, 15 * 60 * 1000L, midnightIntent(ctx))
        }
    }
}
