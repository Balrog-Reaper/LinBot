import { Ollama } from "ollama";
import { SYSTEM_PROMPT } from "./systemPrompt.js";

// 對話用的 Ollama 客戶端（從 .env 讀取設定）
const ollama = new Ollama({ host: process.env.OLLAMA_URL });

// 對話記憶（依頻道 ID 儲存，最多保留 N 輪）
const conversationHistory = new Map()
const MAX_HISTORY = 10  // 最多保留 10 輪對話


/**
* @param {string} channelID    頻道 ID
* @param {string} userMessage  使用者訊息
* @returns {Promise<string>}   回傳一個字串（非同步
*/
export async function askOllama(channelID, userMessage) {

    // 取得此頻道的對話記憶
    if (!conversationHistory.has(channelID, [])) {
        conversationHistory.set(channelID, []);
    }
    const history = conversationHistory.get(channelID);


    // 加入使用者訊息
    history.push({
        role: "user",
        content: userMessage
    })


    // 系統提示詞（從共用模組載入）
    const systemPrompt = {
        role: "system",
        content: SYSTEM_PROMPT
    }


    // 呼叫 Ollama API
    try {
        const response = await ollama.chat({
            model: process.env.OLLAMA_MODEL,
            messages: [systemPrompt, ...history],
            stream: false,
            think: true,       // 關閉 Qwen3 思考模式（大幅提升速度）
            temperature: 0.8
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

    } catch (error) {
        console.error("❌ Ollama 發生錯誤：", error.message);
        return "抱歉，我的大腦暫時當機了...請稍後再試 😵";
    }

}

// 清除特定頻道的對話記憶
export function clearHistory(channelId) {
    conversationHistory.delete(channelId);
}