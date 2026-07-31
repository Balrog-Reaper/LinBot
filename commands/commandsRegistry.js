// ═══════════════════════════════════════════════════════════
// commandsRegistry.js — 指令自動註冊中心
// 動態掃描 commands/ 目錄下所有指令檔案，自動載入並建立指令映射表。
// 未來新增指令時，只需在 commands/ 目錄新增檔案，無需修改此檔案。
// ═══════════════════════════════════════════════════════════

import fs from "fs";                    // 用於讀取檔案系統
import path from "path";                // 用於處理檔案路徑
import { fileURLToPath } from "url";    // 用於將 URL 轉換為檔案路徑

// 取得目前的資料夾路徑（ESM 環境下需要手動建立 __dirname）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 不需要被自動載入的檔案（系統基礎設施，非指令）
const EXCLUDED_FILES = [
    "commandsRegistry.js",  // 本檔案（註冊中心）
    "commandsRouter.js",    // 路由器
];


// 指令映射表（模組層級，啟動時由 loadCommands 填入）
let commands = new Map();
/*
 * commands 是一個 Map，結構為： Map<指令名稱, 指令物件>
 * 
 * 每個「指令物件 (Command Schema)」的具體格式規範如下：
 * {
 *     name: "指令名稱",           // (必填) 字串，例如 "gif", "help"
 *     description: "指令說明",    // (選填) 字串，顯示在 >help 選單中
 *     category: "分類名稱",       // (選填) 字串，"public" | "moderator" | "owner"，預設為 "public"
 *     dmAllowed: false,           // (選填) 布林值，是否允許在私訊使用，預設為 false
 *     ownerOnly: false,           // (選填) 布林值，是否僅限開發者(主人)使用，預設為 false
 *     
 *     // (必填) 執行函式，當指令被觸發時執行
 *     async execute(msg, args) { ... }
 * }
 */


/**
 * 取得已載入的指令映射表（供 help.js、commandsRouter.js 等模組使用）
 * @returns {Map<string, object>}
 */
export function getCommands() {
    return commands;
}


/**
 * 動態載入 commands/ 目錄下的所有指令模組，並建立指令映射表。
 * @returns {Promise<Map<string, object>>} 指令名稱 → 指令設定物件的 Map
 */
export async function loadCommands() {
    const commandsMap = new Map();

    // 1. 讀取 commands/ 目錄下所有 .js 檔案，排除系統基礎設施檔案
    const files = fs.readdirSync(__dirname).filter(file =>
        file.endsWith(".js") && !EXCLUDED_FILES.includes(file)
    );

    // 2. 逐一動態 import 每個指令檔案
    for (const file of files) {
        try {
            const module = await import(`./${file}`);

            // 3. 從模組的導出中尋找符合標準 schema 的指令物件
            //    標準 schema 需要有 name 和 execute 屬性
            for (const [key, value] of Object.entries(module)) {
                if (value && typeof value === "object" && typeof value.execute === "function") {
                    commandsMap.set(value.name, value);
                    console.log(`   📦 已載入指令：${value.name}（${file}）`);
                }
            }
        } catch (error) {
            console.error(`   ❌ 載入指令檔案失敗：${file}`, error.message);
        }
    }

    // 存入模組層級的映射表，供 getCommands() 使用
    commands = commandsMap;

    console.log(`✅ 指令註冊完成，共載入 ${commandsMap.size} 個指令`);
    return commandsMap;
}

