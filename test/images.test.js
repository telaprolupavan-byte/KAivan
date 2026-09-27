const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const sharp = require("sharp");
const { buildApp, loginAgent, validStone } = require("./helpers");

function createPng(width = 2400, height = 1200) {
    return sharp({
        create: { width, height, channels: 3, background: "#6f6b64" }
    }).png().toBuffer();
}

describe("image uploads", () => {
    it("requires an admin session", async () => {
        const { app } = buildApp();

        await request(app)
            .post("/api/images")
            .attach("image", await createPng(), "stone.png")
            .expect(401);
    });

    it("resizes, converts to WebP, and serves the upload", async () => {
        const { app } = buildApp();
        const agent = await loginAgent(app);

        const upload = await agent
            .post("/api/images")
            .attach("image", await createPng(), "stone.png")
            .expect(201);

        assert.match(upload.body.url, /^\/api\/images\/[a-f0-9]{24}$/);
        assert.equal(upload.body.width, 1600);
        assert.equal(upload.body.height, 800);

        const image = await request(app)
            .get(upload.body.url)
            .buffer(true)
            .parse((res, callback) => {
                const chunks = [];
                res.on("data", (chunk) => chunks.push(chunk));
                res.on("end", () => callback(null, Buffer.concat(chunks)));
            })
            .expect(200);

        assert.equal(image.headers["content-type"], "image/webp");
        assert.match(image.headers["cache-control"], /immutable/);

        const metadata = await sharp(image.body).metadata();
        assert.equal(metadata.format, "webp");
        assert.equal(metadata.width, 1600);
    });

    it("rejects files that are not images, SVGs, and missing files", async () => {
        const { app } = buildApp();
        const agent = await loginAgent(app);

        await agent
            .post("/api/images")
            .attach("image", Buffer.from("definitely not an image"), "stone.jpg")
            .expect(400);

        const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>');
        const svgResponse = await agent
            .post("/api/images")
            .attach("image", svg, "stone.svg")
            .expect(400);
        assert.match(svgResponse.body.error, /JPEG, PNG/);

        await agent.post("/api/images").expect(400);
    });

    it("rejects files over the size limit", async () => {
        const { app } = buildApp();
        const agent = await loginAgent(app);

        const response = await agent
            .post("/api/images")
            .attach("image", Buffer.alloc(9 * 1024 * 1024), "huge.jpg")
            .expect(413);

        assert.match(response.body.error, /8 MB/);
    });

    it("returns 404 for unknown or malformed image ids", async () => {
        const { app } = buildApp();

        await request(app).get("/api/images/0123456789abcdef01234567").expect(404);
        await request(app).get("/api/images/not-an-id").expect(404);
    });

    it("deletes the old upload when a stone's image is replaced or the stone is deleted", async () => {
        const { app, imageStore } = buildApp();
        const agent = await loginAgent(app);

        const first = await agent.post("/api/images").attach("image", await createPng(), "a.png").expect(201);
        const second = await agent.post("/api/images").attach("image", await createPng(), "b.png").expect(201);

        await agent.post("/api/stones").send({ ...validStone, image: first.body.url }).expect(201);

        // An image in use cannot be deleted directly.
        await agent.delete(first.body.url).expect(409);

        await agent
            .put(`/api/stones/${validStone.id}`)
            .send({ ...validStone, image: second.body.url })
            .expect(200);

        assert.equal(imageStore.files.has(first.body.id), false);
        assert.equal(imageStore.files.has(second.body.id), true);

        await agent.delete(`/api/stones/${validStone.id}`).expect(200);

        assert.equal(imageStore.files.size, 0);
    });

    it("keeps an upload that another stone still uses", async () => {
        const { app, imageStore } = buildApp();
        const agent = await loginAgent(app);

        const upload = await agent.post("/api/images").attach("image", await createPng(), "a.png").expect(201);

        await agent.post("/api/stones").send({ ...validStone, image: upload.body.url }).expect(201);
        await agent
            .post("/api/stones")
            .send({ ...validStone, id: "second-stone", image: upload.body.url })
            .expect(201);

        await agent.delete(`/api/stones/${validStone.id}`).expect(200);
        assert.equal(imageStore.files.has(upload.body.id), true);

        await agent.delete("/api/stones/second-stone").expect(200);
        assert.equal(imageStore.files.has(upload.body.id), false);
    });

    it("lets an admin delete an unused upload", async () => {
        const { app } = buildApp();
        const agent = await loginAgent(app);

        const upload = await agent.post("/api/images").attach("image", await createPng(), "a.png").expect(201);

        await agent.delete(upload.body.url).expect(200);
        await agent.delete(upload.body.url).expect(404);
    });
});
