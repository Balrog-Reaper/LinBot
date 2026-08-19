import type { Message } from "discord.js";
import type { BotCommand } from "../commandTypes.js";


// 機器人search GIF
export const gif: BotCommand = {
    name: "gif",
    description: "`>gif [關鍵字]` 搜尋並傳送 GIF 圖片。若未提供關鍵字，預設搜尋 \"Barlog\"。",
    category: "public",
    dmAllowed: false,
    ownerOnly: false,

    async execute(msg: Message, args: string[]): Promise<void> {
        // search GIF 的關鍵詞
        let keywords = "Barlog";
        if (args.length > 0) {
            keywords = args.join(" ");
        }

        // API連線抓取gif圖片
        const url = `https://api.klipy.com/api/v1/${process.env.KLIPYTOKEN}/gifs/search?page=1&per_page=5&q=${keywords}&locale=zh-TW&content_filter=null`;
        const response = await fetch(url);
        const json = await response.json();

        // 傳送gif圖片至discord伺服器的頻道
        const index = Math.floor(Math.random() * json.data.data.length);
        const targetGif = json.data.data[index].file.hd.gif.url;
        if ("send" in msg.channel) {
            await msg.channel.send(targetGif);
            await msg.channel.send(`GIF from Klipy： ${keywords}`);
        }
    }
};
