const { MongoStore } = require("connect-mongo");
const loadConfig = require("./config");
const { connectToDatabase, ensureIndexes } = require("./DB");
const createApp = require("./app");

async function startServer() {
    const config = loadConfig();
    const { client, db } = await connectToDatabase(config.mongoUri, config.mongoDbName);

    await ensureIndexes(db);

    const sessionStore = MongoStore.create({
        client,
        dbName: config.mongoDbName,
        collectionName: "sessions",
        ttl: 8 * 60 * 60,
        touchAfter: 60 * 60
    });

    const app = createApp({ db, config, sessionStore });

    const server = app.listen(config.port, () => {
        console.log(`Kaivan backend running on port ${config.port}`);
    });

    let shuttingDown = false;

    async function shutdown(signal) {
        if (shuttingDown) {
            return;
        }

        shuttingDown = true;
        console.log(`${signal} received, shutting down gracefully...`);

        // Force exit if connections do not drain in time.
        setTimeout(() => process.exit(1), 10000).unref();

        server.close(async () => {
            try {
                await sessionStore.close();
                await client.close();
            } finally {
                process.exit(0);
            }
        });
    }

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
}

startServer().catch((error) => {
    console.error("Failed to start server:", error.message);
    process.exit(1);
});
