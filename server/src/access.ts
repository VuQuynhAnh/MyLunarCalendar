import { createHash, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { HttpError } from "./http";

/** Header web gửi kèm mật khẩu chung */
export const PASSWORD_HEADER = "x-app-password";

const sha256 = (s: string) => createHash("sha256").update(s).digest();

/**
 * Mật khẩu chung (HORO-UC01/BR-6): không có tài khoản, nên để người lạ biết địa chỉ web không dùng
 * hết hạn mức AI miễn phí, các API gọi AI đòi mật khẩu đặt ở biến môi trường `APP_PASSWORD`.
 * Không đặt thì ai cũng dùng được. So bằng băm + timingSafeEqual để không lộ độ dài hay ký tự đúng.
 */
export function requirePassword(password: string | undefined): RequestHandler {
  const expected = password ? sha256(password) : null;
  return (req, _res, next) => {
    if (!expected) return next();
    const given = req.get(PASSWORD_HEADER) ?? "";
    if (!timingSafeEqual(sha256(given), expected)) return next(new HttpError(401, "Sai mật khẩu, nhập lại mật khẩu chung"));
    next();
  };
}
