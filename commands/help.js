import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";


// 所有指令說明
const description_Lin = `暗示指令,Lin會羞澀地答應主人的請求。`
const description_gif = `>gif [關鍵字]搜尋並傳送 GIF 圖片。若未提供關鍵字，預設搜尋 "Barlog"。`;
const description_restart = `重新啟動機器人（僅限管理員使用）。`;
const description_switchLLM = `>switchLLM [ollama/gemini] 切換 AI 大腦。不加參數可查看目前狀態。`;
const description_weather = `>weather [國家] [城市]查詢天氣狀況。例如：>weather 台灣 或 >weather 台灣 高雄。`;



export async function help(msg, args) {

    // separatorLine 用於在嵌入訊息 (Embed) 中繪製分隔線，增加視覺美觀
    const separatorLine = "--------------------------------------"

    // 判斷 args 長度，若長度為 0 代表使用者只輸入了 `>help`，沒有附帶其他參數
    // 此時將觸發完整的「動態多頁面互動式表單」
    if (args.length === 0) {

        // ==========================================
        // 1. 建立各頁面的 Embed (嵌入訊息卡片) 內容
        // ==========================================

        // 【首頁 (Page 1)】：顯示選單總覽與導覽列
        const embed_page1 = new EmbedBuilder()
            .setTitle("🦊 LinBot 靈狐指南 (首頁)")
            .setDescription(`主人，這是 Lin 目前能為您服務的項目總覽喔～搖搖尾巴。✨\n${separatorLine}`)
            .addFields(
                { name: "🌸 Page 1", value: "目前的總覽介紹" },
                { name: "🍃 Page 2", value: "大家都能用的公開指令" },
                { name: "🌙 Page 3", value: "維持秩序的進階調和指令" },
                { name: "🏮 Page 4", value: "只有主人能用的秘密指令" },
            )
            .addFields({ name: "\u200B", value: `${separatorLine}` }) // 使用零寬度字元作為空行，下方塞入分隔線
            .setFooter({ text: 'Lin 隨時乖乖聽主人的話 🦊' })
            .setColor(0xFFB6C1) // 淺粉紅色
            .setTimestamp();


        // 【公開指令區 (Page 2)】：所有成員皆可使用的指令
        const embed_page2 = new EmbedBuilder()
            .setTitle("🌸 靈狐指令 - 公開區")
            .setDescription(`這些是伺服器裡的所有人都可以找 Lin 玩的指令喔!\n${separatorLine}`)
            .addFields(
                { name: "✨ >gif", value: description_gif },
                { name: "🌤️ >weather", value: description_weather },
            )
            .addFields({ name: "\u200B", value: `${separatorLine}` })
            .setFooter({ text: 'Lin 會幫大家找到有趣的圖片 🦊' })
            .setColor(0xFFB6C1)
            .setTimestamp();

        // 【調和指令區 (Page 3)】：預留給管理員/版主維持秩序的指令 (如踢人、禁言)
        const embed_page3 = new EmbedBuilder()
            .setTitle("🌙 靈狐指令 - 調和區")
            .setDescription(`具有特別權限的人才能讓 Lin 執行的秩序管理指令。\n${separatorLine}`)
            .addFields(
                { name: "🈳 虛位以待", value: "目前這裡還沒有指令呢，等待主人教 Lin～" }
            )
            .addFields({ name: "\u200B", value: `${separatorLine}` })
            .setFooter({ text: 'Lin 會幫忙守護伺服器的和平 🦊' })
            .setColor(0x9B59B6) // 紫色
            .setTimestamp();



        // 【主人專屬區 (Page 4)】：只有開發者/擁有者才能執行的指令
        const embed_page4 = new EmbedBuilder()
            .setTitle("🏮 靈狐指令 - 主人專屬")
            .setDescription(`噓... 這是只有主人您可以對 Lin 下達的秘密指令喔 (///▽///)\n${separatorLine}`)
            .addFields(
                { name: "💖 >Lin", value: description_Lin },
                { name: "⚠️ >restart", value: description_restart },
                { name: "🧠 >switchLLM", value: description_switchLLM },
            )
            .addFields({ name: "\u200B", value: `${separatorLine}` })
            .setFooter({ text: 'Lin 永遠是主人的專屬狐狸 🦊💕' })
            .setColor(0xE74C3C) // 紅色
            .setTimestamp();

        // 建立按鈕
        // ==========================================
        // 2. 建立按鈕控制列 (ActionRow)
        // ==========================================
        // ActionRowBuilder 是一個容器，用來裝載這些按鈕組件
        // customId 就像是按鈕的身分證，按下去的時候我們才知道是哪顆被按了
        const button_bar = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("help_Page1") // 身分證：首頁
                    .setLabel("首頁 🦊")
                    .setStyle(ButtonStyle.Primary), // Primary 通常是藍色
                new ButtonBuilder()
                    .setCustomId("help_Page2")
                    .setLabel("公開 🌸")
                    .setStyle(ButtonStyle.Success), // Success 通常是綠色
                new ButtonBuilder()
                    .setCustomId("help_Page3")
                    .setLabel("調和 🌙")
                    .setStyle(ButtonStyle.Secondary), // Secondary 通常是灰色
                new ButtonBuilder()
                    .setCustomId("help_Page4")
                    .setLabel("主人 🏮")
                    .setStyle(ButtonStyle.Danger) // Danger 通常是紅色
            )

        // ==========================================
        // 3. 發送初始訊息並掛載監聽器
        // ==========================================
        // 將「首頁內容」與「按鈕列」一併回覆到頻道上
        const replyMsg = await msg.reply({
            embeds: [embed_page1],
            components: [button_bar],
        })

        // 在剛剛發出去的這則訊息 (replyMsg) 上，建立一個「按鈕點擊收集器」，存活時間 10 分鐘 (600,000 毫秒)
        const collector = replyMsg.createMessageComponentCollector({ time: 600000 })

        // 啟動監聽，當有人點擊這則訊息上的任何按鈕時觸發
        collector.on("collect", async (interaction) => {
            // 安全防護：如果點擊按鈕的人，不是當初下達 `>help` 指令的人，就阻擋他
            if (interaction.user.id !== msg.author.id) {
                return await interaction.reply({ content: `主人交代過，只有 ${msg.author.tag} 才能翻閱這本手冊喔！🦊`, ephemeral: true })
            } else {
                // 根據按下的按鈕，抽換成對應頁面的 embed，並保留原本的 button_bar
                if (interaction.customId === "help_Page1") {
                    await interaction.update({      // 收到按鈕的互動後更新訊息頁面
                        embeds: [embed_page1],
                        components: [button_bar]
                    })
                }

                if (interaction.customId === "help_Page2") {
                    await interaction.update({
                        embeds: [embed_page2],
                        components: [button_bar]
                    })
                }

                if (interaction.customId === "help_Page3") {
                    await interaction.update({
                        embeds: [embed_page3],
                        components: [button_bar]
                    })
                }

                if (interaction.customId === "help_Page4") {
                    await interaction.update({
                        embeds: [embed_page4],
                        components: [button_bar]
                    })
                }
            }
        })

        // 當收集器過期結束時，可以寫一段邏輯把按鈕清空，避免死按鈕留在畫面上
        collector.on("end", async () => {
            // 移除所有按鈕組件，只留下卡片
            await replyMsg.edit({ embeds: [], components: [] })
                .catch((error) => { console.error("發生錯誤：", error.message) });
        });
    }


}