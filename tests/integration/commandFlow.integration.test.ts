import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockMessage } from "../helpers/mockDiscordMessage.js";

// 1. Mock LLM 對話模組
vi.mock("../../src/services/LLM/chat.js", () => ({
    chat: vi.fn(),
}));

// 2. Mock 指令註冊中心，注入假的指令供路由器測試
const { mockHelpCommand, mockRemindCommand, mockGuildCommand, fakeCommandsMap } = vi.hoisted(() => {
    const help = { name: "help", dmAllowed: true, ownerOnly: false, execute: vi.fn() };
    const remind = { name: "remind", dmAllowed: true, ownerOnly: true, execute: vi.fn() };
    const guild = { name: "guildonly", dmAllowed: false, ownerOnly: false, execute: vi.fn() };

    return {
        mockHelpCommand: help,
        mockRemindCommand: remind,
        mockGuildCommand: guild,
        fakeCommandsMap: new Map([
            ["help", help],
            ["remind", remind],
            ["guildonly", guild]
        ])
    };
});

vi.mock("../../src/commands/commandsRegistry.js", () => ({
    getCommands: vi.fn(() => fakeCommandsMap),
    loadCommands: vi.fn(() => Promise.resolve(fakeCommandsMap)),
}));


// 在所有 mock 宣告之後才 import 路由器
import { handleMessage, initRouter } from "../../src/commands/commandsRouter.js";
import { chat } from "../../src/services/LLM/chat.js";

const mockedChat = vi.mocked(chat);

describe("commandFlow (Integration)", () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        // 設定主人 ID 供 ownerOnly 檢查使用
        vi.stubEnv("MYUSERID", "OWNER_123");

        // 確保路由器已載入假指令
        await initRouter();
    });

    it("1. 機器人自己的訊息應被忽略", async () => {
        const msg = createMockMessage({ content: "<@BOT_ID_123> >help", isBot: true });

        await handleMessage(msg);

        expect(mockHelpCommand.execute).not.toHaveBeenCalled();
        expect(mockedChat).not.toHaveBeenCalled();
    });

    it("2. 無 @Lin 標註的訊息應被忽略", async () => {
        const msg = createMockMessage({ content: ">help", isBot: false });

        await handleMessage(msg);

        expect(mockHelpCommand.execute).not.toHaveBeenCalled();
        expect(mockedChat).not.toHaveBeenCalled();
    });

    it("3. @Lin >help 應觸發 help 指令 (正常權限)", async () => {
        const msg = createMockMessage({ content: "<@BOT_ID_123> >help", isBot: false });

        await handleMessage(msg);

        expect(mockHelpCommand.execute).toHaveBeenCalledWith(msg, []);
        expect(msg.reply).not.toHaveBeenCalled(); // 沒有報錯
    });

    it("4. @Lin >remind 非主人使用應被拒絕", async () => {
        const msg = createMockMessage({ content: "<@BOT_ID_123> >remind", authorId: "NORMAL_USER_456" });

        await handleMessage(msg);

        expect(mockRemindCommand.execute).not.toHaveBeenCalled();
        expect(msg.reply).toHaveBeenCalledWith("這是主人專屬的秘密指令喔，Lin 不能讓別人碰呢～🦊");
    });

    it("4-2. @Lin >remind 主人使用應允許", async () => {
        const msg = createMockMessage({ content: "<@BOT_ID_123> >remind", authorId: "OWNER_123" });

        await handleMessage(msg);

        expect(mockRemindCommand.execute).toHaveBeenCalledWith(msg, []);
    });

    it("5. 不存在的指令應靜默處理", async () => {
        const msg = createMockMessage({ content: "<@BOT_ID_123> >unknowncmd" });

        await handleMessage(msg);

        expect(msg.reply).not.toHaveBeenCalled();
        expect(mockedChat).not.toHaveBeenCalled();
    });

    it("6. 非指令內容 @Lin 你好 應交給 LLM", async () => {
        const msg = createMockMessage({ content: "<@BOT_ID_123> 你好呀" });

        await handleMessage(msg);

        // 解析時會移除標註並 trim
        expect(mockedChat).toHaveBeenCalledWith(msg, "你好呀");
    });

    it("7. dmAllowed = false 的指令在私訊中使用應被拒絕", async () => {
        // guildId = null 代表是在私訊
        const msg = createMockMessage({ content: "<@BOT_ID_123> >guildonly", guildId: null });

        await handleMessage(msg);

        expect(mockGuildCommand.execute).not.toHaveBeenCalled();
        expect(msg.reply).toHaveBeenCalledWith("這個指令只能在伺服器中使用喔！🦊");
    });
});
