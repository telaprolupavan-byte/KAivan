async function checkAdminAuthentication() {
    try {
        const response = await fetch("/api/admin/me", {
            credentials: "include"
        });

        if (!response.ok) {
            window.location.href = "/admin-login.html";
            return false;
        }

        const data = await response.json();

        if (!data.authenticated) {
            window.location.href = "/admin-login.html";
            return false;
        }

        return true;
    } catch (error) {
        console.error("Authentication check failed:", error);
        window.location.href = "/admin-login.html";
        return false;
    }
}
let quotes = [];
let stones = [];
let editingStoneId = null;

function getElement(id) {
    return document.getElementById(id);
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

function renderQuoteMessage(message) {
    const quoteList = getElement("quote-list");
    quoteList.innerHTML = "";
    const status = document.createElement("p");
    status.className = "quote-status";
    status.textContent = message;
    quoteList.appendChild(status);
}

function appendQuoteField(container, label, value) {
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value || "Not provided";
    container.append(term, description);
}

function createQuoteCard(quote) {
    const article = document.createElement("article");
    article.className = "quote-card";

    const heading = document.createElement("h2");
    heading.textContent = quote.name || "Unnamed request";

    const email = document.createElement("p");
    email.textContent = quote.email || "Email not provided";

    const statusContainer = document.createElement("div");
    statusContainer.className = "quote-status-control";

    const statusLabel = document.createElement("label");
    statusLabel.textContent = "Status";

    const statusSelect = document.createElement("select");
    statusSelect.className = "quote-status-select";
    const reference = document.createElement("p");
reference.textContent = `Reference: ${quote.reference || "N/A"}`;

const stone = document.createElement("p");
stone.textContent = `Stone: ${quote.stoneName || "N/A"}`;

const quantity = document.createElement("p");
quantity.textContent = `Quantity: ${quote.quantity || "Not specified"}`;

    const statuses = [
        { value: "new", label: "New" },
        { value: "in-progress", label: "In Progress" },
        { value: "quoted", label: "Quoted" },
        { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" }
    ];

    const currentStatus = quote.status || "new";

    statuses.forEach((status) => {
        const option = document.createElement("option");

        option.value = status.value;
        option.textContent = status.label;

        if (status.value === currentStatus) {
            option.selected = true;
        }

        statusSelect.appendChild(option);
    });

    statusSelect.dataset.previousStatus = currentStatus;

    statusSelect.addEventListener("change", async () => {
        await updateQuoteStatus(
            quote._id,
            statusSelect.value,
            statusSelect
        );
    });

    statusContainer.append(statusLabel, statusSelect);

    const button = document.createElement("button");
    button.type = "button";
    button.dataset.quoteId = String(quote._id);
    button.textContent = "View Details";

    button.addEventListener("click", () => {
        loadQuoteDetailAsync(button.dataset.quoteId);
    });

   article.append(
    heading,
    email,
    reference,
    stone,
    quantity,
    statusContainer,
    button
);

return article;
}
async function updateQuoteStatus(quoteId, status, selectElement) {
    const previousStatus = selectElement.dataset.previousStatus || "new";

    selectElement.disabled = true;

    try {
        const response = await fetch(
            `/api/quotes/${encodeURIComponent(quoteId)}/status`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({ status })
            }
        );

        const data = await response.json();

        if (response.status === 401) {
            window.location.href = "/admin-login.html";
            return;
        }

        if (!response.ok) {
            throw new Error(data.error || "Failed to update quote status");
        }

        const quote = quotes.find(
            (item) => String(item._id) === String(quoteId)
        );

        if (quote) {
            quote.status = status;
        }

        selectElement.dataset.previousStatus = status;

    } catch (error) {
        console.error("Unable to update quote status:", error);

        selectElement.value = previousStatus;

        alert("Unable to update quote status. Please try again.");
    } finally {
        selectElement.disabled = false;
    }
}

function displayQuotes(quoteList) {
    const quoteContainer = getElement("quote-list");
    quoteContainer.innerHTML = "";
    quoteList.forEach((quote) => quoteContainer.appendChild(createQuoteCard(quote)));
}

function renderQuoteDetailMessage(title, message) {
    const quoteDetail = getElement("quote-detail");
    quoteDetail.innerHTML = "";
    const heading = document.createElement("h2");
    heading.textContent = title;
    const paragraph = document.createElement("p");
    paragraph.textContent = message;
    quoteDetail.append(heading, paragraph);
}

function displayQuoteDetail(quote) {
    const quoteDetail = getElement("quote-detail");
    quoteDetail.innerHTML = "";
    const heading = document.createElement("h2");
    heading.textContent = quote.name || "Unnamed request";
    const details = document.createElement("dl");
    appendQuoteField(details, "Reference", quote.reference);
appendQuoteField(details, "Stone", quote.stoneName);
appendQuoteField(details, "Quantity", quote.quantity);
appendQuoteField(details, "Email", quote.email);
appendQuoteField(details, "Company", quote.company);
appendQuoteField(details, "Phone", quote.phone);
appendQuoteField(details, "Message", quote.message);
appendQuoteField(details, "Status", quote.status || "new");
appendQuoteField(details, "Submitted", formatQuoteDate(quote.createdAt));
appendQuoteField(details, "Last Updated", formatQuoteDate(quote.updatedAt));
    quoteDetail.append(heading, details);
}

async function loadQuotesAsync() {
    renderQuoteMessage("Loading quote requests...");

    try {
        const response = await fetch("/api/quotes");
        if (!response.ok) {
            throw new Error(`Quote API request failed with status ${response.status}`);
        }

        const payload = await response.json();
        if (!Array.isArray(payload)) {
            throw new Error("Quote API returned an invalid response.");
        }

        quotes = payload;
        if (quotes.length === 0) {
            renderQuoteMessage("No quote requests have been submitted yet.");
            return;
        }

        displayQuotes(quotes);
    } catch (error) {
        console.error("Unable to load quotes from API:", error);
        quotes = [];
        renderQuoteMessage("Unable to load quote requests. Please try again later.");
    }
}

async function loadQuoteDetailAsync(quoteId) {
    renderQuoteDetailMessage("Loading quote request...", "Retrieving quote details.");

    try {
        const response = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}`);

        if (response.status === 400) {
            renderQuoteDetailMessage("Invalid quote request", "The selected quote request has an invalid ID.");
            return;
        }

        if (response.status === 404) {
            renderQuoteDetailMessage("Quote request not found", "This quote request could not be found.");
            return;
        }

        if (!response.ok) {
            throw new Error(`Quote detail request failed with status ${response.status}`);
        }

        displayQuoteDetail(await response.json());
    } catch (error) {
        console.error("Unable to load quote details from API:", error);
        renderQuoteDetailMessage("Unable to load quote request", "Please try again later.");
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const authenticated = await checkAdminAuthentication();

    if (!authenticated) {
        return;
    }

    loadQuotesAsync();

    const stoneForm = document.getElementById("stone-form");
    const stoneCancel = document.getElementById("stone-cancel");

    stoneForm.addEventListener("submit", handleStoneSubmit);

    stoneCancel.addEventListener("click", resetStoneForm);

    loadStonesAsync();

    const logoutButton = document.getElementById("logout-button");

    logoutButton.addEventListener("click", async () => {
        try {
            const response = await fetch("/api/admin/logout", {
                method: "POST",
                credentials: "include"
            });

            if (!response.ok) {
                throw new Error(`Logout failed with status ${response.status}`);
            }

            window.location.href = "/admin-login.html";
        } catch (error) {
            console.error("Logout failed:", error);
        }
    });
});

function showStoneMessage(message, type = "info") {
    const messageElement = document.getElementById("stone-message");

    messageElement.textContent = message;
    messageElement.className = `admin-message ${type}`;
}

function resetStoneForm() {
    const form = document.getElementById("stone-form");

    form.reset();

    document.getElementById("stone-edit-id").value = "";
    document.getElementById("stone-id").disabled = false;
    document.getElementById("stone-submit").textContent = "Add Stone";
    document.getElementById("stone-cancel").hidden = true;

    editingStoneId = null;
}

function populateStoneForm(stone) {
    document.getElementById("stone-edit-id").value = stone.id;
    document.getElementById("stone-id").value = stone.id;
    document.getElementById("stone-name").value = stone.name || "";
    document.getElementById("stone-origin").value = stone.origin || "";
    document.getElementById("stone-price").value = stone.price || "";
    document.getElementById("stone-dimensions").value = stone.dimensions || "";
    document.getElementById("stone-rating").value = stone.rating || "";
    document.getElementById("stone-image").value = stone.image || "";
    document.getElementById("stone-in-stock").checked = stone.inStock !== false;
    document.getElementById("stone-description").value = stone.description || "";
    document.getElementById("stone-certifications").value =
        Array.isArray(stone.certifications)
            ? stone.certifications.join(", ")
            : "";

    document.getElementById("stone-id").disabled = true;
    document.getElementById("stone-submit").textContent = "Update Stone";
    document.getElementById("stone-cancel").hidden = false;

    editingStoneId = stone.id;

    document.getElementById("stone-form").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function createStoneCard(stone) {
    const card = document.createElement("article");
    card.className = "stone-card";

    if (stone.image) {
        const image = document.createElement("img");
        image.src = stone.image;
        image.alt = stone.name || "Stone";
        card.appendChild(image);
    }

    const content = document.createElement("div");
    content.className = "stone-card-content";

    const title = document.createElement("h3");
    title.textContent = stone.name;

    const origin = document.createElement("p");
    origin.textContent = `Origin: ${stone.origin || "N/A"}`;

    const price = document.createElement("p");
    price.textContent = `Price: ${stone.price || "N/A"}`;

    const stock = document.createElement("p");
    stock.className = "stone-stock";
    stock.textContent = stone.inStock ? "In Stock" : "Out of Stock";

    const actions = document.createElement("div");
    actions.className = "stone-card-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => {
        populateStoneForm(stone);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", () => {
        handleDeleteStone(stone.id);
    });

    actions.append(editButton, deleteButton);

    content.append(title, origin, price, stock, actions);
    card.appendChild(content);

    return card;
}
async function handleDeleteStone(stoneId) {
    const confirmed = window.confirm(
        "Are you sure you want to delete this stone?"
    );

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(
            `/api/stones/${encodeURIComponent(stoneId)}`,
            {
                method: "DELETE",
                credentials: "include"
            }
        );

        if (response.status === 401) {
            window.location.href = "/admin-login.html";
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || data.error || "Unable to delete stone."
            );
        }

        if (editingStoneId === stoneId) {
            resetStoneForm();
        }

        showStoneMessage("Stone deleted successfully.", "success");

        await loadStonesAsync();

    } catch (error) {
        console.error("Unable to delete stone:", error);
        showStoneMessage(error.message, "error");
    }
}

function renderStoneList() {
    const stoneList = document.getElementById("stone-list");

    stoneList.replaceChildren();

    if (stones.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent = "No stones found.";
        stoneList.appendChild(emptyMessage);
        return;
    }

    stones.forEach((stone) => {
        stoneList.appendChild(createStoneCard(stone));
    });
}
async function loadStonesAsync() {
    const stoneList = document.getElementById("stone-list");

    stoneList.innerHTML = "<p>Loading stones...</p>";

    try {
        const response = await fetch("/api/stones", {
            credentials: "include"
        });

        if (response.status === 401) {
            window.location.href = "/admin-login.html";
            return;
        }

        if (!response.ok) {
            throw new Error(`Stone API request failed with status ${response.status}`);
        }

        const data = await response.json();

        stones = Array.isArray(data) ? data : data.stones || [];

        renderStoneList();
    } catch (error) {
        console.error("Unable to load stones:", error);
        showStoneMessage("Unable to load stones. Please try again.", "error");
    }
}
async function handleStoneSubmit(event) {
    event.preventDefault();

    const submitButton = document.getElementById("stone-submit");

    const stone = {
        id: document.getElementById("stone-id").value.trim(),
        name: document.getElementById("stone-name").value.trim(),
        origin: document.getElementById("stone-origin").value.trim(),
        price: document.getElementById("stone-price").value.trim(),
        dimensions: document.getElementById("stone-dimensions").value.trim(),
        rating: Number(document.getElementById("stone-rating").value),
        image: document.getElementById("stone-image").value.trim(),
        inStock: document.getElementById("stone-in-stock").checked,
        description: document.getElementById("stone-description").value.trim(),
        certifications: document
            .getElementById("stone-certifications")
            .value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
    };

    const isEditing = Boolean(editingStoneId);

    const url = isEditing
        ? `/api/stones/${encodeURIComponent(editingStoneId)}`
        : "/api/stones";

    const method = isEditing ? "PUT" : "POST";

    submitButton.disabled = true;

    try {
        const response = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify(stone)
        });

        if (response.status === 401) {
            window.location.href = "/admin-login.html";
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || data.error || "Unable to save stone."
            );
        }

        showStoneMessage(
            isEditing
                ? "Stone updated successfully."
                : "Stone added successfully.",
            "success"
        );

        resetStoneForm();
        await loadStonesAsync();

    } catch (error) {
        console.error("Unable to save stone:", error);
        showStoneMessage(error.message, "error");

    } finally {
        submitButton.disabled = false;
    }
}