import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock LLM 路由器
vi.mock("../LLM/llmRouter.js", () => ({
    completeLLM: vi.fn(),
}));

import { parseTimeWithLLM } from "./timeParser.js";
import { completeLLM } from "../LLM/llmRouter.js";

const mockedCompleteLLM = vi.mocked(completeLLM);

// 防止測試時的 console.error 污染終端機畫面
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => { });

describe("timeParser", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // 固定時區，讓時間解析的提示詞一致
        vi.stubEnv("TIMEZONE", "Asia/Taipei");
    });

    it("LLM 回傳正確 JSON 時，應回傳解析結果", async () => {
        mockedCompleteLLM.mockResolvedValue(
            '{"time":"2026-08-14T00:00:00.000Z","task":"繳報告"}'
        );

        const result = await parseTimeWithLLM("明天早上八點 繳報告");

        expect(result).toEqual({
            time: "2026-08-14T00:00:00.000Z",
            task: "繳報告",
        });

        // 驗證是否有帶入強制 JSON 模式的設定
        expect(mockedCompleteLLM).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(String),
            expect.objectContaining({ jsonMode: true, temperature: 0.1 })
        );
    });

    it("LLM 回傳缺少 task 欄位時，應回傳 null", async () => {
        mockedCompleteLLM.mockResolvedValue('{"time":"2026-08-14T00:00:00.000Z"}');

        const result = await parseTimeWithLLM("明天早上八點 繳報告");

        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("LLM 回傳缺少 time 欄位時，應回傳 null", async () => {
        mockedCompleteLLM.mockResolvedValue('{"task":"繳報告"}');

        const result = await parseTimeWithLLM("明天早上八點 繳報告");

        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("LLM 回傳非 JSON 文字時，應回傳 null (JSON.parse 失敗)", async () => {
        mockedCompleteLLM.mockResolvedValue("我不知道你在說什麼");

        const result = await parseTimeWithLLM("明天 吃飯");

        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("LLM 服務拋出異常時，應回傳 null", async () => {
        mockedCompleteLLM.mockRejectedValue(new Error("API timeout"));

        const result = await parseTimeWithLLM("明天 吃飯");

        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalled();
    });
});
