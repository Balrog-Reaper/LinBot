import { EmbedBuilder } from "discord.js";

export async function userInfo(msg, args) {
    // 1. 取得指令中被標註的對手 (第一位)
    const targetMember = msg.mentions.members.first();

    // 如果沒有標註對象，提醒主人
    if (!targetMember) {
        return await msg.reply("主人，請標註一位您想調查的對象喔！例如：`>userInfo @某人` 🦊");
    }

    // 2. 獲取代查對象的基礎 User 屬性
    const user = targetMember.user;

    // 把時間戳轉換成 Discord 的「當地時間顯示標籤」格式 <t:Timestamp:d> (短日期格式，例如 2026/03/17)
    const joinedTimeStr = `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:d>`;

    // 3. 繪製精美的調查報告 (嵌入訊息)
    const separatorLine = "--------------------------------------"
    const embed = new EmbedBuilder()
        .setTitle(`📌 秘密調查報告：${user.username}\n${separatorLine}`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
        .setColor(0x9B59B6) // 採用調和區的色系
        .addFields(
            { name: "👤 伺服器暱稱", value: targetMember.displayName },
            { name: "🆔 使用者 ID", value: user.id },
            { name: "🤖 機器人判定", value: user.bot ? "是" : "否" },
            { name: "📥 加入伺服器時間", value: joinedTimeStr }
        )

    try {
        await msg.reply({ embeds: [embed] });
    } catch (error) {
        console.error("無法發送私訊給使用者:", error.message);
    }
}
