import { askLLM } from "../services/llmRouter.js";

export async function chat(msg, userText) {
    // 顯示「Lin 正在輸入...」
    await msg.channel.sendTyping();

    // 將非指令的純文字訊息交給 LLM Router 處理（自動路由至 Ollama 或 Gemini）
    try {
        const replyResult = await askLLM(msg.channel.id, userText)
        await msg.reply(replyResult);
    } catch (error) {
        console.error("❌ LLM 發生錯誤：", error.message);
        await msg.reply("抱歉，我的大腦暫時當機了...請容Lin休息片刻 😵");
    }
}