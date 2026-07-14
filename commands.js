import { gif } from "./commands/gif.js";
import { Lin } from "./commands/Lin.js";
import { restart } from "./commands/restart.js";
import { chat } from "./commands/chat.js";
import { help } from "./commands/help.js";
import { userInfo } from "./commands/userInfo.js";
import { switchLLM } from "./commands/switchLLM.js";
import { weather } from "./commands/weather.js";
import { remind } from "./commands/remind.js";


const commands = {
    Lin,
    gif,
    restart,
    help,
    userInfo,
    switchLLM,
    weather,
    remind,
}

// ═══════════════════════════════════════════
// 私訊 DM 中允許使用的指令（白名單）
// 不想讓人在伺服器看到的隱密指令可以放這裡
// ═══════════════════════════════════════════
const dmAllowedCommands = {
    remind,
};


export async function gotMessage(msg) {

    // 排除機器人自己的訊息，防止無限循環
    if (msg.author.bot) return;

    // 表示有收到訊息
    console.log(`收到訊息: ${msg.content}`);

    // ═══════════════════════════════════════════
    // 私訊 DM 路由（隱密模式 🔒）
    // 使用者可直接私訊 Lin 下達指令，不需 @Lin
    // 目前僅開放 >remind 系列指令
    // ═══════════════════════════════════════════
    if (!msg.guild) {
        const content = msg.content.trim();
        if (content.charAt(0) === ">") {
            const tokens = content.split(" ");
            const command = tokens.shift().substring(1); // 去掉 ">"

            if (dmAllowedCommands[command]) {
                try {
                    await dmAllowedCommands[command](msg, tokens);
                } catch (error) {
                    console.error("❌ DM 指令錯誤：", error.message);
                    await msg.reply("處理指令時發生了錯誤 😿");
                }
            } else {
                await msg.reply(
                    "Lin 的私訊目前只支援提醒指令喔～🦊\n" +
                    "用法：`>remind <時間> <事項>`\n" +
                    "想使用其他指令請到伺服器頻道使用 `@Lin` 呢！"
                );
            }
        } else {
            await msg.reply(
                "(探出頭) 主人想私下設定提醒嗎？🦊\n" +
                "請使用 `>remind <時間> <事項>` 指令喔！\n" +
                "例如：`>remind 明天早上八點 記得繳報告`"
            );
        }
        return;
    }

    // 讀取標註機器人的訊息
    const botMention = new RegExp(`^<@!?${msg.client.user.id}>`);

    // 設定機器人在特定頻道活動
    if (msg.channel.id == process.env.CHANNELID && botMention.test(msg.content)) {

        // 初步擷取訊息並且設定指令類型
        msg.content = msg.content.replace(botMention, "").trim(); // 去除標註@Lin
        let tokens = msg.content.split(" ");                      // 將訊息以空格為分隔標準，切分成一個完整的陣列
        let command = tokens.shift();                             // 取出使用者下達指令(例如：[!gif, "Barlog"]取出!gif)

        // 正式辨識指令類類並執行
        try {
            if (command.charAt(0) === ">") {
                command = command.substring(1);
                commands[command](msg, tokens);
            } else {
                // 非指令內容 → 交給 AI 進行對話
                const fullText = msg.content;
                await chat(msg, fullText);
            }
        } catch (error) {
            // 報錯並且檢視錯誤資訊
            console.error("❌ 發生錯誤了：", error.message);
        }
    }
}