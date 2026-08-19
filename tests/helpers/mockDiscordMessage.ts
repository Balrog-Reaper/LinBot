import { vi } from "vitest";
import type { Message } from "discord.js";

interface MockMessageOptions {
    content: string;
    authorId?: string;
    isBot?: boolean;
    guildId?: string | null;   // null 代表私訊
}

/**
 * 建立一個假的 Discord Message 物件供測試使用
 */
export function createMockMessage(options: MockMessageOptions): Message {
    return {
        content: options.content,
        author: {
            id: options.authorId ?? "330543342196621322",
            bot: options.isBot ?? false,
            username: "TestUser",
            tag: "TestUser#1234"
        },
        guild: options.guildId !== null ? { id: options.guildId ?? "123456" } : null,
        client: { user: { id: "BOT_ID_123" } },
        channel: {
            sendTyping: vi.fn(),
            id: "channel_123"
        },
        reply: vi.fn(),
    } as unknown as Message;
}
