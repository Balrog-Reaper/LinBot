// ═══════════════════════════════════════════════════════════
// commandsRouter.ts — 指令路由器與中央授權中介層
//
// 職責：
//   1. 解析使用者訊息，辨識指令名稱
//   2. 從 commandsRegistry 查找對應指令
//   3. 執行中央化的權限檢查（ownerOnly、dmAllowed）
//   4. 將通過檢查的指令交給 execute() 執行
//   5. 非指令內容則交由 chat 進行 LLM 對話
// ═══════════════════════════════════════════════════════════

import type { Message } from "discord.js";
import { loadCommands, getCommands } from "./commandsRegistry.js";
import { chat } from "../services/LLM/chat.js";
import type { BotCommand } from "./commandTypes.js";


/**
 * 初始化路由器：載入所有指令
 * 需要在機器人啟動時呼叫一次（由 index.ts 的 client.once('ready') 觸發）
 */
export async function initRouter(): Promise<void> {
    commands = await loadCommands();
}


// 指令映射表（啟動時由 initRouter 填入）
let commands: Map<string, BotCommand> = getCommands();


export async function handleMessage(msg: Message): Promise<void> {

    // 排除機器人自己的訊息，防止無限循環
    if (msg.author.bot) return;

    // 表示有收到訊息
    console.log(`收到訊息: ${msg.content}`);

    // 讀取標註機器人的訊息
    const botMention = new RegExp(`^<@!?${msg.client.user.id}>`);

    // ═══════════════════════════════════════════
    // 有 @Lin 標註 → 進入指令 / 對話處理
    // ═══════════════════════════════════════════
    if (botMention.test(msg.content)) {

        // 初步擷取訊息並且設定指令類型
        msg.content = msg.content.replace(botMention, "").trim(); // 去除標註@Lin
        const tokens = msg.content.split(" ");                     // 將訊息以空格為分隔標準，切分成一個完整的陣列
        let command = tokens.shift();                              // 取出使用者下達指令

        // 正式辨識指令類類並執行
        try {

            if (command && command.charAt(0) === ">") {

                // 移除指令的前置符號
                command = command.substring(1);

                // 從指令註冊表中查找指令
                const cmd = commands.get(command);

                if (!cmd) {
                    // 指令不存在 → 忽略（靜默處理）
                    return;
                }

                // ═════════════════════════════════════
                // 中介層 1：私訊 DM 權限檢查
                // ═════════════════════════════════════
                if (!msg.guild && !cmd.dmAllowed) {
                    await msg.reply("這個指令只能在伺服器中使用喔！🦊");
                    return;
                }

                // ═════════════════════════════════════
                // 中介層 2：主人專屬權限檢查
                // ═════════════════════════════════════
                if (cmd.ownerOnly && msg.author.id !== process.env.MYUSERID) {
                    await msg.reply("這是主人專屬的秘密指令喔，Lin 不能讓別人碰呢～🦊");
                    return;
                }

                // 通過所有檢查 → 執行指令
                await cmd.execute(msg, tokens);

            } else {
                // ═════════════════════════════════════════
                // 非指令內容 → 傳送給 LLM 進行回覆
                // ═════════════════════════════════════════
                const fullText = msg.content;
                await chat(msg, fullText);
            }

        } catch (error: unknown) {
            // 報錯並且檢視錯誤資訊
            const errMsg = error instanceof Error ? error.message : String(error);
            console.error("❌ 發生錯誤了：", errMsg);
        }

    }

}
