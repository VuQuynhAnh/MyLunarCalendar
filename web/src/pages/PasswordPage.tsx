import { useState } from "react";
import { Field, inputClass } from "../components/ui";

/**
 * Nhập mật khẩu chung (HORO-UC01/BR-6), chỉ hiện khi server đặt APP_PASSWORD. Nhập một lần, máy nhớ;
 * server báo sai thì quay lại màn này.
 */
export function PasswordPage({ onSubmit, wrong }: { onSubmit(password: string): void; wrong: boolean }) {
  const [value, setValue] = useState("");
  return (
    // Nền tối có quầng vàng kim phía trên
    <div className="flex min-h-dvh items-center justify-center bg-bg bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--color-gold)_22%,transparent),transparent_60%)] px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value) onSubmit(value);
        }}
        className="w-full max-w-sm rounded-2xl border border-line bg-surface/90 p-6 shadow-2xl backdrop-blur"
      >
        <h1 className="text-2xl font-semibold text-gold">MyLunarCalendar</h1>
        <p className="mb-6 text-sm text-muted">Lịch âm và tử vi của bạn</p>
        <Field label="Mật khẩu chung" error={wrong ? "Sai mật khẩu, nhập lại mật khẩu chung" : undefined}>
          <input className={inputClass} type="password" autoComplete="current-password" value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        <button type="submit" disabled={!value} className="min-h-12 w-full rounded-xl bg-gold font-medium text-bg disabled:opacity-50">
          Vào
        </button>
      </form>
    </div>
  );
}
