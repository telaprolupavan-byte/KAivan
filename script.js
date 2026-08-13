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

const stones = {
    "steel-grey": {
        name: "Steel Grey",
        description: "A sophisticated dark granite with subtle grey tones.",
        origin: "India",
        price: "$45/sq ft",
        dimensions: "12x12 tiles",
        rating: 4.8,
        certifications: ["ISO 9001", "Green Certified"],
        inStock: true
    },
    "black-pearl": {
        name: "Black Pearl",
        description: "A striking jet-black granite with luminous sparkle effects.",
        origin: "India",
        price: "$52/sq ft",
        dimensions: "12x12 tiles",
        rating: 4.9,
        certifications: ["ISO 9001"],
        inStock: true
    },
    "vision-white": {
        name: "Vision White",
        description: "A pristine white granite ideal for contemporary designs.",
        origin: "India",
        price: "$48/sq ft",
        dimensions: "12x12 tiles",
        rating: 4.7,
        certifications: ["ISO 9001", "Green Certified"],
        inStock: true
    },
    "moon-white": {
        name: "Moon White",
        description: "An elegant pearl-white granite with subtle mineral patterns.",
        origin: "India",
        price: "$50/sq ft",
        dimensions: "12x12 tiles",
        rating: 4.8,
        certifications: ["ISO 9001"],
        inStock: true
    },
    "black-galaxy": {
        name: "Black Galaxy",
        description: "A dramatic black granite with golden star-like inclusions.",
        origin: "India",
        price: "$58/sq ft",
        dimensions: "12x12 tiles",
        rating: 4.9,
        certifications: ["ISO 9001", "Sustainable Sourced"],
        inStock: true
    },
    "burgundy": {
        name: "Burgundy",
        description: "A warm burgundy-toned granite perfect for luxury interiors.",
        origin: "India",
        price: "$55/sq ft",
        dimensions: "12x12 tiles",
        rating: 4.6,
        certifications: ["ISO 9001"],
        inStock: false
    },
    "jasmine-white": {
        name: "Jasmine White",
        description: "A bright and clean white granite with fine grain texture.",
        origin: "India",
        price: "$46/sq ft",
        dimensions: "12x12 tiles",
        rating: 4.7,
        certifications: ["Green Certified"],
        inStock: true
    },
    "mint-pearl": {
        name: "Mint Pearl",
        description: "A soft mint-toned granite for subtle, sophisticated spaces.",
        origin: "India",
        price: "$49/sq ft",
        dimensions: "12x12 tiles",
        rating: 4.5,
        certifications: ["ISO 9001"],
        inStock: true
    },
    "sil-red": {
        name: "Sil Red",
        description: "A vibrant red granite with intricate mineral formations.",
        origin: "India",
        price: "$56/sq ft",
        dimensions: "12x12 tiles",
        rating: 4.7,
        certifications: ["Sustainable Sourced"],
        inStock: true
    },
    "black": {
        name: "Black",
        description: "A classic pure black granite, versatile and timeless.",
        origin: "India",
        price: "$44/sq ft",
        dimensions: "12x12 tiles",
        rating: 4.9,
        certifications: ["ISO 9001", "Green Certified"],
        inStock: true
    }
};

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
    return {
        name: getElement("name").value.trim(),
        email: getElement("email").value.trim(),
        company: getElement("company").value.trim(),
        phone: getElement("phone").value.trim(),
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
    // Simple email regex
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
    // Simple phone validation (10+ digits)
    const phoneRegex = /^\d{10,}$/;
    if (!phoneRegex.test(phone.replace(/\D/g, ""))) {
        return { valid: false, error: "Please enter a valid phone number." };
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

function displayFormMessage(message, isSuccess = true) {
    const formMessage = getElement("form-message");
    if (formMessage) {
        formMessage.textContent = message;
        formMessage.style.color = isSuccess ? "#4caf50" : "#d32f2f";
    }
}

function handleFormSubmit(event) {
    event.preventDefault();
    
    const formValues = extractFormValues();
    
    // Validate each field
    const nameValidation = validateName(formValues.name);
    if (!nameValidation.valid) {
        displayFormMessage(nameValidation.error, false);
        return;
    }
    
    const emailValidation = validateEmail(formValues.email);
    if (!emailValidation.valid) {
        displayFormMessage(emailValidation.error, false);
        return;
    }
    
    const phoneValidation = validatePhone(formValues.phone);
    if (!phoneValidation.valid) {
        displayFormMessage(phoneValidation.error, false);
        return;
    }
    
    const messageValidation = validateMessage(formValues.message);
    if (!messageValidation.valid) {
        displayFormMessage(messageValidation.error, false);
        return;
    }
    
    // All validation passed
    displayFormMessage(
        "Thank you! Your quote request has been received. We'll contact you within 24 hours.",
        true
    );
    
    // Log form data (in real app, would send to server)
    console.log("📝 Form submitted:", formValues);
    
    // Reset form
    event.target.reset();
    setTimeout(() => displayFormMessage("", true), 3000);
}

function initFormValidation() {
    const quoteForm = getElement("quote-form");
    if (quoteForm) {
        quoteForm.addEventListener("submit", handleFormSubmit);
        console.log("✓ Form validation initialized");
    }
}

/* ========================================
   STEP 5 & 6: FUNCTIONS - Stone Display & DOM Manipulation
   Create and manipulate DOM elements dynamically
   ======================================== */

function createStoneCard(stone) {
    const article = document.createElement("article");
    article.className = "stone-card";
    
    // Stock status
    const stockStatus = stone.inStock ? "In Stock" : "Out of Stock";
    const stockClass = stone.inStock ? "in-stock" : "out-of-stock";
    
    article.innerHTML = `
        <img src="${stone.image}" alt="${stone.name} granite" loading="lazy">
        <h3>${stone.name}</h3>
        <p class="stone-price">${stone.price}</p>
        <span class="stone-stock ${stockClass}">${stockStatus}</span>
        <button class="stone-button" data-stone="${stone.id}" ${!stone.inStock ? 'disabled' : ''}>View Stone</button>
    `;
    
    return article;
}

function displayStoneInfo(stoneId) {
    const stone = stones[stoneId];
    if (!stone) {
        console.warn(`Stone "${stoneId}" not found`);
        return;
    }
    
    const stoneInfo = getElement("stone-info");
    if (!stoneInfo) return;
    
    const ratingStars = "⭐".repeat(Math.round(stone.rating));
    const certBadges = stone.certifications.map(cert => `<span class="cert-badge">${cert}</span>`).join("");
    
    stoneInfo.innerHTML = `
        <div class="stone-detail">
            <h3>${stone.name}</h3>
            <p class="stone-desc">${stone.description}</p>
            
            <div class="stone-meta">
                <p><strong>Price:</strong> ${stone.price}</p>
                <p><strong>Origin:</strong> ${stone.origin}</p>
                <p><strong>Size:</strong> ${stone.dimensions}</p>
                <p><strong>Rating:</strong> ${ratingStars} (${stone.rating}/5)</p>
                <p><strong>Certifications:</strong> ${certBadges || "None"}</p>
                <p><strong>Stock:</strong> ${stone.inStock ? "✓ Available" : "✗ Coming Soon"}</p>
            </div>
        </div>
    `;
    
    console.log(`Displayed stone info for: ${stone.name}`);
}

function attachStoneButtonListeners() {
    const stoneButtons = queryElements(".stone-button");
    stoneButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            const stoneId = button.dataset.stone;
            displayStoneInfo(stoneId);
        });
    });
    console.log(`✓ Attached event listeners to ${stoneButtons.length} stone buttons`);
}

/* ========================================
   STEP 6: DOM MANIPULATION & STEP 4: DYNAMIC GENERATION
   Generate HTML from data arrays
   ======================================== */

const stoneCollection = [
    { name: "Steel Grey", image: "images/steel-grey.jpg", id: "steel-grey" },
    { name: "Black Pearl", image: "images/black-pearl.jpg", id: "black-pearl" },
    { name: "Vision White", image: "images/vision-white.jpg", id: "vision-white" },
    { name: "Moon White", image: "images/moon-white.jpg", id: "moon-white" },
    { name: "Black Galaxy", image: "images/black-galaxy.jpg", id: "black-galaxy" },
    { name: "Burgundy", image: "images/burgundy.jpg", id: "burgundy" },
    { name: "Jasmine White", image: "images/jasmine-white.jpg", id: "jasmine-white" },
    { name: "Mint Pearl", image: "images/mint-pearl.jpg", id: "mint-pearl" },
    { name: "Sil Red", image: "images/sil-red.jpg", id: "sil-red" },
    { name: "Black", image: "images/black.jpg", id: "black" }
];

function generateStoneCollection() {
    const collectionGrid = getElement("collection-grid");
    if (!collectionGrid) return;
    
    collectionGrid.innerHTML = ""; // Clear existing
    
    // Loop: Generate cards from array data
    stoneCollection.forEach(function (stoneData) {
        const stone = stones[stoneData.id];
        if (stone) {
            stone.image = stoneData.image; // Add image to stone object
            const article = createStoneCard(stone);
            collectionGrid.appendChild(article);
        }
    });
    
    console.log(`✓ Generated ${stoneCollection.length} stone cards`);
    
    // Attach listeners to newly created buttons
    attachStoneButtonListeners();
}

/* ========================================
   STEP 11: JSON & STEP 12: ASYNC/STORAGE
   Working with JSON data format and local storage
   ======================================== */

function stoneToJSON(stoneId) {
    const stone = stones[stoneId];
    return JSON.stringify(stone, null, 2);
}

function saveStoneToLocalStorage(stoneId) {
    try {
        const stone = stones[stoneId];
        localStorage.setItem(`stone_${stoneId}`, JSON.stringify(stone));
        console.log(`✓ Saved ${stone.name} to localStorage`);
        return true;
    } catch (e) {
        console.error("Failed to save to localStorage:", e);
        return false;
    }
}

function getStoneFromLocalStorage(stoneId) {
    try {
        const data = localStorage.getItem(`stone_${stoneId}`);
        if (data) {
            const stone = JSON.parse(data);
            console.log(`✓ Loaded ${stone.name} from localStorage`);
            return stone;
        }
    } catch (e) {
        console.error("Failed to load from localStorage:", e);
    }
    return null;
}

/* ========================================
   STEP 10 & 12: FETCH & ASYNC/PROMISES
   Simulating API calls with async functions and Promises
   ======================================== */

// Mock API function - simulates fetching stones from backend
function mockFetchStones() {
    return new Promise((resolve) => {
        // Simulate network delay (2 seconds)
        setTimeout(() => {
            resolve({
                status: 200,
                data: stoneCollection,
                message: "Stones loaded from API"
            });
        }, 2000);
    });
}

// Async/await version of API call
async function loadStonesAsync() {
    try {
        console.log("⏳ Loading stones from API...");
        const response = await mockFetchStones();
        
        if (response.status === 200) {
            console.log(`✓ ${response.message}`);
            console.log(`Loaded ${response.data.length} stones`);
            return response.data;
        }
    } catch (error) {
        console.error("❌ Error loading stones:", error);
    }
}

// Promise .then() version (older pattern, but still used)
function loadStonesWithThen() {
    console.log("⏳ Loading stones with .then()...");
    return mockFetchStones()
        .then(response => {
            if (response.status === 200) {
                console.log(`✓ ${response.message}`);
                return response.data;
            }
        })
        .catch(error => {
            console.error("❌ Error:", error);
        });
}

// Simulate API for single stone
function mockFetchStone(stoneId) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (stones[stoneId]) {
                resolve(stones[stoneId]);
            } else {
                reject(new Error(`Stone "${stoneId}" not found`));
            }
        }, 800);
    });
}

async function loadStoneAsync(stoneId) {
    try {
        console.log(`⏳ Fetching ${stoneId}...`);
        const stone = await mockFetchStone(stoneId);
        console.log(`✓ Loaded: ${stone.name}`);
        return stone;
    } catch (error) {
        console.error(`❌ Error loading stone:`, error.message);
    }
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

// Simulated quote submission to "backend"
async function submitQuoteToBackend(formData) {
    try {
        console.log("⏳ Submitting quote to backend...");
        
        // Simulate network request
        const response = await new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    status: 201,
                    message: "Quote saved successfully",
                    quoteId: `QUOTE-${Date.now()}`
                });
            }, 1500);
        });
        
        if (response.status === 201) {
            console.log(`✓ ${response.message}`);
            console.log(`Quote ID: ${response.quoteId}`);
            console.log("Submitted data:", formData);
            return response;
        }
    } catch (error) {
        console.error("❌ Failed to submit quote:", error);
    }
}

/* ========================================
   INITIALIZATION - Run on Page Load
   ======================================== */

document.addEventListener("DOMContentLoaded", function () {
    console.log("\n🔧 Initializing Kaivan website...\n");
    
    // Initialize all features
    initMobileMenu();
    setupSmoothScroll();
    initFormValidation();
    generateStoneCollection();
    console.log("\n✨ Website fully initialized!\n");
    console.log("📚 Learning Phases Implemented:");
    console.log("  Step 5 - Functions ✓");
    console.log("  Step 6 - DOM Manipulation ✓");
    console.log("  Step 7 - Stone Interaction ✓");
    console.log("  Step 8 - Advanced Forms ✓");
    console.log("  Step 9 - Data & Logic ✓");
    console.log("  Step 10 - Fetch & APIs ✓");
    console.log("  Step 11 - JSON ✓");
    console.log("  Step 12 - Async JS ✓");
    console.log("  Step 13 - Backend Preparation ✓");
    console.log("\n🎓 Try these in Console:");
    console.log("  loadStonesAsync()");
    console.log("  loadStoneAsync('steel-grey')");
    console.log("  stoneToJSON('black-pearl')");
    console.log("  saveStoneToLocalStorage('vision-white')");
    console.log("  getStoneFromLocalStorage('vision-white')");
});