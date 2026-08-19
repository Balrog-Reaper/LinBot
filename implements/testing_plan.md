# 🧪 LinBot × 自動化測試計畫書

> 作成日期：2026-08-13
> 目標：為已完成 TypeScript 遷移的 LinBot 建立自動化測試，運用 Vitest 針對核心模組進行單元測試，確保功能的正確性與未來重構的安全性。

---

## 📋 專案背景

LinBot 已從 JavaScript 完成遷移至 TypeScript，具備完整的型別定義與嚴格模式 (`strict: true`)。
專案目前具備以下核心功能模組，但尚未有任何自動化測試覆蓋：

| 功能模組 | 檔案路徑 | 說明 |
|----------|----------|------|
| 指令路由 | `src/commands/commandsRouter.ts` | 解析訊息、權限檢查、分派指令 |
| 指令註冊 | `src/commands/commandsRegistry.ts` | 動態載入所有指令模組 |
| 提醒排程 | `src/services/scheduler/schedulerManager.ts` | Agenda 排程管理器 |
| 時間解析 | `src/services/scheduler/timeParser.ts` | LLM 驅動的自然語言時間解析 |
| 訊息模板 | `src/services/scheduler/reminderTemplates.ts` | 提醒相關的 Discord Embed/文字模板 |
| LLM 路由 | `src/services/LLM/llmRouter.ts` | LLM 提供者切換與路由 |
| 天氣路由 | `src/services/weather/weatherRouter.ts` | 天氣查詢國家/城市路由 |
| 天氣格式 | `src/services/weather/weatherFormatter.ts` | 天氣資料 → Discord Embed 格式化 |
| DB 連線 | `src/databases/mongodb.ts` | MongoDB 連線單例管理 |

---

## 🎯 測試策略

### 分層測試原則

將測試分為三個層級，**由底層純邏輯開始，逐步向上延伸至帶有外部依賴的模組**：

```
┌────────────────────────────────────────────────┐
│ 第三層：整合測試（Integration Tests）           │ ← 最後實作
│ 排程管理器 + MongoDB 記憶體伺服器               │
│ 指令路由器 + Mock Discord Message               │
├────────────────────────────────────────────────┤
│ 第二層：帶 Mock 的單元測試                      │ ← 第二步
│ timeParser（Mock LLM 回應）                     │
│ llmRouter（Mock Provider 函式）                 │
├────────────────────────────────────────────────┤
│ 第一層：純邏輯單元測試（Zero Dependencies）     │ ← 優先實作
│ reminderTemplates、weatherRouter                │
│ weatherFormatter                                │
└────────────────────────────────────────────────┘
```

### 測試框架與工具

| 工具 | 版本 | 用途 |
|------|------|------|
| **Vitest** | ^3.2.0 | 測試框架（已安裝於 devDependencies） |
| **mongodb-memory-server** | ^10.0.0 | MongoDB 記憶體伺服器（已安裝於 devDependencies） |
| **vi.mock / vi.fn** | Vitest 內建 | 模擬外部依賴（LLM、Discord.js） |

> 💡 不需要額外安裝任何套件，`package.json` 中已具備所有必要的測試工具。

---

## 📁 檔案結構規劃

採用**混合策略**，依照測試性質決定放置位置：

- **單元測試**：就近放置在原始碼旁邊（`*.test.ts`），因為它們與單一模組高度綁定。
- **整合測試**：集中放置在專用的 `tests/` 資料夾，因為它們涉及多個模組的協作，不屬於任何單一模組。

```
src/
├── services/
│   ├── scheduler/
│   │   ├── reminderTemplates.ts
│   │   ├── reminderTemplates.test.ts    ← 單元測試：就近放置
│   │   ├── timeParser.ts
│   │   └── timeParser.test.ts           ← 單元測試：就近放置
│   ├── LLM/
│   │   ├── llmRouter.ts
│   │   └── llmRouter.test.ts            ← 單元測試：就近放置
│   └── weather/
│       ├── weatherRouter.ts
│       ├── weatherRouter.test.ts        ← 單元測試：就近放置
│       ├── weatherFormatter.ts
│       └── weatherFormatter.test.ts     ← 單元測試：就近放置
│
tests/                                   ← 整合測試：集中放置
├── integration/
│   ├── scheduler.integration.test.ts    ← 排程器 + MongoDB 協作測試
│   └── commandFlow.integration.test.ts  ← 指令路由 + 多模組流程測試
└── helpers/
    └── mockDiscordMessage.ts            ← 共用的 Mock 工具（模擬 Discord 訊息物件）
│
vitest.config.ts                         ← Vitest 設定檔（專案根目錄）
```

> 📝 **為什麼採用混合策略？**
>
> - `services/` 底下的子資料夾（scheduler、LLM、weather）檔案數量少，測試檔放旁邊很清爽。
> - `commands/` 目前有 11 個指令檔，未來還會持續增加。如果每個旁邊再放一個 `.test.ts`，資料夾會變得雜亂。指令相關的測試放到 `tests/` 更乾淨。
> - 整合測試涉及「排程器 + MongoDB」或「指令路由 + 多模組」等跨模組協作，本身就不屬於任何單一模組，集中管理更合理。

---

## 🆕 新增檔案

| 檔案路徑 | 類型 | 說明 |
|----------|------|------|
| `vitest.config.ts` | 設定 | Vitest 設定檔，定義測試環境與排除規則 |
| `src/services/scheduler/reminderTemplates.test.ts` | 單元 | 提醒訊息模板測試 |
| `src/services/scheduler/timeParser.test.ts` | 單元 | 時間解析器測試（Mock LLM） |
| `src/services/LLM/llmRouter.test.ts` | 單元 | LLM 路由器測試（Mock Provider） |
| `src/services/weather/weatherRouter.test.ts` | 單元 | 天氣路由邏輯測試 |
| `src/services/weather/weatherFormatter.test.ts` | 單元 | 天氣格式化測試 |
| `tests/helpers/mockDiscordMessage.ts` | 工具 | 共用的 Discord Message 模擬工具 |
| `tests/integration/scheduler.integration.test.ts` | 整合 | 排程管理器 + MongoDB 協作測試 |
| `tests/integration/commandFlow.integration.test.ts` | 整合 | 指令路由 + 權限檢查流程測試 |

## 🔧 修改檔案

| 檔案 | 變更內容 |
|------|----------|
| `tsconfig.json` | 將 `*.test.ts` 和 `tests/` 加入 `exclude`，避免測試檔被編譯進 `dist/` |

---

## 🧩 各模組測試詳細說明

### 第一層：純邏輯單元測試（無外部依賴）

這一層的模組是「純函式」，不依賴任何外部服務（不碰 Discord API、不碰 MongoDB、不碰 LLM），因此可以直接測試，不需要任何 Mock。

---

#### 1. `reminderTemplates.test.ts`

**測試目標**：驗證所有訊息模板函式都能正確產出預期格式的字串或 Embed 物件。

| # | 測試案例 | 驗證項目 |
|---|----------|----------|
| 1 | `buildReminderEmbed` 產出正確的 Embed | 標題、描述中包含提醒內容、顏色為粉色 `0xFF69B4` |
| 2 | `buildDmBlockedNotice` 包含使用者 Tag 與重試資訊 | 訊息中包含 `<@userId>`、重試次數 |
| 3 | `buildDmGiveUpNotice` 包含放棄通知 | 訊息中包含總重試次數與結束提示 |
| 4 | `formatConfirmMessage` 格式化確認訊息 | 包含提醒事項、時間格式正確 |
| 5 | `formatReminderListEmbed` 空列表 | Embed 描述為「沒有待執行的提醒」 |
| 6 | `formatReminderListEmbed` 多筆提醒 | Embed fields 數量正確、包含取消指令提示 |
| 7 | `formatCancelMessage` 成功取消 | 包含取消的提醒內容 |
| 8 | `formatCancelMessage` 取消失敗 | 包含錯誤訊息 |
| 9 | `formatErrorMessage` 錯誤格式 | 包含傳入的錯誤細節文字 |

```ts
// reminderTemplates.test.ts 範例
import { describe, it, expect } from "vitest";
import { buildReminderEmbed, formatErrorMessage } from "./reminderTemplates.js";

describe("reminderTemplates", () => {
    describe("buildReminderEmbed", () => {
        it("應產出包含提醒內容的 Embed", () => {
            const embed = buildReminderEmbed("記得繳報告");
            const json = embed.toJSON();

            expect(json.title).toBe("🔔 叮～主人的提醒時間到了");
            expect(json.description).toContain("記得繳報告");
            expect(json.color).toBe(0xFF69B4);
        });
    });

    describe("formatErrorMessage", () => {
        it("應包含傳入的錯誤細節", () => {
            const msg = formatErrorMessage("資料庫連線失敗");
            expect(msg).toContain("資料庫連線失敗");
            expect(msg).toContain("🦊");
        });
    });
});
```

---

#### 2. `weatherRouter.test.ts`

**測試目標**：驗證國家/城市名稱解析邏輯的正確性（不實際呼叫氣象 API）。

| # | 測試案例 | 驗證項目 |
|---|----------|----------|
| 1 | 輸入「台灣」能正確解析為 `taiwan` | 國家別名對照表正確運作 |
| 2 | 輸入「臺灣」能正確解析 | 支援繁體用字 |
| 3 | 輸入「tw」能正確解析 | 支援英文縮寫 |
| 4 | 輸入不支援的國家應拋出錯誤 | 錯誤訊息包含支援的國家列表 |
| 5 | 台灣城市「台北」→「臺北市」 | 城市別名正確對應 |
| 6 | 台灣城市「高雄」→「高雄市」 | 城市別名正確對應 |
| 7 | 台灣城市「馬祖」→「連江縣」 | 特殊別名正確對應 |
| 8 | 輸入不存在的城市應拋出錯誤 | 錯誤訊息包含提示文字 |

> ⚠️ **注意**：`queryWeather()` 函式本身會呼叫外部 API，因此需要 Mock 掉 `fetchTaiwanWeather` 和 `fetchTaiwanDetailWeather`，
> 只測試路由邏輯本身（國家解析、城市解析、Provider 分派）。

---

### 第二層：帶 Mock 的單元測試

這一層的模組依賴外部服務（LLM API），需要透過 Vitest 的 `vi.mock()` 來模擬這些依賴。

> 💡 **什麼是 Mock？**
>
> Mock 就是用一個**「假的替身函式」取代真正的外部服務**，讓測試能完全控制外部服務的回傳結果。
> 例如測試 `timeParser` 時，我們不會真的去呼叫 Gemini API（花錢、不穩定、太慢），
> 而是用 `vi.mock()` 建立一個假的 `completeLLM`，直接回傳我們預設好的假資料，
> 讓測試只聚焦在「timeParser 自己的解析邏輯」上。

---

#### 3. `timeParser.test.ts`

**測試目標**：驗證 `parseTimeWithLLM()` 能正確處理 LLM 回傳的各種情境。

**Mock 策略**：使用 `vi.mock("../LLM/llmRouter.js")` 模擬 `completeLLM` 函式，直接控制 LLM 的回傳結果。

| # | 測試案例 | Mock 回傳值 | 預期結果 |
|---|----------|-------------|----------|
| 1 | LLM 回傳正確 JSON | `{"time":"2026-08-14T00:00:00.000Z","task":"繳報告"}` | 回傳解析後的物件 |
| 2 | LLM 回傳缺少 `task` 欄位 | `{"time":"2026-08-14T00:00:00.000Z"}` | 回傳 `null` |
| 3 | LLM 回傳缺少 `time` 欄位 | `{"task":"繳報告"}` | 回傳 `null` |
| 4 | LLM 回傳非 JSON 文字 | `"我不知道你在說什麼"` | 回傳 `null`（JSON.parse 失敗） |
| 5 | LLM 服務拋出異常 | `throw new Error("API timeout")` | 回傳 `null`，console.error 被呼叫 |

```ts
// timeParser.test.ts 範例
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock LLM 路由器
vi.mock("../LLM/llmRouter.js", () => ({
    completeLLM: vi.fn(),
}));

import { parseTimeWithLLM } from "./timeParser.js";
import { completeLLM } from "../LLM/llmRouter.js";

const mockedCompleteLLM = vi.mocked(completeLLM);

describe("timeParser", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("LLM 回傳正確 JSON 時，應回傳解析結果", async () => {
        mockedCompleteLLM.mockResolvedValue(
            '{"time":"2026-08-14T00:00:00.000Z","task":"繳報告"}'
        );

        const result = await parseTimeWithLLM("明天早上八點 繳報告");

        expect(result).toEqual({
            time: "2026-08-14T00:00:00.000Z",
            task: "繳報告",
        });
    });

    it("LLM 服務拋出異常時，應回傳 null", async () => {
        mockedCompleteLLM.mockRejectedValue(new Error("API timeout"));

        const result = await parseTimeWithLLM("明天 吃飯");

        expect(result).toBeNull();
    });
});
```

---

#### 4. `llmRouter.test.ts`

**測試目標**：驗證 LLM 路由器的 Provider 切換與路由邏輯。

| # | 測試案例 | 驗證項目 |
|---|----------|----------|
| 1 | `switchProvider("gemini")` 切換成功 | 回傳 `success: true` |
| 2 | `switchProvider("GEMINI")` 大小寫不敏感 | 回傳 `success: true` |
| 3 | `switchProvider("不存在的")` 切換失敗 | 回傳 `success: false`，訊息包含可用選項 |
| 4 | `getCurrentProvider()` 回傳當前 provider | 與切換後的值一致 |

---

### 第三層：整合測試（集中放置於 `tests/`）

這一層測試會實際連接資料庫（使用記憶體版 MongoDB）或模擬完整的指令處理流程，驗證多個模組之間的協作是否正確。因為涉及跨模組協作，這些測試集中放在 `tests/integration/` 資料夾中。

---

#### 5. `scheduler.integration.test.ts`

**測試目標**：驗證排程管理器與 MongoDB 的完整互動流程。

**測試環境**：使用 `mongodb-memory-server`（已安裝）啟動一個輕量的記憶體內 MongoDB，測試完畢自動清除。

| # | 測試案例 | 驗證項目 |
|---|----------|----------|
| 1 | `initScheduler` 成功初始化 | 不拋出異常，Agenda 啟動 |
| 2 | `scheduleReminder` 建立任務 | 任務成功寫入 MongoDB |
| 3 | `getUserReminders` 查詢使用者提醒 | 回傳正確數量與內容 |
| 4 | `getUserReminders` 結果按時間排序 | 最近的提醒排在最前面 |
| 5 | `getUserReminders` 不同使用者資料隔離 | 使用者 A 看不到使用者 B 的提醒 |
| 6 | `cancelReminder` 成功取消 | 回傳 `success: true`，再查詢數量減少 |
| 7 | `cancelReminder` 超出範圍的編號 | 回傳 `success: false` |

```ts
// tests/integration/scheduler.integration.test.ts 範例
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";

describe("schedulerManager (Integration)", () => {
    let mongoServer: MongoMemoryServer;

    beforeAll(async () => {
        // 啟動記憶體版 MongoDB
        mongoServer = await MongoMemoryServer.create();
        process.env.MONGODB_URI = mongoServer.getUri();
        process.env.MONGODB_DB_NAME = "test-db";
        process.env.MONGODB_COLLECTION_REMINDER = "test-reminders";
    });

    afterAll(async () => {
        await mongoServer.stop();
    });

    it("排程並查詢提醒", async () => {
        // ... 測試邏輯
    });
});
```

---

#### 6. `commandFlow.integration.test.ts`

**測試目標**：驗證指令路由器的訊息解析、權限檢查中介層、指令分派的完整流程。

**Mock 策略**：使用 `tests/helpers/mockDiscordMessage.ts` 建立一個假的 Discord `Message` 物件，供所有整合測試共用。

| # | 測試案例 | 驗證項目 |
|---|----------|----------|
| 1 | 機器人自己的訊息應被忽略 | `msg.author.bot = true` → 不執行任何邏輯 |
| 2 | 無 @Lin 標註的訊息應被忽略 | 不觸發指令或對話 |
| 3 | `@Lin >help` 應觸發 help 指令 | 對應指令的 `execute` 被呼叫 |
| 4 | `@Lin >remind` 非主人使用應被拒絕 | 回覆權限不足訊息 |
| 5 | 不存在的指令應靜默處理 | 不回覆任何訊息 |
| 6 | 非指令內容 `@Lin 你好` 應交給 LLM | `chat()` 被呼叫 |

---

#### 7. `tests/helpers/mockDiscordMessage.ts`

**用途**：提供一個可重複使用的工廠函式，用來快速建立假的 Discord `Message` 物件，避免每個測試檔都要重複寫一大堆模擬程式碼。

```ts
// tests/helpers/mockDiscordMessage.ts 範例
import type { Message } from "discord.js";

interface MockMessageOptions {
    content: string;
    authorId?: string;
    isBot?: boolean;
    guildId?: string | null;   // null 代表私訊
}

export function createMockMessage(options: MockMessageOptions): Message {
    return {
        content: options.content,
        author: {
            id: options.authorId ?? "330543342196621322",
            bot: options.isBot ?? false,
            username: "TestUser",
        },
        guild: options.guildId !== null ? { id: options.guildId ?? "123456" } : null,
        client: { user: { id: "BOT_ID_123" } },
        channel: { sendTyping: vi.fn() },
        reply: vi.fn(),
    } as unknown as Message;
}
```

---

## ⚙️ Vitest 設定檔

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        // 使用 Node 環境（非瀏覽器）
        environment: "node",

        // 測試檔案匹配模式（同時涵蓋 src/ 就近放置 和 tests/ 集中放置）
        include: [
            "src/**/*.test.ts",
            "tests/**/*.test.ts",
        ],

        // 排除目錄
        exclude: ["node_modules", "dist"],

        // 全域超時時間（整合測試可能需要較長時間啟動 MongoDB）
        testTimeout: 30000,

        // 覆蓋率設定
        coverage: {
            provider: "v8",
            include: ["src/**/*.ts"],
            exclude: [
                "src/**/*.test.ts",
                "src/**/*.d.ts",
                "src/types/**",
            ],
        },
    },
});
```

---

## 📋 實作順序與優先級

| 優先級 | 階段 | 測試檔案 | 放置位置 | 複雜度 | 說明 |
|--------|------|----------|----------|--------|------|
| 🔴 P0 | 環境建置 | `vitest.config.ts` | 根目錄 | 低 | 建立設定檔，確認 `npm run test` 能跑 |
| 🔴 P0 | 第一層 | `reminderTemplates.test.ts` | `src/` 就近 | 低 | 純函式，最適合當第一個測試練手 |
| 🟡 P1 | 第一層 | `weatherRouter.test.ts` | `src/` 就近 | 低 | 純路由邏輯，測試城市/國家解析 |
| 🟡 P1 | 第一層 | `weatherFormatter.test.ts` | `src/` 就近 | 低 | 純格式化邏輯 |
| 🟡 P1 | 第二層 | `timeParser.test.ts` | `src/` 就近 | 中 | 需要 Mock LLM，學習 vi.mock 的好機會 |
| 🟡 P1 | 第二層 | `llmRouter.test.ts` | `src/` 就近 | 中 | 測試 Provider 切換邏輯 |
| 🟢 P2 | 第三層 | `commandFlow.integration.test.ts` | `tests/` 集中 | 中高 | 需要 Mock Discord Message 物件 |
| 🟢 P2 | 第三層 | `scheduler.integration.test.ts` | `tests/` 集中 | 高 | 需要 mongodb-memory-server |

---

## ✅ 驗證計畫

### 自動化驗證

```bash
# 執行所有測試
npm run test

# 監聽模式（開發時持續跑測試）
npm run test:watch

# 產出覆蓋率報告
npm run test:coverage
```

### 目標覆蓋率

| 模組分類 | 目標覆蓋率 | 說明 |
|----------|-----------|------|
| 純邏輯模組（templates、formatter、router） | **≥ 90%** | 無外部依賴，應高度覆蓋 |
| 帶 Mock 模組（timeParser、llmRouter） | **≥ 80%** | 主要邏輯路徑都需覆蓋 |
| 整合測試模組（scheduler、commandFlow） | **≥ 70%** | 覆蓋核心 CRUD 流程即可 |

---

## 🔮 未來擴充

| 項目 | 說明 |
|------|------|
| **CI/CD 整合** | 將 `npm run test` 加入 GitHub Actions，每次 Push 自動跑測試 |
| **Pre-commit Hook** | 使用 `husky` + `lint-staged`，提交前自動跑受影響的測試 |
| **E2E 測試** | 未來若需要，可在 Docker 內啟動完整的 Bot + MongoDB 進行端對端測試 |
| **指令資料夾分組** | 當指令數量超過 15 個時，將 `commands/` 按功能分組成子資料夾（core/fun/utility） |
