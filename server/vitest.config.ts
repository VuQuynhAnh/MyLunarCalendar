import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Một luồng: chạy song song nhiều tiến trình từng làm tràn bộ nhớ
    // trên máy dev ít RAM.
    pool: "threads",
    poolOptions: { threads: { singleThread: true } },
  },
});
