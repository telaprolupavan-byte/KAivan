/* ========================================
   KAIVAN STONE
   Earth to Excellence
   ======================================== */

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
   MOBILE MENU
   ======================================== */

function setMenuOpen(isOpen) {
    const navLinks = queryElements(".nav-links")[0];
    const menuButton = getElement("menu-button");

    if (navLinks) {
        navLinks.classList.toggle("open", isOpen);
    }

    if (menuButton) {
        menuButton.setAttribute("aria-expanded", String(isOpen));
    }
}

function toggleMobileMenu() {
    const navLinks = queryElements(".nav-links")[0];

    setMenuOpen(!(navLinks && navLinks.classList.contains("open")));
}

function closeMobileMenu() {
    setMenuOpen(false);
}

function initMobileMenu() {
    const menuButton = getElement("menu-button");

    if (menuButton) {
        menuButton.addEventListener("click", toggleMobileMenu);
    }
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

            if (targetElement) {
                event.preventDefault();

                targetElement.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

                closeMobileMenu();
            }
        });
    });
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

function stoneImageSource(stone) {
    return stone.image || `images/${stone.id}.jpg`;
}

function createStoneImage(stone, loading = "lazy") {
    const image = document.createElement("img");
    image.src = stoneImageSource(stone);
    image.alt = `${stone.name} granite`;
    image.loading = loading;
    image.addEventListener(
        "error",
        () => {
            image.src = "images/hero.jpg";
        },
        { once: true }
    );

    return image;
}

function createStockBadge(stone) {
    return createElement("span", {
        className: `stone-stock ${stone.inStock ? "in-stock" : "out-of-stock"}`,
        text: stone.inStock ? "In Stock" : "Out of Stock"
    });
}

function createStoneCard(stone) {
    const article = createElement("article", { className: "stone-card" });

    const media = createElement("button", { className: "stone-card-media" });
    media.type = "button";
    media.dataset.stone = stone.id;
    media.disabled = !stone.inStock;
    media.setAttribute("aria-label", `View details for ${stone.name}`);
    media.append(createStoneImage(stone), createStockBadge(stone));

    const body = createElement("div", { className: "stone-card-body" });

    const title = createElement("h3", { text: stone.name });

    const origin = createElement("p", {
        className: "stone-origin",
        text: [stone.origin, stone.dimensions].filter(Boolean).join(" · ")
    });

    const price = createElement("p", {
        className: "stone-price",
        text: stone.price || "Contact for pricing"
    });

    const button = createElement("button", {
        className: "stone-button",
        text: stone.inStock ? "View Stone" : "Coming Soon"
    });
    button.type = "button";
    button.dataset.stone = stone.id;
    button.disabled = !stone.inStock;

    body.append(title, origin, price, button);
    article.append(media, body);

    return article;
}

function createSkeletonCard() {
    const article = createElement("article", { className: "stone-card skeleton" });
    article.setAttribute("aria-hidden", "true");

    const media = createElement("div", { className: "stone-card-media" });
    const body = createElement("div", { className: "stone-card-body" });

    body.append(
        createElement("div", { className: "skeleton-line" }),
        createElement("div", { className: "skeleton-line short" })
    );

    article.append(media, body);

    return article;
}

function createDetailItem(label, value, full = false) {
    const item = createElement("div", { className: full ? "full" : "" });
    const term = createElement("dt", { text: label });
    const description = document.createElement("dd");

    if (value instanceof Node) {
        description.append(value);
    } else {
        description.textContent = String(value);
    }

    item.append(term, description);

    return item;
}

function openStoneDialog(stone) {
    const dialog = getElement("stone-dialog");
    const dialogBody = getElement("stone-dialog-body");

    if (!dialog || !dialogBody) {
        return;
    }

    const detail = createElement("div", { className: "stone-detail" });

    const media = createElement("div", { className: "stone-detail-media" });
    media.append(createStoneImage(stone, "eager"));

    const info = createElement("div", { className: "stone-detail-info" });
    const title = createElement("h3", { text: stone.name });
    title.id = "stone-dialog-title";

    const description = createElement("p", {
        className: "stone-desc",
        text: stone.description || ""
    });

    const meta = createElement("dl", { className: "stone-meta" });

    [
        ["Price", stone.price],
        ["Origin", stone.origin],
        ["Color", stone.color],
        ["Finish", stone.finish],
        ["Size", stone.dimensions]
    ]
        .filter(([, value]) => value)
        .forEach(([label, value]) => meta.append(createDetailItem(label, value)));

    if (typeof stone.rating === "number" && stone.rating > 0) {
        const stars = "★".repeat(Math.round(stone.rating));

        meta.append(createDetailItem("Rating", `${stars} ${stone.rating}/5`));
    }

    if (Array.isArray(stone.certifications) && stone.certifications.length > 0) {
        const badges = document.createDocumentFragment();

        stone.certifications.forEach(cert => {
            badges.append(createElement("span", { className: "cert-badge", text: cert }));
        });

        meta.append(createDetailItem("Certifications", badges, true));
    }

    info.append(createStockBadge(stone), title, description, meta);

    if (stone.inStock) {
        const quoteButton = createElement("button", {
            className: "stone-quote-button",
            text: `Request a Quote for ${stone.name}`
        });
        quoteButton.type = "button";
        quoteButton.addEventListener("click", () => {
            dialog.close();
            selectStoneForQuote(stone.id);
        });

        info.append(quoteButton);
    }

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
            behavior: "smooth",
            block: "start"
        });
    }

    getElement("name")?.focus({ preventScroll: true });
}

function generateStoneCollection(stoneList) {
    const collectionGrid = getElement("collection-grid");

    if (!collectionGrid) {
        return;
    }

    collectionGrid.removeAttribute("aria-busy");
    collectionGrid.replaceChildren(...stoneList.map(createStoneCard));
}

function initStoneCollection() {
    const collectionGrid = getElement("collection-grid");

    if (!collectionGrid) {
        return;
    }

    // One delegated listener handles both the image and the "View Stone" button.
    collectionGrid.addEventListener("click", (event) => {
        const trigger = event.target.closest("[data-stone]");

        if (!trigger || trigger.disabled) {
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

        return stoneList;
    } catch (error) {
        console.error("Unable to load stones from API:", error);

        renderCollectionMessage("Unable to load stones. Please try again later.");

        return [];
    }
}

/* ========================================
   PAGE CHROME
   ======================================== */

function initHeaderState() {
    const header = queryElements(".site-header")[0];

    if (!header) {
        return;
    }

    const update = () => header.classList.toggle("scrolled", window.scrollY > 8);

    update();
    window.addEventListener("scroll", update, { passive: true });
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

function initScrollReveal() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || !("IntersectionObserver" in window)) {
        return;
    }

    const targets = queryElements(
        ".section-heading, .about-grid article, .logistics-grid article, .stat, .contact-intro"
    );

    const observer = new IntersectionObserver(
        (entries) => {
            entries
                .filter(entry => entry.isIntersecting)
                .forEach(entry => {
                    entry.target.classList.add("visible");
                    observer.unobserve(entry.target);
                });
        },
        { threshold: 0.15 }
    );

    targets.forEach(target => {
        target.classList.add("reveal");
        observer.observe(target);
    });
}

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
    initHeaderState();
    initActiveNavLinks();
    initScrollReveal();
    initFooterYear();
    initFormValidation();
    initStoneDialog();
    initStoneCollection();
    loadStonesAsync();
});
