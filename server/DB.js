const { MongoClient } = require("mongodb");

async function connectToDatabase(uri, dbName = "kaivan") {
    const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 10000
    });

    await client.connect();

    console.log("MongoDB connected successfully");

    return {
        client,
        db: client.db(dbName)
    };
}

async function ensureIndexes(db) {
    const indexes = [
        // Stone ids must be unique; legacy seeded documents without an `id` field are ignored.
        db.collection("stones").createIndex(
            { id: 1 },
            {
                unique: true,
                partialFilterExpression: { id: { $type: "string" } }
            }
        ),
        db.collection("quotes").createIndex({ createdAt: -1 }),
        db.collection("quotes").createIndex({ status: 1 }),
        db.collection("quotes").createIndex({ reference: 1 }, { unique: true }),
        db.collection("stoneImages.files").createIndex({ "metadata.parentId": 1 })
    ];

    const results = await Promise.allSettled(indexes);

    results
        .filter((result) => result.status === "rejected")
        .forEach((result) => {
            console.warn("Unable to create MongoDB index:", result.reason.message);
        });
}

module.exports = {
    connectToDatabase,
    ensureIndexes
};
