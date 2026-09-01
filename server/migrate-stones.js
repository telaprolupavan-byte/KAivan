const connectToDatabase = require("./DB");
const stones = require("./data/stones");

async function migrateStones() {
    const db = await connectToDatabase();

    const collection = db.collection("stones");

    const documents = Object.entries(stones).map(([id, stone]) => ({
        _id: id,
        ...stone
    }));

    await collection.deleteMany({});

    await collection.insertMany(documents);

    console.log(`${documents.length} stones migrated successfully`);
}

migrateStones()
    .catch((error) => {
        console.error("Stone migration failed:", error);
        process.exit(1);
    });