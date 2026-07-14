import { parseTimeWithLLM } from "../services/scheduler/timeParser.js";
import {
    scheduleReminder,
    getUserReminders,
    cancelReminder
} from "../services/scheduler/schedulerManager.js";
import {
    formatConfirmMessage,
    formatReminderListEmbed,
    formatCancelMessage,
    formatErrorMessage
} from "../services/scheduler/reminderTemplates.js";


/**
 * >remind 指令主體
 * @param {import('discord.js').Message} msg - Discord 訊息物件
 * @param {string[]} args - 指令參數陣列
 */
export async function remind(msg, args) {
    await msg.channel.sendTyping();

    // ═══════════════════════════════════════════
    // 權限檢查：僅限主人使用
    // ═══════════════════════════════════════════
    if (msg.author.id !== process.env.MYUSERID) {
        return await msg.reply("這是主人專屬的秘密指令喔，Lin 不能讓別人碰呢～🦊");
    }

    // ═══════════════════════════════════════════
    // 無參數 → 提示用法
    // ═══════════════════════════════════════════
    if (args.length === 0) {
        await msg.reply(
            "請告訴 Lin 要提醒什麼喔！🦊\n" +
            "用法：`>remind <時間> <事項>`\n" +
            "範例：`>remind 明天早上八點 記得繳報告`\n" +
            "其他：`>remind list`（查看提醒）、`>remind cancel <編號>`（取消提醒）"
        );
        return;
    }

    // ═══════════════════════════════════════════
    // 子指令：list（查看待執行提醒）
    // ═══════════════════════════════════════════
    if (args[0] === "list") {
        try {
            const reminders = await getUserReminders(msg.author.id);
            const embed = formatReminderListEmbed(reminders, msg.author.username);
            await msg.reply({ embeds: [embed] });
        } catch (error) {
            console.error("❌ 查詢提醒錯誤：", error.message);
            await msg.reply(formatErrorMessage("查詢提醒時發生錯誤"));
        }
        return;
    }

    // ═══════════════════════════════════════════
    // 子指令：cancel <編號>（取消指定提醒）
    // ═══════════════════════════════════════════
    if (args[0] === "cancel") {
        const index = parseInt(args[1]);
        if (isNaN(index) || index < 1) {
            await msg.reply("請輸入正確的提醒編號喔！用法：`>remind cancel 1`");
            return;
        }

        try {
            const result = await cancelReminder(msg.author.id, index);
            await msg.reply(formatCancelMessage(result));
        } catch (error) {
            console.error("❌ 取消提醒錯誤：", error.message);
            await msg.reply(formatErrorMessage("取消提醒時發生錯誤"));
        }
        return;
    }

    // ═══════════════════════════════════════════
    // 主要功能：解析時間 → 排程提醒
    // ═══════════════════════════════════════════
    const rawInput = args.join(" "); // 將所有參數合併為原始字串

    try {
        // Step 1：呼叫 LLM 解析時間
        const parsed = await parseTimeWithLLM(rawInput);

        if (!parsed || !parsed.time || !parsed.task) {
            await msg.reply(formatErrorMessage("Lin 無法理解這個時間描述，請換個方式說說看？"));
            return;
        }

        // Step 2：驗證解析出的時間是否為未來時間
        const scheduledDate = new Date(parsed.time);
        if (isNaN(scheduledDate.getTime())) {
            await msg.reply(formatErrorMessage("LLM 回傳了無效的時間格式，請重試一次"));
            return;
        }
        if (scheduledDate <= new Date()) {
            await msg.reply(formatErrorMessage("這個時間已經過去了呢～請設定一個未來的時間吧！"));
            return;
        }

        // Step 3：將任務送入 Agenda 排程
        const jobData = {
            userId:    msg.author.id,
            channelId: msg.channel.id,
            content:   parsed.task,
            createdAt: new Date().toISOString(),
        };

        await scheduleReminder(scheduledDate, jobData);

        // Step 4：回覆確認訊息
        await msg.reply(formatConfirmMessage(parsed.task, scheduledDate));

    } catch (error) {
        console.error("❌ 排程提醒錯誤：", error.message);
        await msg.reply(formatErrorMessage("設定提醒時發生了一點問題，請稍後再試"));
    }
}
