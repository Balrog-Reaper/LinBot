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

    // 讀取標註機器人的訊息
    const botMention = new RegExp(`^<@!?${msg.client.user.id}>`);

    // ═══════════════════════════════════════════
    // 有 @Lin 標註 → 進入指令 / 對話處理
    // ═══════════════════════════════════════════
    if (botMention.test(msg.content)) {

        // 初步擷取訊息並且設定指令類型
        msg.content = msg.content.replace(botMention, "").trim(); // 去除標註@Lin
        let tokens = msg.content.split(" ");                      // 將訊息以空格為分隔標準，切分成一個完整的陣列
        let command = tokens.shift();                             // 取出使用者下達指令(例如：[!gif, "Barlog"]取出!gif)

        // 正式辨識指令類類並執行
        try {

            if (command.charAt(0) === ">") {

                command = command.substring(1);

                if (msg.guild) {
                    // 伺服器指令路由 → 開放所有指令
                    commands[command](msg, tokens);

                } else if (dmAllowedCommands[command]) {
                    // 私訊 DM 路由 → 只允許白名單指令（隱密模式 🔒）
                    await dmAllowedCommands[command](msg, tokens);

                } else {
                    // 私訊中使用了不在白名單的指令 → 提示使用者
                    await msg.reply(
                        "Lin 的私訊目前不支援此指令喔～🦊\n" +
                        "想使用其他指令請到伺服器頻道呢！"
                    );
                }

            } else {
                // 非指令內容 → 傳送給 AI
                const fullText = msg.content;
                await chat(msg, fullText);
            }

        } catch (error) {
            // 報錯並且檢視錯誤資訊
            console.error("❌ 發生錯誤了：", error.message);
        }

    } else if (!msg.guild) {
        // ═══════════════════════════════════════════
        // 私訊但沒有 @Lin → 溫馨提示
        // ═══════════════════════════════════════════
        await msg.reply(
            "(探出頭) 主人找我嗎？🦊\n" +
            "私訊時也請先 `@Lin` 呼叫我喔！\n" +
            "例如：`@Lin >remind 明天早上八點 記得繳報告`"
        );
    }
}
