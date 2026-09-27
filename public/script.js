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

    if (type === "success") {
        formMessage.style.color = "#2e7d32";
    } else if (type === "error") {
        formMessage.style.color = "#d32f2f";
    } else {
        formMessage.style.color = "#555";
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const formValues = extractFormValues();

    const validations = [
        validateName(formValues.name),
        validateEmail(formValues.email),
        validatePhone(formValues.phone),
        validateStone(formValues.stoneId),
        validateMessage(formValues.message)
    ];

    const invalidField = validations.find(validation => !validation.valid);

    if (invalidField) {
        displayFormMessage(invalidField.error, "error");
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
    }
}

/* ========================================
   STONE DISPLAY
   ======================================== */

function createStoneCard(stone) {
    const article = createElement("article", { className: "stone-card" });

    const image = document.createElement("img");
    image.src = stone.image || `images/${stone.id}.jpg`;
    image.alt = `${stone.name} granite`;
    image.loading = "lazy";
    image.addEventListener(
        "error",
        () => {
            image.src = "images/hero.jpg";
        },
        { once: true }
    );

    const title = createElement("h3", { text: stone.name });

    const price = createElement("p", {
        className: "stone-price",
        text: stone.price || "Contact for pricing"
    });

    const stock = createElement("span", {
        className: `stone-stock ${stone.inStock ? "in-stock" : "out-of-stock"}`,
        text: stone.inStock ? "In Stock" : "Out of Stock"
    });

    const button = createElement("button", {
        className: "stone-button",
        text: "View Stone"
    });
    button.type = "button";
    button.dataset.stone = stone.id;
    button.disabled = !stone.inStock;

    article.append(image, title, price, stock, button);

    return article;
}

function createDetailRow(label, value) {
    const row = document.createElement("p");
    const term = createElement("strong", { text: `${label}:` });

    row.append(term, " ");

    if (value instanceof Node) {
        row.append(value);
    } else {
        row.append(String(value));
    }

    return row;
}

function displayStoneInfo(stone) {
    const stoneInfo = getElement("stone-info");

    if (!stoneInfo) {
        return;
    }

    const container = createElement("div", { className: "stone-detail" });
    const title = createElement("h3", { text: stone.name });
    const description = createElement("p", {
        className: "stone-desc",
        text: stone.description || ""
    });
    const meta = createElement("div", { className: "stone-meta" });

    const textDetails = [
        ["Price", stone.price],
        ["Origin", stone.origin],
        ["Color", stone.color],
        ["Finish", stone.finish],
        ["Size", stone.dimensions]
    ];

    textDetails
        .filter(([, value]) => value)
        .forEach(([label, value]) => meta.append(createDetailRow(label, value)));

    if (typeof stone.rating === "number" && stone.rating > 0) {
        const stars = "⭐".repeat(Math.round(stone.rating));

        meta.append(createDetailRow("Rating", `${stars} (${stone.rating}/5)`));
    }

    if (Array.isArray(stone.certifications) && stone.certifications.length > 0) {
        const badges = document.createDocumentFragment();

        stone.certifications.forEach(cert => {
            badges.append(createElement("span", { className: "cert-badge", text: cert }));
        });

        meta.append(createDetailRow("Certifications", badges));
    }

    meta.append(
        createDetailRow("Stock", stone.inStock ? "✓ Available" : "✗ Coming Soon")
    );

    container.append(title, description, meta);

    if (stone.inStock) {
        const quoteButton = createElement("button", {
            className: "stone-quote-button",
            text: `Request a Quote for ${stone.name}`
        });
        quoteButton.type = "button";
        quoteButton.addEventListener("click", () => selectStoneForQuote(stone.id));

        container.append(quoteButton);
    }

    stoneInfo.replaceChildren(container);
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

    if (contactSection) {
        contactSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}

function attachStoneButtonListeners() {
    queryElements(".stone-button").forEach(button => {
        button.addEventListener("click", () => {
            const stone = stones[button.dataset.stone];

            if (stone) {
                displayStoneInfo(stone);
            }
        });
    });
}

function generateStoneCollection(stoneList) {
    const collectionGrid = getElement("collection-grid");

    if (!collectionGrid) {
        return;
    }

    collectionGrid.replaceChildren(...stoneList.map(createStoneCard));

    attachStoneButtonListeners();
}

function resetStoneInfo() {
    const stoneInfo = getElement("stone-info");

    if (!stoneInfo) {
        return;
    }

    stoneInfo.replaceChildren(
        createElement("h3", { text: "Select a stone" }),
        createElement("p", { text: "Choose a stone above to learn more." })
    );
}

async function loadStonesAsync() {
    renderCollectionMessage("Loading stones...");

    try {
        const response = await fetch("/api/stones");

        if (!response.ok) {
            throw new Error(`Stone API request failed with status ${response.status}`);
        }

        const stoneList = normalizeStonesResponse(await response.json());

        if (stoneList.length === 0) {
            renderCollectionMessage("No stones available at this time.");
            resetStoneInfo();

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
        resetStoneInfo();

        return [];
    }
}

/* ========================================
   INITIALIZATION
   ======================================== */

document.addEventListener("DOMContentLoaded", () => {
    initMobileMenu();
    setupSmoothScroll();
    initFormValidation();
    loadStonesAsync();
});
