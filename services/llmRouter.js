import { askOllama } from "./ollama.js";
import { askGemini } from "./gemini.js";


// 當前使用的 LLM 提供者（從 .env 讀取預設值）
let currentProvider = process.env.LLM_PROVIDER;


// 支援的 provider 對照表
const providers = {
    ollama: askOllama,
    gemini: askGemini,
};


/**
 * 統一對外的 LLM 對話介面
 * 根據當前 provider 自動路由至對應的服務模組
 * @param {string} channelID    頻道 ID
 * @param {string} userMessage  使用者訊息
 * @returns {Promise<string>}   AI 回覆字串
 */
export async function askLLM(channelID, userMessage) {
    const askFn = providers[currentProvider];

    if (!askFn) {
        return `❌ 不支援的 LLM 提供者：${currentProvider}`;
    }

    return await askFn(channelID, userMessage);
}


/**
 * 切換 LLM 提供者
 * @param {string} providerName
 * @returns {{ success: boolean, message: string }}
 */
export function switchProvider(providerName) {
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
 * 取得目前使用中的 LLM 提供者名稱
 * @returns {string}
 */
export function getCurrentProvider() {
    return currentProvider;
}
