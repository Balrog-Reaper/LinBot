import { describe, it, expect, vi, beforeEach } from "vitest";

// 1. Mock provider
vi.mock("./providers/taiwanProvider.js", () => ({
    fetchTaiwanWeather: vi.fn(),
    fetchTaiwanDetailWeather: vi.fn()
}));

import { queryWeather } from "./weatherRouter.js";
import { fetchTaiwanWeather, fetchTaiwanDetailWeather } from "./providers/taiwanProvider.js";

const mockedFetchTaiwanWeather = vi.mocked(fetchTaiwanWeather);
const mockedFetchTaiwanDetailWeather = vi.mocked(fetchTaiwanDetailWeather);

describe("weatherRouter", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // 設定基本的 mock 回傳值，避免測試報錯
        mockedFetchTaiwanWeather.mockResolvedValue({
            isDetailed: false,
            weatherList: []
        });

        mockedFetchTaiwanDetailWeather.mockResolvedValue({
            isDetailed: true,
            weatherList: []
        });
    });

    // ─────────────────────────────────────────
    // 國家解析測試
    // ─────────────────────────────────────────
    describe("國家名稱解析", () => {
        it("輸入「台灣」能正確解析為 taiwan 並呼叫總覽", async () => {
            await queryWeather("台灣", null);
            expect(mockedFetchTaiwanWeather).toHaveBeenCalledTimes(1);
        });

        it("輸入「臺灣」能正確解析", async () => {
            await queryWeather("臺灣", null);
            expect(mockedFetchTaiwanWeather).toHaveBeenCalledTimes(1);
        });

        it("輸入英文「tw」能正確解析", async () => {
            await queryWeather("tw", null);
            expect(mockedFetchTaiwanWeather).toHaveBeenCalledTimes(1);
        });

        it("輸入不支援的國家應拋出錯誤", async () => {
            await expect(queryWeather("日本", null))
                .rejects
                .toThrowError(/不支援的國家「日本」。目前支援：台灣/);
        });
    });


    // ─────────────────────────────────────────
    // 城市解析測試
    // ─────────────────────────────────────────
    describe("城市名稱解析", () => {
        it("台灣城市「台北」應解析為「臺北市」並呼叫詳細天氣", async () => {
            await queryWeather("台灣", "台北");
            expect(mockedFetchTaiwanDetailWeather).toHaveBeenCalledWith("臺北市");
        });

        it("台灣城市「高雄」應解析為「高雄市」", async () => {
            await queryWeather("tw", "高雄");
            expect(mockedFetchTaiwanDetailWeather).toHaveBeenCalledWith("高雄市");
        });

        it("台灣城市特殊別名「馬祖」應解析為「連江縣」", async () => {
            await queryWeather("taiwan", "馬祖");
            expect(mockedFetchTaiwanDetailWeather).toHaveBeenCalledWith("連江縣");
        });

        it("輸入不存在的城市應拋出錯誤", async () => {
            await expect(queryWeather("台灣", "東京"))
                .rejects
                .toThrowError(/在台灣中找不到「東京」，請確認城市名稱是否正確/);
        });
    });
});
