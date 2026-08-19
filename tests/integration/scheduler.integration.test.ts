import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import type { Client } from "discord.js";

import {
    initScheduler,
    scheduleReminder,
    getUserReminders,
    cancelReminder
} from "../../src/services/scheduler/schedulerManager.js";
import { closeMongoConnection } from "../../src/databases/mongodb.js";

describe("schedulerManager (Integration)", () => {
    let mongoServer: MongoMemoryServer;

    // 假的 Discord Client 供 Agenda Job 初始化使用
    const mockClient = {
        users: { fetch: vi.fn() },
        channels: { fetch: vi.fn() }
    } as unknown as Client;

    beforeAll(async () => {
        // 啟動記憶體版 MongoDB
        mongoServer = await MongoMemoryServer.create();
        process.env.MONGODB_URI = mongoServer.getUri();
        process.env.MONGODB_DB_NAME = "test-agenda-db";
        process.env.MONGODB_COLLECTION_REMINDER = "test-reminders";
    });

    afterAll(async () => {
        // 停止 Agenda 並關閉連線，最後停止 mongoServer
        await closeMongoConnection();
        if (mongoServer) {
            await mongoServer.stop();
        }
    });

    it("1. initScheduler 成功初始化", async () => {
        await expect(initScheduler(mockClient)).resolves.not.toThrow();
    });

    it("2. scheduleReminder 建立任務", async () => {
        const targetTime = new Date();
        targetTime.setHours(targetTime.getHours() + 1); // 1小時後

        const jobData = {
            userId: "USER_A",
            channelId: "CHANNEL_1",
            content: "吃藥",
            createdAt: new Date().toISOString()
        };

        await expect(scheduleReminder(targetTime, jobData)).resolves.not.toThrow();
    });

    it("3. getUserReminders 查詢使用者提醒", async () => {
        const reminders = await getUserReminders("USER_A");

        expect(reminders.length).toBe(1);
        expect(reminders[0]!.content).toBe("吃藥");
        expect(reminders[0]!.index).toBe(1);
    });

    it("4. getUserReminders 結果應按時間排序", async () => {
        // 再建立一個更早發生的任務
        const earlierTime = new Date();
        earlierTime.setMinutes(earlierTime.getMinutes() + 10); // 10分鐘後

        await scheduleReminder(earlierTime, {
            userId: "USER_A",
            channelId: "CHANNEL_1",
            content: "打掃",
            createdAt: new Date().toISOString()
        });

        const reminders = await getUserReminders("USER_A");

        expect(reminders.length).toBe(2);
        // "打掃" 應該排在 "吃藥" 前面，因為它比較早發生
        expect(reminders[0]!.content).toBe("打掃");
        expect(reminders[1]!.content).toBe("吃藥");
    });

    it("5. getUserReminders 不同使用者資料隔離", async () => {
        // 為 USER_B 建立任務
        const targetTime = new Date();
        targetTime.setHours(targetTime.getHours() + 2);

        await scheduleReminder(targetTime, {
            userId: "USER_B",
            channelId: "CHANNEL_2",
            content: "開會",
            createdAt: new Date().toISOString()
        });

        const remindersA = await getUserReminders("USER_A");
        const remindersB = await getUserReminders("USER_B");

        expect(remindersA.length).toBe(2);
        expect(remindersB.length).toBe(1);
        expect(remindersB[0]!.content).toBe("開會");
    });

    it("6. cancelReminder 成功取消", async () => {
        // USER_A 有 2 個任務："打掃" (index 1), "吃藥" (index 2)
        // 取消 "打掃"
        const result = await cancelReminder("USER_A", 1);

        expect(result.success).toBe(true);
        expect(result.content).toBe("打掃");

        // 再次查詢，只剩下 "吃藥"
        const reminders = await getUserReminders("USER_A");
        expect(reminders.length).toBe(1);
        expect(reminders[0]!.content).toBe("吃藥");
    });

    it("7. cancelReminder 超出範圍的編號", async () => {
        const result = await cancelReminder("USER_A", 99);

        expect(result.success).toBe(false);
        expect(result.message).toContain("找不到編號 99 的提醒");
    });
});
