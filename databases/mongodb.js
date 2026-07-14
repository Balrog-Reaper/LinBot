import { MongoClient } from "mongodb";


// ═══════════════════════════════════════════
// MongoDB 連線單例
// ═══════════════════════════════════════════
let client = null;
let db = null;


/**
 * 取得 MongoDB 連線（單例模式）
 * 若尚未連線則自動建立，已連線則直接回傳
 *
 * @param {string} [dbName="lin-bot"] - 資料庫名稱
 * @returns {Promise<{client: MongoClient, db: import('mongodb').Db}>}
 */
export async function getMongoConnection(dbName = "lin-bot") {
    if (client && db) {
        return { client, db };
    }

    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";

    try {
        client = new MongoClient(uri);
        await client.connect();
        db = client.db(dbName);

        console.log(`✅ MongoDB 已連線：${uri} / ${dbName}`);
        return { client, db };

    } catch (error) {
        console.error("❌ MongoDB 連線失敗：", error.message);
        throw error;
    }
}


/**
 * 關閉 MongoDB 連線（優雅關機時呼叫）
 */
export async function closeMongoConnection() {
    if (client) {
        await client.close();
        client = null;
        db = null;
        console.log("✅ MongoDB 連線已關閉");
    }
}
