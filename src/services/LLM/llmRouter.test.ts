import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock providers
vi.mock("./ollama.js", () => ({
    askOllama: vi.fn(),
    completeOllama: vi.fn()
}));
vi.mock("./gemini.js", () => ({
    askGemini: vi.fn(),
    completeGemini: vi.fn()
}));

import { switchProvider, getCurrentProvider, askLLM, completeLLM } from "./llmRouter.js";
import { askOllama, completeOllama } from "./ollama.js";
import { askGemini, completeGemini } from "./gemini.js";

const mockedAskOllama = vi.mocked(askOllama);
const mockedCompleteOllama = vi.mocked(completeOllama);
const mockedAskGemini = vi.mocked(askGemini);
const mockedCompleteGemini = vi.mocked(completeGemini);

describe("llmRouter", () => {
    // 儲存原始的 env 避免污染其他測試
    let originalEnv: string | undefined;

    beforeEach(() => {
        vi.clearAllMocks();
        originalEnv = process.env.LLM_PROVIDER;

        // 為了確保測試狀態乾淨，我們先預設切換回 ollama (或者也可以用其他方式)
        // 但因為 switchProvider 會直接修改模組內的變數 currentProvider，所以我們直接呼叫它
        switchProvider("ollama");
    });

    afterEach(() => {
        process.env.LLM_PROVIDER = originalEnv;
    });


    // ─────────────────────────────────────────
    // switchProvider & getCurrentProvider
    // ─────────────────────────────────────────
    describe("switchProvider & getCurrentProvider", () => {
        it("switchProvider(\"gemini\") 切換成功並回傳 success: true", () => {
            const result = switchProvider("gemini");

            expect(result.success).toBe(true);
            expect(result.message).toContain("gemini");
            expect(getCurrentProvider()).toBe("gemini");
        });

        it("switchProvider(\"GEMINI\") 大小寫不敏感", () => {
            const result = switchProvider("GEMINI");

            expect(result.success).toBe(true);
            expect(getCurrentProvider()).toBe("gemini");
        });

        it("switchProvider(\"不存在的\") 切換失敗並回傳 false", () => {
            // 先切換到 ollama 以確認失敗後沒有被改變
            switchProvider("ollama");

            const result = switchProvider("不存在的");

            expect(result.success).toBe(false);
            expect(result.message).toContain("不支援");
            expect(getCurrentProvider()).toBe("ollama"); // 維持原樣
        });
    });


    // ─────────────────────────────────────────
    // askLLM & completeLLM 路由測試
    // ─────────────────────────────────────────
    describe("API 路由正確性", () => {
        it("在 ollama 模式下呼叫 askLLM 應該觸發 askOllama", async () => {
            switchProvider("ollama");
            mockedAskOllama.mockResolvedValue("ollama reply");

            const result = await askLLM("channel-1", "hello");

            expect(result).toBe("ollama reply");
            expect(mockedAskOllama).toHaveBeenCalledWith("channel-1", "hello");
            expect(mockedAskGemini).not.toHaveBeenCalled();
        });

        it("在 gemini 模式下呼叫 completeLLM 應該觸發 completeGemini", async () => {
            switchProvider("gemini");
            mockedCompleteGemini.mockResolvedValue("gemini complete");

            const result = await completeLLM("system prompt", "user prompt", { temperature: 0.5 });

            expect(result).toBe("gemini complete");
            expect(mockedCompleteGemini).toHaveBeenCalledWith("system prompt", "user prompt", { temperature: 0.5 });
            expect(mockedCompleteOllama).not.toHaveBeenCalled();
        });
    });
});
