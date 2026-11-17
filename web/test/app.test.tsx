import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "../src/api";
import { baseHandlers, deferred, horoscope, mockApi, renderAt, seedProfiles } from "./helpers";

vi.mock("../src/api", async (orig) => ({ ...(await orig<typeof import("../src/api")>()), api: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  // Chỉ giả đồng hồ (Date), không giả setTimeout để userEvent vẫn chạy: "hôm nay" là 17/11/2026 giờ VN
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-17T03:00:00.000Z"));
  try {
    localStorage.clear();
  } catch {
    // jsdom luôn có localStorage; bọc cho chắc
  }
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("tab Lịch (CAL-UC01)", () => {
  // SC: CAL-UC01-SC5
  it("lịch tháng có ngày âm, ngày lễ; chạm một ngày xem chi tiết", async () => {
    mockApi(baseHandlers());
    const user = userEvent.setup();
    renderAt("/");
    const grid = await screen.findByRole("grid", { name: "Lịch tháng 11 năm 2026" });
    // Tuần bắt đầu thứ Hai: tháng 11/2026 bắt đầu từ ô 26/10
    const cells = within(grid).getAllByRole("gridcell");
    expect(cells).toHaveLength(42);
    expect(cells[0]!.getAttribute("aria-label")).toContain("26/10/2026");
    // Hôm nay 17/11/2026 là mùng 9 tháng 10 âm
    const detail = screen.getByRole("region", { name: "Chi tiết ngày" });
    expect(within(detail).getByText("Thứ Ba, 17/11/2026")).toBeTruthy();
    expect(within(detail).getByText(/Ngày 9 tháng 10 năm Bính Ngọ/)).toBeTruthy();
    // Ngày Nhà giáo 20/11 có tên lễ
    await user.click(screen.getByRole("gridcell", { name: /20\/11\/2026.*Nhà giáo Việt Nam/ }));
    expect(within(detail).getByText("Nhà giáo Việt Nam")).toBeTruthy();
    expect(within(detail).getByText("Thứ Sáu, 20/11/2026")).toBeTruthy();
  });

  it("chuyển tháng; nút Thêm: đổi âm → dương, dương → âm, Xem trên lịch", async () => {
    mockApi(baseHandlers());
    const user = userEvent.setup();
    renderAt("/");
    await user.click(await screen.findByRole("button", { name: "Tháng sau" }));
    expect(screen.getByRole("grid", { name: "Lịch tháng 12 năm 2026" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Thêm" }));
    const sheet = screen.getByRole("dialog", { name: "Thêm" });
    const conv = within(sheet).getByRole("region", { name: "Đổi ngày âm sang dương" });
    await user.type(within(conv).getByLabelText("Ngày"), "1");
    await user.type(within(conv).getByLabelText("Tháng"), "1");
    await user.clear(within(conv).getByLabelText("Năm"));
    await user.type(within(conv).getByLabelText("Năm"), "2027");
    await user.click(within(conv).getByRole("button", { name: "Đổi sang dương" }));
    expect(within(conv).getByText("01/01 âm lịch năm 2027 là Thứ Bảy, 06/02/2027")).toBeTruthy();
    await user.click(within(conv).getByLabelText("Tháng nhuận"));
    await user.click(within(conv).getByRole("button", { name: "Đổi sang dương" }));
    expect(within(conv).getByText("Ngày âm không tồn tại")).toBeTruthy();

    const back = within(sheet).getByRole("region", { name: "Đổi ngày dương sang âm" });
    const input = within(back).getByLabelText(/^Ngày dương/) as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "2025-10-06");
    await user.click(within(back).getByRole("button", { name: "Đổi sang âm" }));
    expect(within(back).getByText("Thứ Hai, 06/10/2025 là ngày 15 tháng 8 năm Ất Tỵ (âm lịch)")).toBeTruthy();
    // Ngoài app Android thì mời tải app
    expect(within(sheet).getByRole("link", { name: "Tải mylunarcalendar.apk" })).toBeTruthy();

    await user.click(within(back).getByRole("button", { name: "Xem trên lịch" }));
    expect(screen.queryByRole("dialog", { name: "Thêm" })).toBeNull();
    expect(await screen.findByRole("grid", { name: "Lịch tháng 10 năm 2025" })).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Chi tiết ngày" })).getByText("Tết Trung thu")).toBeTruthy();
  });
});

describe("tab Tử vi (HORO-UC01)", () => {
  it("chưa có hồ sơ thì mời thêm", async () => {
    mockApi(baseHandlers());
    renderAt("/tu-vi");
    expect(await screen.findByText("Thêm ngày sinh để xem tử vi hằng ngày")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Thêm hồ sơ" })).toBeTruthy();
  });

  // SC: HORO-UC01-SC6
  it("gửi hồ sơ trên máy để xem tử vi; bản đã xem lưu lại, mở lại không gọi AI; Hỏi thêm mở chat", async () => {
    seedProfiles();
    const calls = mockApi({
      ...baseHandlers(),
      "POST /horoscope": (init) => horoscope((init!.body as { date: string }).date),
      "POST /chat": () => ({ reply: "Hôm nay hợp tuổi bạn." }),
    });
    const user = userEvent.setup();
    const view = renderAt("/tu-vi");
    expect(await screen.findByText("Tóm tắt ngày 2026-11-17")).toBeTruthy();
    expect(screen.getByText(/Anh · tuổi Canh Ngọ · mệnh Lộ Bàng Thổ/)).toBeTruthy();
    expect(screen.getByLabelText("Điểm ngày: 4/5")).toBeTruthy();
    expect(calls.find((c) => c.path === "/horoscope")!.body).toEqual({ name: "Anh", birthDate: "1990-03-01", birthTime: "08:30", gender: "male", date: "2026-11-17" });

    await user.click(screen.getByRole("button", { name: "Ngày sau" }));
    expect(await screen.findByText("Tóm tắt ngày 2026-11-18")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Ngày trước" }));
    expect(await screen.findByText("Tóm tắt ngày 2026-11-17")).toBeTruthy();
    // Hai ngày, mỗi ngày gọi AI một lần; quay lại ngày đã xem dùng bản lưu trên máy
    expect(calls.filter((c) => c.path === "/horoscope")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Hỏi thêm AI" }));
    const chat = screen.getByRole("dialog", { name: "Hỏi AI" });
    expect(within(chat).getByText("Tử vi Thứ Ba, 17/11/2026 của Anh: Tóm tắt ngày 2026-11-17")).toBeTruthy();
    // Chat gửi kèm hồ sơ và tóm tắt tử vi hôm nay đang lưu trên máy (HORO-UC02/BR-2)
    await user.type(within(chat).getByLabelText("Câu hỏi"), "Nên làm gì?");
    await user.click(within(chat).getByRole("button", { name: "Gửi" }));
    expect(await within(chat).findByText("Hôm nay hợp tuổi bạn.")).toBeTruthy();
    expect(calls.find((c) => c.path === "/chat")!.body).toMatchObject({
      profiles: [{ name: "Anh", birthDate: "1990-03-01", birthTime: "08:30", gender: "male" }],
      readings: [{ name: "Anh", score: 4, summary: "Tóm tắt ngày 2026-11-17" }],
    });
    view.unmount();
  });

  it("kết quả về muộn của ngày cũ không ghi đè ngày đang xem (R-UI-02); lỗi có Thử lại", async () => {
    seedProfiles();
    const slow = deferred<unknown>();
    let fail = true;
    mockApi({
      ...baseHandlers(),
      "POST /horoscope": (init) => {
        const date = (init!.body as { date: string }).date;
        if (date === "2026-11-17") return slow.promise;
        if (fail) throw new ApiError(503, "AI đang quá tải, thử lại sau ít phút");
        return horoscope(date);
      },
    });
    const user = userEvent.setup();
    renderAt("/tu-vi");
    await user.click(await screen.findByRole("button", { name: "Ngày sau" }));
    expect(await screen.findByText("AI đang quá tải, thử lại sau ít phút")).toBeTruthy();
    slow.resolve(horoscope("2026-11-17"));
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByText("Tóm tắt ngày 2026-11-17")).toBeNull();
    fail = false;
    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByText("Tóm tắt ngày 2026-11-18")).toBeTruthy();
  });
});

describe("hồ sơ lưu trên máy (HORO-UC01/BR-1)", () => {
  // SC: HORO-UC01-SC7
  it("thêm hồ sơ: lỗi hiện dưới từng ô; lưu xong có trong danh sách và trên máy", async () => {
    mockApi(baseHandlers());
    const user = userEvent.setup();
    renderAt("/ho-so");
    await user.click(await screen.findByRole("link", { name: "Thêm hồ sơ" }));
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    expect(screen.getByText("Vui lòng nhập tên")).toBeTruthy();
    expect(screen.getByText("Vui lòng chọn giới tính")).toBeTruthy();

    await user.type(screen.getByLabelText(/^Tên gọi/), "Anh");
    await user.type(screen.getByLabelText(/^Ngày sinh/), "1990-03-01");
    await user.click(screen.getByRole("radio", { name: "Nam" }));
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    expect(await screen.findByText(/tuổi Canh Ngọ · mệnh Lộ Bàng Thổ/)).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("mlc.profiles")!)).toEqual([{ id: 1, name: "Anh", birthDate: "1990-03-01", birthTime: null, gender: "male" }]);
  });

  it("mở link sửa: các ô có sẵn dữ liệu; xoá phải xác nhận", async () => {
    seedProfiles();
    mockApi(baseHandlers());
    const user = userEvent.setup();
    renderAt("/ho-so/1");
    expect(((await screen.findByLabelText(/^Tên gọi/)) as HTMLInputElement).value).toBe("Anh");
    expect((screen.getByLabelText(/^Giờ sinh/) as HTMLInputElement).value).toBe("08:30");
    await user.click(screen.getByRole("button", { name: "Xoá hồ sơ" }));
    expect(screen.getByText('Xoá hồ sơ "Anh" và các tử vi đã xem?')).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Xoá" }));
    expect(await screen.findByText("Chưa có hồ sơ nào")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("mlc.profiles")!)).toEqual([]);
  });

  it("link sửa hồ sơ không có thì báo không tìm thấy", async () => {
    mockApi(baseHandlers());
    renderAt("/ho-so/99");
    expect(await screen.findByText("Không tìm thấy hồ sơ")).toBeTruthy();
  });
});

describe("mật khẩu chung (HORO-UC01/BR-6)", () => {
  // SC: HORO-UC01-SC9
  it("server đặt mật khẩu thì hỏi một lần rồi vào app, máy nhớ mật khẩu", async () => {
    mockApi(baseHandlers(true));
    const user = userEvent.setup();
    renderAt("/");
    await user.type(await screen.findByLabelText(/^Mật khẩu chung/), "bimat");
    await user.click(screen.getByRole("button", { name: "Vào" }));
    expect(await screen.findByRole("grid", { name: "Lịch tháng 11 năm 2026" })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("mlc.password")!)).toBe("bimat");
  });
});

describe("chưa bật AI (HORO-UC01/BR-8)", () => {
  // SC: HORO-UC01-SC10
  it("server chưa có key Gemini: chỉ còn lịch, không có tab Tử vi/Hồ sơ, nút Hỏi AI; link cũ về Lịch", async () => {
    mockApi({ "GET /config": () => ({ passwordRequired: false, aiEnabled: false }) });
    renderAt("/tu-vi");
    expect(await screen.findByRole("grid", { name: "Lịch tháng 11 năm 2026" })).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Điều hướng chính" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Hỏi AI" })).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    // Nút Thêm (đổi ngày) vẫn có, đứng chỗ nút Hỏi AI
    expect(screen.getByRole("button", { name: "Thêm" })).toBeTruthy();
  });

  it("không gọi được server: lịch vẫn chạy, ẩn phần AI, không báo lỗi", async () => {
    mockApi({
      "GET /config": () => {
        throw new ApiError(0, "Không kết nối được máy chủ");
      },
    });
    renderAt("/");
    expect(await screen.findByRole("grid", { name: "Lịch tháng 11 năm 2026" })).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("navigation", { name: "Điều hướng chính" })).toBeNull());
    expect(screen.queryByText("Không kết nối được máy chủ")).toBeNull();
  });
});

describe("mở thẳng một ngày (CAL-UC01/BR-6)", () => {
  it("?ngay= chọn sẵn ngày đó (app Android mở từ ô ngày trên widget)", async () => {
    mockApi(baseHandlers());
    renderAt("/?ngay=2027-02-06");
    expect(await screen.findByRole("grid", { name: "Lịch tháng 2 năm 2027" })).toBeTruthy();
    const detail = screen.getByRole("region", { name: "Chi tiết ngày" });
    expect(within(detail).getByText("Tết Nguyên Đán")).toBeTruthy();
  });
});
