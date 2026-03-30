# 🧠 LinBot × Gemini 雲端 LLM 整合計畫書

> 作成日期：2026-03-30  
> 目標：整合 Google Gemini 雲端 LLM，並建立路由機制讓 Lin 可在本地 Ollama 與雲端 Gemini 之間即時切換。

---

## 📋 專案背景

LinBot 已透過 `ollama_ai_integration_plan.md` 成功整合本地端 Ollama 模型（qwen3.5:4b），使 Lin 具備 AI 對話能力。

**新目標**：新增 Google Gemini 雲端 LLM 作為第二個 AI 引擎，並透過 LLM 路由器 (Router) 讓主人可在 Discord 中即時切換。

### 動機
- Ollama（本地端）：隱私性高、無延遲上限、但需要 GPU 硬體資源
- Gemini（雲端）：模型品質更高、免費額度充足、但需要網路連線

---

## 🏗️ 架構設計

```
使用者 @Lin 說 "你好！"
        │
        ▼
  commands.js（gotMessage）
        │ 不是 > 開頭的指令
        ▼
  commands/chat.js
        │ 呼叫 askLLM()
        ▼
  services/llmRouter.js  ← 路由中樞
        │
        ├── currentProvider === "ollama"
        │       → services/ollama.js → 本地 Ollama API
        │
        └── currentProvider === "gemini"
                → services/gemini.js → Google Gemini API
```

### 切換流程

```
@Lin >switchLLM gemini   →  llmRouter 切換至 gemini
@Lin >switchLLM ollama   →  llmRouter 切換至 ollama
@Lin >switchLLM          →  顯示目前使用中的 provider
```

---

## 📁 檔案變更清單

### 🆕 新增檔案

| 檔案 | 說明 |
|------|------|
| `services/gemini.js` | Gemini API 封裝，使用 `@google/genai` SDK |
| `services/llmRouter.js` | LLM 路由管理器，統一 `askLLM()` 介面 |
| `commands/switchLLM.js` | `>switchLLM` 指令，即時切換 LLM 提供者 |

### 🔧 修改檔案

| 檔案 | 變更內容 |
|------|----------|
| `commands/chat.js` | 改用 `askLLM()`（from llmRouter）取代原本的 `askOllama()` |
| `commands.js` | 新增 `switchLLM` 的 import 與指令註冊 |
| `.env` | 新增 `GEMINI_API_KEY`、`GEMINI_MODEL`、`LLM_PROVIDER` |
| `package.json` | 新增依賴 `@google/genai` |

---

## 🧩 核心模組說明

### `services/gemini.js`

```js
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function askGemini(channelID, userMessage) {
    // 1. 管理 conversationHistory（Map，以頻道 ID 為 key）
    // 2. 建構 contents 陣列（包含歷史對話）
    // 3. 呼叫 ai.models.generateContent() 並傳入 systemInstruction
    // 4. 儲存回覆至記憶，超過 MAX_HISTORY 則裁切
    // 5. 回傳 response.text
}

export function clearGeminiHistory(channelId) { ... }
```

**與 Ollama 的差異**：
| 項目 | Ollama | Gemini |
|------|--------|--------|
| SDK | `ollama` npm package | `@google/genai` |
| 歷史格式 | `{ role, content }` | `{ role, parts: [{ text }] }` |
| 角色名稱 | `assistant` | `model` |
| System Prompt | 放入 messages 陣列 | 使用 `config.systemInstruction` |

---

### `services/llmRouter.js`

```js
let currentProvider = process.env.LLM_PROVIDER || "ollama";

const providers = {
    ollama: askOllama,
    gemini: askGemini,
};

export async function askLLM(channelID, userMessage) { ... }
export function switchProvider(providerName) { ... }
export function getCurrentProvider() { ... }
```

---

### `commands/switchLLM.js`

```
用法：
  @Lin >switchLLM           → 查詢目前 provider
  @Lin >switchLLM gemini    → 切換至 Gemini
  @Lin >switchLLM ollama    → 切換至 Ollama

權限：僅限主人（MYUSERID）使用
```

---

## 🔧 `.env` 新增設定

```env
# Google Gemini 設定
GEMINI_API_KEY=你的_API_Key
GEMINI_MODEL=gemini-2.5-flash

# 預設 LLM 提供者 (ollama / gemini)
LLM_PROVIDER=ollama
```

---

## 📦 新增依賴

```bash
npm install @google/genai
```

| 套件 | 版本 | 用途 |
|------|------|------|
| `@google/genai` | latest | Google Gemini AI SDK |

---

## ✅ 實作進度追蹤

- [x] **Step 1**：安裝 `@google/genai` SDK
- [x] **Step 2**：建立 `services/gemini.js`（Gemini API 封裝）
- [x] **Step 3**：建立 `services/llmRouter.js`（LLM 路由管理器）
- [x] **Step 4**：建立 `commands/switchLLM.js`（切換指令）
- [x] **Step 5**：修改 `commands/chat.js`（改用 llmRouter）
- [x] **Step 6**：修改 `commands.js`（註冊 switchLLM 指令）
- [x] **Step 7**：更新 `.env`（新增 Gemini & LLM_PROVIDER 設定）
- [ ] **Step 8**：實機測試

---

## 🧪 驗證計畫

### 前置條件
1. `.env` 已設定 `GEMINI_API_KEY`
2. 本機 Ollama 服務已啟動（測試 Ollama 模式時需要）

### 測試步驟

| # | 測試情境 | 預期結果 |
|---|----------|----------|
| 1 | `@Lin 你好！`（預設 Ollama） | Lin 透過 Ollama 回覆 |
| 2 | `@Lin >switchLLM` | 顯示「目前使用的大腦是：ollama」 |
| 3 | `@Lin >switchLLM gemini` | 回覆「已切換至 gemini 模式」 |
| 4 | `@Lin 自我介紹一下` | Lin 透過 Gemini 回覆 |
| 5 | `@Lin >switchLLM ollama` | 回覆「已切換至 ollama 模式」 |
| 6 | `@Lin 你剛才說什麼？` | 使用 Ollama 回覆（各 provider 記憶獨立） |
| 7 | 非主人使用 `>switchLLM` | 被拒絕，回覆權限不足訊息 |
| 8 | 使用無效 provider 名稱 | 回覆錯誤訊息，列出可用選項 |

---

## 🔮 未來擴充

- 支援更多 LLM（如 Claude、ChatGPT）只需在 `llmRouter.js` 新增 provider
- `>clearHistory` 指令清除當前 provider 的對話記憶
- 各 provider 使用不同的 System Prompt 微調
- 細化切換指令至「頻道級別」（不同頻道可用不同 provider）
