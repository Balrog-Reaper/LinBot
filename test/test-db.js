import "dotenv/config";
import { getMongoConnection, closeMongoConnection } from "../databases/mongodb.js";

async function test() {
    try {
        console.log("Connecting to MongoDB...");
        const { db } = await getMongoConnection("lin-bot");
        console.log("Connected successfully!");
        const collections = await db.listCollections().toArray();
        console.log("Collections:", collections.map(c => c.name));
        await closeMongoConnection();
    } catch (err) {
        console.error("Connection failed:", err.message);
    }
}

test();
