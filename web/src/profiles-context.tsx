import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { ProfileInput } from "@mylunar/shared";
import type { Profile } from "./api";
import { KEYS, load, save } from "./lib/storage";
import { forgetReadings } from "./lib/readings";

interface ProfilesState {
  profiles: Profile[];
  add(p: ProfileInput): Profile;
  update(id: number, p: ProfileInput): void;
  remove(id: number): void;
  /** Hồ sơ đang xem tử vi; nhớ trên máy để lần sau mở lại đúng người */
  selectedId: number | null;
  select(id: number): void;
}

const ProfilesContext = createContext<ProfilesState | null>(null);

/** Mỗi máy chỉ một hồ sơ của chính chủ máy (user chốt 2026-11-18) */
export const MAX_LOCAL_PROFILES = 1;

/**
 * Hồ sơ lưu trên máy (HORO-UC01/BR-1), dùng chung cho Tử vi, Tiện ích và chat. Không có server
 * lưu hồ sơ (user chốt 2026-11-17).
 */
export function ProfilesProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>(() => load<Profile[]>(KEYS.profiles, []));
  const [selectedId, setSelectedId] = useState<number | null>(() => load<number | null>(KEYS.selected, null));

  const commit = useCallback((next: Profile[]) => {
    setProfiles(next);
    save(KEYS.profiles, next);
  }, []);

  const add = useCallback(
    (p: ProfileInput) => {
      if (profiles.length >= MAX_LOCAL_PROFILES) throw new Error("Mỗi máy chỉ lưu một hồ sơ");
      const created = { ...p, id: Math.max(0, ...profiles.map((x) => x.id)) + 1 };
      commit([...profiles, created]);
      return created;
    },
    [profiles, commit],
  );
  const update = useCallback((id: number, p: ProfileInput) => commit(profiles.map((x) => (x.id === id ? { ...p, id } : x))), [profiles, commit]);
  const remove = useCallback(
    (id: number) => {
      commit(profiles.filter((x) => x.id !== id));
      forgetReadings(id);
    },
    [profiles, commit],
  );
  const select = useCallback((id: number) => {
    setSelectedId(id);
    save(KEYS.selected, id);
  }, []);

  // Hồ sơ đã chọn bị xoá hoặc chưa chọn: dùng hồ sơ đầu tiên
  const effective = profiles.some((p) => p.id === selectedId) ? selectedId : (profiles[0]?.id ?? null);

  return (
    <ProfilesContext.Provider value={{ profiles, add, update, remove, selectedId: effective, select }}>{children}</ProfilesContext.Provider>
  );
}

export function useProfiles(): ProfilesState {
  const ctx = useContext(ProfilesContext);
  if (!ctx) throw new Error("useProfiles phải nằm trong ProfilesProvider");
  return ctx;
}
