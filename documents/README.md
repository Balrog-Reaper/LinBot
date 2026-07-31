# 🦊 LinBot — Barlog Family Discord 機器人

> Lin，來自靈界的九尾靈狐女僕，專屬於 Barlog Family Discord 伺服器的智慧機器人。

---

## 📋 目錄

- [專案簡介](#-專案簡介)
- [功能特色](#-功能特色)
- [技術架構](#-技術架構)
- [專案結構](#-專案結構)
- [環境需求](#-環境需求)
- [安裝與設定](#-安裝與設定)
- [指令一覽](#-指令一覽)
- [AI 對話系統](#-ai-對話系統)
- [如何新增指令](#-如何新增指令)
- [常見問題](#-常見問題)

---

## 🌸 專案簡介

**LinBot** 是為 **Barlog Family Discord 伺服器** 量身打造的專屬機器人，角色設定為來自靈界的「九尾靈狐」女僕 **Lin**。她能執行多種指令、搜尋 GIF 圖片、查詢天氣與使用者資訊，並透過本地端 AI 模型 (Ollama) 或雲端 AI 模型 (Google Gemini) 與使用者進行角色扮演對話，且可即時切換。

---

## ✨ 功能特色

| 功能 | 說明 |
|------|------|
| 🤖 **AI 智慧對話** | 整合 Ollama 本地 LLM 及 Google Gemini 雲端 LLM，Lin 以靈狐女僕角色與主人互動對話 |
| 🎞️ **GIF 搜尋** | 透過 Klipy API 搜尋並傳送 GIF 動圖 |
| 🌤️ **天氣查詢** | 透過 WeatherAPI 查詢指定國家/城市的即時天氣狀況 |
| 📋 **互動式說明選單** | 多頁面 Embed + 按鈕切換的精美 Help 介面，動態從指令註冊表自動產生 |
| 📌 **使用者資訊查詢** | 查看伺服器成員的詳細資訊 (暱稱、ID、加入時間等) |
| ⏰ **排程提醒系統** | 基於 Agenda + MongoDB 的持久化排程提醒，支援口語時間解析 |
| 🔄 **遠端重啟** | 管理員可透過指令遠端重啟機器人 |
| 💬 **對話記憶** | AI 對話按頻道保留上下文，最多保留 10 輪 |
| 🧠 **LLM 即時切換** | 主人可隨時在 Ollama (本地端) 與 Gemini (雲端) 之間切換 |

---

## 🏗️ 技術架構

- **執行環境**：Node.js (ES Modules)
- **容器化**：Docker + Docker Compose
- **Discord API**：[discord.js](https://discord.js.org/) v14
- **AI 引擎**：[Ollama](https://ollama.com/) (本地端 LLM) / [Google Gemini](https://ai.google.dev/) (雲端 LLM)
- **GIF 來源**：[Klipy API](https://klipy.com/)
- **天氣資料**：[WeatherAPI](https://www.weatherapi.com/)
- **排程引擎**：[Agenda](https://github.com/agenda/agenda) + MongoDB
- **環境變數管理**：dotenv

### 運作流程

```
使用者在指定頻道 @Lin → index.js 監聽訊息
    → commandsRouter.js（中央路由器）
        → 以 ">" 開頭 → commandsRegistry.js 比對指令名稱
            → 全域權限檢查（ownerOnly / dmAllowed）
            → 執行對應指令模組的 execute()
        → 非指令內容 → services/LLM/chat.js → llmRouter.js 路由
            → currentProvider === "ollama" → ollama.js → 本地 Ollama API
            → currentProvider === "gemini" → gemini.js → Google Gemini API
```

---

## 📁 專案結構

```
LinBot/
├── index.js                    # 主程式進入點，建立 Discord Client、初始化指令註冊表與排程器
├── commands/                   # 指令模組目錄
│   ├── commandsRouter.js       # 中央指令路由器：前綴解析、全域權限檢查、非指令訊息轉發
│   ├── commandsRegistry.js     # 中央指令註冊表：動態掃描載入所有指令模組
│   ├── Lin.js                  # >Lin — 靈狐問候指令 (主人專屬)
│   ├── gif.js                  # >gif — GIF 搜尋指令
│   ├── help.js                 # >help — 互動式多頁面說明選單（動態產生）
│   ├── weather.js              # >weather — 天氣查詢指令
│   ├── userInfo.js             # >userInfo — 使用者資訊查詢
│   ├── remind.js               # >remind — 排程提醒指令 (主人專屬，含 list/cancel 子指令)
│   ├── restart.js              # >restart — 機器人重啟指令 (主人專屬)
│   └── switchLLM.js            # >switchLLM — 切換 LLM 提供者 (主人專屬)
├── databases/                  # 資料庫層
│   └── mongodb.js              # MongoDB 資料庫連線管理器（單例模式）
├── services/                   # 服務層
│   ├── systemPrompt.js         # 共用系統提示詞 (Lin 的角色設定)
│   ├── LLM/                    # AI 大腦模組
│   │   ├── chat.js             # AI 對話處理（非指令訊息，透過 LLM Router 路由）
│   │   ├── gemini.js           # Gemini AI 對話服務與單次生成 API
│   │   ├── ollama.js           # Ollama AI 對話服務與單次生成 API
│   │   └── llmRouter.js        # LLM 路由管理器 (切換與路由對話/生成)
│   └── scheduler/              # 排程提醒模組
│       ├── schedulerManager.js # Agenda 排程引擎封裝與 API
│       ├── timeParser.js       # NLP 口語時間解析器 (呼叫 LLM)
│       ├── jobDefinitions.js   # Agenda 任務行為定義 (發送 DM 私訊)
│       └── reminderTemplates.js # 女僕風格提醒訊息模板 (含時區格式化)
├── implements/                 # 功能實作規劃文件
├── documents/                  # 文件與說明書
├── docker-compose.yml          # Docker Compose 設定（bot + MongoDB）
├── Dockerfile                  # Docker 映像檔建置設定
├── .dockerignore               # Docker 建置排除規則
├── .env                        # 環境變數設定 (不納入版控)
├── .gitignore                  # Git 忽略規則
└── package.json                # 專案依賴與設定
```

---

## 🔧 環境需求

- **Node.js** v18 以上
- **Docker Desktop** (建議，用於容器化部署)
- **Ollama** 本地端 AI 服務 (需預先安裝並啟動)
- **Google Gemini API Key** (至 [Google AI Studio](https://aistudio.google.com/) 免費取得)
- **Discord Bot Token** (需至 [Discord Developer Portal](https://discord.com/developers/applications) 建立)
- **Klipy API Token** (用於 GIF 搜尋功能)
- **WeatherAPI Key** (用於天氣查詢功能)

---

## 🚀 安裝與設定

### 1. 複製專案

```bash
git clone <你的-repo-url>
cd LinBot
```

### 2. 設定環境變數

在專案根目錄建立 `.env` 檔案，填入以下內容：

```env
# Discord 機器人 Token
BOTTOKEN=你的_Discord_Bot_Token

# 指定機器人活動的頻道 ID
CHANNELID=你的_頻道_ID

# 機器人主人的 User ID (用於限制主人專屬指令)
MYUSERID=你的_User_ID

# Klipy GIF API Token
KLIPYTOKEN=你的_Klipy_API_Token

# WeatherAPI Key
WEATHERAPI_KEY=你的_WeatherAPI_Key

# Ollama 設定
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=你的_模型名稱

# Google Gemini 設定
GEMINI_API_KEY=你的_Gemini_API_Key
GEMINI_MODEL=gemini-2.5-flash

# 預設 LLM 提供者 (ollama / gemini)
LLM_PROVIDER=ollama

# MongoDB 設定
MONGODB_URI=mongodb://db:27017/lin-bot

# 系統時區 (例如 Asia/Taipei)
TIMEZONE=Asia/Taipei
```

### 3. 使用 Docker Compose 啟動（推薦）

```bash
# 建置映像檔並啟動容器
docker compose up -d --build

# 查看機器人運作日誌
docker compose logs -f bot
```

### 4. 或使用 Node.js 直接啟動

```bash
npm install
node index.js
```

看到以下訊息即代表成功上線：

```
Beep beep
✅ 機器人 Lin 已上線！
```

---

## 📖 指令一覽

所有指令需在**指定頻道**中先 **@Lin**，再輸入指令。
支援私訊的指令可直接在 DM 中輸入（不需標註 @Lin）。

### 🌸 公開指令 (所有成員可用)

| 指令 | 用法 | 說明 |
|------|------|------|
| `>gif` | `@Lin >gif [關鍵字]` | 搜尋並傳送 GIF 圖片。若未提供關鍵字，預設搜尋 "Barlog" |
| `>help` | `@Lin >help` | 開啟互動式多頁面說明選單，可透過按鈕切換分頁 |
| `>weather` | `@Lin >weather [國家] [城市]` | 查詢天氣狀況。例如：`>weather 台灣 高雄` |
| `>userInfo` | `@Lin >userInfo @某人` | 查詢被標註成員的伺服器資訊 |

### 🏮 主人專屬指令

| 指令 | 用法 | 說明 |
|------|------|------|
| `>Lin` | `@Lin >Lin` | Lin 會羞澀地回應主人的招喚 |
| `>restart` | `@Lin >restart` | 重新啟動機器人 |
| `>switchLLM` | `@Lin >switchLLM [ollama/gemini]` | 切換 AI 大腦，不加參數可查看目前狀態 |
| `>remind` | `@Lin >remind [口語時間] [事項]`<br>`@Lin >remind list`<br>`@Lin >remind cancel [編號]` | 排程提醒系統。時間到時會透過私訊 (DM) 悄悄提醒主人。支援私訊直接輸入指令（完全隱密） |

### 💬 AI 自由對話

在指定頻道中 `@Lin` 之後直接輸入任意文字 (不加 `>` 前綴)，Lin 會以九尾靈狐女僕的角色與你對話。

```
@Lin 今天天氣如何？
```

> 對話記憶按頻道獨立保存，每個頻道最多保留 **10 輪**對話上下文。

---

## 🧠 AI 對話系統

LinBot 的 AI 對話功能由 **Ollama** (本地端) 及 **Google Gemini** (雲端) 雙引擎提供，特色如下：

- **角色設定**：Lin 被設定為來自靈界的九尾靈狐，是主人的貼身女僕
- **語言風格**：使用繁體中文，語氣溫柔優雅，稱呼使用者為「主人」
- **動作描述**：會在括號內描述動作，如 *(搖了搖九條尾巴)*
- **記憶管理**：每個頻道獨立記憶，避免不同頻道對話互相干擾
- **模型彈性**：可在 `.env` 中自由切換 Ollama 模型或 Gemini 模型
- **雙引擎切換**：透過 `>switchLLM` 指令即時切換本地 Ollama 與雲端 Gemini

---

## 🔧 如何新增指令

得益於**中央指令註冊表**的設計，新增指令只需兩步：

### 1. 建立指令檔案

在 `commands/` 目錄下建立新的 `.js` 檔案（例如 `play.js`），匯出一個符合標準結構的配置物件：

```javascript
export const play = {
    name: "play",
    description: "播放音樂。",
    category: "public",       // 必須是 CATEGORY_ORDER 中已定義的分類
    dmAllowed: false,
    ownerOnly: false,

    async execute(msg, args) {
        // 你的指令邏輯...
        await msg.reply("🎵 開始播放！");
    }
};
```

### 2. 完成！

- 指令會在下次啟動時被 `commandsRegistry.js` **自動掃描並載入**
- `>help` 選單會**自動顯示**新指令的名稱與說明
- `commandsRouter.js` 會**自動處理**權限驗證（`ownerOnly`、`dmAllowed`）

> ⚠️ **注意**：如果使用了新的 `category`（例如 `"music"`），需要在 `help.js` 的 `CATEGORY_CONFIG` 和 `CATEGORY_ORDER` 中新增對應的分類設定，否則 `>help` 會顯示除錯警告。

---

## ❓ 常見問題

### Q: 機器人沒有回應我的訊息？

1. 確認你是在**指定頻道** (`CHANNELID`) 中發送訊息
2. 確認訊息開頭有 **@Lin** (標註機器人)
3. 確認指令格式正確 (指令需以 `>` 開頭)

### Q: Docker 容器啟動後機器人無法連線？

這是 Docker Desktop for Windows (WSL2) 的已知 DNS 問題。`docker-compose.yml` 中已配置 `dns: [8.8.8.8, 1.1.1.1]` 來解決此問題。如果問題持續，請嘗試：
```bash
docker compose down
docker compose up -d --build
```

### Q: AI 對話回應很慢？

Ollama 的回應速度取決於你的硬體規格與使用的模型大小。建議：
- 使用較小的模型 (如 7B 參數) 以加快速度
- 確保 GPU 加速已正確啟用

### Q: GIF 搜尋沒有結果？

確認 `.env` 中的 `KLIPYTOKEN` 設定正確，且 Klipy API 服務運作正常。

---

## 📦 依賴套件

| 套件 | 版本 | 用途 |
|------|------|------|
| `discord.js` | ^14.25.1 | Discord API 客戶端 |
| `dotenv` | ^17.3.1 | 環境變數管理 |
| `node-fetch` | ^3.3.2 | HTTP 請求工具 |
| `ollama` | ^0.6.3 | Ollama AI 客戶端 |
| `@google/genai` | ^1.47.0 | Google Gemini AI SDK |
| `agenda` | ^6.2.4 | 基於 MongoDB 的定時任務與非同步工作排程器 |
| `mongodb` | ^7.1.1 | MongoDB 官方資料庫驅動程式 |
| `@agendajs/mongo-backend` | ^4.0.1 | Agenda 的 MongoDB 後端儲存庫連線器 |

---

## 📄 授權

ISC License

---

> 🦊 *Lin 隨時乖乖聽主人的話～*
