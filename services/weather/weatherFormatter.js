// ═══════════════════════════════════════════════════════════
// weatherFormatter.js — 天氣 Embed 格式化工具
// 將天氣資料轉換為美觀的 Discord Embed 訊息
// ═══════════════════════════════════════════════════════════

import { EmbedBuilder } from "discord.js";


/**
 * 根據天氣描述給予對應 emoji
 * 注意順序：「雷」比「雨」優先（因為雷雨的描述同時包含兩者）
 */
function getWeatherEmoji(description) {
    if (!description) return "🌤️";
    if (description.includes("雷")) return "⛈️";
    if (description.includes("雨")) return "🌧️";
    if (description.includes("陰")) return "☁️";
    if (description.includes("雲")) return "⛅";
    if (description.includes("晴")) return "☀️";
    if (description.includes("霧")) return "🌫️";
    return "🌤️";
}


/**
 * 總覽模式：台灣全部縣市天氣概覽
 * 
 * ⚠️ Discord 單個 Embed 最多 25 個 field
 *    台灣 22 縣市剛好不會超過，但為保險仍做分頁處理
 * 
 * @param {Array} weatherList - 各縣市天氣資料陣列
 * @returns {EmbedBuilder[]} Embed 陣列（可能有多頁）
 */
export function formatWeatherOverviewEmbed(weatherList) {
    const MAX_FIELDS = 18; // 18 城市 + 5 間隔 = 23 欄位，不超過 Discord 的 25 上限
    const embeds = [];

    for (let i = 0; i < weatherList.length; i += MAX_FIELDS) {
        const chunk = weatherList.slice(i, i + MAX_FIELDS);
        const pageNum = Math.floor(i / MAX_FIELDS) + 1;
        const totalPages = Math.ceil(weatherList.length / MAX_FIELDS);

        const title = totalPages > 1
            ? `🌤️ 台灣今日天氣概覽（${pageNum}/${totalPages}）`
            : "🌤️ 台灣今日天氣概覽";

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription("以下為各縣市 36 小時天氣預報\n--------------------------------------")
            .setColor(0x3498DB)
            .setTimestamp()
            .setFooter({ text: "Lin 為主人查了天氣 🦊☀️ | 資料來源：中央氣象署" });

        for (let j = 0; j < chunk.length; j++) {
            const data = chunk[j];
            const emoji = getWeatherEmoji(data.description);
            embed.addFields({
                name: `${emoji} ${data.locationName}`,
                value: `${data.description}\n🌡️ 平均 ${data.avgTemp}（${data.temperature}）\n🌧️ 降雨 ${data.rainProb}\n\u200B`,
                inline: true,
            });

            // 每 3 個城市後插入一條空白分隔列，製造視覺間距
            if ((j + 1) % 3 === 0 && j !== chunk.length - 1) {
                embed.addFields({ name: "\u200B", value: "\u200B", inline: false });
            }
        }

        embeds.push(embed);
    }

    return embeds;
}


/**
 * 詳細模式：指定縣市的完整天氣報告
 * 包含氣溫、體感溫度、風速風向、舒適度、天氣詳細說明等
 * 
 * @param {Object} weatherData - 單一縣市的詳細天氣資料
 * @returns {EmbedBuilder} 單一 Embed
 */
export function formatWeatherDetailEmbed(weatherData) {
    const emoji = getWeatherEmoji(weatherData.description);

    const embed = new EmbedBuilder()
        .setTitle(`${emoji} ${weatherData.locationName} 詳細天氣報告`)
        .setDescription("--------------------------------------")
        .setColor(0x2ECC71)
        .addFields(
            { name: "🌤️ 天氣狀況", value: weatherData.description, inline: true },
            { name: "🌡️ 平均氣溫", value: weatherData.temperature, inline: true },
            { name: "🤒 體感溫度", value: weatherData.feelTemp, inline: true },
            { name: "🔺 最高溫", value: weatherData.maxTemp, inline: true },
            { name: "🔻 最低溫", value: weatherData.minTemp, inline: true },
            { name: "🌧️ 降雨機率", value: weatherData.rainProb, inline: true },
            { name: "💧 相對濕度", value: weatherData.humidity, inline: true },
            { name: "😌 舒適度", value: weatherData.comfort, inline: true },
            { name: "💨 風速", value: weatherData.windSpeed, inline: true },
            { name: "🧭 風向", value: weatherData.windDir, inline: true },
        )
        .addFields({ name: "\u200B", value: "--------------------------------------" })
        .addFields({
            name: "📝 天氣詳細說明 & 影響分析",
            value: weatherData.detail || "暫無詳細說明",
        })
        .setTimestamp()
        .setFooter({ text: "Lin 為主人查了天氣 🦊☀️ | 資料來源：中央氣象署" });

    return embed;
}
