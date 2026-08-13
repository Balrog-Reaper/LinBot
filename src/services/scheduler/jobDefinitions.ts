import { backoffStrategies } from "agenda";
import type { Agenda, Job } from "agenda";
import type { Client } from "discord.js";
import type { ReminderJobData } from "./schedulerTypes.js";

// 引入提醒訊息範本模組
import {
    buildReminderEmbed,
    buildDmBlockedNotice,
    buildDmGiveUpNotice
} from "./reminderTemplates.js";



// ═══════════════════════════════════════════
// 私訊屏蔽重試設定
// ═══════════════════════════════════════════
const DM_BLOCKED_MAX_RETRIES = 3;              // 最大重試次數
const DM_BLOCKED_RETRY_DELAY = "in 10 minutes"; // 每次重試的延後時間


/**
 * 註冊所有排程任務定義
 * 透過閉包（Closure）捕獲 Discord client 實例
 *
 * @param agenda  - Agenda 實例
 * @param client  - Discord Client 實例
 */
export function defineAllJobs(agenda: Agenda, client: Client): void {

    // ═══════════════════════════════════════════
    // 任務：send_reminder（一次性私訊提醒）
    // ═══════════════════════════════════════════
    agenda.define("send_reminder", async (job: Job<ReminderJobData>) => {
        const { userId, channelId, content } = job.attrs.data;
        const dmRetryCount = job.attrs.data.dmRetryCount || 0;

        console.log(`🔔 正在執行提醒任務：${content}（目標使用者：${userId}，DM 重試次數：${dmRetryCount}）`);

        try {
            // 透過 Discord Client 取得目標使用者
            const user = await client.users.fetch(userId);

            // 透過 DM 私訊發送（貼身女僕模式 💌）
            const embed = buildReminderEmbed(content);
            await user.send({ embeds: [embed] });
            console.log(`✅ 私訊提醒已發送：${content} → ${user.tag}`);

            // DM 發送成功 → 刪除任務
            await job.remove();

        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : String(error);
            console.error(`❌ 發送提醒失敗：`, errMsg);

            // ═══════════════════════════════════════════
            // 使用者關閉私訊（Discord API Error Code: 50007）
            // ═══════════════════════════════════════════
            const discordError = error as { code?: number };
            if (discordError.code === 50007) {

                // 檢查是否已達最大重試次數
                if (dmRetryCount >= DM_BLOCKED_MAX_RETRIES) {
                    console.warn(`⚠️ 使用者 ${userId} 已連續 ${dmRetryCount} 次屏蔽私訊，放棄重試。`);

                    // 發送最終放棄通知到頻道
                    try {
                        const channel = await client.channels.fetch(channelId);
                        if (channel && "send" in channel) {
                            await (channel as { send: (msg: string) => Promise<unknown> }).send(buildDmGiveUpNotice(userId, content, dmRetryCount));
                        }
                    } catch (notifyError: unknown) {
                        const notifyMsg = notifyError instanceof Error ? notifyError.message : String(notifyError);
                        console.error(`❌ 發送放棄通知失敗：`, notifyMsg);
                    }

                    // 任務正常結束，不再重試（任務留在資料庫但 nextRunAt 為 null）
                    return;
                }

                // 尚未達上限 → 發送頻道通知並延後重試
                console.warn(`⚠️ 使用者 ${userId} 已關閉私訊權限（第 ${dmRetryCount + 1}/${DM_BLOCKED_MAX_RETRIES} 次），延後 10 分鐘再次嘗試。`);

                try {
                    const channel = await client.channels.fetch(channelId);
                    if (channel && "send" in channel) {
                        await (channel as { send: (msg: string) => Promise<unknown> }).send(buildDmBlockedNotice(userId, content, dmRetryCount + 1, DM_BLOCKED_MAX_RETRIES));
                    }
                } catch (channelError: unknown) {
                    const channelMsg = channelError instanceof Error ? channelError.message : String(channelError);
                    console.error(`❌ 發送頻道降級訊息失敗：`, channelMsg);
                }

                // 更新重試次數並延後 10 分鐘再次嘗試
                job.attrs.data.dmRetryCount = dmRetryCount + 1;
                job.schedule(DM_BLOCKED_RETRY_DELAY);
                await job.save();
                return;
            }

            // ═══════════════════════════════════════════
            // 其他暫時性錯誤（如網路問題、Discord 伺服器異常）
            // 拋出錯誤，讓 Agenda 的 Backoff 機制進行退避重試
            // ═══════════════════════════════════════════
            throw error;
        }
    }, {
        backoff: backoffStrategies.exponential({
            delay: 1000,                // 初始延遲時間
            factor: 2,                  // 乘數 / 倍率
            maxRetries: 5,              // 最大重試次數
            jitter: 0.1                 // 隨機抖動 / 波動範圍值
        })
    });
}
