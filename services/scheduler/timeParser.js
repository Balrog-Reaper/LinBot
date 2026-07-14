import { completeLLM } from "../LLM/llmRouter.js";

// 時間解析專用的 System Prompt
const TIME_PARSER_PROMPT = `你是一個精確的時間解析器，你的唯一任務是將使用者的口語化時間描述轉換為標準時間格式。

規則：
1. 參考「當前時間」來計算目標時間
2. 所有時間一律轉換為 UTC 標準時間（注意：當前時間字串中已包含時區偏移量，請據此正確計算時差）
3. 從使用者輸入中分離「時間描述」與「提醒事項」
4. 僅回傳 JSON，不要包含任何額外文字、說明或 markdown 格式
5. JSON 格式：{"time": "YYYY-MM-DDTHH:mm:ss.000Z", "task": "提醒事項"}

範例：
- 輸入：「三小時後 吃藥」 → {"time": "2026-04-07T01:00:00.000Z", "task": "吃藥"}
- 輸入：「明天早上八點 記得繳報告」 → {"time": "2026-04-07T00:00:00.000Z", "task": "記得繳報告"}
- 輸入：「下週一晚上九點 開會」 → {"time": "2026-04-13T13:00:00.000Z", "task": "開會"}`;


/**
 * 取得指定時區的當前格式化時間
 * @returns {string} 例如 "2026-04-06T22:30:00+08:00 (星期一)"
 */
function getCurrentFormattedTime() {
    const timeZone = process.env.TIMEZONE || "Asia/Taipei";
    const currentTime = new Date();

    // 使用 Intl.DateTimeFormat 格式化成指定時區的時間
    const formatter = new Intl.DateTimeFormat("zh-TW", {
        timeZone: timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        weekday: "long"
    });


    // 取得該時區的時間 components
    const parts = formatter.formatToParts(currentTime);
    /*
    // formatToParts() 回傳格式:
    [
        { type: "Year", value: "2012" },
        { type: "month", value: "07" },
        { type: "day", value: "14" },
        { type: "hour", value: "09" },
        { type: "minute", value: "30" },
        { type: "second", value: "00" },
        { type: "weekday", value: "星期日" }
    ];
    */


    // 透過 components 取得該時區的年、月、日、時、分、秒、星期
    const getVal = (type) => parts.find(p => p.type === type).value;
    const year = getVal("year");
    const month = getVal("month");
    const day = getVal("day");
    const hour = getVal("hour");
    const minute = getVal("minute");
    const second = getVal("second");
    const weekday = getVal("weekday");


    // 取得該時區的時差偏移量 (例如 +08:00 或 -04:00)
    const tzString = currentTime.toLocaleString("en-US", { timeZone, timeZoneName: "longOffset" });
    const offset = tzString.split("GMT")[1] || "+00:00";

    console.log(tzString.split("GMT"));

    const formattedOffset = offset.includes(":") ? offset : (offset.startsWith("-") ? "-" : "+") + String(Math.abs(parseInt(offset))).padStart(2, "0") + ":00";

    return `${year}-${month}-${day}T${hour}:${minute}:${second}${formattedOffset} (${weekday})`;
}


/**
 * 使用 LLM 將口語化時間描述解析為標準 UTC 時間
 *
 * @param {string} rawInput - 使用者原始輸入（例如「明天早上八點 記得繳報告」）
 * @returns {Promise<{time: string, task: string} | null>} 解析結果，或 null 表示解析失敗
 */
export async function parseTimeWithLLM(rawInput) {
    const currentTime = getCurrentFormattedTime();
    const userMessage = `當前時間：${currentTime}\n使用者輸入：「${rawInput}」`;

    try {
        // 透過 LLM 路由器呼叫當前 provider（不需要知道底層用的是哪個 LLM）
        const text = await completeLLM(TIME_PARSER_PROMPT, userMessage, {
            temperature: 0.1,     // 低溫度 → 精確穩定的結果
            jsonMode: true,       // 強制回傳 JSON 格式
        });

        // 嘗試解析 JSON（容錯：移除可能的 markdown code block 標記）
        const cleanText = text
            .replace(/^```json?\s*/i, "")
            .replace(/\s*```$/, "")
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