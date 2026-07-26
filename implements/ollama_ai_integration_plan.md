# 🤖 LinBot × Ollama AI 整合計畫書

> 作成日期：2026-03-02  
> 目標：透過本機 Ollama 引入 qwen3:8b 模型，讓 Lin 能像人類一樣進行自然對話。

---

## 📋 專案背景

目前 LinBot（Lin）已具備以下能力：
- 接收特定頻道中標注（@mention）機器人的訊息
- 執行指令（`!Lin`、`!gif`、`!restart`）

**目標**：當使用者標注 Lin 並輸入一般對話文字（非 `!` 開頭的指令）時，Lin 會透過本機 Ollama 的 `qwen3:8b` 模型，產生自然、有個性的回覆。

---

## 🏗️ 架構設計

```
使用者 @Lin 說 "你好！今天天氣如何？"
        │
        ▼
  commands.js（gotMessage）
        │ 不是 ! 開頭的指令
        ▼
  commands/chat.js（新增）
        │ 呼叫 Ollama API
        ▼
  services/ollama.js（新增）
        │ POST http://localhost:11434/api/chat
        ▼
  qwen3:8b 模型回應
        │
        ▼
  Lin 在頻道回覆訊息
```

---

## 📁 檔案變更清單

### ✅ 現有檔案（不動）

| 檔案 | 說明 |
|------|------|
| `index.js` | 主入口，不需修改 |
| `commands/gif.js` | GIF 搜尋指令，不需修改 |
| `commands/restart.js` | 重啟指令，不需修改 |

---

### 🔧 修改檔案

#### `commands.js`
- **修改**：原先只處理 `>` 開頭的指令，現追加 `else` 分支：非指令文字一律送到新的 `chat()` 函式處理。

```diff
// 正式辨識指令並執行
try {
    if (command.charAt(0) === ">") {
        command = command.substring(1);
        commands[command](msg, tokens);
+   } else {
+       // 非指令內容 → 交給 AI 進行對話
+       const fullText = msg.content; // 已去除 @mention
+       await chat(msg, fullText);
    }
} catch (error) {
    console.error("❌ 發生錯誤了：", error.message);
}
```

- **新增 import**：
```js
import { chat } from "./commands/chat.js";
```

---

#### `commands/Lin.js`（可選優化）
- 目前 `>Lin` 指令仍保留固定問候，維持不變。
- 未來可考慮讓 `>Lin` 也走 AI 對話。

---

### 🆕 新增檔案

#### `services/LLM/ollama.js`
封裝與 Ollama API 的溝通邏輯，引入官方 `ollama` SDK，支援對話與單次完成 API。

```js
// services/LLM/ollama.js
import { Ollama } from "ollama";
import { SYSTEM_PROMPT } from "./systemPrompt.js";

const ollama = new Ollama({ host: process.env.OLLAMA_URL });

// 對話記憶（依頻道 ID 儲存，最多保留 N 輪）
const conversationHistory = new Map();
const MAX_HISTORY = 10; // 最多保留 10 輪對話

export async function askOllama(channelId, userMessage) {
    if (!conversationHistory.has(channelId)) {
        conversationHistory.set(channelId, []);
    }
    const history = conversationHistory.get(channelId);

    history.push({ role: "user", content: userMessage });

    const systemPrompt = {
        role: "system",
        content: SYSTEM_PROMPT
    };

    try {
        const response = await ollama.chat({
            model: process.env.OLLAMA_MODEL,
            messages: [systemPrompt, ...history],
            stream: false,
            temperature: 0.8
        });

        const reply = response.message.content;
        history.push({ role: "assistant", content: reply });

        if (history.length > MAX_HISTORY * 2) {
            history.splice(0, 2);
        }

        return reply;
    } catch (error) {
        console.error("❌ Ollama 發生錯誤：", error.message);
        return "抱歉，我的大腦暫時當機了...請稍後再試 😵";
    }
}

export async function completeOllama(systemPrompt, userMessage, options = {}) {
    // 無狀態的單次呼叫，支援 options.jsonMode (強制 format 為 json)
    const response = await ollama.chat({
        model: process.env.OLLAMA_MODEL,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
        ],
        stream: false,
        temperature: options.temperature ?? 0.8,
        ...(options.jsonMode ? { format: "json" } : undefined),
    });

    return response.message.content.trim();
}

export function clearHistory(channelId) {
    conversationHistory.delete(channelId);
}
```

---

#### `commands/chat.js`
新增 `chat` 指令，作為 AI 對話的入口（改走 `askLLM` 路由，而非直接呼叫 `askOllama`）。

```js
// commands/chat.js
import { askLLM } from "../services/LLM/llmRouter.js";

export async function chat(msg, userText) {
    await msg.channel.sendTyping();

    try {
        const reply = await askLLM(msg.channel.id, userText);
        await msg.reply(reply);
    } catch (error) {
        console.error("❌ LLM Router 發生錯誤：", error.message);
        await msg.reply("抱歉，我的大腦暫時當機了...請稍後再試 😵");
    }
}
```

---

### 🔧 `.env` 新增設定

```env
# Ollama 設定（可選，有預設值）
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:8b
```

---

## 🧠 對話記憶機制

| 項目 | 說明 |
|------|------|
| **記憶範圍** | 以 Discord **頻道 ID** 為單位，各頻道各自記憶 |
| **記憶上限** | 最多保留 `MAX_HISTORY = 10` 輪對話（可調整） |
| **記憶重置** | 目前以 process 重啟為界；未來可加 `!clear` 指令 |

---

## 📦 相依套件

目前 `package.json` 已包含 `node-fetch`，但專案使用 ES Module（`"type": "module"`），故 `fetch` 已為原生支援（Node.js 18+）。

**無需額外安裝套件**，但請確認：
- Node.js 版本 ≥ 18（原生支援 `fetch`）
- Ollama 已在本機安裝並執行 `qwen3:8b` 模型

---

## ✅ 實作進度追蹤

- [x] **Step 1**：建立 `services/ollama.js`（Ollama API 封裝）
- [x] **Step 2**：建立 `commands/chat.js`（AI 對話指令）
- [x] **Step 3**：修改 `commands.js`（加入非指令 → AI 對話的分支）
- [x] **Step 4**：更新 `.env`（新增 Ollama 相關設定）
- [ ] **Step 5**：本機測試（啟動 Ollama + 啟動 LinBot + 實際對話測試）

---

## 🧪 驗證計畫

### 前置條件
1. 本機已安裝 Ollama：`ollama --version`
2. 已拉取模型：`ollama pull qwen3:8b`
3. Ollama 服務已啟動：`ollama serve`（或背景執行中）

### 測試步驟

| # | 測試情境 | 預期結果 |
|---|----------|----------|
| 1 | 在指定頻道 `@Lin 你好！` | Lin 用 AI 回覆自然對話 |
| 2 | 連續對話 `@Lin 你剛才說什麼？` | Lin 依記憶回答前一輪內容 |
| 3 | `@Lin !gif 貓咪` | 仍然正常執行 gif 指令（指令系統不受影響） |
| 4 | `@Lin !Lin` | 仍然正常回覆固定問候語 |
| 5 | `@Lin !restart`（限管理員） | 仍然正常重啟 |
| 6 | 關閉 Ollama 後 `@Lin 測試` | Lin 回覆友善的錯誤訊息，不崩潰 |

### 啟動指令
```bash
# 在 LinBot 目錄下
node index.js
```

---

## 🔮 未來擴充（Optional）

- `!clear` 指令：清除對話記憶
- 支援私訊（DM）對話
- 對話記憶持久化（寫入 JSON 或 SQLite）
- 支援多模型切換（`!model gpt / qwen`）
