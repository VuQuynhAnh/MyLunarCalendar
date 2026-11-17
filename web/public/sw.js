// Service worker (CAL-UC01/BR-13): giữ sẵn giao diện để mở lại là thấy lịch ngay, kể cả khi mất mạng
// hay server miễn phí đang ngủ. Trả bản đã lưu trước rồi lấy bản mới ở nền (lần mở sau dùng bản mới).
// /api luôn đi mạng: số liệu tử vi, chat không được lấy từ bộ nhớ đệm.
const CACHE = "mlc-shell-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  // Mọi trang (/, /tien-ich, /?ngay=…) là cùng một index.html của web một trang
  const key = req.mode === "navigate" ? "/" : req;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(key);
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(key, res.clone());
          return res;
        })
        .catch(() => cached);
      if (cached) {
        event.waitUntil(fresh);
        return cached;
      }
      return fresh;
    }),
  );
});
