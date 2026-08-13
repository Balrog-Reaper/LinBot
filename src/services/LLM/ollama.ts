import { Ollama } from "ollama";
import { SYSTEM_PROMPT } from "./systemPrompt.js";
import type { CompleteLLMOptions } from "./llmTypes.js";

// 對話用的 Ollama 客戶端（從 .env 讀取設定）
const ollama = new Ollama({ host: process.env.OLLAMA_URL });

// 對話記憶（依頻道 ID 儲存，最多保留 N 輪）
const conversationHistory = new Map<string, Array<{ role: string; content: string }>>();
const MAX_HISTORY = 10;  // 最多保留 10 輪對話


/**
* @param channelID    頻道 ID
* @param userMessage  使用者訊息
* @returns 回傳一個字串（非同步）
*/
export async function askOllama(channelID: string, userMessage: string): Promise<string> {

    // 取得此頻道的對話記憶
    if (!conversationHistory.has(channelID)) {
        conversationHistory.set(channelID, []);
    }
    const history = conversationHistory.get(channelID)!;


    // 加入使用者訊息
    history.push({
        role: "user",
        content: userMessage
    });


    // 系統提示詞（從共用模組載入）
    const systemPrompt = {
        role: "system",
        content: SYSTEM_PROMPT
    };


    // 呼叫 Ollama API
    try {
        const response = await ollama.chat({
            model: process.env.OLLAMA_MODEL,
            messages: [systemPrompt, ...history],
            stream: false,
            think: true,       // 關閉 Qwen3 思考模式（大幅提升速度）
            options: { temperature: 0.8 }
        });

        // console.log(JSON.stringify(response, null, 2));
        const reply = response.message.content;

        history.push({
            role: "assistant",
            content: reply
        });

        // 超過上限則移除最舊的一輪（移除最早的 user + assistant 各一則）
        if (history.length > MAX_HISTORY * 2) {
            history.splice(0, 2);
        }
        return reply;

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("❌ Ollama 發生錯誤：", msg);
        return "抱歉，我的大腦暫時當機了...請稍後再試 😵";
    }

}

// 清除特定頻道的對話記憶
export function clearHistory(channelId: string): void {
    conversationHistory.delete(channelId);
}


/**
 * 無狀態的單次 LLM 呼叫（不帶對話記憶）
 * 適用於工具型任務，例如時間解析、摘要產生等
 *
 * @param systemPrompt  系統提示詞
 * @param userMessage   使用者訊息
 * @param options       額外選項（temperature, jsonMode 等）
 * @returns 回傳 AI 回覆的純文字
 */
export async function completeOllama(systemPrompt: string, userMessage: string, options: CompleteLLMOptions = {}): Promise<string> {
    const response = await ollama.chat({
        model: process.env.OLLAMA_MODEL,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
        ],
        stream: false,
        options: { temperature: options.temperature ?? 0.8 },
        ...(options.jsonMode ? { format: "json" } : undefined),
    });

    const reply = response.message.content.trim();
    return reply;
}
