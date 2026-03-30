// ═══════════════════════════════════════════════════════════
// weather.js — 天氣查詢指令
// 用法：>weather [國家] [城市(選填)]
// ═══════════════════════════════════════════════════════════

import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { queryWeather } from "../services/weather/weatherRouter.js";
import { formatWeatherOverviewEmbed, formatWeatherDetailEmbed } from "../services/weather/weatherFormatter.js";


export async function weather(msg, args) {
    await msg.channel.sendTyping();

    // 國家為必填參數
    if (args.length === 0) {
        await msg.reply("請輸入國家名稱喔！用法：`>weather [國家] [城市(選填)]`\n例如：`>weather 台灣` 或 `>weather 台灣 高雄`");
        return;
    }

    // 解析參數：第一個 = 國家，第二個(含之後) = 城市
    const country = args[0];
    const city = args.length > 1 ? args.slice(1).join(" ") : null;

    try {
        // 查詢天氣（路由器會根據國家分派至對應的 provider）
        const weatherData = await queryWeather(country, city);

        // 根據是否有指定城市，選擇不同的 Embed 格式
        if (weatherData.isDetailed) {
            // ─── 詳細模式：單一 Embed，不需要翻頁 ───
            const embed = formatWeatherDetailEmbed(weatherData);
            await msg.reply({ embeds: [embed] });
        } else {
            // ─── 總覽模式：按鈕翻頁 ───
            const embeds = formatWeatherOverviewEmbed(weatherData.weatherList);

            // 如果只有一頁，不需要按鈕
            if (embeds.length === 1) {
                await msg.reply({ embeds: [embeds[0]] });
                return;
            }

            // 多頁 → 啟動翻頁機制
            let currentPage = 0;

            // 建立翻頁按鈕的函式（每次翻頁都要更新按鈕的禁用狀態）
            function createButtons(page) {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("weather_prev")
                        .setLabel("◀ 上一頁")
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 0),                  // 第一頁禁用
                    new ButtonBuilder()
                        .setCustomId("weather_pageinfo")
                        .setLabel(`${page + 1} / ${embeds.length}`)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),                        // 頁碼顯示，不可點擊
                    new ButtonBuilder()
                        .setCustomId("weather_next")
                        .setLabel("下一頁 ▶")
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === embeds.length - 1),  // 最後一頁禁用
                );
            }

            // 發送第一頁 + 按鈕
            const replyMsg = await msg.reply({
                embeds: [embeds[currentPage]],
                components: [createButtons(currentPage)],
            });

            // 建立按鈕收集器（2 分鐘後過期）
            const collector = replyMsg.createMessageComponentCollector({ time: 120000 });

            collector.on("collect", async (interaction) => {
                // 安全防護：只有下指令的人能翻頁
                if (interaction.user.id !== msg.author.id) {
                    return await interaction.reply({
                        content: "這不是你的天氣查詢喔！請自己輸入 `>weather` 🦊",
                        ephemeral: true,
                    });
                }

                // 根據按鈕更新頁碼
                if (interaction.customId === "weather_prev") {
                    currentPage = Math.max(currentPage - 1, 0);
                } else if (interaction.customId === "weather_next") {
                    currentPage = Math.min(currentPage + 1, embeds.length - 1);
                }

                // 更新 Embed 和按鈕狀態
                await interaction.update({
                    embeds: [embeds[currentPage]],
                    components: [createButtons(currentPage)],
                });
            });

            // 收集器過期 → 移除按鈕，保留 Embed
            collector.on("end", async () => {
                await replyMsg.edit({ components: [] })
                    .catch((error) => console.error("移除按鈕失敗：", error.message));
            });
        }
    } catch (error) {
        console.error("❌ 天氣查詢錯誤：", error.message);
        await msg.reply(`Lin 查不到天氣資料呢… 🌧️\n${error.message}`);
    }
}
