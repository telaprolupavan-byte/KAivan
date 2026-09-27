/* ========================================
   KAIVAN STONE
   Earth to Excellence
   ======================================== */

const SVG_NS = "http://www.w3.org/2000/svg";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ========================================
   HELPERS
   ======================================== */

function getElement(id) {
    return document.getElementById(id);
}

function queryElements(selector) {
    return document.querySelectorAll(selector);
}

function createElement(tag, options = {}) {
    const element = document.createElement(tag);

    if (options.className) {
        element.className = options.className;
    }

    if (options.text !== undefined) {
        element.textContent = options.text;
    }

    return element;
}

function createArrowIcon() {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "icon-arrow");
    svg.setAttribute("viewBox", "0 0 26 12");
    svg.setAttribute("aria-hidden", "true");

    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", "M0 6h24M19 1l5 5-5 5");

    svg.appendChild(path);

    return svg;
}

// Parses a JSON response body, tolerating empty or non-JSON bodies.
async function readJson(response) {
    try {
        return await response.json();
    } catch {
        return {};
    }
}

/* ========================================
   STONE DATA
   ======================================== */

let stones = {};

/* ========================================
   HEADER & MOBILE MENU
   ======================================== */

function isMenuOpen() {
    return getElement("nav-links")?.classList.contains("open") === true;
}

function setMenuOpen(isOpen) {
    const navLinks = getElement("nav-links");
    const menuButton = getElement("menu-button");
    const header = getElement("site-header");

    if (!navLinks || !menuButton) {
        return;
    }

    navLinks.classList.toggle("open", isOpen);
    header?.classList.toggle("menu-open", isOpen);
    document.body.classList.toggle("menu-open", isOpen);

    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");

    // Keep keyboard and screen-reader focus inside the open menu.
    document.querySelectorAll("main, footer").forEach(region => {
        region.inert = isOpen;
    });

    if (isOpen) {
        header?.classList.remove("is-hidden");
        navLinks.querySelector("a")?.focus({ preventScroll: true });
    }
}

function closeMobileMenu() {
    if (isMenuOpen()) {
        setMenuOpen(false);
    }
}

function initMobileMenu() {
    const menuButton = getElement("menu-button");

    if (!menuButton) {
        return;
    }

    menuButton.addEventListener("click", () => setMenuOpen(!isMenuOpen()));

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && isMenuOpen()) {
            setMenuOpen(false);
            menuButton.focus();
        }
    });

    // The overlay menu only exists on small screens.
    window.matchMedia("(min-width: 901px)").addEventListener("change", (event) => {
        if (event.matches) {
            closeMobileMenu();
        }
    });
}

/* ========================================
   SMOOTH SCROLLING
   ======================================== */

function setupSmoothScroll() {
    queryElements("a[href^='#']").forEach(anchor => {
        anchor.addEventListener("click", function (event) {
            const targetId = this.getAttribute("href");

            if (targetId.length < 2) {
                return;
            }

            const targetElement = document.querySelector(targetId);

            if (!targetElement) {
                return;
            }

            event.preventDefault();
            closeMobileMenu();

            if (targetId === "#hero") {
                window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
            } else {
                targetElement.scrollIntoView({
                    behavior: reduceMotion ? "auto" : "smooth",
                    block: "start"
                });
            }
        });
    });
}

/* ========================================
   SCROLL EFFECTS
   Header state, progress line and parallax share one rAF-throttled handler.
   ======================================== */

function initScrollEffects() {
    const header = getElement("site-header");
    const hero = getElement("hero");
    const progress = getElement("scroll-progress");
    const parallaxItems = reduceMotion ? [] : Array.from(queryElements("[data-parallax]"));

    let lastScrollY = window.scrollY;
    let ticking = false;

    function update() {
        ticking = false;

        const scrollY = window.scrollY;
        const viewportHeight = window.innerHeight;

        if (header) {
            const heroBottom = hero ? hero.offsetHeight - header.offsetHeight : 0;
            const pastHero = scrollY > heroBottom;

            header.classList.toggle("is-solid", pastHero || !hero);

            // Hide while reading downwards, reveal on the way back up.
            const scrollingDown = scrollY > lastScrollY + 4;
            const scrollingUp = scrollY < lastScrollY - 4;

            if (!isMenuOpen() && pastHero && scrollingDown) {
                header.classList.add("is-hidden");
            } else if (scrollingUp || !pastHero) {
                header.classList.remove("is-hidden");
            }
        }

        if (progress) {
            const scrollable = document.documentElement.scrollHeight - viewportHeight;
            const ratio = scrollable > 0 ? Math.min(1, scrollY / scrollable) : 0;

            progress.style.transform = `scaleX(${ratio})`;
        }

        parallaxItems.forEach(item => {
            const container = item.parentElement;
            const rect = container.getBoundingClientRect();

            if (rect.bottom < 0 || rect.top > viewportHeight) {
                return;
            }

            const speed = Number(item.dataset.parallax) || 0.15;
            const offset = (rect.top + rect.height / 2 - viewportHeight / 2) * -speed;

            item.style.translate = `0 ${offset.toFixed(1)}px`;
        });

        lastScrollY = scrollY;
    }

    function requestUpdate() {
        if (!ticking) {
            ticking = true;
            window.requestAnimationFrame(update);
        }
    }

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
}

function initActiveNavLinks() {
    if (!("IntersectionObserver" in window)) {
        return;
    }

    const links = Array.from(queryElements(".nav-links a:not(.nav-cta)"));

    const observer = new IntersectionObserver(
        (entries) => {
            entries
                .filter(entry => entry.isIntersecting)
                .forEach(entry => {
                    links.forEach(link => {
                        link.classList.toggle(
                            "active",
                            link.getAttribute("href") === `#${entry.target.id}`
                        );
                    });
                });
        },
        { rootMargin: "-45% 0px -50% 0px" }
    );

    links
        .map(link => document.querySelector(link.getAttribute("href")))
        .filter(Boolean)
        .forEach(section => observer.observe(section));
}

/* ========================================
   SCROLL REVEAL
   Only elements that start below the fold are hidden, so nothing flashes on load
   and everything stays visible without JavaScript.
   ======================================== */

let revealObserver = null;

function getRevealObserver() {
    if (revealObserver || reduceMotion || !("IntersectionObserver" in window)) {
        return revealObserver;
    }

    revealObserver = new IntersectionObserver(
        (entries) => {
            entries
                .filter(entry => entry.isIntersecting)
                .forEach(entry => {
                    entry.target.classList.add("is-visible");
                    revealObserver.unobserve(entry.target);
                });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );

    return revealObserver;
}

function observeReveal(elements) {
    const observer = getRevealObserver();

    if (!observer) {
        return;
    }

    elements.forEach(element => {
        const rect = element.getBoundingClientRect();

        if (rect.top < window.innerHeight * 0.92) {
            return;
        }

        element.classList.add("reveal", "is-pending");
        observer.observe(element);
    });
}

// Staggers siblings so grids and lists cascade in.
function staggerChildren(container, step = 0.12) {
    Array.from(container.children).forEach((child, index) => {
        child.style.setProperty("--delay", `${(index % 3) * step}s`);
    });
}

function initScrollReveal() {
    [".pillars", ".stats-grid", ".timeline"].forEach(selector => {
        const container = document.querySelector(selector);

        if (container) {
            staggerChildren(container);
        }
    });

    observeReveal(Array.from(queryElements(".reveal")));

    // Draw the logistics timeline line when it comes into view.
    const timeline = document.querySelector(".timeline");
    const observer = getRevealObserver();

    if (timeline && observer && timeline.getBoundingClientRect().top > window.innerHeight * 0.92) {
        timeline.classList.add("is-pending");

        const lineObserver = new IntersectionObserver((entries) => {
            if (entries.some(entry => entry.isIntersecting)) {
                timeline.classList.remove("is-pending");
                lineObserver.disconnect();
            }
        }, { threshold: 0.3 });

        lineObserver.observe(timeline);
    }
}

/* ========================================
   COUNT-UP STATISTICS
   ======================================== */

function animateCount(element) {
    const target = Number(element.dataset.count);
    const duration = 1800;
    const start = performance.now();

    function frame(now) {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 4);

        element.textContent = String(Math.round(target * eased));

        if (progress < 1) {
            window.requestAnimationFrame(frame);
        }
    }

    element.textContent = "0";
    window.requestAnimationFrame(frame);
}

function initCountUp() {
    const counters = Array.from(queryElements("[data-count]"));

    if (reduceMotion || !("IntersectionObserver" in window) || counters.length === 0) {
        return;
    }

    const observer = new IntersectionObserver(
        (entries) => {
            entries
                .filter(entry => entry.isIntersecting)
                .forEach(entry => {
                    animateCount(entry.target);
                    observer.unobserve(entry.target);
                });
        },
        { threshold: 0.6 }
    );

    counters.forEach(counter => observer.observe(counter));
}

/* ========================================
   QUOTE FORM VALIDATION
   ======================================== */

function extractFormValues() {
    const stoneSelect = getElement("stone");

    return {
        name: getElement("name").value.trim(),
        email: getElement("email").value.trim(),
        phone: getElement("phone").value.trim(),
        company: getElement("company").value.trim(),
        stoneId: stoneSelect ? stoneSelect.value.trim() : "",
        quantity: getElement("quantity").value.trim(),
        message: getElement("message").value.trim()
    };
}

function validateName(name) {
    if (name === "") {
        return { valid: false, error: "Please enter your name." };
    }
    if (name.length < 2) {
        return { valid: false, error: "Name must be at least 2 characters." };
    }
    return { valid: true, error: "" };
}

function validateEmail(email) {
    if (email === "") {
        return { valid: false, error: "Please enter your email." };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        return { valid: false, error: "Please enter a valid email address." };
    }

    return { valid: true, error: "" };
}

function validatePhone(phone) {
    if (phone === "") {
        return { valid: false, error: "Please enter your phone number." };
    }

    if (phone.replace(/\D/g, "").length < 10) {
        return { valid: false, error: "Please enter a valid phone number." };
    }

    return { valid: true, error: "" };
}

function validateStone(stoneId) {
    if (stoneId === "") {
        return { valid: false, error: "Please select a stone." };
    }

    if (!stones[stoneId]) {
        return { valid: false, error: "Selected stone is not available." };
    }

    if (stones[stoneId].inStock === false) {
        return { valid: false, error: "Please select a stone that is currently in stock." };
    }

    return { valid: true, error: "" };
}

function validateMessage(message) {
    if (message === "") {
        return { valid: false, error: "Please enter your message." };
    }

    if (message.length < 10) {
        return { valid: false, error: "Message must be at least 10 characters." };
    }

    return { valid: true, error: "" };
}

function displayFormMessage(message, type = "success") {
    const formMessage = getElement("form-message");

    if (!formMessage) {
        return;
    }

    formMessage.textContent = message;
    formMessage.className = type;
}

function setFieldInvalid(fieldId, isInvalid) {
    const field = getElement(fieldId);

    if (!field) {
        return;
    }

    if (isInvalid) {
        field.setAttribute("aria-invalid", "true");
    } else {
        field.removeAttribute("aria-invalid");
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const formValues = extractFormValues();

    const validations = [
        ["name", validateName(formValues.name)],
        ["email", validateEmail(formValues.email)],
        ["phone", validatePhone(formValues.phone)],
        ["stone", validateStone(formValues.stoneId)],
        ["message", validateMessage(formValues.message)]
    ];

    validations.forEach(([fieldId, result]) => setFieldInvalid(fieldId, !result.valid));

    const invalidField = validations.find(([, result]) => !result.valid);

    if (invalidField) {
        const [fieldId, result] = invalidField;

        displayFormMessage(result.error, "error");
        getElement(fieldId)?.focus();
        return;
    }

    const submitButton = getElement("quote-submit");

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";
    }

    displayFormMessage("Submitting your quote request...", "info");

    try {
        const response = await fetch("/api/quotes", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(formValues)
        });

        const result = await readJson(response);

        if (!response.ok) {
            throw new Error(result.error || "Unable to submit your quote request.");
        }

        const reference = result.quote?.reference || "Pending";

        displayFormMessage(
            `Thank you! Your quote request has been received. Reference: ${reference}`,
            "success"
        );

        form.reset();
    } catch (error) {
        console.error("Quote submission failed:", error);

        displayFormMessage(
            error.message || "Unable to submit your quote request. Please try again.",
            "error"
        );
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "Request a Quote";
        }
    }
}

function initFormValidation() {
    const quoteForm = getElement("quote-form");

    if (quoteForm) {
        quoteForm.addEventListener("submit", handleFormSubmit);

        // Clear a field's error state as soon as the visitor edits it.
        quoteForm.addEventListener("input", (event) => {
            if (event.target.hasAttribute("aria-invalid")) {
                setFieldInvalid(event.target.id, false);
            }
        });
    }
}

/* ========================================
   STONE DISPLAY
   ======================================== */

// Stones without an uploaded photo use the bundled, web-optimized image for their id.
function stoneImageSource(stone) {
    return stone.image || `images/${stone.id}.webp`;
}

function createStoneImage(stone, loading = "lazy") {
    const image = document.createElement("img");
    image.src = stoneImageSource(stone);
    image.alt = `${stone.name} granite`;
    image.loading = loading;
    image.decoding = "async";
    image.addEventListener(
        "error",
        () => {
            image.src = "images/logo.webp";
        },
        { once: true }
    );

    return image;
}

function stoneMetaLine(stone) {
    return [stone.origin, stone.dimensions].filter(Boolean).join(" · ");
}

function createStoneCard(stone) {
    const isAvailable = stone.inStock !== false;

    const article = createElement("article", {
        className: `stone-card${isAvailable ? "" : " is-unavailable"}`
    });

    const media = createElement("div", { className: "stone-card-media" });
    media.append(createStoneImage(stone));

    if (!isAvailable) {
        media.append(createElement("span", { className: "stone-status", text: "Coming Soon" }));
    }

    const body = createElement("div", { className: "stone-card-body" });

    const meta = createElement("p", {
        className: "stone-card-meta",
        text: stoneMetaLine(stone)
    });

    const title = createElement("h3", { className: "stone-card-title" });
    const link = createElement("button", { className: "stone-card-link", text: stone.name });
    link.type = "button";
    link.dataset.stone = stone.id;
    title.appendChild(link);

    const foot = createElement("div", { className: "stone-card-foot" });
    const price = createElement("span", {
        className: "stone-price",
        text: stone.price || "Price on request"
    });
    const cta = createElement("span", { className: "stone-card-cta", text: "Discover" });
    cta.setAttribute("aria-hidden", "true");
    cta.appendChild(createArrowIcon());

    foot.append(price, cta);
    body.append(meta, title, foot);
    article.append(media, body);

    return article;
}

function createSkeletonCard() {
    const article = createElement("article", { className: "stone-card skeleton" });
    article.setAttribute("aria-hidden", "true");

    const media = createElement("div", { className: "stone-card-media" });
    const body = createElement("div", { className: "stone-card-body" });

    body.append(
        createElement("div", { className: "skeleton-line short" }),
        createElement("div", { className: "skeleton-line wide" })
    );

    article.append(media, body);

    return article;
}

function createSpecRow(label, value) {
    const row = document.createElement("div");
    const term = createElement("dt", { text: label });
    const description = document.createElement("dd");

    if (value instanceof Node) {
        description.append(value);
    } else {
        description.textContent = String(value);
    }

    row.append(term, description);

    return row;
}

function openStoneDialog(stone) {
    const dialog = getElement("stone-dialog");
    const dialogBody = getElement("stone-dialog-body");

    if (!dialog || !dialogBody) {
        return;
    }

    const isAvailable = stone.inStock !== false;

    const detail = createElement("div", { className: "stone-detail" });

    const media = createElement("div", { className: "stone-detail-media" });
    media.append(createStoneImage(stone, "eager"));

    const info = createElement("div", { className: "stone-detail-info" });

    const availability = createElement("p", {
        className: `stone-availability${isAvailable ? "" : " is-unavailable"}`,
        text: isAvailable ? "Available" : "Currently unavailable"
    });

    const eyebrow = createElement("p", {
        className: "eyebrow",
        text: stone.origin ? `Quarried in ${stone.origin}` : "Natural Stone"
    });

    const title = createElement("h3", { text: stone.name });
    title.id = "stone-dialog-title";

    const description = createElement("p", {
        className: "stone-desc",
        text: stone.description || ""
    });

    const specs = createElement("dl", { className: "stone-specs" });

    [
        ["Price", stone.price],
        ["Size", stone.dimensions],
        ["Color", stone.color],
        ["Finish", stone.finish]
    ]
        .filter(([, value]) => value)
        .forEach(([label, value]) => specs.append(createSpecRow(label, value)));

    if (typeof stone.rating === "number" && stone.rating > 0) {
        const rating = document.createDocumentFragment();

        rating.append(
            createElement("span", { className: "stars", text: "★".repeat(Math.round(stone.rating)) }),
            ` ${stone.rating} / 5`
        );

        specs.append(createSpecRow("Rating", rating));
    }

    if (Array.isArray(stone.certifications) && stone.certifications.length > 0) {
        const badges = document.createDocumentFragment();

        stone.certifications.forEach(cert => {
            badges.append(createElement("span", { className: "cert-badge", text: cert }));
        });

        specs.append(createSpecRow("Certified", badges));
    }

    const actions = createElement("div", { className: "stone-detail-actions" });

    if (isAvailable) {
        const quoteButton = createElement("button", {
            className: "button button-dark stone-quote-button",
            text: "Request a Quote"
        });
        quoteButton.type = "button";
        quoteButton.setAttribute("aria-label", `Request a quote for ${stone.name}`);
        quoteButton.appendChild(createArrowIcon());
        quoteButton.addEventListener("click", () => {
            dialog.close();
            selectStoneForQuote(stone.id);
        });

        actions.append(quoteButton);
    } else {
        actions.append(createElement("p", {
            className: "stone-unavailable-note",
            text: "This stone is currently unavailable. Please check back soon."
        }));
    }

    info.append(availability, eyebrow, title, description, specs, actions);
    detail.append(media, info);
    dialogBody.replaceChildren(detail);

    dialog.showModal();
}

function initStoneDialog() {
    const dialog = getElement("stone-dialog");
    const closeButton = getElement("stone-dialog-close");

    if (!dialog) {
        return;
    }

    closeButton?.addEventListener("click", () => dialog.close());

    // Close when the backdrop (the dialog element itself) is clicked.
    dialog.addEventListener("click", (event) => {
        if (event.target === dialog) {
            dialog.close();
        }
    });
}

function renderCollectionMessage(message) {
    const collectionGrid = getElement("collection-grid");

    if (!collectionGrid) {
        return;
    }

    collectionGrid.removeAttribute("aria-busy");
    collectionGrid.replaceChildren(
        createElement("p", { className: "collection-status", text: message })
    );
}

function renderCollectionSkeletons(count = 6) {
    const collectionGrid = getElement("collection-grid");

    if (!collectionGrid) {
        return;
    }

    collectionGrid.setAttribute("aria-busy", "true");
    collectionGrid.replaceChildren(
        ...Array.from({ length: count }, createSkeletonCard)
    );
}

function normalizeStonesResponse(payload) {
    if (!payload || typeof payload !== "object") {
        throw new Error("Stone API returned an invalid response.");
    }

    if (Array.isArray(payload)) {
        return payload.map((stone, index) => ({
            ...stone,
            id: stone.id || `stone-${index + 1}`
        }));
    }

    return Object.entries(payload).map(([id, stone]) => ({
        ...stone,
        id: stone.id || id
    }));
}

function populateStoneSelect(stoneList) {
    const stoneSelect = getElement("stone");

    if (!stoneSelect) {
        return;
    }

    const placeholder = createElement("option", { text: "Select a stone" });
    placeholder.value = "";

    stoneSelect.replaceChildren(placeholder);

    stoneList
        .filter(stone => stone.inStock !== false)
        .forEach(stone => {
            const option = createElement("option", { text: stone.name });
            option.value = stone.id;

            stoneSelect.appendChild(option);
        });
}

function selectStoneForQuote(stoneId) {
    const stoneSelect = getElement("stone");
    const contactSection = getElement("contact");

    if (!stoneSelect) {
        return;
    }

    stoneSelect.value = stoneId;
    setFieldInvalid("stone", false);

    if (contactSection) {
        contactSection.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
            block: "start"
        });
    }

    getElement("name")?.focus({ preventScroll: true });
}

function renderStoneMarquee(stoneList) {
    const marquee = getElement("stone-marquee");
    const track = getElement("stone-marquee-track");

    if (!marquee || !track || stoneList.length === 0) {
        return;
    }

    const group = createElement("div", { className: "marquee-group" });

    stoneList.forEach(stone => {
        group.append(createElement("span", { className: "marquee-item", text: stone.name }));
    });

    // Two identical groups make the loop seamless.
    track.replaceChildren(group, group.cloneNode(true));
    marquee.hidden = false;
}

// Picks cards to span two columns so that every row of a `columns`-wide grid is full.
// Wide cards alternate between the start and the end of their row.
function computeWideCards(count, columns) {
    const wide = new Set();
    const emptySlots = (columns - (count % columns)) % columns;

    if (columns < 2 || count < 2 || emptySlots === 0) {
        return wide;
    }

    const rows = (count + emptySlots) / columns;
    const wideRows = new Set(
        Array.from({ length: emptySlots }, (_, k) => Math.round((k * rows) / emptySlots))
    );

    let index = 0;
    let placed = 0;

    for (let row = 0; row < rows; row++) {
        const cardsInRow = wideRows.has(row) ? columns - 1 : columns;

        if (wideRows.has(row)) {
            wide.add(index + (placed % 2 === 0 ? 0 : cardsInRow - 1));
            placed++;
        }

        index += cardsInRow;
    }

    return wide;
}

function generateStoneCollection(stoneList) {
    const collectionGrid = getElement("collection-grid");

    if (!collectionGrid) {
        return;
    }

    const wideOnThree = computeWideCards(stoneList.length, 3);
    const wideOnTwo = computeWideCards(stoneList.length, 2);

    const cards = stoneList.map((stone, index) => {
        const card = createStoneCard(stone);

        card.classList.toggle("wide-3", wideOnThree.has(index));
        card.classList.toggle("wide-2", wideOnTwo.has(index));

        return card;
    });

    collectionGrid.removeAttribute("aria-busy");
    collectionGrid.replaceChildren(...cards);

    staggerChildren(collectionGrid, 0.1);
    observeReveal(Array.from(collectionGrid.children));

    const count = getElement("stone-count");

    if (count) {
        count.textContent = `${stoneList.length} ${stoneList.length === 1 ? "Stone" : "Stones"}`;
    }
}

function initStoneCollection() {
    const collectionGrid = getElement("collection-grid");

    if (!collectionGrid) {
        return;
    }

    // One delegated listener handles every card.
    collectionGrid.addEventListener("click", (event) => {
        const trigger = event.target.closest(".stone-card")?.querySelector("[data-stone]");

        if (!trigger) {
            return;
        }

        const stone = stones[trigger.dataset.stone];

        if (stone) {
            openStoneDialog(stone);
        }
    });
}

async function loadStonesAsync() {
    renderCollectionSkeletons();

    try {
        const response = await fetch("/api/stones");

        if (!response.ok) {
            throw new Error(`Stone API request failed with status ${response.status}`);
        }

        const stoneList = normalizeStonesResponse(await response.json());

        if (stoneList.length === 0) {
            renderCollectionMessage("No stones available at this time.");

            return [];
        }

        stones = stoneList.reduce((catalog, stone) => {
            catalog[stone.id] = stone;

            return catalog;
        }, {});

        populateStoneSelect(stoneList);
        generateStoneCollection(stoneList);
        renderStoneMarquee(stoneList);

        return stoneList;
    } catch (error) {
        console.error("Unable to load stones from API:", error);

        renderCollectionMessage("Unable to load stones. Please try again later.");

        return [];
    }
}

/* ========================================
   FOOTER
   ======================================== */

function initFooterYear() {
    const year = getElement("current-year");

    if (year) {
        year.textContent = String(new Date().getFullYear());
    }
}

/* ========================================
   INITIALIZATION
   ======================================== */

document.addEventListener("DOMContentLoaded", () => {
    initMobileMenu();
    setupSmoothScroll();
    initScrollEffects();
    initActiveNavLinks();
    initScrollReveal();
    initCountUp();
    initFooterYear();
    initFormValidation();
    initStoneDialog();
    initStoneCollection();
    loadStonesAsync();
});
