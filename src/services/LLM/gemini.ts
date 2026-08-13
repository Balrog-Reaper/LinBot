import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT } from "./systemPrompt.js";
import type { CompleteLLMOptions } from "./llmTypes.js";

// 建立 Gemini 客戶端（從 .env 讀取 API Key）
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Gemini 對話記憶格式
interface GeminiMessage {
    role: "user" | "model";
    parts: Array<{ text: string }>;
}

// 對話記憶（依頻道 ID 儲存，最多保留 N 輪）
const conversationHistory = new Map<string, GeminiMessage[]>();
const MAX_HISTORY = 10; // 最多保留 10 輪對話


/**
 * @param channelID    頻道 ID
 * @param userMessage  使用者訊息
 * @returns 回傳 AI 回覆字串
 */
export async function askGemini(channelID: string, userMessage: string): Promise<string> {

    // 取得此頻道的對話記憶
    if (!conversationHistory.has(channelID)) {
        conversationHistory.set(channelID, []);
    }
    const history = conversationHistory.get(channelID)!;

    // 加入使用者訊息
    history.push({
        role: "user",
        parts: [{ text: userMessage }]
    });

    // 呼叫 Gemini API
    try {
        const response = await ai.models.generateContent({
            model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
            contents: history,
            config: {
                systemInstruction: SYSTEM_PROMPT,
                temperature: 0.8,
            }
        });

        const reply = response.text ?? "";

        // 儲存 AI 回覆進記憶
        history.push({
            role: "model",
            parts: [{ text: reply }]
        });

        // 超過上限則移除最舊的一輪（移除最早的 user + model 各一則）
        if (history.length > MAX_HISTORY * 2) {
            history.splice(0, 2);
        }

        return reply;

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("❌ Gemini 發生錯誤：", msg);
        return "抱歉，Lin 的雲端靈力暫時中斷了...請稍後再試 😵";
    }
}


// 清除特定頻道的對話記憶
export function clearGeminiHistory(channelId: string): void {
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
export async function completeGemini(systemPrompt: string, userMessage: string, options: CompleteLLMOptions = {}): Promise<string> {
    const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL,
        contents: [{
            role: "user",
            parts: [{ text: userMessage }]
        }],
        config: {
            systemInstruction: systemPrompt,
            temperature: options.temperature ?? 0.1,
            ...(options.jsonMode ? { responseMimeType: "application/json" } : undefined),
        }
    });

    const reply = (response.text ?? "").trim();
    return reply;
}
