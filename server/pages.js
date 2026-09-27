// Server-rendered pages: stone detail pages, sitemap, robots.txt, and the home page's
// absolute SEO tags. The header and footer mirror public/index.html.
const fs = require("fs");
const path = require("path");

const PUBLIC_DIR = path.join(__dirname, "..", "public");
const SITE_NAME = "Kaivan Stone";
const UPLOADED_IMAGE = /^\/api\/images\/[a-f0-9]{24}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HOME_SEO_MARKER = "<!-- seo:home -->";

const ARROW_ICON = '<svg class="icon-arrow" viewBox="0 0 26 12" aria-hidden="true"><path d="M0 6h24M19 1l5 5-5 5"/></svg>';

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// JSON-LD is embedded in a <script> block, so "<" is escaped to keep "</script>" out.
function jsonLd(data) {
    return JSON.stringify(data).replace(/</g, "\\u003c");
}

function absoluteUrl(origin, value) {
    if (/^https?:\/\//i.test(value)) {
        return value;
    }

    return `${origin}${value.startsWith("/") ? "" : "/"}${value}`;
}

function publicFileExists(relativePath) {
    return fs.existsSync(path.join(PUBLIC_DIR, relativePath));
}

/**
 * Resolves the photo a stone should display, plus a responsive srcset when smaller
 * renditions exist: admin uploads have ?w=800 variants, bundled photos have -800 files.
 */
function resolveStoneImage(stone) {
    const id = stone.id || String(stone._id);

    if (stone.image) {
        const src = /^(https?:)?\/\//i.test(stone.image) || stone.image.startsWith("/")
            ? stone.image
            : `/${stone.image}`;

        return {
            src,
            srcset: UPLOADED_IMAGE.test(src) ? `${src}?w=800 800w, ${src} 1600w` : ""
        };
    }

    if (SLUG.test(id) && publicFileExists(`images/${id}.webp`)) {
        const srcset = publicFileExists(`images/${id}-800.webp`)
            ? `/images/${id}-800.webp 800w, /images/${id}.webp 1200w`
            : "";

        return { src: `/images/${id}.webp`, srcset };
    }

    return { src: "/images/logo.webp", srcset: "" };
}

// Social networks handle JPEG most reliably, so bundled stones share their original photo.
function socialImage(stone, origin) {
    const id = stone.id || String(stone._id);

    if (!stone.image && SLUG.test(id) && publicFileExists(`images/${id}.jpg`)) {
        return absoluteUrl(origin, `/images/${id}.jpg`);
    }

    return absoluteUrl(origin, resolveStoneImage(stone).src);
}

// "$45/sq ft" -> { price: "45", perSquareFoot: true }
function parsePrice(price) {
    const match = /\$\s*([0-9]+(?:\.[0-9]+)?)/.exec(price || "");

    if (!match) {
        return null;
    }

    return {
        price: match[1],
        perSquareFoot: /sq\.?\s*ft|sqft|square\s*f(oo|ee)t/i.test(price)
    };
}

function truncate(text, length) {
    const value = String(text || "").trim();

    return value.length > length ? `${value.slice(0, length - 1).trimEnd()}…` : value;
}

function renderHeader() {
    return `
    <a class="skip-link" href="#main">Skip to content</a>

    <header class="site-header" id="site-header">

        <nav class="nav" aria-label="Main">

            <a class="brand" href="/" aria-label="Kaivan Stone home">
                <span class="brand-name">Kaivan</span>
                <span class="brand-sub">Stone</span>
            </a>

            <div class="nav-links" id="nav-links">
                <a href="/#collection"><span class="nav-index" aria-hidden="true">01</span>Collection</a>
                <a href="/#about"><span class="nav-index" aria-hidden="true">02</span>About</a>
                <a href="/#logistics"><span class="nav-index" aria-hidden="true">03</span>Logistics</a>
                <a href="/#contact"><span class="nav-index" aria-hidden="true">04</span>Contact</a>
                <a class="nav-cta" href="/#contact">Request a Quote</a>
            </div>

            <button id="menu-button" type="button" aria-label="Open menu" aria-controls="nav-links" aria-expanded="false">
                <span class="menu-icon" aria-hidden="true"></span>
            </button>

        </nav>

        <span class="scroll-progress" id="scroll-progress" aria-hidden="true"></span>

    </header>`;
}

function renderFooter() {
    return `
    <footer class="site-footer">

        <div class="footer-top">

            <div class="footer-brand">
                <p class="footer-tagline">Earth to <em>Excellence.</em></p>
                <p>Premium natural stone sourced from our quarries in India.</p>
            </div>

            <nav class="footer-links" aria-label="Footer">
                <p class="footer-heading">Explore</p>
                <a href="/#collection">Collection</a>
                <a href="/#about">About</a>
                <a href="/#logistics">Logistics</a>
                <a href="/#contact">Contact</a>
            </nav>

            <div class="footer-cta">
                <p class="footer-heading">Start a Project</p>
                <a class="button button-ghost-light" href="/#contact">Request a Quote</a>
            </div>

        </div>

        <p class="footer-wordmark" aria-hidden="true">
            <span class="footer-wordmark-name">Kaivan</span>
            <span class="footer-wordmark-sub">Stone</span>
        </p>

        <div class="footer-bottom">
            <p>&copy; <span id="current-year">${new Date().getFullYear()}</span> Kaivan Stone. All rights reserved.</p>
            <a href="#main" class="back-to-top">Back to top</a>
        </div>

    </footer>`;
}

function renderSpecRow(label, valueHtml) {
    return `<div><dt>${escapeHtml(label)}</dt><dd>${valueHtml}</dd></div>`;
}

function renderRelatedCard(stone) {
    const id = stone.id || String(stone._id);
    const image = resolveStoneImage(stone);
    const isAvailable = stone.inStock !== false;
    const meta = [stone.origin, stone.dimensions].filter(Boolean).join(" · ");

    return `
                <article class="stone-card${isAvailable ? "" : " is-unavailable"}">
                    <div class="stone-card-media">
                        <img src="${escapeHtml(image.src)}"${image.srcset ? ` srcset="${escapeHtml(image.srcset)}" sizes="(max-width: 640px) calc(100vw - 40px), (max-width: 1100px) calc(50vw - 40px), 30vw"` : ""} alt="${escapeHtml(stone.name)} granite" loading="lazy" decoding="async">
                        ${isAvailable ? "" : '<span class="stone-status">Coming Soon</span>'}
                    </div>
                    <div class="stone-card-body">
                        <p class="stone-card-meta">${escapeHtml(meta)}</p>
                        <h3 class="stone-card-title"><a class="stone-card-link" href="/stones/${encodeURIComponent(id)}">${escapeHtml(stone.name)}</a></h3>
                        <div class="stone-card-foot">
                            <span class="stone-price">${escapeHtml(stone.price || "Price on request")}</span>
                            <span class="stone-card-cta" aria-hidden="true">Discover ${ARROW_ICON}</span>
                        </div>
                    </div>
                </article>`;
}

/**
 * @param {object} options
 * @param {object} options.stone - stone document
 * @param {object[]} options.related - other stones to suggest
 * @param {string} options.origin - site origin, e.g. https://kaivanstone.com
 */
function renderStonePage({ stone, related, origin }) {
    const id = stone.id || String(stone._id);
    const url = absoluteUrl(origin, `/stones/${encodeURIComponent(id)}`);
    const image = resolveStoneImage(stone);
    const isAvailable = stone.inStock !== false;
    const title = `${stone.name} — Natural Stone from ${stone.origin || "India"} | ${SITE_NAME}`;
    const description = truncate(
        `${stone.description || stone.name}. Quarried in ${stone.origin || "India"} and supplied by ${SITE_NAME}.`.replace(/\.\./g, "."),
        160
    );

    const specs = [];

    if (stone.price) {
        specs.push(renderSpecRow("Price", escapeHtml(stone.price)));
    }

    if (stone.dimensions) {
        specs.push(renderSpecRow("Size", escapeHtml(stone.dimensions)));
    }

    if (stone.origin) {
        specs.push(renderSpecRow("Origin", escapeHtml(stone.origin)));
    }

    if (typeof stone.rating === "number" && stone.rating > 0) {
        specs.push(renderSpecRow(
            "Rating",
            `<span class="stars">${"★".repeat(Math.round(stone.rating))}</span> ${escapeHtml(stone.rating)} / 5`
        ));
    }

    if (Array.isArray(stone.certifications) && stone.certifications.length > 0) {
        specs.push(renderSpecRow(
            "Certified",
            stone.certifications.map((cert) => `<span class="cert-badge">${escapeHtml(cert)}</span>`).join("")
        ));
    }

    const price = parsePrice(stone.price);
    const product = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: stone.name,
        description: stone.description || stone.name,
        image: [socialImage(stone, origin)],
        sku: id,
        category: "Natural stone",
        brand: { "@type": "Brand", name: SITE_NAME },
        ...(stone.origin ? { countryOfOrigin: { "@type": "Country", name: stone.origin } } : {}),
        ...(price ? {
            offers: {
                "@type": "Offer",
                url,
                priceCurrency: "USD",
                price: price.price,
                availability: isAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                seller: { "@type": "Organization", name: SITE_NAME },
                ...(price.perSquareFoot ? {
                    priceSpecification: {
                        "@type": "UnitPriceSpecification",
                        price: price.price,
                        priceCurrency: "USD",
                        referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "FTK" }
                    }
                } : {})
            }
        } : {})
    };

    const breadcrumbs = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl(origin, "/") },
            { "@type": "ListItem", position: 2, name: stone.name, item: url }
        ]
    };

    const actions = isAvailable
        ? `
                    <a class="button button-gold" href="/?stone=${encodeURIComponent(id)}#contact">Request a Quote ${ARROW_ICON}</a>
                    <a class="button button-ghost-light" href="/#collection">View All Stones</a>`
        : `
                    <p class="stone-unavailable-note">This stone is currently unavailable. Please check back soon.</p>
                    <a class="button button-ghost-light" href="/#collection">View All Stones</a>`;

    const relatedSection = related.length === 0 ? "" : `
        <section class="more-stones" aria-labelledby="more-title">

            <div class="section-head reveal">
                <div>
                    <p class="eyebrow">Continue Exploring</p>
                    <h2 id="more-title">More from the <em>Collection</em></h2>
                </div>

                <a class="section-link" href="/#collection">View All ${ARROW_ICON}</a>
            </div>

            <div class="collection-grid related-grid">${related.map(renderRelatedCard).join("")}
            </div>

        </section>`;

    return `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="theme-color" content="#121211">
    <link rel="canonical" href="${escapeHtml(url)}">

    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${SITE_NAME}">
    <meta property="og:title" content="${escapeHtml(`${stone.name} | ${SITE_NAME}`)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${escapeHtml(url)}">
    <meta property="og:image" content="${escapeHtml(socialImage(stone, origin))}">
    <meta name="twitter:card" content="summary_large_image">

    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">

    <link rel="preload" href="/fonts/cormorant-garamond-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="/fonts/jost-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>

    <link rel="stylesheet" href="/style.css">

    <script type="application/ld+json">${jsonLd(product)}</script>
    <script type="application/ld+json">${jsonLd(breadcrumbs)}</script>
</head>

<body class="stone-page">
${renderHeader()}

    <main id="main">

        <section id="stone-hero" class="stone-hero" data-hero aria-labelledby="stone-title">

            <div class="stone-hero-media">
                <img src="${escapeHtml(image.src)}"${image.srcset ? ` srcset="${escapeHtml(image.srcset)}" sizes="(max-width: 900px) 100vw, 55vw"` : ""} alt="${escapeHtml(stone.name)} granite" fetchpriority="high">
            </div>

            <div class="stone-hero-info">

                <nav class="breadcrumb" aria-label="Breadcrumb">
                    <ol>
                        <li><a href="/">Home</a></li>
                        <li><a href="/#collection">Collection</a></li>
                        <li aria-current="page">${escapeHtml(stone.name)}</li>
                    </ol>
                </nav>

                <p class="stone-availability${isAvailable ? "" : " is-unavailable"}">${isAvailable ? "Available" : "Currently unavailable"}</p>

                <p class="eyebrow eyebrow-light">Quarried in ${escapeHtml(stone.origin || "India")}</p>

                <h1 id="stone-title">${escapeHtml(stone.name)}</h1>

                ${stone.description ? `<p class="stone-hero-desc">${escapeHtml(stone.description)}</p>` : ""}

                ${specs.length ? `<dl class="stone-specs stone-specs-dark">${specs.join("")}</dl>` : ""}

                <div class="stone-hero-actions">${actions}
                </div>

            </div>

        </section>
${relatedSection}

    </main>
${renderFooter()}

    <script src="/script.js"></script>

</body>

</html>
`;
}

// Picks up to `count` other stones, starting after the current one alphabetically,
// so neighbouring pages suggest different stones.
function pickRelatedStones(stones, current, count = 3) {
    const currentId = current.id || String(current._id);
    const sorted = [...stones].sort((a, b) => String(a.name).localeCompare(String(b.name)));
    const index = sorted.findIndex((stone) => (stone.id || String(stone._id)) === currentId);
    const rotated = [...sorted.slice(index + 1), ...sorted.slice(0, Math.max(index, 0))];

    return rotated
        .filter((stone) => (stone.id || String(stone._id)) !== currentId)
        .sort((a, b) => Number(b.inStock !== false) - Number(a.inStock !== false))
        .slice(0, count);
}

function escapeXml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;"
    })[character]);
}

function renderSitemap({ stones, origin }) {
    const urls = [`    <url><loc>${escapeXml(absoluteUrl(origin, "/"))}</loc></url>`];

    stones.forEach((stone) => {
        const id = stone.id || String(stone._id);
        const updated = new Date(stone.updatedAt || stone.createdAt || "");
        const lastmod = Number.isNaN(updated.getTime())
            ? ""
            : `<lastmod>${updated.toISOString().slice(0, 10)}</lastmod>`;

        urls.push(`    <url><loc>${escapeXml(absoluteUrl(origin, `/stones/${encodeURIComponent(id)}`))}</loc>${lastmod}</url>`);
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
}

function renderRobots({ origin }) {
    return `User-agent: *
Allow: /api/images/
Disallow: /api/
Disallow: /admin
Disallow: /admin.html
Disallow: /admin-login.html

Sitemap: ${absoluteUrl(origin, "/sitemap.xml")}
`;
}

function renderHomeSeo({ origin }) {
    const organization = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: SITE_NAME,
        url: absoluteUrl(origin, "/"),
        logo: absoluteUrl(origin, "/images/logo.webp"),
        slogan: "Earth to Excellence"
    };

    return `<link rel="canonical" href="${escapeHtml(absoluteUrl(origin, "/"))}">
    <meta property="og:url" content="${escapeHtml(absoluteUrl(origin, "/"))}">
    <meta property="og:image" content="${escapeHtml(absoluteUrl(origin, "/images/og-image.jpg"))}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta name="twitter:card" content="summary_large_image">
    <script type="application/ld+json">${jsonLd(organization)}</script>`;
}

/**
 * Returns a function producing the home page HTML with absolute SEO tags for an origin.
 * The template is cached in production and re-read on every request in development.
 */
function createHomeRenderer({ cache }) {
    const templatePath = path.join(PUBLIC_DIR, "index.html");
    let template = null;

    return function renderHome(origin) {
        if (!cache || template === null) {
            template = fs.readFileSync(templatePath, "utf8");
        }

        return template.replace(HOME_SEO_MARKER, renderHomeSeo({ origin }));
    };
}

module.exports = {
    escapeHtml,
    resolveStoneImage,
    renderStonePage,
    pickRelatedStones,
    renderSitemap,
    renderRobots,
    createHomeRenderer
};
