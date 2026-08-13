import type { Message } from "discord.js";
import { askLLM } from "./llmRouter.js";

export async function chat(msg: Message, userText: string): Promise<void> {
    // 顯示「Lin 正在輸入...」
    if ("sendTyping" in msg.channel) {
        await msg.channel.sendTyping();
    }

    // 將非指令的純文字訊息交給 LLM Router 處理（自動路由至 Ollama 或 Gemini）
    try {
        const replyResult = await askLLM(msg.channel.id, userText);
        await msg.reply(replyResult);
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error("❌ LLM 發生錯誤：", errMsg);
        await msg.reply("抱歉，我的大腦暫時當機了...請容Lin休息片刻 😵");
    }
}
