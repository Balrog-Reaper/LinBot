import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        // 讓全域檔案可以引入測試函式
        globals: true,

        // 使用 Node 環境（非瀏覽器）
        environment: "node",

        // 測試檔案匹配模式（同時涵蓋 src/ 就近放置 和 tests/ 集中放置）
        include: [
            "src/**/*.test.ts",
            "tests/**/*.test.ts",
            "scratch/**/*.test.js",
        ],

        // 排除目錄
        exclude: ["node_modules", "dist"],

        // 全域超時時間（整合測試可能需要較長時間啟動 MongoDB）
        testTimeout: 30000,

        // 覆蓋率設定
        coverage: {
            provider: "v8",
            include: ["src/**/*.ts"],
            exclude: [
                "src/**/*.test.ts",
                "src/**/*.d.ts",
                "src/types/**",
            ],
        },
    },
});
