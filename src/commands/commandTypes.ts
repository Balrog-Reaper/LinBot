import type { Message } from "discord.js";

export type CommandCategory = "public" | "moderator" | "owner";

export interface BotCommand {
  name: string;
  description: string;
  category: CommandCategory;
  dmAllowed: boolean;
  ownerOnly: boolean;
  execute(msg: Message, args: string[]): Promise<void>;
}
