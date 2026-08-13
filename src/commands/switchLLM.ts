import type { Message } from "discord.js";
import type { BotCommand } from "./commandTypes.js";
import { switchProvider, getCurrentProvider } from "../services/LLM/llmRouter.js";


// 切換 LLM 提供者指令（僅限主人使用）
export const switchLLM: BotCommand = {
    name: "switchLLM",
    description: "`>switchLLM [ollama/gemini]` 切換 AI 大腦。不加參數可查看目前狀態。",
    category: "owner",
    dmAllowed: false,
    ownerOnly: true,

    async execute(msg: Message, args: string[]): Promise<void> {
        // 無參數 → 顯示目前狀態
        if (args.length === 0) {
            const currentLLM = getCurrentProvider();
            await msg.reply(`🦊 Lin 目前使用的大腦是：**${currentLLM}**\n可用選項：\`ollama\`、\`gemini\`\n\n用法：\`>switchLLM gemini\` 或 \`>switchLLM ollama\``);
            return;
        }

        // 執行切換
        const target = args[0]!;
        const result = switchProvider(target);
        await msg.reply(result.message);
    }
};
