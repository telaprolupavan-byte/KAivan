const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const session = require("express-session");
const request = require("supertest");
const createApp = require("../server/app");
const createFakeDb = require("./fake-db");

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

const validQuote = {
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "(555) 123-4567",
    company: "Acme Builders",
    stoneId: "steel-grey",
    quantity: "2,000 sq. ft.",
    message: "Kitchen countertops for a new build."
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

function buildApp() {
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

    const app = createApp({
        db,
        config,
        sessionStore: new session.MemoryStore()
    });

    return { app, db };
}

async function loginAgent(app) {
    const agent = request.agent(app);

    await agent
        .post("/api/admin/login")
        .send({ username: "admin", password: ADMIN_PASSWORD })
        .expect(200);

    return agent;
}

describe("public pages", () => {
    it("serves the homepage with security headers", async () => {
        const { app } = buildApp();
        const response = await request(app).get("/").expect(200);

        assert.match(response.text, /Kaivan Stone/);
        assert.match(response.text, /id="contact"/);
        assert.match(response.text, /id="form-message"/);
        assert.ok(response.headers["content-security-policy"]);
        assert.equal(response.headers["x-powered-by"], undefined);
    });

    it("does not expose server source, package files, or .env", async () => {
        const { app } = buildApp();

        for (const path of ["/server/server.js", "/package.json", "/.env", "/server/app.js"]) {
            await request(app).get(path).expect(404);
        }
    });

    it("redirects the dashboard to login when not authenticated", async () => {
        const { app } = buildApp();

        const response = await request(app).get("/admin.html").expect(302);

        assert.equal(response.headers.location, "/admin-login.html");
    });

    it("serves the dashboard to an authenticated admin", async () => {
        const { app } = buildApp();
        const agent = await loginAgent(app);

        const response = await agent.get("/admin.html").expect(200);

        assert.match(response.text, /Admin Dashboard/);
    });

    it("returns JSON 404 for unknown API routes", async () => {
        const { app } = buildApp();

        const response = await request(app).get("/api/nope").expect(404);

        assert.equal(response.body.error, "Not found");
    });
});

describe("health", () => {
    it("reports ok when the database responds", async () => {
        const { app } = buildApp();
        const response = await request(app).get("/api/health").expect(200);

        assert.equal(response.body.status, "ok");
    });
});

describe("stones API", () => {
    it("lists stones keyed by id, including legacy seeded stones", async () => {
        const { app } = buildApp();
        const response = await request(app).get("/api/stones").expect(200);

        assert.equal(response.body["steel-grey"].id, "steel-grey");
        assert.equal(response.body["steel-grey"].name, "Steel Grey");
        assert.equal(response.body.burgundy.inStock, false);
    });

    it("fetches a legacy seeded stone by slug", async () => {
        const { app } = buildApp();
        const response = await request(app).get("/api/stones/steel-grey").expect(200);

        assert.equal(response.body.id, "steel-grey");
    });

    it("rejects stone writes without an admin session", async () => {
        const { app } = buildApp();

        await request(app).post("/api/stones").send(validStone).expect(401);
        await request(app).put("/api/stones/steel-grey").send(validStone).expect(401);
        await request(app).delete("/api/stones/steel-grey").expect(401);
    });

    it("creates, updates, and deletes a stone as admin", async () => {
        const { app } = buildApp();
        const agent = await loginAgent(app);

        const created = await agent.post("/api/stones").send(validStone).expect(201);
        assert.equal(created.body.stone.id, "new-stone");

        await agent.post("/api/stones").send(validStone).expect(409);

        const updated = await agent
            .put("/api/stones/new-stone")
            .send({ ...validStone, name: "Renamed Stone" })
            .expect(200);
        assert.equal(updated.body.stone.name, "Renamed Stone");

        await agent.delete("/api/stones/new-stone").expect(200);
        await agent.delete("/api/stones/new-stone").expect(404);
    });

    it("updates a legacy seeded stone and keeps its id", async () => {
        const { app } = buildApp();
        const agent = await loginAgent(app);

        await agent
            .put("/api/stones/steel-grey")
            .send({ ...validStone, name: "Steel Grey Polished" })
            .expect(200);

        const response = await request(app).get("/api/stones/steel-grey").expect(200);
        assert.equal(response.body.name, "Steel Grey Polished");
        assert.equal(response.body.id, "steel-grey");
    });

    it("validates stone input", async () => {
        const { app } = buildApp();
        const agent = await loginAgent(app);

        const cases = [
            { ...validStone, id: "Bad ID!" },
            { ...validStone, id: { $ne: null } },
            { ...validStone, name: "" },
            { ...validStone, rating: 9 },
            { ...validStone, inStock: "yes" },
            { ...validStone, certifications: "ISO" },
            { ...validStone, image: "javascript:alert(1)" }
        ];

        for (const body of cases) {
            await agent.post("/api/stones").send(body).expect(400);
        }
    });
});

describe("quotes API", () => {
    let app;

    beforeEach(() => {
        ({ app } = buildApp());
    });

    it("accepts a valid quote for a legacy seeded stone", async () => {
        const response = await request(app).post("/api/quotes").send(validQuote).expect(201);

        assert.match(response.body.quote.reference, /^KAI-[A-Z0-9]+-[A-F0-9]{4}$/);
        assert.equal(response.body.quote.stoneName, "Steel Grey");
        // Personal details are not echoed back to the browser.
        assert.equal(response.body.quote.email, undefined);
    });

    it("rejects invalid quote input", async () => {
        const cases = [
            { ...validQuote, name: "" },
            { ...validQuote, name: 123 },
            { ...validQuote, email: "not-an-email" },
            { ...validQuote, phone: "123" },
            { ...validQuote, message: "short" },
            { ...validQuote, stoneId: { $ne: null } },
            { ...validQuote, stoneId: "does-not-exist" },
            { ...validQuote, stoneId: "burgundy" }
        ];

        for (const body of cases) {
            const response = await request(app).post("/api/quotes").send(body);

            assert.equal(response.status, 400, JSON.stringify(body));
            assert.ok(response.body.error);
        }
    });

    it("returns 400 for malformed JSON", async () => {
        const response = await request(app)
            .post("/api/quotes")
            .set("Content-Type", "application/json")
            .send("{bad json")
            .expect(400);

        assert.equal(response.body.error, "Request body must be valid JSON.");
    });

    it("keeps quotes private to admins", async () => {
        await request(app).get("/api/quotes").expect(401);
    });

    it("lets an admin list, view, and update quote status", async () => {
        await request(app).post("/api/quotes").send(validQuote).expect(201);

        const agent = await loginAgent(app);
        const list = await agent.get("/api/quotes").expect(200);

        assert.equal(list.body.length, 1);

        const quoteId = list.body[0]._id;

        const detail = await agent.get(`/api/quotes/${quoteId}`).expect(200);
        assert.equal(detail.body.email, "jane@example.com");

        const updated = await agent
            .patch(`/api/quotes/${quoteId}/status`)
            .send({ status: "quoted" })
            .expect(200);
        assert.equal(updated.body.quote.status, "quoted");

        await agent.patch(`/api/quotes/${quoteId}/status`).send({ status: "bogus" }).expect(400);
        await agent.get("/api/quotes/not-an-id").expect(400);
        await agent.get("/api/quotes/0123456789abcdef01234567").expect(404);
    });

    it("rate limits quote submissions", async () => {
        for (let i = 0; i < 10; i++) {
            await request(app).post("/api/quotes").send(validQuote).expect(201);
        }

        const response = await request(app).post("/api/quotes").send(validQuote).expect(429);
        assert.ok(response.body.error);
    });
});

describe("admin authentication", () => {
    it("rejects bad credentials", async () => {
        const { app } = buildApp();

        await request(app)
            .post("/api/admin/login")
            .send({ username: "admin", password: "wrong" })
            .expect(401);

        await request(app)
            .post("/api/admin/login")
            .send({ username: "someone", password: ADMIN_PASSWORD })
            .expect(401);

        await request(app)
            .post("/api/admin/login")
            .send({ username: { $ne: "" }, password: ["x"] })
            .expect(400);
    });

    it("logs in, reports the session, and logs out", async () => {
        const { app } = buildApp();
        const agent = await loginAgent(app);

        const me = await agent.get("/api/admin/me").expect(200);
        assert.equal(me.body.authenticated, true);

        await agent.post("/api/admin/logout").expect(200);

        const after = await agent.get("/api/admin/me").expect(200);
        assert.equal(after.body.authenticated, false);
    });

    it("issues a new session id on every login", async () => {
        const { app } = buildApp();
        const agent = request.agent(app);

        function sessionCookie(response) {
            const cookie = response.headers["set-cookie"].find((item) =>
                item.startsWith("kaivan.sid=")
            );

            assert.ok(cookie, "session cookie is set");
            assert.match(cookie, /HttpOnly/);
            assert.match(cookie, /SameSite=Lax/);

            return cookie.split(";")[0];
        }

        const credentials = { username: "admin", password: ADMIN_PASSWORD };
        const first = await agent.post("/api/admin/login").send(credentials).expect(200);
        const second = await agent.post("/api/admin/login").send(credentials).expect(200);

        assert.notEqual(sessionCookie(first), sessionCookie(second));
    });

    it("locks out repeated failed logins", async () => {
        const { app } = buildApp();

        for (let i = 0; i < 10; i++) {
            await request(app)
                .post("/api/admin/login")
                .send({ username: "admin", password: "wrong" })
                .expect(401);
        }

        await request(app)
            .post("/api/admin/login")
            .send({ username: "admin", password: ADMIN_PASSWORD })
            .expect(429);
    });
});
