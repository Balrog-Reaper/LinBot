// 機器人重啟指令
export const restart = {
    name: "restart",
    description: "重新啟動機器人（僅限主人使用）。",
    category: "owner",
    dmAllowed: false,
    ownerOnly: true,

    async execute(msg) {
        await msg.reply("正在關閉系統並重啟...");
        console.log("Restarting...");
        process.exit(); // 結束目前程序
    }
};
