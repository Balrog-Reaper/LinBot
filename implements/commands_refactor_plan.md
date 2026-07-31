# 🛠️ 實作計畫：指令系統重構 — 中央註冊表與路由器架構

> **目標**：將原本散落在 `commands.js` 中的指令路由邏輯與各指令檔案中重複的權限檢查，
> 重構為「中央註冊表 + 中央路由器」的模組化架構，提升可維護性與擴充性。

---

## ✅ 目前狀態：已完成

---

## 🏗️ 架構設計

### 重構前（舊架構）
```
index.js → commands.js（手動 import 每個指令 + switch/case 路由）
                ├── Lin.js（各自檢查 ownerOnly）
                ├── gif.js（各自匯出函式）
                ├── chat.js（混在 commands/ 中）
                └── ...
```

### 重構後（新架構）
```
index.js → commandsRouter.js（中央路由器：前綴解析 + 全域權限檢查）
                ├── commandsRegistry.js（中央註冊表：動態掃描載入）
                │       ├── Lin.js        （標準配置物件）
                │       ├── gif.js        （標準配置物件）
                │       ├── help.js       （標準配置物件）
                │       ├── weather.js    （標準配置物件）
                │       ├── userInfo.js   （標準配置物件）
                │       ├── remind.js     （標準配置物件）
                │       ├── restart.js    （標準配置物件）
                │       └── switchLLM.js  （標準配置物件）
                └── services/LLM/chat.js（非指令對話，遷移至 services 層）
```

---

## 📋 變更清單

### 1. 標準化指令配置物件
所有指令模組統一匯出以下結構的配置物件：

```javascript
export const commandName = {
    name: "commandName",          // 指令名稱（與 > 後的文字比對）
    description: "指令說明文字",    // 用於 >help 動態顯示
    category: "public",           // 分類：public | moderator | owner
    dmAllowed: false,             // 是否允許在私訊中使用
    ownerOnly: false,             // 是否僅限機器人主人使用
    async execute(msg, args) {}   // 指令執行邏輯
};
```

受影響的檔案：
- [x] `commands/Lin.js` — category: `owner`, ownerOnly: `true`
- [x] `commands/gif.js` — category: `public`
- [x] `commands/help.js` — category: `public`, dmAllowed: `true`
- [x] `commands/weather.js` — category: `public`
- [x] `commands/userInfo.js` — category: `public`
- [x] `commands/remind.js` — category: `owner`, ownerOnly: `true`, dmAllowed: `true`
- [x] `commands/restart.js` — category: `owner`, ownerOnly: `true`
- [x] `commands/switchLLM.js` — category: `owner`, ownerOnly: `true`

---

### 2. 中央指令註冊表 (`commands/commandsRegistry.js`) — 新建
- 使用 `fs.readdirSync()` 掃描 `commands/` 目錄下所有 `.js` 檔案
- 使用 `import()` 動態載入每個模組
- 透過 `Object.entries(module)` 檢查匯出值是否符合標準配置結構
- 自動排除輔助檔案（`commandsRouter.js`、`commandsRegistry.js`）
- 匯出 `loadCommands()` 與 `getCommands()` 供其他模組使用

---

### 3. 中央指令路由器 (`commands/commandsRouter.js`) — 新建
取代原本的 `commands.js`，集中處理：
- `>` 前綴解析與指令名稱比對
- 全域 `ownerOnly` 權限攔截（不再需要各指令自行檢查）
- 全域 `dmAllowed` 私訊權限攔截
- 非指令訊息自動路由至 `services/LLM/chat.js`

---

### 4. 舊檔案清理
- [x] 刪除 `commands.js`（根目錄的舊路由）— 功能已被 `commandsRouter.js` 取代
- [x] 刪除 `commands/chat.js` — 已遷移至 `services/LLM/chat.js`

---

### 5. 入口檔案更新 (`index.js`)
- 回呼函式從 `gotMessage` 更名為 `handleMessage`（語義更清晰）
- 啟動時呼叫 `loadCommands()` 初始化註冊表
- `import` 路徑從 `commands.js` 改為 `commands/commandsRouter.js`

---

### 6. Docker 設定修正 (`docker-compose.yml`)
- 在 `bot` 服務下新增 `dns: [8.8.8.8, 1.1.1.1]` 設定
- 修正 Docker Desktop for Windows (WSL2) 容器無法解析外部域名的問題（`ENOTFOUND discord.com`）

---

## 🔑 ESM 注意事項

在 Node.js ES Modules (`"type": "module"`) 環境中：
- `__filename` 與 `__dirname` 全域變數不存在，需使用以下方式重建：
  ```javascript
  import { fileURLToPath } from "url";
  import path from "path";
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  ```
- `import()` 動態匯入回傳的是 Module Namespace Object，需用 `Object.entries()` 遍歷其匯出內容
