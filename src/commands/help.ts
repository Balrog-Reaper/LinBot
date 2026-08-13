// ═══════════════════════════════════════════════════════════
// help.ts — 動態幫助指令
// 自動從 commandsRegistry 讀取所有指令的 metadata，
// 依據 category 分類並動態產生多頁面互動式幫助選單。
// ═══════════════════════════════════════════════════════════

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { Message } from "discord.js";
import { getCommands } from "./commandsRegistry.js";
import type { BotCommand, CommandCategory } from "./commandTypes.js";


// ═══════════════════════════════════════════
// 分類設定：定義每個 category 的頁面外觀
// ═══════════════════════════════════════════
interface CategoryConfig {
    pageTitle: string;
    pageDescription: string;
    footer: string;
    color: number;
    buttonLabel: string;
    buttonStyle: typeof ButtonStyle.Success | typeof ButtonStyle.Secondary | typeof ButtonStyle.Danger;
    emoji: string;
}

const CATEGORY_CONFIG: Record<CommandCategory, CategoryConfig> = {
    public: {
        pageTitle: "🌸 靈狐指令 - 公開區",
        pageDescription: "這些是伺服器裡的所有人都可以找 Lin 玩的指令喔!",
        footer: "Lin 會幫大家找到有趣的東西 🦊",
        color: 0xFFB6C1,       // 淺粉紅色
        buttonLabel: "公開 🌸",
        buttonStyle: ButtonStyle.Success,
        emoji: "✨",
    },
    moderator: {
        pageTitle: "🌙 靈狐指令 - 調和區",
        pageDescription: "具有特別權限的人才能讓 Lin 執行的秩序管理指令。",
        footer: "Lin 會幫忙守護伺服器的和平 🦊",
        color: 0x9B59B6,       // 紫色
        buttonLabel: "調和 🌙",
        buttonStyle: ButtonStyle.Secondary,
        emoji: "🛡️",
    },
    owner: {
        pageTitle: "🏮 靈狐指令 - 主人專屬",
        pageDescription: "噓... 這是只有主人您可以對 Lin 下達的秘密指令喔 (///▽///)",
        footer: "Lin 永遠是主人的專屬狐狸 🦊💕",
        color: 0xE74C3C,       // 紅色
        buttonLabel: "主人 🏮",
        buttonStyle: ButtonStyle.Danger,
        emoji: "💖",
    },
};

// 分類的顯示順序
const CATEGORY_ORDER: CommandCategory[] = ["public", "moderator", "owner"];


export const help: BotCommand = {
    name: "help",
    description: "顯示 Lin 的指令清單與使用說明。",
    category: "public",
    dmAllowed: true,
    ownerOnly: false,

    async execute(msg: Message): Promise<void> {

        const separatorLine = "--------------------------------------";
        const commands = getCommands();

        // ════════════════════════════════════════
        // 1. 依據 category 自動分組指令
        // ════════════════════════════════════════

        // 建立一個物件，用來存放不同分類的指令
        const cmdsByCategory: Record<CommandCategory, BotCommand[]> = {
            public: [],
            moderator: [],
            owner: [],
        };

        // 將指令依據 category 分類
        for (const [name, cmd] of commands) {
            const cmdCategory = cmd.category as CommandCategory;
            if (!cmdsByCategory[cmdCategory]) {

                // 1. 在 Docker / 終端機控制台印出超詳細的紅色警告，方便查閱日誌
                console.error(`\n❌ [DEBUG 錯誤] 指令 ">${name}" 的分類 "${cmd.category}" 未定義在 CATEGORY_ORDER 中！\n`);

                // 2. 在 Discord 頻道直接印出具體的錯誤資訊，讓您在玩機器人時能一目了然
                await msg.reply(`⚠️ **開發者除錯提示**：指令 \`>${name}\` 使用了未定義的分類 \`${cmd.category}\`，請至 CATEGORY_ORDER 中新增或修正！`);
                return;
            }
            cmdsByCategory[cmdCategory].push(cmd);
        }

        // ════════════════════════════════════════
        // 2. 建立首頁 Embed
        // ════════════════════════════════════════
        const pageEmbeds: EmbedBuilder[] = [];
        const pageKeys: string[] = ["home"]; // 對應按鈕 customId 的鍵值

        const embed_home = new EmbedBuilder()
            .setTitle("🦊 LinBot 靈狐指南 (首頁)")
            .setDescription(`主人，這是 Lin 目前能為您服務的項目總覽喔～搖搖尾巴。✨\n${separatorLine}`)
            .addFields(
                { name: "🌸 公開區", value: "大家都能用的公開指令" },
                { name: "🌙 調和區", value: "維持秩序的進階調和指令" },
                { name: "🏮 主人專屬", value: "只有主人能用的秘密指令" },
            )
            .addFields({ name: "\u200B", value: `${separatorLine}` })
            .setFooter({ text: "Lin 隨時乖乖聽主人的話 🦊" })
            .setColor(0xFFB6C1)
            .setTimestamp();

        pageEmbeds.push(embed_home);

        // ════════════════════════════════════════
        // 3. 依序建立各分類的 Embed
        // ════════════════════════════════════════
        for (const category of CATEGORY_ORDER) {
            const config = CATEGORY_CONFIG[category];
            const cmds = cmdsByCategory[category];

            const embed = new EmbedBuilder()
                .setTitle(config.pageTitle)
                .setDescription(`${config.pageDescription}\n${separatorLine}`)
                .setFooter({ text: config.footer })
                .setColor(config.color)
                .setTimestamp();

            if (cmds.length === 0) {
                embed.addFields({ name: "🈳 虛位以待", value: "目前這裡還沒有指令呢，等待主人教 Lin～" });
            } else {
                for (const cmd of cmds) {
                    embed.addFields({
                        name: `${config.emoji} >${cmd.name}`,
                        value: cmd.description || "（尚無說明）",
                    });
                }
            }

            embed.addFields({ name: "\u200B", value: `${separatorLine}` });

            pageEmbeds.push(embed);
            pageKeys.push(category);
        }

        // ════════════════════════════════════════
        // 4. 建立按鈕控制列
        // ════════════════════════════════════════
        const button_bar = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("help_home")
                    .setLabel("首頁 🦊")
                    .setStyle(ButtonStyle.Primary),
                ...CATEGORY_ORDER.map(category => {
                    const config = CATEGORY_CONFIG[category];
                    return new ButtonBuilder()
                        .setCustomId(`help_${category}`)
                        .setLabel(config.buttonLabel)
                        .setStyle(config.buttonStyle);
                })
            );

        // ════════════════════════════════════════
        // 5. 發送初始訊息並掛載監聽器
        // ════════════════════════════════════════
        const replyMsg = await msg.reply({
            embeds: [embed_home],
            components: [button_bar],
        });

        const collector = replyMsg.createMessageComponentCollector({ time: 600000 });

        collector.on("collect", async (interaction) => {
            // 安全防護：如果點擊按鈕的人，不是當初下達 >help 指令的人，就阻擋他
            if (interaction.user.id !== msg.author.id) {
                await interaction.reply({
                    content: `主人交代過，只有 ${msg.author.tag} 才能翻閱這本手冊喔！🦊`,
                    ephemeral: true,    // 只有點擊按鈕的人才看得到
                });
                return;
            }

            // 從 customId 中解析出對應的頁面 key（help_home → home, help_public → public）
            const pageKey = interaction.customId.replace("help_", "");
            const pageIndex = pageKeys.indexOf(pageKey);

            if (pageIndex !== -1) {
                await interaction.update({
                    embeds: [pageEmbeds[pageIndex]!],
                    components: [button_bar],
                });
            }
        });

        // 當收集器過期結束時，移除按鈕避免死按鈕留在畫面上
        collector.on("end", async () => {
            await replyMsg.edit({ components: [] })
                .catch((error: unknown) => {

                    // 如果錯誤代碼是 10008 代表訊息已被刪除，這種情況直接忽略；其他錯誤才記錄
                    const discordError = error as { code?: number; message?: string };
                    if (discordError.code !== 10008) {
                        console.error("移除幫助選單按鈕失敗：", discordError.message);
                    }
                });
        });
    }
};
