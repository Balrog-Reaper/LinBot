// ═══════════════════════════════════════════════════════════
// commandsRegistry.ts — 指令自動註冊中心
// 動態掃描 commands/ 目錄下所有指令檔案，自動載入並建立指令映射表。
// 未來新增指令時，只需在 commands/ 目錄新增檔案，無需修改此檔案。
// ═══════════════════════════════════════════════════════════

import fs from "fs";                    // 用於讀取檔案系統
import path from "path";                // 用於處理檔案路徑
import { fileURLToPath } from "url";    // 用於將 URL 轉換為檔案路徑
import type { BotCommand } from "./commandTypes.js";

// 取得目前的資料夾路徑（ESM 環境下需要手動建立 __dirname）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 不需要被自動載入的檔案（系統基礎設施，非指令）
const EXCLUDED_FILES: string[] = [
    "commandsRegistry",  // 本檔案（註冊中心）
    "commandsRouter",    // 路由器
    "commandTypes",      // 型別定義
];


// 指令映射表（模組層級，啟動時由 loadCommands 填入）
let commands = new Map<string, BotCommand>();


/**
 * 取得已載入的指令映射表（供 help.ts、commandsRouter.ts 等模組使用）
 * @returns 指令名稱 → 指令設定物件的 Map
 */
export function getCommands(): Map<string, BotCommand> {
    return commands;
}


/**
 * 動態載入 commands/ 目錄下的所有指令模組，並建立指令映射表。
 * @returns 指令名稱 → 指令設定物件的 Map
 */
export async function loadCommands(): Promise<Map<string, BotCommand>> {
    const commandsMap = new Map<string, BotCommand>();

    // 判斷副檔名：開發環境 (.ts via tsx) vs 生產環境 (.js via tsc)
    const ext = __filename.endsWith(".ts") ? ".ts" : ".js";

    // 1. 讀取 commands/ 目錄下所有對應副檔名的檔案，排除系統基礎設施檔案
    const files = fs.readdirSync(__dirname).filter(file => {
        if (!file.endsWith(ext)) return false;
        const baseName = path.basename(file, ext);
        return !EXCLUDED_FILES.includes(baseName);
    });

    // 2. 逐一動態 import 每個指令檔案
    for (const file of files) {
        try {
            const module = await import(`./${file}`) as Record<string, unknown>;

            // 3. 從模組的導出中尋找符合標準 schema 的指令物件
            //    標準 schema 需要有 name 和 execute 屬性
            for (const [_key, value] of Object.entries(module)) {
                if (value && typeof value === "object" && "execute" in value && typeof (value as BotCommand).execute === "function") {
                    const cmd = value as BotCommand;
                    commandsMap.set(cmd.name, cmd);
                    console.log(`   📦 已載入指令：${cmd.name}（${file}）`);
                }
            }
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error(`   ❌ 載入指令檔案失敗：${file}`, msg);
        }
    }

    // 存入模組層級的映射表，供 getCommands() 使用
    commands = commandsMap;

    console.log(`✅ 指令註冊完成，共載入 ${commandsMap.size} 個指令`);
    return commandsMap;
}
