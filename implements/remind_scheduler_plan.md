# 🦊 LinBot × 排程提醒系統 實作計畫書

> 作成日期：2026-04-06  
> 目標：為 LinBot 新增非同步排程提醒功能 `>remind`，具備資料持久化、自然語言時間解析、以及女僕角色風格的互動回覆。

---

## 📋 專案背景

LinBot 目前已具備 GIF 搜尋、AI 對話、天氣查詢、使用者資訊查詢等功能。本次新增「**排程提醒**」系統，解決傳統 `setTimeout` 在程式重啟時任務遺失的痛點，並運用已串接的 Ollama/Gemini 作為自然語言時間解析引擎，讓使用者能以口語方式設定提醒。

### 需求整理

| # | 需求描述 | 優先度 |
|---|----------|--------|
| 1 | 以 `>remind` 指令設定一次性提醒，時間到透過**私訊 (DM)** 悄悄提醒使用者 | 🔴 高 |
| 2 | 支援自然語言時間輸入（如「明天早上八點」、「三小時後」） | 🔴 高 |
| 3 | 任務持久化至 MongoDB，程式重啟後自動補發/接續未完成任務 | 🔴 高 |
| 4 | 使用者可查看/取消自己的待執行提醒 | 🟡 中 |
| 5 | 支援**私訊 DM 直接下達** `>remind` 指令（不需 `@Lin`，完全隱密） | 🔴 高 |
| 6 | 未來可擴充為「週期性排程」（每日早安、每週週報）| 🟢 低 |

---

## 🏗️ 系統架構設計

### 設計理念：三層解耦架構

系統採「**解耦 (Decoupling)**」設計，將提醒流程分為三個獨立運作的層次，每一層都是獨立模組，可單獨測試與替換。

```
使用者輸入 @Lin >remind 明天早上八點 記得繳報告
        │
        ▼
 ╔══════════════════════════════════════════════════╗
 ║  第一層：接收與解析層 (Command + NLP Parser)      ║
 ║                                                  ║
 ║  commands/remind.js                              ║
 ║    ├─ 攔截 >remind 指令                          ║
 ║    ├─ 提取原始字串「明天早上八點 記得繳報告」      ║
 ║    └─ 呼叫 NLP 時間解析器                        ║
 ║                                                  ║
 ║  services/scheduler/timeParser.js                ║
 ║    ├─ 注入當前系統時間（UTC+8）                   ║
 ║    ├─ 透過 LLM（Ollama/Gemini）解析口語時間       ║
 ║    └─ 回傳標準 JSON { time, task }               ║
 ╚══════════════════════════════════════════════════╝
        │ 解析結果：Date 物件 + 任務內容
        ▼
 ╔══════════════════════════════════════════════════╗
 ║  第二層：排程與儲存層 (Scheduler + MongoDB)       ║
 ║                                                  ║
 ║  databases/mongodb.js  ← 🆕 獨立資料庫連線層     ║
 ║    └─ 集中管理 MongoDB 連線（單例模式）           ║
 ║                                                  ║
 ║  services/scheduler/schedulerManager.js          ║
 ║    ├─ 從 databases/ 取得 MongoDB 連線            ║
 ║    ├─ 初始化 Agenda 排程引擎                     ║
 ║    ├─ agenda.schedule(date, 'send_reminder', data)║
 ║    ├─ 任務資料寫入 MongoDB，狀態為「待執行」     ║
 ║    └─ 提供查詢/取消任務的 API                    ║
 ╚══════════════════════════════════════════════════╝
        │ 時間到達時，Agenda Worker 自動觸發
        ▼
 ╔══════════════════════════════════════════════════╗
 ║  第三層：執行層 (Job Worker) — 私訊提醒          ║
 ║                                                  ║
 ║  services/scheduler/jobDefinitions.js            ║
 ║    ├─ 定義 'send_reminder' 任務行為              ║
 ║    ├─ 從 job.attrs.data 提取使用者資訊           ║
 ║    ├─ 透過 user.send() 發送「私訊 DM」提醒      ║
 ║    ├─ DM 失敗時降級至頻道 Tag 提醒（容錯）      ║
 ║    └─ 使用女僕風格訊息模板                       ║
 ╚══════════════════════════════════════════════════╝
```

---

## 🧩 模組拆分與職責

系統共拆分為 **6 個模組**，各模組職責獨立、互不耦合。

### 模組總覽

| # | 模組名稱 | 檔案路徑 | 類型 | 職責 |
|---|----------|----------|------|------|
| M0 | **資料庫連線** | `databases/mongodb.js` | Infrastructure | 集中管理 MongoDB 連線（單例模式），供所有服務共用 |
| M1 | **指令入口** | `commands/remind.js` | Command | 接收 `>remind` 指令、解析參數、回覆確認訊息 |
| M2 | **NLP 時間解析器** | `services/scheduler/timeParser.js` | Service | 將口語時間透過 LLM 解析為標準 UTC 時間戳記 |
| M3 | **排程管理器** | `services/scheduler/schedulerManager.js` | Service | 封裝 Agenda 操作（排程/查詢/取消），透過 M0 取得連線 |
| M4 | **任務定義** | `services/scheduler/jobDefinitions.js` | Service | 定義排程任務的執行行為，透過 DM 私訊發送提醒 |
| M5 | **訊息模板** | `services/scheduler/reminderTemplates.js` | Utility | 女僕風格提醒訊息模板，與發送邏輯解耦 |

### 模組互動關係圖

```
                   使用者 Discord 訊息
                          │
                          ▼
               ┌─────────────────────┐
               │  commands.js (路由)  │ ← 既有指令路由器
               └──────────┬──────────┘
                          │ command === "remind"
                          ▼
              ┌───────────────────────┐
              │  M1: commands/remind  │ ← 指令入口
              │  (remind.js)          │
              └───┬───────────┬───────┘
                  │           │
          解析時間 │           │ 排程任務
                  ▼           ▼
    ┌──────────────────┐  ┌──────────────────────┐
    │  M2: timeParser   │  │  M3: schedulerManager │
    │  (NLP 時間解析)   │  │  (Agenda 排程引擎)    │
    └──────┬───────────┘  └──────┬───────────┬────┘
           │                     │           │
    呼叫 LLM│          取得連線   │     定義任務│
           ▼                     ▼           ▼
    ┌──────────────┐  ┌────────────────┐ ┌───────────────────┐
    │ LLM Service  │  │ M0: databases/ │ │ M4: jobDefinitions│
    │ (既有模組)    │  │  mongodb.js    │ │ (任務執行邏輯)     │
    │ llmRouter.js │  │  (連線單例)    │ └──────────┬────────┘
    └──────────────┘  └───────┬────────┘           │
                              │              發送 DM│私訊
                              ▼                    ▼
                       ┌──────────┐  ┌──────────────────────┐
                       │ MongoDB  │  │  M5: reminderTemplates│
                       └──────────┘  │  (訊息模板)           │
                                     └──────────┬───────────┘
                                                │
                                                ▼
                                     Discord 使用者私訊 (DM)
                                  （貼身女僕悄悄提醒主人 💌🦊）
```

### 模組依賴關係（誰呼叫誰？）

每個模組透過 `import` 引用其他模組。以下列出各模組「**用到了誰**」：

| 模組 | 它需要用到… | 說明 |
|------|------------|------|
| **M0** mongodb.js | 無（零依賴）| 最底層基礎設施，只被別人引用 |
| **M1** remind.js | M2、M3、M5 | 總指揮：叫 M2 解析時間 → 叫 M3 排程 → 叫 M5 組回覆訊息 |
| **M2** timeParser | 無（零依賴）| 純工具：丟口語字串進去，拿標準時間 JSON 出來 |
| **M3** schedulerManager | M0、M4 | 啟動時：跟 M0 要 DB 連線、載入 M4 的任務定義 |
| **M4** jobDefinitions | M5 | 時間到時：跟 M5 拿女僕風格訊息模板，發送 DM |
| **M5** templates | 無（零依賴）| 純工具：只負責產出訊息文字與 Embed |

### 依賴方向樹狀圖

```
M1 remind.js（指令入口 — 總指揮）
 │
 ├──→ M2 timeParser（解析口語時間）        ★ 獨立模組，不依賴任何人
 │
 ├──→ M3 schedulerManager（排程管理）
 │     │
 │     ├──→ M0 mongodb.js（取得 DB 連線）   ★ 獨立模組，不依賴任何人
 │     │
 │     └──→ M4 jobDefinitions（載入任務定義）
 │           │
 │           └──→ M5 templates（取得訊息模板）★ 獨立模組，不依賴任何人
 │
 └──→ M5 templates（組合確認回覆訊息）
```

> **設計重點**：
> - 依賴方向**永遠是單向往下**的，不會有 A 呼叫 B、B 又呼叫回 A 的循環
> - 標示 ★ 的模組**完全獨立**（零依賴），可以單獨拿出來測試或替換
> - 未來若要換掉 MongoDB，只需改 M0 一個檔案，其他模組完全不受影響

---

## 📁 檔案變更清單

### 🆕 新增檔案

| 檔案路徑 | 說明 |
|----------|------|
| `databases/mongodb.js` | MongoDB 連線管理器（單例模式），集中式資料庫連線 |
| `commands/remind.js` | `>remind` 指令主體，含子指令 `list` / `cancel` |
| `services/scheduler/timeParser.js` | NLP 時間解析器，呼叫 LLM 將口語轉 UTC |
| `services/scheduler/schedulerManager.js` | Agenda 排程引擎封裝，從 databases/ 取得連線 |
| `services/scheduler/jobDefinitions.js` | 排程任務行為定義（`send_reminder`，DM 私訊模式） |
| `services/scheduler/reminderTemplates.js` | 女僕風格提醒訊息模板 |

### 🔧 修改檔案

| 檔案 | 變更內容 |
|------|----------|
| `commands.js` | 新增 `remind` 的 import 與指令註冊 |
| `index.js` | 新增 Agenda 初始化啟動邏輯（在 `client.once('ready')` 中） |
| `.env` | 新增 `MONGODB_URI` 連線字串 |
| `commands/help.js` | 將 `>remind` 指令加入 help 說明 |

---

## 🧩 核心模組詳細說明

### 1. `commands/remind.js`（M1：指令入口）

指令入口，負責解析使用者輸入、調度時間解析與排程註冊，並回覆確認訊息。

**支援的使用方式：**

| 使用方式 | 輸入 | 行為 |
|----------|------|------|
| **伺服器頻道** | `@Lin >remind 明天早上八點 記得繳報告` | 設定一次性提醒 |
| **伺服器頻道** | `@Lin >remind list` | 查看自己所有待執行的提醒 |
| **伺服器頻道** | `@Lin >remind cancel <編號>` | 取消指定編號的提醒 |
| **🔒 私訊 DM** | `>remind 明天早上八點 記得繳報告` | 隱密設定提醒（不需 `@Lin`） |
| **🔒 私訊 DM** | `>remind list` | 隱密查看提醒 |
| **🔒 私訊 DM** | `>remind cancel <編號>` | 隱密取消提醒 |

> 💡 **私訊模式**：使用者可以直接私訊 Lin 機器人，不需要 `@Lin` 前綴，
> 只要以 `>remind` 開頭即可。適合不想讓伺服器成員知道提醒安排的場景。

```js
import { parseTimeWithLLM } from "../services/scheduler/timeParser.js";
import {
    scheduleReminder,
    getUserReminders,
    cancelReminder
} from "../services/scheduler/schedulerManager.js";
import {
    formatConfirmMessage,
    formatReminderListEmbed,
    formatCancelMessage,
    formatErrorMessage
} from "../services/scheduler/reminderTemplates.js";


/**
 * >remind 指令主體
 * @param {import('discord.js').Message} msg - Discord 訊息物件
 * @param {string[]} args - 指令參數陣列
 */
export async function remind(msg, args) {
    await msg.channel.sendTyping();

    // ═══════════════════════════════════════════
    // 無參數 → 提示用法
    // ═══════════════════════════════════════════
    if (args.length === 0) {
        await msg.reply(
            "請告訴 Lin 要提醒什麼喔！🦊\n" +
            "用法：`>remind <時間> <事項>`\n" +
            "範例：`>remind 明天早上八點 記得繳報告`\n" +
            "其他：`>remind list`（查看提醒）、`>remind cancel <編號>`（取消提醒）"
        );
        return;
    }

    // ═══════════════════════════════════════════
    // 子指令：list（查看待執行提醒）
    // ═══════════════════════════════════════════
    if (args[0] === "list") {
        try {
            const reminders = await getUserReminders(msg.author.id);
            const embed = formatReminderListEmbed(reminders, msg.author.username);
            await msg.reply({ embeds: [embed] });
        } catch (error) {
            console.error("❌ 查詢提醒錯誤：", error.message);
            await msg.reply(formatErrorMessage("查詢提醒時發生錯誤"));
        }
        return;
    }

    // ═══════════════════════════════════════════
    // 子指令：cancel <編號>（取消指定提醒）
    // ═══════════════════════════════════════════
    if (args[0] === "cancel") {
        const index = parseInt(args[1]);
        if (isNaN(index) || index < 1) {
            await msg.reply("請輸入正確的提醒編號喔！用法：`>remind cancel 1`");
            return;
        }

        try {
            const result = await cancelReminder(msg.author.id, index);
            await msg.reply(formatCancelMessage(result));
        } catch (error) {
            console.error("❌ 取消提醒錯誤：", error.message);
            await msg.reply(formatErrorMessage("取消提醒時發生錯誤"));
        }
        return;
    }

    // ═══════════════════════════════════════════
    // 主要功能：解析時間 → 排程提醒
    // ═══════════════════════════════════════════
    const rawInput = args.join(" "); // 將所有參數合併為原始字串

    try {
        // Step 1：呼叫 LLM 解析時間
        const parsed = await parseTimeWithLLM(rawInput);

        if (!parsed || !parsed.time || !parsed.task) {
            await msg.reply(formatErrorMessage("Lin 無法理解這個時間描述，請換個方式說說看？"));
            return;
        }

        // Step 2：驗證解析出的時間是否為未來時間
        const scheduledDate = new Date(parsed.time);
        if (isNaN(scheduledDate.getTime())) {
            await msg.reply(formatErrorMessage("LLM 回傳了無效的時間格式，請重試一次"));
            return;
        }
        if (scheduledDate <= new Date()) {
            await msg.reply(formatErrorMessage("這個時間已經過去了呢～請設定一個未來的時間吧！"));
            return;
        }

        // Step 3：將任務送入 Agenda 排程
        const jobData = {
            userId:    msg.author.id,
            channelId: msg.channel.id,
            content:   parsed.task,
            createdAt: new Date().toISOString(),
        };

        await scheduleReminder(scheduledDate, jobData);

        // Step 4：回覆確認訊息
        await msg.reply(formatConfirmMessage(parsed.task, scheduledDate));

    } catch (error) {
        console.error("❌ 排程提醒錯誤：", error.message);
        await msg.reply(formatErrorMessage("設定提醒時發生了一點問題，請稍後再試"));
    }
}
```

---

### 2. `services/scheduler/timeParser.js`（M2：NLP 時間解析器）

**核心職責**：將使用者的口語化時間描述，透過 LLM 轉換為標準的 ISO 8601 UTC 時間戳記。

**設計要點**：
- 透過 System Prompt 將 LLM 轉化為「專屬時間解析微服務」
- 注入當前系統時間（UTC+8 台灣時間）作為參考基準
- 嚴格要求 LLM 僅回傳 JSON，避免額外文字干擾
- **直接呼叫 Ollama API**（而非透過 llmRouter），因為時間解析需要獨立的 System Prompt，與角色扮演的對話 Prompt 完全不同

```js
import { Ollama } from "ollama";

const ollama = new Ollama({ host: process.env.OLLAMA_URL });

// 時間解析專用的 System Prompt
const TIME_PARSER_PROMPT = `你是一個精確的時間解析器，你的唯一任務是將使用者的口語化時間描述轉換為標準時間格式。

規則：
1. 參考「當前時間」來計算目標時間
2. 所有時間一律轉換為 UTC 標準時間（注意：當前時間為 UTC+8，請正確計算時差）
3. 從使用者輸入中分離「時間描述」與「提醒事項」
4. 僅回傳 JSON，不要包含任何額外文字、說明或 markdown 格式
5. JSON 格式：{"time": "YYYY-MM-DDTHH:mm:ss.000Z", "task": "提醒事項"}

範例：
- 輸入：「三小時後 吃藥」 → {"time": "2026-04-07T01:00:00.000Z", "task": "吃藥"}
- 輸入：「明天早上八點 記得繳報告」 → {"time": "2026-04-07T00:00:00.000Z", "task": "記得繳報告"}
- 輸入：「下週一晚上九點 開會」 → {"time": "2026-04-13T13:00:00.000Z", "task": "開會"}`;


/**
 * 取得當前台灣時間的格式化字串（UTC+8）
 * @returns {string} 例如 "2026-04-06T22:30:00+08:00 (星期一)"
 */
function getCurrentTaiwanTime() {
    const now = new Date();
    const taiwanTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const dayNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    const dayName = dayNames[taiwanTime.getUTCDay()];
    return `${taiwanTime.toISOString().replace("Z", "+08:00")} (${dayName})`;
}


/**
 * 使用 LLM 將口語化時間描述解析為標準 UTC 時間
 *
 * @param {string} rawInput - 使用者原始輸入（例如「明天早上八點 記得繳報告」）
 * @returns {Promise<{time: string, task: string} | null>} 解析結果，或 null 表示解析失敗
 */
export async function parseTimeWithLLM(rawInput) {
    const currentTime = getCurrentTaiwanTime();

    const userMessage = `當前時間：${currentTime}\n使用者輸入：「${rawInput}」`;

    try {
        const response = await ollama.chat({
            model: process.env.OLLAMA_MODEL,
            messages: [
                { role: "system", content: TIME_PARSER_PROMPT },
                { role: "user",   content: userMessage },
            ],
            stream: false,
            format: "json",       // 強制 Ollama 回傳 JSON 格式
            temperature: 0.1,     // 低溫度 → 精確穩定的結果
        });

        const text = response.message.content.trim();

        // 嘗試解析 JSON（容錯：移除可能的 markdown code block 標記）
        const cleanText = text
            .replace(/^```json?\s*/i, "")
            .replace(/\s*```$/,        "")
            .trim();

        const parsed = JSON.parse(cleanText);

        // 驗證必要欄位
        if (!parsed.time || !parsed.task) {
            console.error("❌ LLM 回傳的 JSON 缺少必要欄位：", parsed);
            return null;
        }

        return parsed;

    } catch (error) {
        console.error("❌ 時間解析失敗：", error.message);
        return null;
    }
}
```

> ⚠️ **設計決策：為何不走 `llmRouter.js`？**
>
> `llmRouter.js` 是為「角色對話」設計的，它會自動注入 Lin 的九尾狐女僕人設 System Prompt。
> 但時間解析需要**完全不同的 System Prompt**（精準的 JSON 格式解析器），
> 兩者的場景截然不同，因此 `timeParser.js` 直接建立獨立的 Ollama 連線。
>
> 若未來需要支援 Gemini 做時間解析，可以在此模組內部加入切換邏輯，
> 或者在 `llmRouter.js` 新增一個 `askLLMRaw(systemPrompt, userMessage)` 通用介面。

---

### 新增模組：`databases/mongodb.js`（M0：資料庫連線層）

**核心職責**：集中管理 MongoDB 連線，以**單例模式 (Singleton)** 確保全域只有一個連線實例。
未來若其他服務也需要 MongoDB（如對話日誌、使用者偏好設定），都從這裡取得連線。

> 💡 **為何獨立成 `databases/` 資料夾？**
>
> 將資料庫連線從業務邏輯中解耦，形成三層架構：
> `commands/`（指令層）→ `services/`（業務層）→ `databases/`（資料層）
> 每一層只關心自己的職責，互不干涉。

```js
import { MongoClient } from "mongodb";


// ═══════════════════════════════════════════
// MongoDB 連線單例
// ═══════════════════════════════════════════
let client = null;
let db = null;


/**
 * 取得 MongoDB 連線（單例模式）
 * 若尚未連線則自動建立，已連線則直接回傳
 *
 * @param {string} [dbName="lin-bot"] - 資料庫名稱
 * @returns {Promise<{client: MongoClient, db: import('mongodb').Db}>}
 */
export async function getMongoConnection(dbName = "lin-bot") {
    if (client && db) {
        return { client, db };
    }

    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";

    try {
        client = new MongoClient(uri);
        await client.connect();
        db = client.db(dbName);

        console.log(`✅ MongoDB 已連線：${uri} / ${dbName}`);
        return { client, db };

    } catch (error) {
        console.error("❌ MongoDB 連線失敗：", error.message);
        throw error;
    }
}


/**
 * 關閉 MongoDB 連線（優雅關機時呼叫）
 */
export async function closeMongoConnection() {
    if (client) {
        await client.close();
        client = null;
        db = null;
        console.log("✅ MongoDB 連線已關閉");
    }
}
```

---

### 3. `services/scheduler/schedulerManager.js`（M3：排程管理器）

**核心職責**：封裝 Agenda 的所有操作，對外提供簡潔的排程/查詢/取消 API。
這是整個系統的「心臟」，負責管理 Agenda 生命週期。**MongoDB 連線由 `databases/mongodb.js` 統一提供**。

```js
import { Agenda } from "agenda";
import { MongoBackend } from "@agendajs/mongo-backend";
import { getMongoConnection, closeMongoConnection } from "../../databases/mongodb.js";
import { defineAllJobs } from "./jobDefinitions.js";


// ═══════════════════════════════════════════
// Agenda 單例（全域唯一）
// ═══════════════════════════════════════════
let agenda = null;


/**
 * 初始化 Agenda 排程器
 * 應在 Discord client.once('ready') 中呼叫
 *
 * @param {import('discord.js').Client} client - Discord Client 實例，供 Job Worker 使用
 */
export async function initScheduler(client) {
    try {
        // 從集中式資料庫連線層取得 MongoDB 連線
        const { db } = await getMongoConnection("lin-bot");

        agenda = new Agenda({
            backend: new MongoBackend({ db }),
            defaultConcurrency: 5,       // 同時最多處理 5 個任務
            maxConcurrency: 20,          // 全域最大並行數
            processEvery: "30 seconds",  // 每 30 秒輪詢一次 MongoDB
        });

        // 載入所有任務定義（傳入 Discord client 供發送訊息用）
        defineAllJobs(agenda, client);

        // 啟動排程器
        await agenda.start();
        console.log("✅ Agenda 排程器已啟動");

        // 優雅關機處理
        const gracefulShutdown = async () => {
            console.log("⏳ 正在停止排程系統...");
            await agenda.stop();
            await closeMongoConnection();
            console.log("✅ Agenda 與 MongoDB 已安全停止");
            process.exit(0);
        };

        process.on("SIGTERM", gracefulShutdown);
        process.on("SIGINT",  gracefulShutdown);

    } catch (error) {
        console.error("❌ Agenda 初始化失敗：", error.message);
        throw error;
    }
}


/**
 * 排程一個新提醒任務
 *
 * @param {Date}   scheduledDate - 預定執行時間（UTC）
 * @param {Object} data          - 任務附帶資料
 * @param {string} data.userId    - 使用者 Discord ID
 * @param {string} data.channelId - 頻道 ID
 * @param {string} data.content   - 提醒內容
 * @param {string} data.createdAt - 建立時間
 */
export async function scheduleReminder(scheduledDate, data) {
    if (!agenda) throw new Error("排程器尚未初始化");

    await agenda.schedule(scheduledDate, "send_reminder", data);
    console.log(`📅 已排程提醒：${data.content} → ${scheduledDate.toISOString()}`);
}


/**
 * 查詢指定使用者的所有待執行提醒
 *
 * @param {string} userId - 使用者 Discord ID
 * @returns {Promise<Array>} 待執行的提醒列表
 */
export async function getUserReminders(userId) {
    if (!agenda) throw new Error("排程器尚未初始化");

    const jobs = await agenda.jobs({
        name: "send_reminder",
        "data.userId": userId,
        nextRunAt: { $ne: null },    // 尚未執行的任務
    });

    return jobs.map((job, index) => ({
        index: index + 1,
        content:     job.attrs.data.content,
        scheduledAt: job.attrs.nextRunAt,
        createdAt:   job.attrs.data.createdAt,
        jobId:       job.attrs._id,
    }));
}


/**
 * 取消指定使用者的某個提醒（依序號）
 *
 * @param {string} userId - 使用者 Discord ID
 * @param {number} index  - 提醒序號（從 1 開始）
 * @returns {Promise<{success: boolean, message: string, content?: string}>}
 */
export async function cancelReminder(userId, index) {
    if (!agenda) throw new Error("排程器尚未初始化");

    const reminders = await getUserReminders(userId);

    if (index < 1 || index > reminders.length) {
        return {
            success: false,
            message: `找不到編號 ${index} 的提醒。您目前有 ${reminders.length} 個待執行提醒。`,
        };
    }

    const target = reminders[index - 1];
    await agenda.cancel({ _id: target.jobId });

    return {
        success: true,
        message: `已取消提醒「${target.content}」`,
        content: target.content,
    };
}
```

---

### 4. `services/scheduler/jobDefinitions.js`（M4：任務定義）

**核心職責**：定義所有排程任務的「執行行為」（Callback）。未來新增排程類型時，只需在此檔案新增 `agenda.define()`。

> 💌 **私訊提醒設計**：提醒透過 `user.send()` 以 DM 私訊方式發送，
> 如同 Lin 悄悄走到主人身邊低聲提醒，更具「貼身女僕」的親密感。
> 若使用者關閉了 DM 權限，則降級至原始頻道 Tag 提醒（容錯處理）。

```js
import { buildReminderMessage, buildReminderEmbed } from "./reminderTemplates.js";


/**
 * 註冊所有排程任務定義
 * 透過閉包（Closure）捕獲 Discord client 實例
 *
 * @param {import('agenda').Agenda} agenda  - Agenda 實例
 * @param {import('discord.js').Client} client - Discord Client 實例
 */
export function defineAllJobs(agenda, client) {

    // ═══════════════════════════════════════════
    // 任務：send_reminder（一次性私訊提醒）
    // ═══════════════════════════════════════════
    agenda.define("send_reminder", async (job) => {
        const { userId, channelId, content } = job.attrs.data;

        console.log(`🔔 正在執行提醒任務：${content}（目標使用者：${userId}）`);

        try {
            // 透過 Discord Client 取得目標使用者
            const user = await client.users.fetch(userId);

            // 組合女僕風格提醒訊息（Embed 格式，更精緻）
            const embed = buildReminderEmbed(content);

            // ═══════════════════════════════════════════
            // 優先透過 DM 私訊發送（貼身女僕模式 💌）
            // ═══════════════════════════════════════════
            try {
                await user.send({ embeds: [embed] });
                console.log(`✅ 私訊提醒已發送：${content} → ${user.tag}`);

            } catch (dmError) {
                // ═══════════════════════════════════════════
                // DM 失敗（使用者可能關閉了私訊權限）
                // 降級至原始頻道 Tag 提醒（容錯處理）
                // ═══════════════════════════════════════════
                console.warn(`⚠️ 無法私訊使用者 ${user.tag}，降級至頻道提醒`);

                const channel = await client.channels.fetch(channelId);
                if (channel) {
                    const fallbackMsg = buildReminderMessage(userId, content);
                    await channel.send(fallbackMsg);
                    console.log(`✅ 頻道提醒已發送（降級模式）：${content}`);
                } else {
                    console.error(`❌ 找不到頻道 ${channelId}，提醒發送完全失敗`);
                }
            }

        } catch (error) {
            console.error(`❌ 發送提醒失敗：`, error.message);
        }
    });

    // ═══════════════════════════════════════════
    // 以下為未來擴充預留區
    // ═══════════════════════════════════════════

    // 範例：每日早安問候（Phase 2）
    // agenda.define("daily_greeting", async (job) => { ... });

    // 範例：每週伺服器活躍度週報（Phase 2）
    // agenda.define("weekly_report", async (job) => { ... });
}
```

---

### 5. `services/scheduler/reminderTemplates.js`（M5：訊息模板）

**核心職責**：集中管理所有與提醒相關的 Discord 訊息格式，確保風格統一且易於維護。

```js
import { EmbedBuilder } from "discord.js";


// ═══════════════════════════════════════════
// 隨機女僕風格提醒語句（私訊 DM 用，更親密的語氣）
// ═══════════════════════════════════════════
const REMINDER_LINES = [
    "(輕輕推開書房的門) 主人，您交代的事情時間到囉～🦊",
    "(搖了搖九條尾巴靠近主人) 嗯…主人，Lin 悄悄來提醒您了～",
    "(優雅地行禮後低聲說) 主人，這是您設定的提醒呢～",
    "(用尾巴輕輕碰了碰主人的手) 主人…時間到了喔…🦊",
    "(踮起腳尖走到主人身邊) 主人主人～Lin 來叫您了！✨",
    "(從門縫探出頭來) 主人…Lin 有事要提醒您呢～ (臉紅)",
];


/**
 * 建構女僕風格的 Embed 提醒訊息（私訊 DM 用，精緻版）
 *
 * @param {string} content - 提醒內容
 * @returns {EmbedBuilder} Embed 物件
 */
export function buildReminderEmbed(content) {
    const line = REMINDER_LINES[Math.floor(Math.random() * REMINDER_LINES.length)];

    return new EmbedBuilder()
        .setTitle("🔔 叮～主人的提醒時間到了")
        .setDescription(`${line}\n\n📌 **提醒事項**：${content}`)
        .setColor(0xFF69B4)  // 粉色，符合女僕私訊的親密感
        .setTimestamp()
        .setFooter({ text: "Lin 的貼身提醒服務 💌🦊" });
}


/**
 * 建構頻道降級提醒訊息（DM 失敗時的備用方案）
 *
 * @param {string} userId  - 使用者 Discord ID
 * @param {string} content - 提醒內容
 * @returns {string} 完整的提醒訊息字串
 */
export function buildReminderMessage(userId, content) {
    return `<@${userId}> 主人！Lin 想私訊提醒您但被擋住了…😿\n所以在這裡提醒您～\n\n📌 **提醒事項**：${content}`;
}


/**
 * 格式化排程確認訊息（使用者設定提醒後的即時回覆）
 *
 * @param {string} task          - 提醒事項
 * @param {Date}   scheduledDate - 排定時間（UTC）
 * @returns {string} 確認訊息
 */
export function formatConfirmMessage(task, scheduledDate) {
    // 轉換為台灣時間顯示（UTC+8）
    const taiwanTime = new Date(scheduledDate.getTime() + (8 * 60 * 60 * 1000));
    const formatted = taiwanTime.toLocaleString("zh-TW", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
        hour12: false,
    });

    return (
        `✅ (拿出小本本認真記下) Lin 記住了！🦊\n\n` +
        `📌 **提醒事項**：${task}\n` +
        `⏰ **預定時間**：${formatted}\n` +
        `📨 **提醒方式**：私訊 (DM)\n\n` +
        `Lin 會悄悄私訊提醒主人的，請放心～ 💌✨`
    );
}


/**
 * 格式化提醒列表為 Discord Embed
 *
 * @param {Array}  reminders - 待執行提醒列表
 * @param {string} username  - 使用者名稱
 * @returns {EmbedBuilder} Embed 物件
 */
export function formatReminderListEmbed(reminders, username) {
    const embed = new EmbedBuilder()
        .setTitle(`📋 ${username} 的待執行提醒`)
        .setColor(0xE67E22)
        .setTimestamp()
        .setFooter({ text: "Lin 的備忘錄 🦊📝" });

    if (reminders.length === 0) {
        embed.setDescription("目前沒有待執行的提醒喔～主人很自律呢！🦊✨");
        return embed;
    }

    embed.setDescription(`共有 **${reminders.length}** 個待執行提醒：`);

    for (const r of reminders) {
        // 轉換為台灣時間顯示
        const taiwanTime = new Date(new Date(r.scheduledAt).getTime() + (8 * 60 * 60 * 1000));
        const formatted = taiwanTime.toLocaleString("zh-TW", {
            month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit",
            hour12: false,
        });

        embed.addFields({
            name: `#${r.index} ⏰ ${formatted}`,
            value: `📌 ${r.content}`,
            inline: false,
        });
    }

    embed.addFields({
        name: "\u200B",
        value: "💡 取消提醒請使用：`>remind cancel <編號>`",
    });

    return embed;
}


/**
 * 格式化取消提醒的回覆訊息
 *
 * @param {Object} result - cancelReminder 的回傳結果
 * @returns {string}
 */
export function formatCancelMessage(result) {
    if (result.success) {
        return `✅ (劃掉備忘錄上的項目) 已取消提醒「${result.content}」囉！🦊`;
    }
    return `❌ ${result.message}`;
}


/**
 * 統一的錯誤訊息格式
 *
 * @param {string} detail - 錯誤細節
 * @returns {string}
 */
export function formatErrorMessage(detail) {
    return `❌ (困惑地歪頭) ${detail} 🦊`;
}
```

---

## 🔧 既有檔案修改

### `index.js` — 新增 Agenda 初始化

```diff
 import "dotenv/config";
 import { gotMessage } from "./commands.js";
+import { initScheduler } from "./services/scheduler/schedulerManager.js";


 /* API 的連線規格與監聽行為 */
 import { Client, GatewayIntentBits, Partials } from 'discord.js';
 // ... (client 設定不變)


 // 確認機器人已上線
-client.once('ready', () => {
+client.once('ready', async () => {
     console.log("Beep beep");
     console.log(`✅ 機器人 ${client.user.username} 已上線！`);
+
+    // 初始化排程系統（Agenda + MongoDB）
+    try {
+        await initScheduler(client);
+        console.log("✅ 排程提醒系統已就緒");
+    } catch (error) {
+        console.error("❌ 排程系統初始化失敗：", error.message);
+    }
 });
```

### `commands.js` — 註冊 remind 指令 ＆ 新增 DM 私訊路由

> 🔑 **核心變更**：`gotMessage()` 新增 DM 私訊判斷路由。
> 當訊息來自 DM 頻道且以 `>remind` 開頭時，直接轉發至 remind 指令，
> **不需要 `@Lin` 前綴**，也不受 `CHANNELID` 限制。
> 僅開放 `remind` 指令，其他指令在 DM 中不可使用（安全考量）。

```diff
 import { gif } from "./commands/gif.js";
 import { Lin } from "./commands/Lin.js";
 import { restart } from "./commands/restart.js";
 import { chat } from "./commands/chat.js";
 import { help } from "./commands/help.js";
 import { userInfo } from "./commands/userInfo.js";
 import { switchLLM } from "./commands/switchLLM.js";
 import { weather } from "./commands/weather.js";
+import { remind } from "./commands/remind.js";


 const commands = {
     Lin,
     gif,
     restart,
     help,
     userInfo,
     switchLLM,
     weather,
+    remind,
 }

+// ═══════════════════════════════════════════
+// 私訊 DM 中允許使用的指令（白名單）
+// 不想讓人在伺服器看到的隱密指令可以放這裡
+// ═══════════════════════════════════════════
+const dmAllowedCommands = {
+    remind,
+};
+

 export async function gotMessage(msg) {

     // 排除機器人自己的訊息，防止無限循環
     if (msg.author.bot) return;

     // 表示有收到訊息
     console.log(`收到訊息: ${msg.content}`);

+    // ═══════════════════════════════════════════
+    // 私訊 DM 路由（隱密模式 🔒）
+    // 使用者可直接私訊 Lin 下達指令，不需 @Lin
+    // 目前僅開放 >remind 系列指令
+    // ═══════════════════════════════════════════
+    if (!msg.guild) {
+        const content = msg.content.trim();
+        if (content.charAt(0) === ">") {
+            const tokens = content.split(" ");
+            const command = tokens.shift().substring(1); // 去掉 ">"
+
+            if (dmAllowedCommands[command]) {
+                try {
+                    await dmAllowedCommands[command](msg, tokens);
+                } catch (error) {
+                    console.error("❌ DM 指令錯誤：", error.message);
+                    await msg.reply("處理指令時發生了錯誤 😿");
+                }
+            } else {
+                await msg.reply(
+                    "Lin 的私訊目前只支援提醒指令喔～🦊\n" +
+                    "用法：`>remind <時間> <事項>`\n" +
+                    "想使用其他指令請到伺服器頻道使用 `@Lin` 呢！"
+                );
+            }
+        } else {
+            await msg.reply(
+                "(探出頭) 主人想私下設定提醒嗎？🦊\n" +
+                "請使用 `>remind <時間> <事項>` 指令喔！\n" +
+                "例如：`>remind 明天早上八點 記得繳報告`"
+            );
+        }
+        return;
+    }

     // 讀取標註機器人的訊息
     const botMention = new RegExp(`^<@!?${msg.client.user.id}>`);
```

### `.env` — 新增 MongoDB 連線字串

```diff
 # 中央氣象署 Open Data API
 CWA_API_KEY=CWA-2E355ADC-0478-4AE3-B0BF-A2C03B1F3EF9
+
+# MongoDB 連線字串（databases/mongodb.js 統一管理）
+MONGODB_URI=mongodb://localhost:27017
```

> 💡 **注意**：不再在 URI 中指定資料庫名稱，由 `databases/mongodb.js` 的 `getMongoConnection(dbName)` 參數決定。
> 這樣未來不同服務可以使用不同的資料庫名稱，而共用同一個連線。

---

## 📦 新增依賴

```bash
npm install agenda @agendajs/mongo-backend
```

| 套件 | 版本 | 說明 |
|------|------|------|
| `agenda` | ^6.x (ESM) | 輕量級任務排程引擎，基於 MongoDB |
| `@agendajs/mongo-backend` | ^6.x | Agenda v6 的 MongoDB 後端適配器 |
| `mongodb` | — | 由 `@agendajs/mongo-backend` 自動安裝為 peer dependency |

> ⚠️ **前置條件**：開發機或伺服器必須先安裝並啟動 MongoDB 服務。
>
> - **Windows 本機開發**：可安裝 [MongoDB Community Edition](https://www.mongodb.com/try/download/community) 或使用 Docker：`docker run -d -p 27017:27017 --name mongo mongo:7`
> - **正式部署**：建議使用 [MongoDB Atlas](https://www.mongodb.com/atlas) 雲端免費方案（512MB 足夠使用）

---

## ⏰ 時區處理策略

| 階段 | 時區 | 說明 |
|------|------|------|
| 使用者輸入 | UTC+8（台灣） | 口語描述的時間皆以台灣時區為基準 |
| LLM 解析 | UTC+8 → UTC | System Prompt 中明確告知當前時間為 UTC+8，要求回傳 UTC |
| MongoDB 儲存 | UTC | Agenda 內部一律使用 UTC 時間戳記 |
| Agenda 觸發 | UTC | Worker 根據 UTC 時間判斷何時觸發任務 |
| 使用者顯示 | UTC → UTC+8 | 確認訊息與列表顯示時，轉回台灣時間給使用者閱讀 |

> 💡 **核心原則**：「**內部全 UTC，顯示才轉 +8**」，徹底避免時區混亂。

---

## 📐 目錄結構預覽（變更後）

```
LinBot/
├── commands/
│   ├── remind.js              ← 🆕 排程提醒指令
│   ├── chat.js
│   ├── gif.js
│   ├── help.js                ← 🔧 新增 remind 說明
│   ├── Lin.js
│   ├── restart.js
│   ├── switchLLM.js
│   ├── userInfo.js
│   └── weather.js
│
├── databases/                 ← 🆕 資料庫連線層
│   └── mongodb.js                 ← MongoDB 連線管理器（單例模式）
│
├── services/
│   ├── scheduler/             ← 🆕 排程服務模組
│   │   ├── schedulerManager.js    ← Agenda 引擎封裝（使用 databases/）
│   │   ├── jobDefinitions.js      ← 任務行為定義（DM 私訊模式）
│   │   ├── timeParser.js          ← NLP 時間解析器
│   │   └── reminderTemplates.js   ← 訊息模板
│   │
│   ├── LLM/
│   │   ├── llmRouter.js
│   │   ├── ollama.js
│   │   ├── gemini.js
│   │   └── systemPrompt.js
│   │
│   └── weather/
│       ├── weatherRouter.js
│       ├── weatherFormatter.js
│       └── providers/
│           └── taiwanProvider.js
│
├── implements/
│   ├── remind_scheduler_plan.md   ← 📄 本文件
│   ├── weather_command_plan.md
│   └── ...
│
├── commands.js                ← 🔧 註冊 remind 指令
├── index.js                   ← 🔧 新增 Agenda 初始化
├── .env                       ← 🔧 新增 MONGODB_URI
└── package.json
```

> 💡 **三層式架構**：`commands/`（指令層）→ `services/`（業務邏輯層）→ `databases/`（資料存取層）

---

## ✅ 實作進度追蹤

### 階段一：環境建置

- [ ] **Step 1**：安裝並啟動 MongoDB 服務（本機或 Atlas）
- [ ] **Step 2**：`npm install agenda @agendajs/mongo-backend mongodb`
- [ ] **Step 3**：`.env` 新增 `MONGODB_URI` 設定

### 階段二：核心模組實作

- [ ] **Step 4**：建立 `databases/mongodb.js`（M0：資料庫連線層）
- [ ] **Step 5**：建立 `services/scheduler/reminderTemplates.js`（M5：訊息模板）
- [ ] **Step 6**：建立 `services/scheduler/jobDefinitions.js`（M4：任務定義）
- [ ] **Step 7**：建立 `services/scheduler/schedulerManager.js`（M3：排程管理器）
- [ ] **Step 8**：建立 `services/scheduler/timeParser.js`（M2：NLP 時間解析器）
- [ ] **Step 9**：建立 `commands/remind.js`（M1：指令入口）

### 階段三：整合與註冊

- [ ] **Step 10**：修改 `index.js`（新增 Agenda 初始化）
- [ ] **Step 11**：修改 `commands.js`（註冊 remind 指令）
- [ ] **Step 12**：修改 `commands/help.js`（新增 remind 指令說明）

### 階段四：測試與部署

- [ ] **Step 13**：實機測試（見下方驗證計畫）
- [ ] **Step 14**：PM2 部署上線

---

## 🧪 驗證計畫

### 前置條件

1. MongoDB 已啟動並可連線
2. `.env` 已設定 `MONGODB_URI`
3. Ollama 已啟動並可連線（時間解析用）
4. 機器人已啟動並連線 Discord

### 測試步驟

**伺服器頻道測試：**

| # | 測試情境 | 預期結果 |
|---|----------|----------|
| 1 | `@Lin >remind` | 提示用法說明 |
| 2 | `@Lin >remind 三分鐘後 測試提醒` | 回覆確認訊息（顯示 DM 提醒），3 分鐘後**收到私訊 DM** |
| 3 | `@Lin >remind 明天早上八點 記得繳報告` | 回覆確認訊息，顯示正確的台灣時間 |
| 4 | `@Lin >remind 下週一晚上九點 開會` | 正確計算到下週一 21:00 UTC+8 |
| 5 | `@Lin >remind list` | 顯示所有待執行提醒的 Embed 列表 |
| 6 | `@Lin >remind cancel 1` | 成功取消第一個提醒 |
| 7 | `@Lin >remind cancel 999` | 回覆「找不到該編號」錯誤 |
| 8 | `@Lin >remind 昨天 做某事` | 回覆「時間已經過去」錯誤 |
| 9 | 關閉 DM 權限後設定提醒 | DM 失敗 → 自動降級至頻道 Tag 提醒 |
| 10 | 重啟機器人後 | Agenda 自動恢復並補發未過期的任務（仍透過 DM） |
| 11 | MongoDB 斷線時 | console 輸出錯誤訊息，不影響其他機器人功能 |

**🔒 私訊 DM 測試：**

| # | 測試情境 | 預期結果 |
|---|----------|----------|
| 12 | 直接私訊 `>remind 三分鐘後 測試` | 私訊內回覆確認訊息，3 分鐘後私訊提醒 |
| 13 | 直接私訊 `>remind list` | 私訊內回覆 Embed 提醒列表 |
| 14 | 直接私訊 `>remind cancel 1` | 私訊內取消成功 |
| 15 | 直接私訊 `>weather 台北` | 回覆「私訊僅支援 remind」提示 |
| 16 | 直接私訊 `你好` (非指令) | 回覆「請使用 >remind 指令」提示 |
| 17 | 直接私訊 `>remind`（無參數）| 私訊內提示用法說明 |

### 重啟持久性測試

1. 設定一個 5 分鐘後的提醒
2. 在 2 分鐘後重啟機器人
3. 確認機器人重新上線後，剩餘 3 分鐘到期時仍正確**私訊 DM 提醒**

---

## 🔮 未來擴充規劃

### Phase 2：週期性排程

使用 Agenda 的 `every()` API 輕鬆擴充：

```js
// 每天早上 08:00 UTC+8 (00:00 UTC) 發送早安
await agenda.every("0 0 * * *", "daily_greeting", { channelId: "..." });

// 每週日 20:00 UTC+8 (12:00 UTC) 發送週報
await agenda.every("0 12 * * 0", "weekly_report", { channelId: "..." });
```

只需在 `jobDefinitions.js` 新增對應的 `agenda.define()`，無需修改任何其他模組。

### Phase 3：進階功能

- 📝 提醒事項編輯（修改時間/內容）
- 🔁 重複提醒（每天/每週/每月）
- 📊 提醒統計（完成率、最常提醒的類別等）
- 🔄 提醒模式切換（可選 DM 私訊 / 頻道提醒）
- 📂 `databases/` 擴充：對話日誌、使用者偏好設定等共用同一 MongoDB 連線
