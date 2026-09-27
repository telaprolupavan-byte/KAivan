// Seeds the stones collection from server/data/stones.js.
//
//   npm run seed            inserts missing stones, leaves existing (admin-edited) ones untouched
//   npm run seed -- --reset deletes every stone first, then inserts the seed data
require("dotenv").config({ quiet: true });

const { connectToDatabase } = require("./DB");
const stones = require("./data/stones");

async function migrateStones() {
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI is not set. Copy .env.example to .env first.");
    }

    const reset = process.argv.includes("--reset");
    const { client, db } = await connectToDatabase(
        process.env.MONGODB_URI,
        process.env.MONGODB_DB || "kaivan"
    );

    try {
        const collection = db.collection("stones");
        const now = new Date().toISOString();

        if (reset) {
            const { deletedCount } = await collection.deleteMany({});

            console.log(`Deleted ${deletedCount} existing stones`);
        }

        const operations = Object.entries(stones).map(([id, stone]) => ({
            updateOne: {
                filter: { $or: [{ id }, { _id: id }] },
                update: {
                    $setOnInsert: {
                        _id: id,
                        id,
                        ...stone,
                        createdAt: now,
                        updatedAt: now
                    }
                },
                upsert: true
            }
        }));

        // Older seeds stored the slug only in `_id`; backfill `id` so lookups are consistent.
        await collection.updateMany(
            { id: { $exists: false } },
            [{ $set: { id: { $toString: "$_id" } } }]
        );

        const result = await collection.bulkWrite(operations);

        console.log(
            `${result.upsertedCount} stones inserted, ` +
            `${operations.length - result.upsertedCount} already present`
        );
    } finally {
        await client.close();
    }
}

migrateStones().catch((error) => {
    console.error("Stone migration failed:", error);
    process.exit(1);
});
