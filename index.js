import "dotenv/config";
import { gotMessage } from "./commands.js";
import { initScheduler } from "./services/scheduler/schedulerManager.js";


/* API 的連線規格與監聽行為 */
import { Client, GatewayIntentBits, Partials } from 'discord.js';
const client = new Client({
    // 這裡定義機器人要監聽哪些「事件」
    intents: [
        GatewayIntentBits.Guilds,           // 伺服器基本運作
        GatewayIntentBits.GuildMessages,    // 伺服器訊息
        GatewayIntentBits.MessageContent,   // (重要) 讀取訊息文字內容
        GatewayIntentBits.GuildMembers,     // 處理成員加入/離開
        GatewayIntentBits.DirectMessages,   // 處理私訊
        GatewayIntentBits.GuildVoiceStates, // 語音頻道狀態
    ],
    // 如果你要機器人能處理「私訊」，建議加上 Partials
    partials: [
        Partials.Channel,  // 用於私訊
        Partials.Message,  // 用於處理未快取的訊息
    ],
});


// 確認機器人已上線
client.once('ready', async () => {
    console.log("Beep beep");
    console.log(`✅ 機器人 ${client.user.username} 已上線！`);

    // 初始化排程系統（Agenda + MongoDB）
    try {
        await initScheduler(client);
        console.log("✅ 排程提醒系統已就緒");
    } catch (error) {
        console.error("❌ 排程系統初始化失敗：", error.message);
    }
});


// 觸發訊息事件
client.on("messageCreate", gotMessage);


// 機器人正式連接discord伺服器
client.login(process.env.BOTTOKEN);