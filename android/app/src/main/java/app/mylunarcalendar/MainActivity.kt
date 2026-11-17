package app.mylunarcalendar

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent
import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.webkit.WebView
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.Toast

/**
 * Mở app là mở web MyLunarCalendar ngay trong app (user chốt 2026-11-17: cả app là webview), không
 * phải mở trình duyệt. Widget lịch tháng vẫn tính trên máy, không cần mạng. Chạm một ngày trên widget
 * thì mở web ở đúng ngày đó (`/?ngay=YYYY-MM-DD`). Chưa có địa chỉ web thì mở màn hình cài đặt.
 */
class MainActivity : Activity() {
    private lateinit var web: WebView
    private lateinit var progress: ProgressBar

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val base = SetupActivity.webUrl(this)
        if (base == null) {
            startActivity(Intent(this, SetupActivity::class.java))
            finish()
            return
        }
        web = WebView(this)
        progress = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply { isIndeterminate = true }
        val root = FrameLayout(this).apply {
            fitsSystemWindows = true
            setBackgroundColor(0xFF0F0F10.toInt())
            addView(web, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
            addView(progress, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT))
        }
        setContentView(root)
        WebScreen.setup(this, web, base) { loading -> progress.visibility = if (loading) View.VISIBLE else View.GONE }
        if (savedInstanceState != null) web.restoreState(savedInstanceState) else web.loadUrl(urlFor(base, intent))
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // Đang mở app mà chạm thêm một ngày trên widget: chuyển tới ngày đó
        val base = SetupActivity.webUrl(this) ?: return
        if (intent.hasExtra(EXTRA_DAY)) web.loadUrl(urlFor(base, intent))
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        if (::web.isInitialized) web.saveState(outState)
    }

    /** Nút back của điện thoại lùi trang trong web trước, hết trang mới thoát app */
    @Deprecated("Vẫn chạy khi chưa bật cử chỉ back dự đoán")
    override fun onBackPressed() {
        if (::web.isInitialized && web.canGoBack()) web.goBack() else super.onBackPressed()
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menu.add(0, MENU_PIN, 0, getString(R.string.pin_widget))
        menu.add(0, MENU_SETUP, 1, getString(R.string.change_url))
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        when (item.itemId) {
            MENU_PIN -> pinWidget()
            MENU_SETUP -> startActivity(Intent(this, SetupActivity::class.java))
            else -> return super.onOptionsItemSelected(item)
        }
        return true
    }

    private fun pinWidget() {
        val manager = getSystemService(AppWidgetManager::class.java)
        if (manager != null && manager.isRequestPinAppWidgetSupported) {
            manager.requestPinAppWidget(ComponentName(this, MonthWidgetProvider::class.java), null, null)
        } else {
            Toast.makeText(this, getString(R.string.pin_manual), Toast.LENGTH_LONG).show()
        }
    }

    companion object {
        // Widget gửi kèm ngày được chạm
        const val EXTRA_YEAR = "year"
        const val EXTRA_MONTH = "month"
        const val EXTRA_DAY = "day"

        private const val MENU_PIN = 1
        private const val MENU_SETUP = 2

        private fun urlFor(base: String, intent: Intent): String {
            if (!intent.hasExtra(EXTRA_DAY)) return "$base/"
            val y = intent.getIntExtra(EXTRA_YEAR, 0)
            val m = intent.getIntExtra(EXTRA_MONTH, 0)
            val d = intent.getIntExtra(EXTRA_DAY, 0)
            return "$base/?ngay=%04d-%02d-%02d".format(y, m, d)
        }
    }
}
