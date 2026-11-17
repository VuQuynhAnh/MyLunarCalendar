import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
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

  it("chuyển tháng bằng nút và vuốt ngang", async () => {
    mockApi(baseHandlers());
    const user = userEvent.setup();
    renderAt("/");
    await user.click(await screen.findByRole("button", { name: "Tháng sau" }));
    const grid = screen.getByRole("grid", { name: "Lịch tháng 12 năm 2026" });
    // Vuốt sang trái: tháng sau; vuốt sang phải: tháng trước; vuốt dọc: không đổi
    fireEvent.touchStart(grid, { touches: [{ clientX: 300, clientY: 100 }] });
    fireEvent.touchEnd(grid, { changedTouches: [{ clientX: 120, clientY: 110 }] });
    expect(screen.getByRole("grid", { name: "Lịch tháng 1 năm 2027" })).toBeTruthy();
    fireEvent.touchStart(screen.getByRole("grid"), { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchEnd(screen.getByRole("grid"), { changedTouches: [{ clientX: 300, clientY: 100 }] });
    expect(screen.getByRole("grid", { name: "Lịch tháng 12 năm 2026" })).toBeTruthy();
    fireEvent.touchStart(screen.getByRole("grid"), { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchEnd(screen.getByRole("grid"), { changedTouches: [{ clientX: 160, clientY: 300 }] });
    expect(screen.getByRole("grid", { name: "Lịch tháng 12 năm 2026" })).toBeTruthy();
  });

  it("tab Tiện ích: đổi ngày gọn, nút mũi tên đảo chiều, Xem trên lịch", async () => {
    mockApi(baseHandlers());
    const user = userEvent.setup();
    renderAt("/");
    await user.click(await screen.findByRole("link", { name: "Tiện ích" }));
    const box = await screen.findByRole("region", { name: "Đổi ngày âm dương" });
    // Mặc định Dương → Âm
    const solar = within(box).getByLabelText("Ngày dương") as HTMLInputElement;
    await user.clear(solar);
    await user.type(solar, "2025-10-06");
    await user.click(within(box).getByRole("button", { name: "Đổi" }));
    expect(within(box).getByText("Ngày 15 tháng 8 năm Ất Tỵ (âm lịch)")).toBeTruthy();

    // Đảo chiều: Âm → Dương
    await user.click(within(box).getByRole("button", { name: /Đảo chiều, đang đổi Dương sang Âm/ }));
    await user.type(within(box).getByLabelText("Ngày âm"), "1");
    await user.type(within(box).getByLabelText("Tháng âm"), "1");
    await user.clear(within(box).getByLabelText("Năm âm"));
    await user.type(within(box).getByLabelText("Năm âm"), "2027");
    await user.click(within(box).getByRole("button", { name: "Đổi" }));
    expect(within(box).getByText("Thứ Bảy, 06/02/2027 (dương lịch)")).toBeTruthy();
    await user.click(within(box).getByLabelText("Tháng nhuận"));
    await user.click(within(box).getByRole("button", { name: "Đổi" }));
    expect(within(box).getByText("Ngày âm không tồn tại")).toBeTruthy();
    await user.click(within(box).getByLabelText("Tháng nhuận"));
    await user.click(within(box).getByRole("button", { name: "Đổi" }));

    await user.click(within(box).getByRole("button", { name: "Xem trên lịch" }));
    expect(await screen.findByRole("grid", { name: "Lịch tháng 2 năm 2027" })).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Chi tiết ngày" })).getByText("Tết Nguyên Đán")).toBeTruthy();
  });

  // SC: CAL-UC01-SC6
  it("chạm tiêu đề để chọn tháng, năm; Hôm nay quay về; hôm nay tô nền vàng", async () => {
    mockApi(baseHandlers());
    const user = userEvent.setup();
    renderAt("/");
    const todayCell = await screen.findByRole("gridcell", { name: /17\/11\/2026/ });
    expect(todayCell.className).toContain("bg-gold");
    await user.click(screen.getByRole("button", { name: /Chọn tháng, năm/ }));
    const picker = screen.getByRole("dialog", { name: "Chọn tháng, năm" });
    await user.selectOptions(within(picker).getByLabelText("Năm"), "1990");
    await user.click(within(picker).getByRole("button", { name: "Th 3" }));
    expect(screen.getByRole("grid", { name: "Lịch tháng 3 năm 1990" })).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Chọn tháng, năm" })).toBeNull();
    // Ngày nghỉ lễ nền đỏ nhạt (30/4)
    await user.click(screen.getByRole("button", { name: "Tháng sau" }));
    expect(screen.getByRole("gridcell", { name: /30\/04\/1990/ }).className).toContain("bg-bad/15");
    await user.click(screen.getByRole("button", { name: "Về hôm nay" }));
    expect(screen.getByRole("grid", { name: "Lịch tháng 11 năm 2026" })).toBeTruthy();
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

describe("hồ sơ lưu trên máy, mỗi máy một hồ sơ (HORO-UC01/BR-1)", () => {
  // SC: HORO-UC01-SC7
  it("chưa có hồ sơ: mời thêm; lỗi dưới từng ô; lưu xong Tiện ích hiện thẻ hồ sơ", async () => {
    mockApi(baseHandlers());
    const user = userEvent.setup();
    renderAt("/tien-ich");
    await user.click(await screen.findByRole("link", { name: "Thêm hồ sơ" }));
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    expect(screen.getByText("Vui lòng nhập tên")).toBeTruthy();
    expect(screen.getByText("Vui lòng chọn giới tính")).toBeTruthy();

    await user.type(screen.getByLabelText(/^Tên gọi/), "Anh");
    await user.type(screen.getByLabelText(/^Ngày sinh/), "1990-03-01");
    await user.click(screen.getByRole("radio", { name: "Nam" }));
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    const card = await screen.findByRole("region", { name: "Hồ sơ của bạn" });
    expect(within(card).getByText("Anh")).toBeTruthy();
    expect(within(card).getByText("Canh Ngọ")).toBeTruthy();
    expect(within(card).getByRole("link", { name: "Xem tử vi hôm nay" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Thêm hồ sơ" })).toBeNull();
    expect(JSON.parse(localStorage.getItem("mlc.profiles")!)).toEqual([{ id: 1, name: "Anh", birthDate: "1990-03-01", birthTime: null, gender: "male" }]);
  });

  it("đã có hồ sơ mà vào link thêm thì mở form sửa; xoá phải xác nhận, xong mời thêm lại", async () => {
    seedProfiles();
    mockApi(baseHandlers());
    const user = userEvent.setup();
    renderAt("/ho-so/them");
    expect(((await screen.findByLabelText(/^Tên gọi/)) as HTMLInputElement).value).toBe("Anh");
    expect((screen.getByLabelText(/^Giờ sinh/) as HTMLInputElement).value).toBe("08:30");
    await user.click(screen.getByRole("button", { name: "Xoá hồ sơ" }));
    expect(screen.getByText('Xoá hồ sơ "Anh" và các tử vi đã xem?')).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Xoá" }));
    expect(await screen.findByRole("link", { name: "Thêm hồ sơ" })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("mlc.profiles")!)).toEqual([]);
  });

  it("link sửa hồ sơ không có thì báo không tìm thấy; link danh sách cũ về Tiện ích", async () => {
    mockApi(baseHandlers());
    const view = renderAt("/ho-so/99");
    expect(await screen.findByText("Không tìm thấy hồ sơ")).toBeTruthy();
    view.unmount();
    renderAt("/ho-so");
    expect(await screen.findByRole("heading", { name: "Tiện ích" })).toBeTruthy();
  });
});

describe("chưa bật AI (HORO-UC01/BR-8)", () => {
  // SC: HORO-UC01-SC10
  it("server chưa có key Gemini: không có Tử vi/Hồ sơ, nút Hỏi AI; link cũ về Lịch; Tiện ích vẫn đổi ngày", async () => {
    mockApi({ "GET /config": () => ({ passwordRequired: false, aiEnabled: false }) });
    const user = userEvent.setup();
    renderAt("/tu-vi");
    expect(await screen.findByRole("grid", { name: "Lịch tháng 11 năm 2026" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Hỏi AI" })).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    await user.click(screen.getByRole("link", { name: "Tiện ích" }));
    expect(await screen.findByRole("region", { name: "Đổi ngày âm dương" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Hồ sơ của bạn" })).toBeNull();
  });

  it("không gọi được server: lịch vẫn chạy, ẩn phần AI, không báo lỗi", async () => {
    mockApi({
      "GET /config": () => {
        throw new ApiError(0, "Không kết nối được máy chủ");
      },
    });
    renderAt("/");
    expect(await screen.findByRole("grid", { name: "Lịch tháng 11 năm 2026" })).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Hỏi AI" })).toBeNull());
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

describe("tab Cài đặt: sáng tối (CAL-UC02)", () => {
  // SC: CAL-UC02-SC1
  it("chọn Sáng/Tối thì áp ngay, nhớ trên máy, báo xuống app Android để widget đổi theo", async () => {
    const setTheme = vi.fn();
    window.AndroidApp = { setTheme };
    mockApi(baseHandlers());
    const user = userEvent.setup();
    renderAt("/cai-dat");
    expect((await screen.findByRole("radio", { name: /Theo hệ thống/ })).getAttribute("aria-checked")).toBe("true");
    await user.click(screen.getByRole("radio", { name: "Sáng" }));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(JSON.parse(localStorage.getItem("mlc.theme")!)).toBe("light");
    expect(setTheme).toHaveBeenLastCalledWith("light");
    await user.click(screen.getByRole("radio", { name: "Tối" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(setTheme).toHaveBeenLastCalledWith("dark");
    // Trong app thì không mời tải app nữa
    expect(screen.queryByRole("region", { name: "Tải app Android" })).toBeNull();
    delete window.AndroidApp;
  });

  it("mở bằng trình duyệt thì có hướng dẫn tải app", async () => {
    mockApi(baseHandlers());
    renderAt("/cai-dat");
    expect(await screen.findByRole("link", { name: "Tải mylunarcalendar.apk" })).toBeTruthy();
  });
});
