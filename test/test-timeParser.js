import "dotenv/config";
import { parseTimeWithLLM } from "../services/scheduler/timeParser.js";

async function runTest() {
    const inputs = [
        "三小時後 吃藥",
        "明天早上八點 記得繳報告",
        "下週一晚上九點 開會"
    ];

    console.log(`Using LLM Provider: ${process.env.LLM_PROVIDER}`);
    console.log(`Using Gemini Model: ${process.env.GEMINI_MODEL}`);
    console.log("------------------------------------------");

    for (const input of inputs) {
        console.log(`Input: "${input}"`);
        const result = await parseTimeWithLLM(input);
        if (result) {
            console.log(`Result: Time = ${result.time}, Task = "${result.task}"`);
            // Convert to Taiwan Local Time for display
            const targetDate = new Date(result.time);
            const localStr = new Date(targetDate.getTime() + (8 * 60 * 60 * 1000))
                .toISOString().replace("Z", "+08:00");
            console.log(`Local Time (Taiwan): ${localStr}`);
        } else {
            console.log("Result: FAILED to parse!");
        }
        console.log("------------------------------------------");
    }
}

runTest();
