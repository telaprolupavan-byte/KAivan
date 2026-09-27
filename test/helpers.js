const bcrypt = require("bcrypt");
const session = require("express-session");
const request = require("supertest");
const createApp = require("../server/app");
const createFakeDb = require("./fake-db");
const createMemoryImageStore = require("./memory-image-store");

const ADMIN_PASSWORD = "correct horse battery staple";
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(ADMIN_PASSWORD, 4);

const config = {
    isProduction: false,
    port: 0,
    adminUsername: "admin",
    adminPasswordHash: ADMIN_PASSWORD_HASH,
    sessionSecret: "test-secret-that-is-long-enough-to-use",
    trustProxy: 0
};

const validStone = {
    id: "new-stone",
    name: "New Stone",
    description: "A test stone.",
    origin: "India",
    price: "$40/sq ft",
    dimensions: "12x12 tiles",
    rating: 4.5,
    certifications: ["ISO 9001"],
    inStock: true,
    image: "images/hero.jpg"
};

function buildApp(configOverrides = {}) {
    const db = createFakeDb();

    // Legacy seeded stone: slug stored only in _id.
    db.collection("stones").documents.push({
        _id: "steel-grey",
        name: "Steel Grey",
        description: "Dark granite.",
        origin: "India",
        price: "$45/sq ft",
        dimensions: "12x12 tiles",
        rating: 4.8,
        certifications: ["ISO 9001"],
        inStock: true
    });

    db.collection("stones").documents.push({
        _id: "burgundy",
        id: "burgundy",
        name: "Burgundy",
        description: "Deep red granite.",
        origin: "India",
        price: "$55/sq ft",
        dimensions: "12x12 tiles",
        inStock: false
    });

    const imageStore = createMemoryImageStore();

    const app = createApp({
        db,
        config: { ...config, ...configOverrides },
        imageStore,
        sessionStore: new session.MemoryStore()
    });

    return { app, db, imageStore };
}

async function loginAgent(app) {
    const agent = request.agent(app);

    await agent
        .post("/api/admin/login")
        .send({ username: "admin", password: ADMIN_PASSWORD })
        .expect(200);

    return agent;
}

module.exports = {
    ADMIN_PASSWORD,
    buildApp,
    loginAgent,
    validStone
};
