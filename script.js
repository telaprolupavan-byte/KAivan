/* ========================================
   KAIVAN STONE — PROGRESSIVE WEB DEVELOPMENT
   Earth to Excellence
   ======================================== */

console.log("🪨 Kaivan website loaded");

/* ========================================
   STEP 5: FUNCTIONS
   Modularizing code into reusable, single-purpose functions
   ======================================== */

// Helper function: Safely get DOM elements
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with ID "${id}" not found`);
    }
    return element;
}

// Helper function: Safely query elements
function queryElements(selector) {
    return document.querySelectorAll(selector);
}

/* ========================================
   STEP 7 & 9: STONE DATA & LOGIC
   Rich data structure with descriptions, properties, and metadata
   ======================================== */

let stones = {};
let quotes = [];

/* ========================================
   STEP 5: FUNCTIONS - Mobile Menu Management
   ======================================== */

function toggleMobileMenu() {
    const navLinks = queryElements(".nav-links")[0];
    if (navLinks) {
        navLinks.classList.toggle("open");
        console.log("Mobile menu toggled");
    }
}

function closeMobileMenu() {
    const navLinks = queryElements(".nav-links")[0];
    if (navLinks) {
        navLinks.classList.remove("open");
    }
}

// Initialize mobile menu
function initMobileMenu() {
    const menuButton = getElement("menu-button");
    if (menuButton) {
        menuButton.addEventListener("click", toggleMobileMenu);
        console.log("✓ Mobile menu initialized");
    }
}

/* ========================================
   STEP 5: FUNCTIONS - Smooth Scrolling
   ======================================== */

function setupSmoothScroll() {
    queryElements("a[href^='#']").forEach(anchor => {
        anchor.addEventListener("click", function (e) {
            e.preventDefault();
            const targetId = this.getAttribute("href");
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
                closeMobileMenu();
                console.log(`Scrolled to ${targetId}`);
            }
        });
    });
    console.log("✓ Smooth scroll initialized");
}

/* ========================================
   STEP 5: FUNCTIONS - Form Validation
   Separate validation logic into modular functions
   ======================================== */

function extractFormValues() {
    const stoneSelect = getElement("stone");
    const stoneId = stoneSelect ? stoneSelect.value.trim() : "";
    const selectedStone = stones[stoneId];

    return {
        name: getElement("name").value.trim(),
        email: getElement("email").value.trim(),
        phone: getElement("phone").value.trim(),
        company: getElement("company").value.trim(),
        stoneId: stoneId,
        stoneName: selectedStone ? selectedStone.name : "",
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
        return {
            valid: false,
            error: "Please enter a valid email address."
        };
    }

    return { valid: true, error: "" };
}

function validatePhone(phone) {
    if (phone === "") {
        return {
            valid: false,
            error: "Please enter your phone number."
        };
    }

    const phoneRegex = /^\d{10,}$/;

    if (!phoneRegex.test(phone.replace(/\D/g, ""))) {
        return {
            valid: false,
            error: "Please enter a valid phone number."
        };
    }

    return { valid: true, error: "" };
}

function validateStone(stoneId) {
    if (stoneId === "") {
        return {
            valid: false,
            error: "Please select a stone."
        };
    }

    if (!stones[stoneId]) {
        return {
            valid: false,
            error: "Selected stone is not available."
        };
    }

    if (stones[stoneId].inStock === false) {
        return {
            valid: false,
            error: "Please select a stone that is currently in stock."
        };
    }

    return {
        valid: true,
        error: ""
    };
}

function validateMessage(message) {
    if (message === "") {
        return {
            valid: false,
            error: "Please enter your message."
        };
    }

    if (message.length < 10) {
        return {
            valid: false,
            error: "Message must be at least 10 characters."
        };
    }

    return {
        valid: true,
        error: ""
    };
}

function displayFormMessage(message, type = "success") {
    const formMessage = getElement("form-message");

    if (!formMessage) {
        return;
    }

    formMessage.textContent = message;

    if (type === "success") {
        formMessage.style.color = "#4caf50";
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

    const invalidField = validations.find(
        validation => !validation.valid
    );

    if (invalidField) {
        displayFormMessage(
            invalidField.error,
            "error"
        );
        return;
    }

    const submitButton = getElement("quote-submit");

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";
    }

    displayFormMessage(
        "Submitting your quote request...",
        "info"
    );

    try {
        const response = await fetch("/api/quotes", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(formValues)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error ||
                "Unable to submit your quote request."
            );
        }

        const reference =
            result.quote?.reference || "Pending";

        displayFormMessage(
            `Thank you! Your quote request has been received. Reference: ${reference}`,
            "success"
        );

        form.reset();
    } catch (error) {
        console.error(
            "Quote submission failed:",
            error
        );

        displayFormMessage(
            error.message ||
            "Unable to submit your quote request. Please try again.",
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
        quoteForm.addEventListener(
            "submit",
            handleFormSubmit
        );

        console.log(
            "✓ Form validation initialized"
        );
    }
}

/* ========================================
   STEP 8: QUOTE MANAGEMENT
   ======================================== */

function renderQuoteMessage(message) {
    const quoteList = getElement("quote-list");

    if (!quoteList) {
        return;
    }

    quoteList.innerHTML =
        `<p class="quote-status">${message}</p>`;
}

function formatQuoteDate(createdAt) {
    const date = new Date(createdAt);

    if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

function appendQuoteField(
    container,
    label,
    value
) {
    const term = document.createElement("dt");
    term.textContent = label;

    const description =
        document.createElement("dd");

    description.textContent =
        value || "Not provided";

    container.append(term, description);
}

function createQuoteCard(quote) {
    const article =
        document.createElement("article");

    article.className = "quote-card";

    const heading =
        document.createElement("h4");

    heading.textContent =
        quote.name || "Unnamed request";

    const button =
        document.createElement("button");

    button.className =
        "quote-detail-button";

    button.type = "button";

    button.dataset.quoteId =
        String(quote._id);

    button.textContent =
        "View Details";

    button.addEventListener(
        "click",
        () =>
            loadQuoteDetailAsync(
                button.dataset.quoteId
            )
    );

    const details =
        document.createElement("dl");

    const fields = [
        ["Reference", quote.reference],
        ["Email", quote.email],
        ["Company", quote.company],
        ["Phone", quote.phone],
        ["Stone", quote.stoneName],
        ["Quantity", quote.quantity],
        ["Message", quote.message],
        ["Status", quote.status],
        ["Submitted", formatQuoteDate(quote.createdAt)]
    ];

    fields.forEach(([label, value]) => {
        const term =
            document.createElement("dt");

        term.textContent = label;

        const description =
            document.createElement("dd");

        description.textContent =
            value || "Not provided";

        details.append(
            term,
            description
        );
    });

    article.append(
        heading,
        details,
        button
    );

    return article;
}

function displayQuotes(quoteList) {
    const quoteContainer =
        getElement("quote-list");

    if (!quoteContainer) {
        return;
    }

    quoteContainer.innerHTML = "";

    quoteList.forEach(quote => {
        quoteContainer.appendChild(
            createQuoteCard(quote)
        );
    });
}

function renderQuoteDetailMessage(
    title,
    message
) {
    const quoteDetail =
        getElement("quote-detail");

    if (!quoteDetail) {
        return;
    }

    quoteDetail.innerHTML = "";

    const heading =
        document.createElement("h3");

    heading.textContent = title;

    const paragraph =
        document.createElement("p");

    paragraph.textContent = message;

    quoteDetail.append(
        heading,
        paragraph
    );
}

function displayQuoteDetail(quote) {
    const quoteDetail =
        getElement("quote-detail");

    if (!quoteDetail) {
        return;
    }

    quoteDetail.innerHTML = "";

    const heading =
        document.createElement("h3");

    heading.textContent =
        quote.name || "Unnamed request";

    const details =
        document.createElement("dl");

    appendQuoteField(
        details,
        "Reference",
        quote.reference
    );

    appendQuoteField(
        details,
        "Email",
        quote.email
    );

    appendQuoteField(
        details,
        "Company",
        quote.company
    );

    appendQuoteField(
        details,
        "Phone",
        quote.phone
    );

    appendQuoteField(
        details,
        "Stone",
        quote.stoneName
    );

    appendQuoteField(
        details,
        "Quantity",
        quote.quantity
    );

    appendQuoteField(
        details,
        "Message",
        quote.message
    );

    appendQuoteField(
        details,
        "Status",
        quote.status
    );

    appendQuoteField(
        details,
        "Submitted",
        formatQuoteDate(
            quote.createdAt
        )
    );

    quoteDetail.append(
        heading,
        details
    );
}

async function loadQuotesAsync() {
    renderQuoteMessage(
        "Loading quote requests..."
    );

    try {
        const response =
            await fetch("/api/quotes");

        if (!response.ok) {
            throw new Error(
                `Quote API request failed with status ${response.status}`
            );
        }

        const payload =
            await response.json();

        if (!Array.isArray(payload)) {
            throw new Error(
                "Quote API returned an invalid response."
            );
        }

        quotes = payload;

        if (quotes.length === 0) {
            renderQuoteMessage(
                "No quote requests have been submitted yet."
            );

            renderQuoteDetailMessage(
                "No quote request selected",
                "Submit a quote request to view its details here."
            );

            return [];
        }

        displayQuotes(quotes);

        renderQuoteDetailMessage(
            "Select a quote request",
            "Choose a quote request above to view its details."
        );

        return quotes;
    } catch (error) {
        console.error(
            "Unable to load quotes from API:",
            error
        );

        quotes = [];

        renderQuoteMessage(
            "Unable to load quote requests. Please try again later."
        );

        renderQuoteDetailMessage(
            "Unable to load quote request",
            "Please try again later."
        );

        return [];
    }
}

async function loadQuoteDetailAsync(
    quoteId
) {
    renderQuoteDetailMessage(
        "Loading quote request...",
        "Retrieving quote details."
    );

    try {
        const response =
            await fetch(
                `/api/quotes/${encodeURIComponent(quoteId)}`
            );

        if (response.status === 400) {
            renderQuoteDetailMessage(
                "Invalid quote request",
                "The selected quote request has an invalid ID."
            );

            return null;
        }

        if (response.status === 404) {
            renderQuoteDetailMessage(
                "Quote request not found",
                "This quote request could not be found."
            );

            return null;
        }

        if (!response.ok) {
            throw new Error(
                `Quote detail request failed with status ${response.status}`
            );
        }

        const quote =
            await response.json();

        displayQuoteDetail(quote);

        return quote;
    } catch (error) {
        console.error(
            "Unable to load quote details from API:",
            error
        );

        renderQuoteDetailMessage(
            "Unable to load quote request",
            "Please try again later."
        );

        return null;
    }
}

/* ========================================
   STEP 5 & 6: FUNCTIONS - Stone Display & DOM Manipulation
   Create and manipulate DOM elements dynamically
   ======================================== */

function createStoneCard(stone) {
    const article =
        document.createElement("article");

    article.className =
        "stone-card";

    const stockStatus =
        stone.inStock
            ? "In Stock"
            : "Out of Stock";

    const stockClass =
        stone.inStock
            ? "in-stock"
            : "out-of-stock";

    const imageSrc =
        stone.image ||
        `images/${stone.id}.jpg`;

    article.innerHTML = `
        <img
            src="${imageSrc}"
            alt="${stone.name} granite"
            loading="lazy"
            onerror="this.src='images/hero.jpg'"
        >

        <h3>${stone.name}</h3>

        <p class="stone-price">
            ${stone.price || "Contact for pricing"}
        </p>

        <span class="stone-stock ${stockClass}">
            ${stockStatus}
        </span>

        <button
            class="stone-button"
            data-stone="${stone.id}"
            ${!stone.inStock ? "disabled" : ""}
        >
            View Stone
        </button>
    `;

    return article;
}

function displayStoneInfo(stone) {
    const stoneInfo =
        getElement("stone-info");

    if (!stoneInfo) {
        return;
    }

    const ratingStars =
        typeof stone.rating === "number"
            ? "⭐".repeat(
                Math.round(stone.rating)
            )
            : "";

    const certBadges =
        Array.isArray(
            stone.certifications
        )
            ? stone.certifications
                .map(
                    cert =>
                        `<span class="cert-badge">${cert}</span>`
                )
                .join("")
            : "";

    const details = [
        stone.price
            ? `<p><strong>Price:</strong> ${stone.price}</p>`
            : "",

        stone.origin
            ? `<p><strong>Origin:</strong> ${stone.origin}</p>`
            : "",

        stone.color
            ? `<p><strong>Color:</strong> ${stone.color}</p>`
            : "",

        stone.finish
            ? `<p><strong>Finish:</strong> ${stone.finish}</p>`
            : "",

        stone.dimensions
            ? `<p><strong>Size:</strong> ${stone.dimensions}</p>`
            : "",

        ratingStars
            ? `<p><strong>Rating:</strong> ${ratingStars} (${stone.rating}/5)</p>`
            : "",

        certBadges
            ? `<p><strong>Certifications:</strong> ${certBadges}</p>`
            : "",

        `<p><strong>Stock:</strong> ${
            stone.inStock
                ? "✓ Available"
                : "✗ Coming Soon"
        }</p>`
    ]
        .filter(Boolean)
        .join("");

    stoneInfo.innerHTML = `
        <div class="stone-detail">
            <h3>${stone.name}</h3>

            <p class="stone-desc">
                ${stone.description || ""}
            </p>

            <div class="stone-meta">
                ${details}
            </div>

            ${
                stone.inStock
                    ? `
                    <button
                        type="button"
                        class="stone-quote-button"
                        data-quote-stone="${stone.id}"
                    >
                        Request a Quote for ${stone.name}
                    </button>
                    `
                    : ""
            }
        </div>
    `;

    const quoteButton =
        stoneInfo.querySelector(
            ".stone-quote-button"
        );

    if (quoteButton) {
        quoteButton.addEventListener(
            "click",
            () => {
                selectStoneForQuote(
                    stone.id
                );
            }
        );
    }

    console.log(
        `Displayed stone info for: ${stone.name}`
    );
}

/* ========================================
   STEP 6: DOM MANIPULATION & STEP 10: REAL API FETCH
   ======================================== */

function renderCollectionMessage(
    message
) {
    const collectionGrid =
        getElement("collection-grid");

    if (!collectionGrid) {
        return;
    }

    collectionGrid.innerHTML =
        `<p class="collection-status">${message}</p>`;
}

function normalizeStonesResponse(
    payload
) {
    if (
        !payload ||
        typeof payload !== "object"
    ) {
        throw new Error(
            "Stone API returned an invalid response."
        );
    }

    if (Array.isArray(payload)) {
        return payload.map(
            (stone, index) => ({
                ...stone,
                id:
                    stone.id ||
                    `stone-${index + 1}`
            })
        );
    }

    return Object.entries(payload).map(
        ([id, stone]) => ({
            ...stone,
            id: stone.id || id
        })
    );
}

function populateStoneSelect(
    stoneList
) {
    const stoneSelect =
        getElement("stone");

    if (!stoneSelect) {
        return;
    }

    stoneSelect.innerHTML =
        '<option value="">Select a stone</option>';

    stoneList
        .filter(
            stone =>
                stone.inStock !== false
        )
        .forEach(stone => {
            const option =
                document.createElement(
                    "option"
                );

            option.value =
                stone.id;

            option.textContent =
                stone.name;

            stoneSelect.appendChild(
                option
            );
        });
}

function selectStoneForQuote(
    stoneId
) {
    const stoneSelect =
        getElement("stone");

    const contactSection =
        getElement("contact");

    if (!stoneSelect) {
        return;
    }

    stoneSelect.value =
        stoneId;

    if (contactSection) {
        contactSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    console.log(
        `Selected stone for quote: ${stoneId}`
    );
}

function attachStoneButtonListeners() {
    const stoneButtons =
        queryElements(".stone-button");

    stoneButtons.forEach(
        function (button) {
            button.addEventListener(
                "click",
                function () {
                    const stoneId =
                        button.dataset.stone;

                    const stone =
                        stones[stoneId];

                    if (stone) {
                        displayStoneInfo(
                            stone
                        );
                    }
                }
            );
        }
    );

    console.log(
        `✓ Attached event listeners to ${stoneButtons.length} stone buttons`
    );
}

function generateStoneCollection(
    stoneList
) {
    const collectionGrid =
        getElement("collection-grid");

    if (!collectionGrid) {
        return;
    }

    collectionGrid.innerHTML = "";

    stoneList.forEach(stone => {
        collectionGrid.appendChild(
            createStoneCard(stone)
        );
    });

    attachStoneButtonListeners();

    console.log(
        `✓ Generated ${stoneList.length} stone cards`
    );
}

function resetStoneInfo() {
    const stoneInfo =
        getElement("stone-info");

    if (!stoneInfo) {
        return;
    }

    stoneInfo.innerHTML = `
        <h3>Select a stone</h3>
        <p>Choose a stone above to learn more.</p>
    `;
}

async function loadStonesAsync() {
    renderCollectionMessage(
        "Loading stones..."
    );

    try {
        const response =
            await fetch("/api/stones");

        if (!response.ok) {
            throw new Error(
                `Stone API request failed with status ${response.status}`
            );
        }

        const payload =
            await response.json();

        const stoneList =
            normalizeStonesResponse(
                payload
            );

        if (stoneList.length === 0) {
            renderCollectionMessage(
                "No stones available at this time."
            );

            resetStoneInfo();

            return [];
        }

        stones =
            stoneList.reduce(
                (catalog, stone) => {
                    catalog[stone.id] =
                        stone;

                    return catalog;
                },
                {}
            );

        populateStoneSelect(
            stoneList
        );

        generateStoneCollection(
            stoneList
        );

        return stoneList;
    } catch (error) {
        console.error(
            "Unable to load stones from API:",
            error
        );

        renderCollectionMessage(
            "Unable to load stones. Please try again later."
        );

        resetStoneInfo();

        return [];
    }
}

function stoneToJSON(
    stoneId
) {
    const stone =
        stones[stoneId];

    if (!stone) {
        return null;
    }

    return JSON.stringify(
        stone,
        null,
        2
    );
}

function saveStoneToLocalStorage(
    stoneId
) {
    const stone =
        stones[stoneId];

    if (!stone) {
        console.warn(
            `Stone "${stoneId}" not found`
        );

        return false;
    }

    localStorage.setItem(
        `stone_${stoneId}`,
        JSON.stringify(stone)
    );

    console.log(
        `✓ Saved ${stone.name} to localStorage`
    );

    return true;
}

function getStoneFromLocalStorage(
    stoneId
) {
    const data =
        localStorage.getItem(
            `stone_${stoneId}`
        );

    if (!data) {
        return null;
    }

    const stone =
        JSON.parse(data);

    console.log(
        `✓ Loaded ${stone.name} from localStorage`
    );

    return stone;
}

async function loadStoneAsync(
    stoneId
) {
    if (stones[stoneId]) {
        return stones[stoneId];
    }

    const response =
        await fetch(
            `/api/stones/${stoneId}`
        );

    if (!response.ok) {
        throw new Error(
            `Stone "${stoneId}" request failed with status ${response.status}`
        );
    }

    const stone =
        await response.json();

    stones[stoneId] = {
        ...stone,
        id: stoneId
    };

    return stones[stoneId];
}

/* ========================================
   STEP 13: BACKEND PREPARATION
   API endpoint structure and data modeling

   BACKEND API ENDPOINTS (for future implementation):
   
   GET    /api/stones              - Fetch all stones
   GET    /api/stones/:id          - Fetch single stone
   POST   /api/quotes              - Submit quote request
   PUT    /api/stones/:id          - Update stone (admin)
   DELETE /api/stones/:id          - Delete stone (admin)
   
   DATABASE SCHEMA (MongoDB example):
   {
       _id: ObjectId,
       id: String,
       name: String,
       description: String,
       price: String,
       origin: String,
       dimensions: String,
       rating: Number,
       certifications: Array,
       inStock: Boolean,
       image: String,
       createdAt: Date,
       updatedAt: Date
   }
   
   QUOTE SUBMISSION SCHEMA:
   {
       _id: ObjectId,
       name: String,
       email: String,
       phone: String,
       company: String,
       message: String,
       stonesInterested: Array,
       createdAt: Date,
       status: String (pending, contacted, completed)
   }
   ======================================== */


/* ========================================
   INITIALIZATION - Run on Page Load
   ======================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {
        console.log(
            "\n🔧 Initializing Kaivan website...\n"
        );

        // Initialize all features
        initMobileMenu();
        setupSmoothScroll();
        initFormValidation();
        loadStonesAsync();

        console.log(
            "\n✨ Website fully initialized!\n"
        );

        console.log(
            "📚 Learning Phases Implemented:"
        );

        console.log(
            "  Step 5 - Functions ✓"
        );

        console.log(
            "  Step 6 - DOM Manipulation ✓"
        );

        console.log(
            "  Step 7 - Stone Interaction ✓"
        );

        console.log(
            "  Step 8 - Advanced Forms ✓"
        );

        console.log(
            "  Step 9 - Data & Logic ✓"
        );

        console.log(
            "  Step 10 - Fetch & APIs ✓"
        );

        console.log(
            "  Step 11 - JSON ✓"
        );

        console.log(
            "  Step 12 - Async JS ✓"
        );

        console.log(
            "  Step 13 - Backend Preparation ✓"
        );

        console.log(
            "\n🎓 Try these in Console:"
        );

        console.log(
            "  loadStonesAsync()"
        );

        console.log(
            "  loadStoneAsync('steel-grey')"
        );

        console.log(
            "  stoneToJSON('black-pearl')"
        );

        console.log(
            "  saveStoneToLocalStorage('vision-white')"
        );

        console.log(
            "  getStoneFromLocalStorage('vision-white')"
        );
    }
);