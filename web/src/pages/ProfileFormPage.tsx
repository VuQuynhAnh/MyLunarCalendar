import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { checkProfile } from "@mylunar/shared";
import type { Profile } from "../api";
import { useProfiles } from "../profiles-context";
import { ConfirmSheet } from "../components/ConfirmSheet";
import { Field, inputClass } from "../components/ui";
import { today } from "../lib/calendar";

/**
 * Thêm/sửa hồ sơ (HORO-UC01/BR-1): tên gọi, ngày sinh dương lịch, giờ sinh (không bắt buộc),
 * giới tính. Lưu trên máy. Trang riêng toàn màn hình để nút back của điện thoại quay về danh sách.
 */
export function ProfileFormPage() {
  const { id } = useParams();
  const { profiles } = useProfiles();
  const editing = id ? profiles.find((p) => String(p.id) === id) : undefined;
  if (id && !editing) return <p className="p-4 text-center text-muted">Không tìm thấy hồ sơ</p>;
  return <ProfileForm key={id ?? "new"} editing={editing} />;
}

function ProfileForm({ editing }: { editing?: Profile }) {
  const navigate = useNavigate();
  const { add, update, remove: removeProfile } = useProfiles();
  const [name, setName] = useState(editing?.name ?? "");
  const [birthDate, setBirthDate] = useState(editing?.birthDate ?? "");
  const [birthTime, setBirthTime] = useState(editing?.birthTime ?? "");
  const [gender, setGender] = useState<"male" | "female" | "">(editing?.gender ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  const save = () => {
    const checked = checkProfile({ name, birthDate, birthTime, gender }, today());
    if (!checked.ok) {
      setErrors(checked.fields);
      return;
    }
    try {
      if (editing) update(editing.id, checked.value);
      else add(checked.value);
      navigate("/ho-so");
    } catch (err) {
      // Vượt số hồ sơ tối đa
      setMessage(err instanceof Error ? err.message : "Chưa lưu được");
    }
  };

  const remove = () => {
    setConfirm(false);
    removeProfile(editing!.id);
    navigate("/ho-so");
  };

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-bg px-4 pb-8">
      <header className="safe-top flex h-12 items-center gap-2">
        <button type="button" onClick={() => navigate(-1)} className="min-h-11 pr-2 text-gold">
          ‹ Quay lại
        </button>
        <h1 className="font-semibold">{editing ? "Sửa hồ sơ" : "Thêm hồ sơ"}</h1>
      </header>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <fieldset>
          <Field label="Tên gọi" error={errors.name}>
            <input className={inputClass} value={name} maxLength={50} onChange={(e) => setName(e.target.value)} placeholder="vd Anh, Mẹ" />
          </Field>
          <Field label="Ngày sinh (dương lịch)" error={errors.birthDate}>
            <input className={inputClass} type="date" min="1900-01-31" max={today()} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </Field>
          <Field label="Giờ sinh (không bắt buộc)" error={errors.birthTime} hint="Không nhớ thì để trống">
            <input className={inputClass} type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} />
          </Field>
          <div role="radiogroup" aria-label="Giới tính" className="mb-3">
            <span className="mb-1 block text-sm font-medium">Giới tính</span>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["male", "Nam"],
                  ["female", "Nữ"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={gender === v}
                  onClick={() => setGender(v)}
                  className={cn("min-h-12 rounded-xl border", gender === v ? "border-gold bg-gold/15 text-gold" : "border-line text-muted")}
                >
                  {label}
                </button>
              ))}
            </div>
            {errors.gender && <span className="mt-1 block text-xs text-bad">{errors.gender}</span>}
          </div>
          {message && <p className="mb-3 text-sm text-bad">{message}</p>}
          <button type="submit" className="min-h-12 w-full rounded-xl bg-gold font-medium text-bg disabled:opacity-50">
            Lưu
          </button>
          {editing && (
            <button type="button" onClick={() => setConfirm(true)} className="mt-2 min-h-12 w-full rounded-xl font-medium text-bad">
              Xoá hồ sơ
            </button>
          )}
        </fieldset>
      </form>
      {confirm && (
        <ConfirmSheet
          message={`Xoá hồ sơ "${editing!.name}" và các tử vi đã xem?`}
          confirmLabel="Xoá"
          onCancel={() => setConfirm(false)}
          onConfirm={remove}
        />
      )}
    </div>
  );
}
