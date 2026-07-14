import { EmbedBuilder } from "discord.js";


// ═══════════════════════════════════════════
// 隨機女僕風格提醒語句（私訊 DM 用，更親密的語氣）
// ═══════════════════════════════════════════
const REMINDER_LINES = [
    "(輕輕推開書房的門) 主人，您交代的事情時間到囉～🦊",
    "(搖了搖九條尾巴靠近主人) 嗯…主人，Lin 悄悄來提醒您了～",
    "(優雅地行禮後低聲說) 主人，這是您設定的提醒呢～",
    "(用尾巴輕輕碰了碰主人的手) 主人…時間到了喔…🦊",
    "(踮起腳尖走到主人身邊) 主人主人～Lin 來叫您了！✨",
    "(從門縫探出頭來) 主人…Lin 有事要提醒您呢～ (臉紅)",
];


/**
 * 建構女僕風格的 Embed 提醒訊息（私訊 DM 用，精緻版）
 *
 * @param {string} content - 提醒內容
 * @returns {EmbedBuilder} Embed 物件
 */
export function buildReminderEmbed(content) {
    const line = REMINDER_LINES[Math.floor(Math.random() * REMINDER_LINES.length)];

    return new EmbedBuilder()
        .setTitle("🔔 叮～主人的提醒時間到了")
        .setDescription(`${line}\n\n📌 **提醒事項**：${content}`)
        .setColor(0xFF69B4)  // 粉色，符合女僕私訊的親密感
        .setTimestamp()
        .setFooter({ text: "Lin 的貼身提醒服務 💌🦊" });
}


/**
 * 建構頻道降級提醒訊息（DM 失敗時的備用方案）
 *
 * @param {string} userId  - 使用者 Discord ID
 * @param {string} content - 提醒內容
 * @returns {string} 完整的提醒訊息字串
 */
export function buildReminderMessage(userId, content) {
    return `<@${userId}> 主人！Lin 想私訊提醒您但被擋住了…😿\n所以在這裡提醒您～\n\n📌 **提醒事項**：${content}`;
}


/**
 * 格式化排程確認訊息（使用者設定提醒後的即時回覆）
 *
 * @param {string} task          - 提醒事項
 * @param {Date}   scheduledDate - 排定時間（UTC）
 * @returns {string} 確認訊息
 */
export function formatConfirmMessage(task, scheduledDate) {
    // 轉換為台灣時間顯示（UTC+8）
    const taiwanTime = new Date(scheduledDate.getTime() + (8 * 60 * 60 * 1000));
    const formatted = taiwanTime.toLocaleString("zh-TW", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
        hour12: false,
    });

    return (
        `✅ (拿出小本本認真記下) Lin 記住了！🦊\n\n` +
        `📌 **提醒事項**：${task}\n` +
        `⏰ **預定時間**：${formatted}\n` +
        `📨 **提醒方式**：私訊 (DM)\n\n` +
        `Lin 會悄悄私訊提醒主人的，請放心～ 💌✨`
    );
}


/**
 * 格式化提醒列表為 Discord Embed
 *
 * @param {Array}  reminders - 待執行提醒列表
 * @param {string} username  - 使用者名稱
 * @returns {EmbedBuilder} Embed 物件
 */
export function formatReminderListEmbed(reminders, username) {
    const embed = new EmbedBuilder()
        .setTitle(`📋 ${username} 的待執行提醒`)
        .setColor(0xE67E22)
        .setTimestamp()
        .setFooter({ text: "Lin 的備忘錄 🦊📝" });

    if (reminders.length === 0) {
        embed.setDescription("目前沒有待執行的提醒喔～主人很自律呢！🦊✨");
        return embed;
    }

    embed.setDescription(`共有 **${reminders.length}** 個待執行提醒：`);

    for (const r of reminders) {
        // 轉換為台灣時間顯示
        const taiwanTime = new Date(new Date(r.scheduledAt).getTime() + (8 * 60 * 60 * 1000));
        const formatted = taiwanTime.toLocaleString("zh-TW", {
            month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit",
            hour12: false,
        });

        embed.addFields({
            name: `#${r.index} ⏰ ${formatted}`,
            value: `📌 ${r.content}`,
            inline: false,
        });
    }

    embed.addFields({
        name: "\u200B",
        value: "💡 取消提醒請使用：`>remind cancel <編號>`",
    });

    return embed;
}


/**
 * 格式化取消提醒的回覆訊息
 *
 * @param {Object} result - cancelReminder 的回傳結果
 * @returns {string}
 */
export function formatCancelMessage(result) {
    if (result.success) {
        return `✅ (劃掉備忘錄上的項目) 已取消提醒「${result.content}」囉！🦊`;
    }
    return `❌ ${result.message}`;
}


/**
 * 統一的錯誤訊息格式
 *
 * @param {string} detail - 錯誤細節
 * @returns {string}
 */
export function formatErrorMessage(detail) {
    return `❌ (困惑地歪頭) ${detail} 🦊`;
}
