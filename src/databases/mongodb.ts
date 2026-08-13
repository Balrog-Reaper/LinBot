import { MongoClient, Db } from "mongodb";


// ═══════════════════════════════════════════
// MongoDB 連線單例
// ═══════════════════════════════════════════
let client: MongoClient | null = null;
let db: Db | null = null;


/**
 * 取得 MongoDB 連線（單例模式）
 * 若尚未連線則自動建立，已連線則直接回傳
 *
 * @param dbName - 資料庫名稱
 * @returns 連線物件 { client, db }
 */
export async function getMongoConnection(dbName: string = process.env.MONGODB_DB_NAME): Promise<{ client: MongoClient; db: Db }> {

    // 若已連線則直接回傳
    if (client && db) {
        return { client, db };
    }

    // 建立 MongoDB 連線
    const uri = process.env.MONGODB_URI;

    // 第一次連線：建立連線並將連線資訊回傳
    try {

        // 建立 Client 實例並連線
        client = new MongoClient(uri);
        await client.connect();

        // 取得指定資料庫的實例
        db = client.db(dbName);

        console.log(`✅ MongoDB 已連線：${uri} / ${dbName}`);
        return { client, db };

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("❌ MongoDB 連線失敗：", msg);
        throw error;
    }
}


/**
 * 關閉 MongoDB 連線（優雅關機時呼叫）
 */
export async function closeMongoConnection(): Promise<void> {
    if (client) {
        await client.close();
        client = null;
        db = null;
        console.log("✅ MongoDB 連線已關閉");
    }
}
