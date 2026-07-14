import { buildReminderMessage, buildReminderEmbed } from "./reminderTemplates.js";


/**
 * 註冊所有排程任務定義
 * 透過閉包（Closure）捕獲 Discord client 實例
 *
 * @param {import('agenda').Agenda} agenda  - Agenda 實例
 * @param {import('discord.js').Client} client - Discord Client 實例
 */
export function defineAllJobs(agenda, client) {

    // ═══════════════════════════════════════════
    // 任務：send_reminder（一次性私訊提醒）
    // ═══════════════════════════════════════════
    agenda.define("send_reminder", async (job) => {
        const { userId, channelId, content } = job.attrs.data;

        console.log(`🔔 正在執行提醒任務：${content}（目標使用者：${userId}）`);

        try {
            // 透過 Discord Client 取得目標使用者
            const user = await client.users.fetch(userId);

            // 組合女僕風格提醒訊息（Embed 格式，更精緻）
            const embed = buildReminderEmbed(content);

            // ═══════════════════════════════════════════
            // 優先透過 DM 私訊發送（貼身女僕模式 💌）
            // ═══════════════════════════════════════════
            try {
                await user.send({ embeds: [embed] });
                console.log(`✅ 私訊提醒已發送：${content} → ${user.tag}`);

            } catch (dmError) {
                // ═══════════════════════════════════════════
                // DM 失敗（使用者可能關閉了私訊權限）
                // 降級至原始頻道 Tag 提醒（容錯處理）
                // ═══════════════════════════════════════════
                console.warn(`⚠️ 無法私訊使用者 ${user.tag}，降級至頻道提醒`);

                const channel = await client.channels.fetch(channelId);
                if (channel) {
                    const fallbackMsg = buildReminderMessage(userId, content);
                    await channel.send(fallbackMsg);
                    console.log(`✅ 頻道提醒已發送（降級模式）：${content}`);
                } else {
                    console.error(`❌ 找不到頻道 ${channelId}，提醒發送完全失敗`);
                }
            }

        } catch (error) {
            console.error(`❌ 發送提醒失敗：`, error.message);
        }
    });

    // ═══════════════════════════════════════════
    // 以下為未來擴充預留區
    // ═══════════════════════════════════════════

    // 範例：每日早安問候（Phase 2）
    // agenda.define("daily_greeting", async (job) => { ... });

    // 範例：每週伺服器活躍度週報（Phase 2）
    // agenda.define("weekly_report", async (job) => { ... });
}
