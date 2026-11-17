package app.mylunarcalendar

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

/**
 * Nhập địa chỉ web MyLunarCalendar (vd địa chỉ Render sau khi deploy) một lần; app nhớ để lần sau
 * mở thẳng web. Widget không cần bước này.
 */
class SetupActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val pad = (20 * resources.displayMetrics.density).toInt()
        val minTouch = (48 * resources.displayMetrics.density).toInt()

        val title = TextView(this).apply {
            text = getString(R.string.setup_title)
            textSize = 22f
        }
        val guide = TextView(this).apply {
            text = getString(R.string.setup_guide)
            textSize = 15f
            setPadding(0, pad / 2, 0, pad / 2)
        }
        val input = EditText(this).apply {
            hint = getString(R.string.setup_hint)
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
            textSize = 16f
            minHeight = minTouch
            setText(webUrl(this@SetupActivity) ?: "")
        }
        val error = TextView(this).apply {
            setTextColor(0xFFF87171.toInt())
            textSize = 14f
        }
        val save = Button(this).apply {
            text = getString(R.string.setup_save)
            minHeight = minTouch
            setOnClickListener {
                val url = WebScreen.normalizeUrl(input.text.toString())
                if (url == null) {
                    error.text = getString(R.string.setup_invalid)
                } else {
                    saveWebUrl(this@SetupActivity, url)
                    startActivity(Intent(this@SetupActivity, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP))
                    finish()
                }
            }
        }
        val col = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.TOP
            setPadding(pad, pad, pad, pad)
            addView(title)
            addView(guide)
            addView(input)
            addView(error)
            addView(save)
        }
        setContentView(ScrollView(this).apply {
            fitsSystemWindows = true
            addView(col)
        })
    }

    companion object {
        private const val PREFS = "app"
        private const val KEY_URL = "webUrl"

        fun webUrl(ctx: Context): String? = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_URL, null)

        fun saveWebUrl(ctx: Context, url: String) {
            ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_URL, url).apply()
        }
    }
}
