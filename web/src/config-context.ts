import { createContext, useContext } from "react";

export interface Config {
  passwordRequired: boolean;
  aiEnabled: boolean;
}

export const DEFAULT_CONFIG: Config = { passwordRequired: false, aiEnabled: false };
/** `ready` = đã biết cấu hình (nhớ từ lần trước hoặc server vừa trả lời) */
export const ConfigContext = createContext<Config & { ready: boolean }>({ ...DEFAULT_CONFIG, ready: false });
export const useConfig = () => useContext(ConfigContext);

/** AI có bật không: chưa có GEMINI_API_KEY hoặc chưa gọi được server thì ẩn tử vi, hồ sơ, chat */
export const useAiEnabled = () => useContext(ConfigContext).aiEnabled;
