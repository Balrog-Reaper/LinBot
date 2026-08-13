import "dotenv/config";
import { describe, it, expect, afterAll } from "vitest";
import { getMongoConnection, closeMongoConnection } from "../src/databases/mongodb.js";

describe("MongoDB 連線測試", () => {
    afterAll(async () => {
        await closeMongoConnection();
    });

    it.skip("應能成功連線到 MongoDB", async () => {
        const { db } = await getMongoConnection("lin-bot");
        expect(db).toBeDefined();

        const collections = await db.listCollections().toArray();
        console.log("Collections:", collections.map(c => c.name));
        expect(Array.isArray(collections)).toBe(true);
    });
});
