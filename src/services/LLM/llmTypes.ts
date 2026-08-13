export type AskLLMFunction = (
  channelId: string,
  userMessage: string
) => Promise<string>;

export type CompleteLLMFunction = (
  systemPrompt: string,
  userMessage: string,
  options?: CompleteLLMOptions
) => Promise<string>;

export interface CompleteLLMOptions {
  temperature?: number;
  jsonMode?: boolean;
}

export interface SwitchProviderResult {
  success: boolean;
  message: string;
}
