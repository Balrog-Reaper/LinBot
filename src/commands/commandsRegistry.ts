// ═══════════════════════════════════════════════════════════
// commandsRegistry.ts — 指令自動註冊中心
// 動態掃描 commands/ 目錄及其子資料夾下所有指令檔案，自動載入並建立指令映射表。
// 未來新增指令時，只需在對應分類資料夾中新增檔案，無需修改此檔案。
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
 * 遞迴收集目錄及其子目錄中所有符合條件的指令檔案路徑
 * @param dir - 要掃描的目錄
 * @param ext - 副檔名（.ts 或 .js）
 * @returns 所有符合條件的檔案絕對路徑陣列
 */
function collectCommandFiles(dir: string, ext: string): string[] {
    const results: string[] = [];

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            // 遞迴進入子資料夾（如 core/, fun/, utility/）
            results.push(...collectCommandFiles(fullPath, ext));
        } else if (entry.isFile() && entry.name.endsWith(ext)) {
            // 排除系統基礎設施檔案和測試檔案
            const baseName = path.basename(entry.name, ext);
            if (!EXCLUDED_FILES.includes(baseName) && !entry.name.includes(".test.")) {
                results.push(fullPath);
            }
        }
    }

    return results;
}


/**
 * 動態載入 commands/ 目錄及其子資料夾下的所有指令模組，並建立指令映射表。
 * @returns 指令名稱 → 指令設定物件的 Map
 */
export async function loadCommands(): Promise<Map<string, BotCommand>> {
    const commandsMap = new Map<string, BotCommand>();

    // 判斷副檔名：開發環境 (.ts via tsx) vs 生產環境 (.js via tsc)
    const ext = __filename.endsWith(".ts") ? ".ts" : ".js";

    // 1. 遞迴收集所有指令檔案路徑
    const files = collectCommandFiles(__dirname, ext);

    // 2. 逐一動態 import 每個指令檔案
    for (const filePath of files) {
        // 計算相對於 __dirname 的路徑，用於 dynamic import
        const relativePath = "./" + path.relative(__dirname, filePath).replace(/\\/g, "/");
        const displayName = path.relative(__dirname, filePath).replace(/\\/g, "/");

        try {
            const module = await import(relativePath) as Record<string, unknown>;

            // 3. 從模組的導出中尋找符合標準 schema 的指令物件
            //    標準 schema 需要有 name 和 execute 屬性
            for (const [_key, value] of Object.entries(module)) {
                if (value && typeof value === "object" && "execute" in value && typeof (value as BotCommand).execute === "function") {
                    const cmd = value as BotCommand;
                    commandsMap.set(cmd.name, cmd);
                    console.log(`   📦 已載入指令：${cmd.name}（${displayName}）`);
                }
            }
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error(`   ❌ 載入指令檔案失敗：${displayName}`, msg);
        }
    }

    // 存入模組層級的映射表，供 getCommands() 使用
    commands = commandsMap;

    console.log(`✅ 指令註冊完成，共載入 ${commandsMap.size} 個指令`);
    return commandsMap;
}

