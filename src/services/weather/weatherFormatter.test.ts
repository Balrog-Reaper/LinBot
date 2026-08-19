import { describe, it, expect } from "vitest";
import { formatWeatherOverviewEmbed, formatWeatherDetailEmbed } from "./weatherFormatter.js";
import type { WeatherOverviewItem, WeatherDetailItem } from "./weatherTypes.js";

describe("weatherFormatter", () => {

    // ─────────────────────────────────────────
    // formatWeatherOverviewEmbed
    // ─────────────────────────────────────────
    describe("formatWeatherOverviewEmbed", () => {
        it("應將天氣列表格式化為 Embed，且每頁不超過 18 個城市", () => {
            // 建立 20 筆測試資料
            const mockList: WeatherOverviewItem[] = Array.from({ length: 20 }, (_, i) => ({
                locationName: `城市${i}`,
                description: i % 2 === 0 ? "晴時多雲" : "陰有雨",
                temperature: "25-30",
                avgTemp: "27.5",
                maxTemp: "30",
                minTemp: "25",
                comfort: "舒適",
                rainProb: "20%"
            }));

            const embeds = formatWeatherOverviewEmbed(mockList);

            // 20 筆資料應分兩頁 (18 + 2)
            expect(embeds.length).toBe(2);

            const page1Json = embeds[0]!.toJSON();
            const page2Json = embeds[1]!.toJSON();

            expect(page1Json.title).toContain("1/2");
            expect(page2Json.title).toContain("2/2");

            // 第一頁驗證
            // 每 3 個城市加一個空白符號 "\u200B"，所以 18 個城市會有 (18/3 - 1) = 5 個空白符號欄位
            // 總共 18 + 5 = 23 個欄位
            expect(page1Json.fields?.length).toBe(23);

            // 第二頁只有 2 個城市，不會有空白符號
            expect(page2Json.fields?.length).toBe(2);
        });

        it("應根據天氣描述加上對應的 emoji", () => {
            const mockList: WeatherOverviewItem[] = [
                { locationName: "A", description: "雷陣雨", temperature: "25", avgTemp: "25", maxTemp: "25", minTemp: "25", comfort: "舒適", rainProb: "100%" },
                { locationName: "B", description: "大雨", temperature: "25", avgTemp: "25", maxTemp: "25", minTemp: "25", comfort: "舒適", rainProb: "100%" },
                { locationName: "C", description: "晴天", temperature: "25", avgTemp: "25", maxTemp: "25", minTemp: "25", comfort: "舒適", rainProb: "0%" }
            ];

            const embeds = formatWeatherOverviewEmbed(mockList);
            const fields = embeds[0]!.toJSON().fields;

            expect(fields![0]!.name).toContain("⛈️");
            expect(fields![1]!.name).toContain("🌧️");
            expect(fields![2]!.name).toContain("☀️");
        });
    });

    // ─────────────────────────────────────────
    // formatWeatherDetailEmbed
    // ─────────────────────────────────────────
    describe("formatWeatherDetailEmbed", () => {
        it("應格式化詳細天氣報告為單一 Embed", () => {
            const mockData: WeatherDetailItem = {
                locationName: "高雄市",
                description: "多雲時晴",
                temperature: "28-32",
                feelTemp: "30-35",
                maxTemp: "32",
                minTemp: "28",
                avgTemp: "30",
                rainProb: "10%",
                humidity: "75%",
                comfort: "悶熱",
                windSpeed: "3 m/s",
                windDir: "西南風",
                detail: "注意防曬"
            };

            const embed = formatWeatherDetailEmbed(mockData);
            const json = embed.toJSON();

            expect(json.title).toContain("高雄市");
            expect(json.title).toContain("⛅");

            // 驗證是否包含重要的屬性
            const fieldsStr = JSON.stringify(json.fields);
            expect(fieldsStr).toContain("28-32");
            expect(fieldsStr).toContain("30-35");
            expect(fieldsStr).toContain("注意防曬");
        });
    });
});
