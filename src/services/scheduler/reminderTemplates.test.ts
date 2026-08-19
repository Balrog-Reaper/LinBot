import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    buildReminderEmbed,
    buildDmBlockedNotice,
    buildDmGiveUpNotice,
    formatConfirmMessage,
    formatReminderListEmbed,
    formatCancelMessage,
    formatErrorMessage,
} from "./reminderTemplates.js";
import type { ReminderInfo, CancelReminderResult } from "./schedulerTypes.js";


// ═══════════════════════════════════════════
// 環境變數設定（測試用）
// ═══════════════════════════════════════════
beforeEach(() => {
    vi.stubEnv("TIMEZONE", "Asia/Taipei");
});


describe("reminderTemplates", () => {

    // ─────────────────────────────────────────
    // buildReminderEmbed
    // ─────────────────────────────────────────
    describe("buildReminderEmbed", () => {
        it("應產出包含提醒內容的 Embed", () => {
            const embed = buildReminderEmbed("記得繳報告");
            const json = embed.toJSON();

            expect(json.title).toBe("🔔 叮～主人的提醒時間到了");
            expect(json.description).toContain("記得繳報告");
            expect(json.color).toBe(0xFF69B4);
        });

        it("Embed 應包含時間戳和 footer", () => {
            const embed = buildReminderEmbed("吃藥");
            const json = embed.toJSON();

            expect(json.timestamp).toBeDefined();
            expect(json.footer?.text).toContain("Lin");
        });
    });


    // ─────────────────────────────────────────
    // buildDmBlockedNotice
    // ─────────────────────────────────────────
    describe("buildDmBlockedNotice", () => {
        it("應包含使用者 Tag 和重試資訊", () => {
            const msg = buildDmBlockedNotice("123456789", "記得開會", 2, 3);

            expect(msg).toContain("<@123456789>");
            expect(msg).toContain("記得開會");
            expect(msg).toContain("2/3");
        });
    });


    // ─────────────────────────────────────────
    // buildDmGiveUpNotice
    // ─────────────────────────────────────────
    describe("buildDmGiveUpNotice", () => {
        it("應包含總重試次數與結束提示", () => {
            const msg = buildDmGiveUpNotice("123456789", "記得繳報告", 3);

            expect(msg).toContain("<@123456789>");
            expect(msg).toContain("記得繳報告");
            expect(msg).toContain("3");
            expect(msg).toContain("不再重試");
        });
    });


    // ─────────────────────────────────────────
    // formatConfirmMessage
    // ─────────────────────────────────────────
    describe("formatConfirmMessage", () => {
        it("應包含提醒事項與格式化的時間", () => {
            const date = new Date("2026-08-14T00:00:00.000Z"); // UTC → 台灣時間 08:00
            const msg = formatConfirmMessage("繳報告", date);

            expect(msg).toContain("繳報告");
            expect(msg).toContain("08:00");   // 台灣時區顯示
            expect(msg).toContain("私訊");
        });
    });


    // ─────────────────────────────────────────
    // formatReminderListEmbed
    // ─────────────────────────────────────────
    describe("formatReminderListEmbed", () => {
        it("空列表時應顯示無提醒訊息", () => {
            const embed = formatReminderListEmbed([], "TestUser");
            const json = embed.toJSON();

            expect(json.description).toContain("沒有待執行的提醒");
        });

        it("多筆提醒時 fields 數量應正確", () => {
            const reminders: ReminderInfo[] = [
                { index: 1, content: "吃藥", scheduledAt: new Date("2026-08-14T01:00:00Z"), createdAt: "2026-08-13T00:00:00Z", jobId: "a" },
                { index: 2, content: "開會", scheduledAt: new Date("2026-08-14T02:00:00Z"), createdAt: "2026-08-13T00:00:00Z", jobId: "b" },
                { index: 3, content: "繳報告", scheduledAt: new Date("2026-08-14T03:00:00Z"), createdAt: "2026-08-13T00:00:00Z", jobId: "c" },
            ];

            const embed = formatReminderListEmbed(reminders, "TestUser");
            const json = embed.toJSON();

            // 3 筆提醒 + 1 筆取消提示 = 4 個 fields
            expect(json.fields).toHaveLength(4);
            expect(json.fields![0]!.value).toContain("吃藥");
            expect(json.fields![3]!.value).toContain("remind cancel");
        });
    });


    // ─────────────────────────────────────────
    // formatCancelMessage
    // ─────────────────────────────────────────
    describe("formatCancelMessage", () => {
        it("成功取消時應包含提醒內容", () => {
            const result: CancelReminderResult = {
                success: true,
                message: "已取消提醒「吃藥」",
                content: "吃藥",
            };
            const msg = formatCancelMessage(result);

            expect(msg).toContain("吃藥");
            expect(msg).toContain("✅");
        });

        it("取消失敗時應包含錯誤訊息", () => {
            const result: CancelReminderResult = {
                success: false,
                message: "找不到編號 5 的提醒",
            };
            const msg = formatCancelMessage(result);

            expect(msg).toContain("找不到編號 5 的提醒");
            expect(msg).toContain("❌");
        });
    });


    // ─────────────────────────────────────────
    // formatErrorMessage
    // ─────────────────────────────────────────
    describe("formatErrorMessage", () => {
        it("應包含傳入的錯誤細節文字", () => {
            const msg = formatErrorMessage("資料庫連線失敗");

            expect(msg).toContain("資料庫連線失敗");
            expect(msg).toContain("🦊");
        });
    });
});
