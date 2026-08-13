import "dotenv/config";
import { describe, it, expect } from "vitest";
import { parseTimeWithLLM } from "../src/services/scheduler/timeParser.js";

describe("LLM 時間解析測試", () => {
    it("應能解析「三小時後 吃藥」", async () => {
        const result = await parseTimeWithLLM("三小時後 吃藥");
        expect(result).not.toBeNull();
        expect(result!.time).toBeDefined();
        expect(result!.task).toBe("吃藥");

        // 確認解析出的時間是有效的 ISO 字串
        const targetDate = new Date(result!.time);
        expect(targetDate.getTime()).not.toBeNaN();
    }, 30000); // LLM 回應較慢，設定 30 秒超時

    it("應能解析「明天早上八點 記得繳報告」", async () => {
        const result = await parseTimeWithLLM("明天早上八點 記得繳報告");
        expect(result).not.toBeNull();
        expect(result!.time).toBeDefined();
        expect(result!.task).toBe("記得繳報告");
    }, 30000);

    it("應能解析「下週一晚上九點 開會」", async () => {
        const result = await parseTimeWithLLM("下週一晚上九點 開會");
        expect(result).not.toBeNull();
        expect(result!.time).toBeDefined();
        expect(result!.task).toBe("開會");
    }, 30000);
});
