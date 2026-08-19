import { EmbedBuilder } from "discord.js";
import type { ReminderInfo, CancelReminderResult } from "./schedulerTypes.js";


// ═══════════════════════════════════════════
// 隨機女僕風格提醒語句（私訊 DM 用，更親密的語氣）
// ═══════════════════════════════════════════
const REMINDER_LINES: string[] = [
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
 * @param content - 提醒內容
 * @returns Embed 物件
 */
export function buildReminderEmbed(content: string): EmbedBuilder {
    const line = REMINDER_LINES[Math.floor(Math.random() * REMINDER_LINES.length)]!;

    return new EmbedBuilder()
        .setTitle("🔔 叮～主人的提醒時間到了")
        .setDescription(`${line}\n\n📌 **提醒事項**：${content}`)
        .setColor(0xFF69B4)  // 粉色，符合女僕私訊的親密感
        .setTimestamp()
        .setFooter({ text: "Lin 的貼身提醒服務 💌🦊" });
}


/**
 * 建構私訊屏蔽降級通知（每次重試時發送至頻道）
 *
 * @param userId     - 使用者 Discord ID
 * @param content    - 提醒內容
 * @param attempt    - 目前是第幾次重試
 * @param maxRetries - 最大重試次數
 * @returns 完整的頻道通知訊息
 */
export function buildDmBlockedNotice(userId: string, content: string, attempt: number, maxRetries: number): string {
    return (
        `<@${userId}> 主人，您目前開啟了私訊屏蔽，Lin 無法私訊提醒您 😿\n` +
        `所以先在這裡告知您～\n\n` +
        `📌 **提醒事項**：${content}\n` +
        `🔄 **重試狀態**：第 ${attempt}/${maxRetries} 次（Lin 會在 10 分鐘後再次嘗試私訊）\n\n` +
        `💡 請開啟私訊權限，Lin 才能悄悄提醒主人喔～`
    );
}


/**
 * 建構私訊屏蔽放棄通知（達到最大重試次數後發送至頻道）
 *
 * @param userId       - 使用者 Discord ID
 * @param content      - 提醒內容
 * @param totalRetries - 已重試的總次數
 * @returns 完整的放棄通知訊息
 */
export function buildDmGiveUpNotice(userId: string, content: string, totalRetries: number): string {
    return (
        `<@${userId}> 主人，Lin 已經嘗試了 ${totalRetries} 次私訊提醒，但都被屏蔽了…😢\n\n` +
        `📌 **提醒事項**：${content}\n` +
        `❌ **狀態**：此提醒任務已結束，不再重試。\n\n` +
        `如需重新設定提醒，請使用 \`>remind\` 指令，並記得開啟私訊權限喔～ 🦊`
    );
}


/**
 * 格式化排程確認訊息（使用者設定提醒後的即時回覆）
 *
 * @param task          - 提醒事項
 * @param scheduledDate - 排定時間（UTC）
 * @returns 確認訊息
 */
export function formatConfirmMessage(task: string, scheduledDate: Date): string {
    // 使用 .env 中設定的時區來顯示，預設為台北時區
    const timeZone = process.env.TIMEZONE || "Asia/Taipei";
    const formatted = scheduledDate.toLocaleString("zh-TW", {
        timeZone: timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });

    const reply = (
        `✅ (拿出小本本認真記下) Lin 記住了！🦊\n\n` +
        `📌 **提醒事項**：${task}\n` +
        `⏰ **預定時間**：${formatted}\n` +
        `📨 **提醒方式**：私訊 (DM)\n\n` +
        `Lin 會悄悄私訊提醒主人的，請放心～ 💌✨`
    );

    return reply;
}


/**
 * 格式化提醒列表為 Discord Embed
 *
 * @param reminders - 待執行提醒列表
 * @param username  - 使用者名稱
 * @returns Embed 物件
 */
export function formatReminderListEmbed(reminders: ReminderInfo[], username: string): EmbedBuilder {
    // 使用 .env 中設定的時區來顯示，預設為台北時區
    const timeZone = process.env.TIMEZONE || "Asia/Taipei";
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
        const scheduledDate = new Date(r.scheduledAt!);
        const formatted = scheduledDate.toLocaleString("zh-TW", {
            timeZone: timeZone,
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
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
 * @param result - cancelReminder 的回傳結果
 * @returns 回覆文字
 */
export function formatCancelMessage(result: CancelReminderResult): string {
    if (result.success) {
        return `✅ (劃掉備忘錄上的項目) 已取消提醒「${result.content}」囉！🦊`;
    }
    return `❌ ${result.message}`;
}


/**
 * 統一的錯誤訊息格式
 *
 * @param detail - 錯誤細節
 * @returns 錯誤訊息文字
 */
export function formatErrorMessage(detail: string): string {
    return `❌ (困惑地歪頭) ${detail} 🦊`;
}
