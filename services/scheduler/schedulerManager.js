import { Agenda } from "agenda";
import { MongoBackend } from "@agendajs/mongo-backend";
import { getMongoConnection, closeMongoConnection } from "../../databases/mongodb.js";
import { defineAllJobs } from "./jobDefinitions.js";


// ═══════════════════════════════════════════
// Agenda 單例（全域唯一）
// ═══════════════════════════════════════════
let agenda = null;


/**
 * 初始化 Agenda 排程器
 * 應在 Discord client.once('ready') 中呼叫
 *
 * @param {import('discord.js').Client} client - Discord Client 實例，供 Job Worker 使用
 */
export async function initScheduler(client) {
    try {
        // 從集中式資料庫連線層取得 MongoDB 連線
        const { db } = await getMongoConnection("lin-bot");

        agenda = new Agenda({
            backend: new MongoBackend({ mongo: db }),
            defaultConcurrency: 5,       // 同時最多處理 5 個任務
            maxConcurrency: 20,          // 全域最大並行數
            processEvery: "30 seconds",  // 每 30 秒輪詢一次 MongoDB
        });

        // 載入所有任務定義（傳入 Discord client 供發送訊息用）
        defineAllJobs(agenda, client);

        // 啟動排程器
        await agenda.start();
        console.log("✅ Agenda 排程器已啟動");

        // 優雅關機處理
        const gracefulShutdown = async () => {
            console.log("⏳ 正在停止排程系統...");
            await agenda.stop();
            await closeMongoConnection();
            console.log("✅ Agenda 與 MongoDB 已安全停止");
            process.exit(0);
        };

        process.on("SIGTERM", gracefulShutdown);
        process.on("SIGINT",  gracefulShutdown);

    } catch (error) {
        console.error("❌ Agenda 初始化失敗：", error.message);
        throw error;
    }
}


/**
 * 排程一個新提醒任務
 *
 * @param {Date}   scheduledDate - 預定執行時間（UTC）
 * @param {Object} data          - 任務附帶資料
 * @param {string} data.userId    - 使用者 Discord ID
 * @param {string} data.channelId - 頻道 ID
 * @param {string} data.content   - 提醒內容
 * @param {string} data.createdAt - 建立時間
 */
export async function scheduleReminder(scheduledDate, data) {
    if (!agenda) throw new Error("排程器尚未初始化");

    await agenda.schedule(scheduledDate, "send_reminder", data);
    console.log(`📅 已排程提醒：${data.content} → ${scheduledDate.toISOString()}`);
}


/**
 * 查詢指定使用者的所有待執行提醒
 *
 * @param {string} userId - 使用者 Discord ID
 * @returns {Promise<Array>} 待執行的提醒列表
 */
export async function getUserReminders(userId) {
    if (!agenda) throw new Error("排程器尚未初始化");

    const jobs = await agenda.jobs({
        name: "send_reminder",
        "data.userId": userId,
        nextRunAt: { $ne: null },    // 尚未執行的任務
    });

    return jobs.map((job, index) => ({
        index: index + 1,
        content:     job.attrs.data.content,
        scheduledAt: job.attrs.nextRunAt,
        createdAt:   job.attrs.data.createdAt,
        jobId:       job.attrs._id,
    }));
}


/**
 * 取消指定使用者的某個提醒（依序號）
 *
 * @param {string} userId - 使用者 Discord ID
 * @param {number} index  - 提醒序號（從 1 開始）
 * @returns {Promise<{success: boolean, message: string, content?: string}>}
 */
export async function cancelReminder(userId, index) {
    if (!agenda) throw new Error("排程器尚未初始化");

    const reminders = await getUserReminders(userId);

    if (index < 1 || index > reminders.length) {
        return {
            success: false,
            message: `找不到編號 ${index} 的提醒。您目前有 ${reminders.length} 個待執行提醒。`,
        };
    }

    const target = reminders[index - 1];
    await agenda.cancel({ _id: target.jobId });

    return {
        success: true,
        message: `已取消提醒「${target.content}」`,
        content: target.content,
    };
}
