import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        // 測試檔案放在 test/ 目錄
        include: ["test/**/*.test.ts"],
    },
});
