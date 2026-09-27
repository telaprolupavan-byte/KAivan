const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const sharp = require("sharp");
const { buildApp, loginAgent, validStone } = require("./helpers");

function jsonLdBlocks(html) {
    return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
        .map((match) => JSON.parse(match[1]));
}

function binaryParser(res, callback) {
    const chunks = [];
    res.on("data", (chunk) => chunks.push(chunk));
    res.on("end", () => callback(null, Buffer.concat(chunks)));
}

describe("compression", () => {
    it("gzips text responses", async () => {
        const { app } = buildApp();

        const response = await request(app)
            .get("/style.css")
            .set("Accept-Encoding", "gzip")
            .buffer(true)
            .parse(binaryParser)
            .expect(200);

        // The HTTP client transparently decompresses, so check the header and the text.
        assert.equal(response.headers["content-encoding"], "gzip");
        assert.match(response.body.toString(), /Cormorant Garamond/);
    });
});

describe("stone pages", () => {
    it("renders a legacy seeded stone with SEO metadata", async () => {
        const { app } = buildApp();
        const response = await request(app).get("/stones/steel-grey").expect(200);
        const html = response.text;
        const host = response.request.url.replace(/\/stones\/steel-grey$/, "");

        assert.match(response.headers["content-type"], /text\/html/);
        assert.match(html, /<h1 id="stone-title">Steel Grey<\/h1>/);
        assert.match(html, /<title>Steel Grey — Natural Stone from India \| Kaivan Stone<\/title>/);
        assert.ok(html.includes(`<link rel="canonical" href="${host}/stones/steel-grey">`));
        assert.match(html, /<meta property="og:image" content="http[^"]+">/);
        assert.match(html, /href="\/\?stone=steel-grey#contact"/);

        const [product, breadcrumbs] = jsonLdBlocks(html);
        assert.equal(product["@type"], "Product");
        assert.equal(product.name, "Steel Grey");
        assert.equal(product.offers.price, "45");
        assert.equal(product.offers.priceCurrency, "USD");
        assert.equal(product.offers.availability, "https://schema.org/InStock");
        assert.equal(product.offers.priceSpecification.referenceQuantity.unitCode, "FTK");
        assert.equal(breadcrumbs["@type"], "BreadcrumbList");
    });

    it("suggests other stones and marks unavailable ones", async () => {
        const { app } = buildApp();

        const steel = await request(app).get("/stones/steel-grey").expect(200);
        assert.match(steel.text, /href="\/stones\/burgundy"/);

        const burgundy = await request(app).get("/stones/burgundy").expect(200);
        assert.match(burgundy.text, /Currently unavailable/);
        assert.doesNotMatch(burgundy.text, /\?stone=burgundy#contact/);
        assert.equal(jsonLdBlocks(burgundy.text)[0].offers.availability, "https://schema.org/OutOfStock");
    });

    it("escapes stone content in HTML and JSON-LD", async () => {
        const { app } = buildApp();
        const agent = await loginAgent(app);

        await agent.post("/api/stones").send({
            ...validStone,
            id: "tricky-stone",
            name: "</script><script>alert(1)</script>",
            description: "<img src=x onerror=alert(1)> & \"quotes\""
        }).expect(201);

        const html = (await request(app).get("/stones/tricky-stone").expect(200)).text;

        assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
        assert.doesNotMatch(html, /<img src=x/);
        assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt; &amp; &quot;quotes&quot;/);
        assert.equal(jsonLdBlocks(html)[0].name, "</script><script>alert(1)</script>");
    });

    it("returns the 404 page for unknown stones", async () => {
        const { app } = buildApp();
        const response = await request(app).get("/stones/does-not-exist").expect(404);

        assert.match(response.text, /Page not/);
    });

    it("redirects /stones to the collection", async () => {
        const { app } = buildApp();
        const response = await request(app).get("/stones").expect(301);

        assert.equal(response.headers.location, "/#collection");
    });

    it("uses SITE_URL for absolute links when configured", async () => {
        const { app } = buildApp({ siteUrl: "https://kaivan.example" });
        const html = (await request(app).get("/stones/steel-grey").expect(200)).text;

        assert.ok(html.includes('<link rel="canonical" href="https://kaivan.example/stones/steel-grey">'));
    });
});

describe("home page SEO", () => {
    it("adds canonical, social image and Organization data", async () => {
        const { app } = buildApp({ siteUrl: "https://kaivan.example" });
        const html = (await request(app).get("/").expect(200)).text;

        assert.ok(html.includes('<link rel="canonical" href="https://kaivan.example/">'));
        assert.ok(html.includes('<meta property="og:image" content="https://kaivan.example/images/og-image.jpg">'));
        assert.equal(jsonLdBlocks(html)[0]["@type"], "Organization");
        assert.doesNotMatch(html, /seo:home/);
    });

    it("ignores a malformed Host header", async () => {
        const { app } = buildApp();
        const html = (await request(app).get("/").set("Host", "evil.example\"><script>").expect(200)).text;

        assert.ok(html.includes('<link rel="canonical" href="http://localhost/">'));
    });
});

describe("sitemap and robots", () => {
    it("lists the home page and every stone", async () => {
        const { app } = buildApp({ siteUrl: "https://kaivan.example" });
        const response = await request(app).get("/sitemap.xml").expect(200);

        assert.match(response.headers["content-type"], /application\/xml/);
        assert.match(response.text, /<loc>https:\/\/kaivan\.example\/<\/loc>/);
        assert.match(response.text, /<loc>https:\/\/kaivan\.example\/stones\/steel-grey<\/loc>/);
        assert.match(response.text, /<loc>https:\/\/kaivan\.example\/stones\/burgundy<\/loc>/);
    });

    it("points crawlers at the sitemap and away from admin pages", async () => {
        const { app } = buildApp({ siteUrl: "https://kaivan.example" });
        const response = await request(app).get("/robots.txt").expect(200);

        assert.match(response.text, /Sitemap: https:\/\/kaivan\.example\/sitemap\.xml/);
        assert.match(response.text, /Disallow: \/admin/);
        assert.match(response.text, /Allow: \/api\/images\//);
    });
});

describe("responsive photos", () => {
    it("serves an 800px rendition of uploads and removes it with the photo", async () => {
        const { app, imageStore } = buildApp();
        const agent = await loginAgent(app);

        const png = await sharp({
            create: { width: 2400, height: 1600, channels: 3, background: "#6f6b64" }
        }).png().toBuffer();

        const upload = await agent.post("/api/images").attach("image", png, "slab.png").expect(201);
        assert.deepEqual(upload.body.variants, [800]);

        const small = await request(app).get(`${upload.body.url}?w=800`).buffer(true).parse(binaryParser).expect(200);
        const full = await request(app).get(`${upload.body.url}?w=999`).buffer(true).parse(binaryParser).expect(200);

        assert.equal((await sharp(small.body).metadata()).width, 800);
        assert.equal((await sharp(full.body).metadata()).width, 1600);

        await agent.delete(upload.body.url).expect(200);
        assert.equal(imageStore.variants.size, 0);
    });

    it("exposes resolved photo sources in the stones API", async () => {
        const { app } = buildApp();
        const response = await request(app).get("/api/stones").expect(200);

        // Seeded stones without an uploaded photo use the bundled, web-optimized images.
        assert.equal(response.body["steel-grey"].imageSrc, "/images/steel-grey.webp");
        assert.match(response.body["steel-grey"].imageSrcset, /steel-grey-800\.webp 800w/);
    });
});
