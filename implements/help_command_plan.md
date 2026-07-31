# 🛠️ 實作計畫：`>help` 指令與多功能查詢系統

> **目標**：實作一個 `>help` 指令。
> 透過動態讀取 `commandsRegistry` 中所有已註冊的指令 metadata，
> 依據 `category` 自動分類並產生多頁面互動式幫助選單（Embed + Button）。

---

## ✅ 目前狀態：已完成

---

## 📅 開發步驟分解

### Step 1: 標準化指令配置物件 (前置作業) ✅
將所有指令模組從「匯出函式」改為「匯出標準配置物件」，每個指令統一遵循以下結構：
```javascript
export const commandName = {
    name: "commandName",
    description: "指令說明",
    category: "public" | "moderator" | "owner",
    dmAllowed: true | false,
    ownerOnly: true | false,
    async execute(msg, args) { /* ... */ }
};
```
- [x] 編輯 `commands/Lin.js` → 匯出標準配置物件
- [x] 編輯 `commands/restart.js` → 匯出標準配置物件
- [x] 編輯 `commands/gif.js` → 匯出標準配置物件
- [x] 編輯 `commands/switchLLM.js` → 匯出標準配置物件
- [x] 編輯 `commands/weather.js` → 匯出標準配置物件
- [x] 編輯 `commands/userInfo.js` → 匯出標準配置物件
- [x] 編輯 `commands/remind.js` → 匯出標準配置物件

---

### Step 2: 建立中央指令註冊表 (`commandsRegistry.js`) ✅
動態掃描 `commands/` 目錄，自動載入所有符合標準配置結構的指令模組，存入一個 `Map<name, config>` 中。
- [x] 建立 `commands/commandsRegistry.js`
- [x] 使用 `fs.readdirSync()` + `import()` 動態載入
- [x] 排除非指令的輔助檔案（`commandsRouter.js`、`commandsRegistry.js`）
- [x] 匯出 `getCommands()` 函式供其他模組取用

---

### Step 3: 建立中央指令路由器 (`commandsRouter.js`) ✅
統一處理指令前綴解析、權限驗證（`ownerOnly`、`dmAllowed`），取代原本散落在各指令中的重複檢查邏輯。
- [x] 建立 `commands/commandsRouter.js`
- [x] 集中處理 `>` 前綴解析與指令名稱比對
- [x] 全域 `ownerOnly` 權限攔截
- [x] 全域 `dmAllowed` 私訊權限攔截
- [x] 非指令訊息自動路由至 `chat.js` 進行 AI 對話

---

### Step 4: 建立核心指令檔案 (`commands/help.js`) ✅
動態從 `commandsRegistry` 讀取所有已註冊指令，依據 `category` 自動分組並產生多頁面互動式 Embed 選單。
- [x] 定義 `CATEGORY_CONFIG` 物件（每個分類的顏色、標題、按鈕樣式）
- [x] 定義 `CATEGORY_ORDER` 陣列（控制分類的顯示順序）
- [x] 自動分組指令至 `cmdsByCategory` 物件
- [x] 分類驗證機制：若指令的 `category` 未定義在 `CATEGORY_ORDER` 中，會在終端機與 Discord 頻道同時輸出除錯訊息
- [x] 建立首頁 Embed（總覽頁面）
- [x] 依序建立各分類 Embed（公開區 / 調和區 / 主人專屬）
- [x] 使用 `ActionRowBuilder` + `ButtonBuilder` + Spread Operator 動態產生按鈕列
- [x] 掛載 `MessageComponentCollector`（10 分鐘過期）
- [x] 按鈕點擊身份驗證（`ephemeral` 悄悄話攔截非授權使用者）
- [x] 收集器過期時自動移除按鈕（含 `.catch()` 防禦訊息已刪除的情況）

---

### Step 5: 獨立子系統 — `>userInfo` ✅
原本規劃在 `>help userData` 子指令中的使用者資訊查詢功能，已獨立為 `>userInfo @某人` 指令。
- [x] 建立 `commands/userInfo.js` 為獨立指令
- [x] 從 `help.js` 中移除子指令路由邏輯

---

## 🔑 關鍵設計決策

### 動態 vs 靜態
採用**動態掃描**方案：新增指令時只需在 `commands/` 目錄下建立符合標準結構的檔案，`>help` 選單會自動更新，無需手動維護指令清單。

### 分類驗證
在分組迴圈中加入防禦性檢查：若指令的 `category` 不在 `CATEGORY_ORDER` 的定義中，會同時在控制台與 Discord 頻道輸出精確的除錯訊息（指出哪個指令、使用了哪個未定義的分類），方便開發者快速定位問題。

### 收集器過期處理
- 使用 `time: 600000`（10 分鐘）作為收集器存活時間
- 過期後自動清除按鈕元件，保留 Embed 說明卡片
- `.catch()` 處理訊息已被手動刪除的情境（Discord Error Code `10008`）
