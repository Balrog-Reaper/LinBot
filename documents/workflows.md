# 🔄 LinBot 核心工作流 (Workflows)

為了讓後續接手的工程師能快速理解系統中各個模組是如何協同運作的，這裡整理了 LinBot 的幾項核心「工作流 (Workflows)」。在這些工作流中，你可以清楚看到不同模組是如何拼裝在一起完成一項具體功能的。

---

## 1. 🎯 指令解析與分發工作流 (Command Routing Flow)

當使用者在頻道中輸入指令（如 `@Lin >weather 台灣 高雄`）時，系統是如何解析並找到對應模組的：

```mermaid
sequenceDiagram
    participant User as 使用者
    participant Index as index.ts (事件監聽)
    participant Router as commandsRouter.ts
    participant Registry as commandsRegistry.ts
    participant Command as weather.ts (具體指令)

    User->>Index: 發送訊息 "@Lin >weather 台灣 高雄"
    Index->>Router: handleMessage(msg)
    Router->>Router: 移除 @Lin 標籤，解析出指令名稱 "weather"
    Router->>Registry: getCommands() 取得可用指令
    Registry-->>Router: 回傳指令 Map
    Router->>Router: 權限檢查 (伺服器限定、主人限定)
    Router->>Command: execute(msg, ["台灣", "高雄"])
    Command-->>User: 回覆天氣結果
```

**涉及模組**：
- `src/index.ts`
- `src/commands/commandsRouter.ts`
- `src/commands/commandsRegistry.ts`
- `src/commands/core/weather.ts` (或其他具體指令)

---

## 2. ⏰ 智慧排程提醒工作流 (Scheduler Flow)

當使用者輸入 `@Lin >remind 明天早上八點 記得吃藥` 時，自然語言如何變成系統排程，並在時間到時發送私訊：

```mermaid
sequenceDiagram
    participant User as 使用者
    participant Cmd as remind.ts (指令)
    participant TimeParser as timeParser.ts
    participant LLM as llmRouter.ts
    participant Scheduler as schedulerManager.ts
    participant Mongo as MongoDB
    participant Job as jobDefinitions.ts

    User->>Cmd: 輸入 ">remind 明天早上八點 吃藥"
    Cmd->>TimeParser: parseTimeWithLLM("明天早上八點 吃藥")
    TimeParser->>LLM: 請求解析時間 (強制 JSON 模式)
    LLM-->>TimeParser: 回傳 {"time": "2026-08-15T00:00:00Z", "task": "吃藥"}
    TimeParser-->>Cmd: 
    Cmd->>Scheduler: scheduleReminder(time, data)
    Scheduler->>Mongo: 將任務寫入 Agenda 資料庫
    Cmd-->>User: 回覆「已設定提醒」
    
    Note over Scheduler, Mongo: (等待直到 2026-08-15 08:00)
    
    Mongo->>Scheduler: 時間到，觸發 "send_reminder" 任務
    Scheduler->>Job: 執行任務回呼函式
    Job->>User: 發送 Discord 私訊 (DM) 提醒「吃藥」
```

**涉及模組**：
- `src/commands/core/remind.ts`
- `src/services/scheduler/timeParser.ts`
- `src/services/scheduler/schedulerManager.ts`
- `src/services/scheduler/jobDefinitions.ts`

---

## 3. 🧠 AI 雙引擎路由工作流 (LLM Router Flow)

當使用者進行一般對話（不加 `>` 前綴）時，系統如何管理記憶並切換 AI 引擎：

```mermaid
sequenceDiagram
    participant User as 使用者
    participant Router as commandsRouter.ts
    participant Chat as chat.ts (對話記憶層)
    participant LLMRouter as llmRouter.ts
    participant Provider as ollama.ts / gemini.ts
    participant API as 外部 AI API

    User->>Router: 輸入 "@Lin 你好呀"
    Router->>Chat: chat(msg, "你好呀")
    Chat->>Chat: 讀取該頻道的歷史對話 (最多 10 輪)
    Chat->>LLMRouter: askLLM(channelID, "你好呀")
    LLMRouter->>LLMRouter: 判斷 currentProvider
    LLMRouter->>Provider: 轉發至 askOllama 或 askGemini
    Provider->>API: 發送包含系統提示詞與歷史對話的請求
    API-->>Provider: 回傳串流或完整文字
    Provider-->>Chat: 
    Chat->>Chat: 將 AI 的回覆存入歷史對話記憶
    Chat-->>User: 回覆 AI 的文字
```

**涉及模組**：
- `src/commands/commandsRouter.ts`
- `src/services/LLM/chat.ts`
- `src/services/LLM/llmRouter.ts`
- `src/services/LLM/ollama.ts` & `src/services/LLM/gemini.ts`

---

## 4. 🌤️ 策略模式天氣查詢工作流 (Weather Provider Flow)

查詢天氣時，系統如何透過策略模式將「國家」分發到不同的 Provider：

```mermaid
sequenceDiagram
    participant User as 使用者
    participant Cmd as weather.ts
    participant Router as weatherRouter.ts
    participant Provider as taiwanProvider.ts
    participant Formatter as weatherFormatter.ts

    User->>Cmd: 輸入 ">weather 台灣 高雄"
    Cmd->>Router: queryWeather("台灣", "高雄")
    Router->>Router: 透過 COUNTRY_ALIASES 找到 "taiwan" 策略
    Router->>Provider: resolveCity("高雄") -> 轉為 "高雄市"
    Router->>Provider: fetchTaiwanDetailWeather("高雄市")
    Provider-->>Router: 回傳 WeatherDetailItem 物件
    Router-->>Cmd: 
    Cmd->>Formatter: formatWeatherDetailEmbed(data)
    Formatter-->>Cmd: 回傳 Discord Embed
    Cmd-->>User: 顯示精緻的天氣卡片
```

**涉及模組**：
- `src/commands/core/weather.ts`
- `src/services/weather/weatherRouter.ts`
- `src/services/weather/providers/taiwanProvider.ts`
- `src/services/weather/weatherFormatter.ts`
