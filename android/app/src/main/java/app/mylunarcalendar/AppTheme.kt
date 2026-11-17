package app.mylunarcalendar

import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import android.content.res.Configuration
import java.util.Calendar

/**
 * Giao diện sáng/tối chọn ở tab Cài đặt của web (user chốt 2026-11-17): web báo xuống app qua
 * cầu nối JavaScript, app lưu lại để widget màn hình chính cũng đổi theo.
 * "system" = theo chế độ sáng/tối của điện thoại.
 */
object AppTheme {
    private const val PREFS = "app"
    private const val KEY_THEME = "theme"
    val MODES = setOf("light", "dark", "system")

    fun mode(ctx: Context): String = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_THEME, "system") ?: "system"

    /** Lưu lựa chọn mới; trả true nếu khác lựa chọn cũ (cần vẽ lại widget) */
    fun save(ctx: Context, mode: String): Boolean {
        if (mode !in MODES || mode == mode(ctx)) return false
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_THEME, mode).apply()
        return true
    }

    fun isDark(ctx: Context): Boolean = when (mode(ctx)) {
        "light" -> false
        "dark" -> true
        else -> (ctx.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
    }
}

/**
 * Icon app hiện ngày dương hôm nay (user chốt 2026-11-17). Android không cho vẽ lại icon, nên app có
 * 31 "bí danh" (activity-alias Day1..Day31) cùng mở MainActivity, mỗi bí danh một icon số ngày; mỗi
 * ngày bật đúng một bí danh, tắt các bí danh khác. Bí danh "Launcher" (icon trăng khuyết) chỉ bật
 * lúc mới cài, trước khi app chạy lần đầu.
 *
 * Lưu ý: một số launcher xoá icon trên màn hình chính (hoặc đóng app đang mở) khi bí danh đổi;
 * khi đó icon vẫn có trong danh sách ứng dụng.
 */
object DayIcon {
    fun update(ctx: Context) {
        val day = Calendar.getInstance().get(Calendar.DAY_OF_MONTH)
        val pm = ctx.packageManager
        val want = "${ctx.packageName}.Day$day"
        val names = (1..31).map { "${ctx.packageName}.Day$it" } + "${ctx.packageName}.Launcher"
        // Bật bí danh hôm nay trước rồi mới tắt cái cũ, để lúc nào cũng có ít nhất một icon
        setEnabled(pm, ctx, want, true)
        for (name in names) if (name != want) setEnabled(pm, ctx, name, false)
    }

    private fun setEnabled(pm: PackageManager, ctx: Context, name: String, enabled: Boolean) {
        val component = ComponentName(ctx, name)
        val state = if (enabled) PackageManager.COMPONENT_ENABLED_STATE_ENABLED else PackageManager.COMPONENT_ENABLED_STATE_DISABLED
        if (pm.getComponentEnabledSetting(component) == state) return
        pm.setComponentEnabledSetting(component, state, PackageManager.DONT_KILL_APP)
    }
}
