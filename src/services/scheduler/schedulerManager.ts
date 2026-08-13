import { Agenda } from "agenda";
import { MongoBackend } from "@agendajs/mongo-backend";
import type { Client } from "discord.js";

// 引入任務定義模組
import { defineAllJobs } from "./jobDefinitions.js";

// 引入 MongoDB 連線模組
import {
    getMongoConnection,
    closeMongoConnection
} from "../../databases/mongodb.js";

// 引入任務類型定義
import type {
    ReminderJobData,
    ReminderInfo,
    CancelReminderResult
} from "./schedulerTypes.js";



// ═══════════════════════════════════════════
// Agenda 單例（全域唯一）
// ═══════════════════════════════════════════
let agenda: Agenda | null = null;


/**
 * 初始化 Agenda 排程器
 * 應在 Discord client.once('ready') 中呼叫
 *
 * @param client - Discord Client 實例，供 Job Worker 使用
 */
export async function initScheduler(client: Client): Promise<void> {
    try {

        // 1.從集中式資料庫連線層取得 MongoDB 連線
        const { db } = await getMongoConnection(process.env.MONGODB_DB_NAME);

        agenda = new Agenda({
            backend: new MongoBackend({ mongo: db, collection: process.env.MONGODB_COLLECTION_REMINDER }),
            defaultConcurrency: 5,       // 同時最多處理 5 個任務
            maxConcurrency: 20,          // 全域最大並行數
            processEvery: "30 seconds",  // 每 30 秒輪詢一次 MongoDB
        });

        // 2.載入所有任務定義（傳入 Discord client 供發送訊息用）
        defineAllJobs(agenda, client);

        // 3.啟動排程器
        await agenda.start();
        console.log("✅ Agenda 排程器已啟動");


        // 關機處理
        const shutdown = async (): Promise<void> => {
            console.log("⏳ 正在停止排程系統...");
            await agenda!.stop();
            await closeMongoConnection();
            console.log("✅ Agenda 與 MongoDB 已安全停止");
            process.exit(0);
        };

        process.on("SIGTERM", shutdown); // 監聽系統關閉訊號（如：Docker 容器停止、伺服器重新部署）
        process.on("SIGINT", shutdown); // 監聽中斷訊號（如：終端機按下 Ctrl + C 結束程式）


    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("❌ Agenda 初始化失敗：", msg);
        throw error;
    }
}


/**
 * 排程一個新提醒任務
 *
 * @param scheduledDate - 預定執行時間（UTC）
 * @param data          - 任務附帶資料
 */
export async function scheduleReminder(scheduledDate: Date, data: ReminderJobData): Promise<void> {
    if (!agenda) throw new Error("排程器尚未初始化");

    await agenda.schedule(scheduledDate, "send_reminder", data);
    console.log(`📅 已排程提醒：${data.content} → ${scheduledDate.toISOString()}`);
}


/**
 * 查詢指定使用者的所有待執行提醒
 *
 * @param userId - 使用者 Discord ID
 * @returns 待執行的提醒列表
 */
export async function getUserReminders(userId: string): Promise<ReminderInfo[]> {

    if (!agenda) throw new Error("排程器尚未初始化");

    // 1. 查詢指定使用者的所有提醒任務
    const result = await agenda.queryJobs({
        name: "send_reminder",
        data: { userId: userId },
    });

    // 2. 過濾出尚未執行的任務，並依照預計執行時間先後排序
    const pendingJobs = result.jobs
        .filter(job => job.nextRunAt != null)
        .sort((a, b) => new Date(a.nextRunAt!).getTime() - new Date(b.nextRunAt!).getTime());


    return pendingJobs.map((job, index) => ({
        index: index + 1,
        content: (job.data as ReminderJobData).content,
        scheduledAt: job.nextRunAt,
        createdAt: (job.data as ReminderJobData).createdAt,
        jobId: job._id,
    }));
}


/**
 * 取消指定使用者的某個提醒（依序號）
 *
 * @param userId - 使用者 Discord ID
 * @param index  - 提醒序號（從 1 開始）
 * @returns 取消結果
 */
export async function cancelReminder(userId: string, index: number): Promise<CancelReminderResult> {

    if (!agenda) throw new Error("排程器尚未初始化");

    const reminders = await getUserReminders(userId);

    if (index < 1 || index > reminders.length) {
        return {
            success: false,
            message: `找不到編號 ${index} 的提醒。您目前有 ${reminders.length} 個待執行提醒。`,
        };
    }

    const target = reminders[index - 1]!;
    await agenda.cancel({ id: (target.jobId as string).toString() });

    return {
        success: true,
        message: `已取消提醒「${target.content}」`,
        content: target.content,
    };
}
