import { askOllama, completeOllama } from "./ollama.js";
import { askGemini, completeGemini } from "./gemini.js";
import type { AskLLMFunction, CompleteLLMFunction, CompleteLLMOptions, SwitchProviderResult } from "./llmTypes.js";


// 當前使用的 LLM 提供者（從 .env 讀取預設值）
let currentProvider: string = process.env.LLM_PROVIDER;


// 支援的 provider 對照表（對話用）
const providers: Record<string, AskLLMFunction> = {
    ollama: askOllama,
    gemini: askGemini,
};


// 支援的 provider 對照表（單次完成用，無對話記憶）
const completionProviders: Record<string, CompleteLLMFunction> = {
    ollama: completeOllama,
    gemini: completeGemini,
};


/**
 * 統一對外的 LLM 對話介面
 * 根據當前 provider 自動路由至對應的服務模組
 * @param channelID    頻道 ID
 * @param userMessage  使用者訊息
 * @returns AI 回覆字串
 */
export async function askLLM(channelID: string, userMessage: string): Promise<string> {
    const askFn = providers[currentProvider];

    if (!askFn) {
        return `❌ 不支援的 LLM 提供者：${currentProvider}`;
    }

    return await askFn(channelID, userMessage);
}


/**
 * 切換 LLM 提供者
 * @param providerName - 提供者名稱
 * @returns 切換結果
 */
export function switchProvider(providerName: string): SwitchProviderResult {
    const name = providerName.toLowerCase();

    if (!providers[name]) {
        return {
            success: false,
            message: `❌ 不支援的 LLM 提供者「${providerName}」。可選：${Object.keys(providers).join("、")}`
        };
    }

    currentProvider = name;
    return {
        success: true,
        message: `✅ 已切換至 **${name}** 模式！`
    };
}


/**
 * 無狀態的單次 LLM 呼叫（不帶對話記憶）
 * 根據當前 provider 自動路由至對應的服務模組
 *
 * @param systemPrompt  系統提示詞
 * @param userMessage   使用者訊息
 * @param options       額外選項（temperature, jsonMode 等）
 * @returns AI 回覆的純文字
 */
export async function completeLLM(systemPrompt: string, userMessage: string, options: CompleteLLMOptions = {}): Promise<string> {
    const completeFn = completionProviders[currentProvider];

    if (!completeFn) {
        throw new Error(`❌ 不支援的 LLM 提供者：${currentProvider}`);
    }

    return await completeFn(systemPrompt, userMessage, options);
}


/**
 * 取得目前使用中的 LLM 提供者名稱
 * @returns 提供者名稱
 */
export function getCurrentProvider(): string {
    return currentProvider;
}
