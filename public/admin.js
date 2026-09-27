/* ========================================
   KAIVAN STONE — ADMIN DASHBOARD
   ======================================== */

const QUOTE_STATUSES = [
    { value: "new", label: "New" },
    { value: "in-progress", label: "In Progress" },
    { value: "quoted", label: "Quoted" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" }
];

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

let quotes = [];
let stones = [];
let editingStoneId = null;

// Photo chosen in the form but not uploaded yet.
let pendingImageFile = null;
let pendingImagePreviewUrl = null;

/* ========================================
   HELPERS
   ======================================== */

function getElement(id) {
    return document.getElementById(id);
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

function redirectToLogin() {
    window.location.href = "/admin-login.html";
}

// Parses a JSON response body, tolerating empty or non-JSON bodies.
async function readJson(response) {
    try {
        return await response.json();
    } catch {
        return {};
    }
}

function getStatusLabel(status) {
    const match = QUOTE_STATUSES.find((item) => item.value === status);

    return match ? match.label : status;
}

function getCurrentStatusFilter() {
    const filter = getElement("quote-status-filter");

    return filter ? filter.value : "all";
}

function formatQuoteDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

function formatQuoteDateTime(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}

function formatFileSize(bytes) {
    return bytes >= 1024 * 1024
        ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function stoneImageSource(stone) {
    return stone.image || `images/${stone.id}.jpg`;
}

/* ========================================
   TOASTS
   ======================================== */

function showToast(message, type = "info") {
    const region = getElement("toast-region");

    if (!region) {
        return;
    }

    const toast = createElement("div", { className: `toast ${type}`, text: message });
    toast.setAttribute("role", type === "error" ? "alert" : "status");

    region.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("leaving");
        toast.addEventListener("transitionend", () => toast.remove(), { once: true });
        // Fallback in case transitions are disabled.
        setTimeout(() => toast.remove(), 400);
    }, type === "error" ? 6000 : 3500);
}

/* ========================================
   AUTHENTICATION
   ======================================== */

async function checkAdminAuthentication() {
    try {
        const response = await fetch("/api/admin/me", {
            credentials: "include"
        });

        if (!response.ok) {
            redirectToLogin();
            return false;
        }

        const data = await response.json();

        if (!data.authenticated) {
            redirectToLogin();
            return false;
        }

        return true;
    } catch (error) {
        console.error("Authentication check failed:", error);
        redirectToLogin();
        return false;
    }
}

async function handleLogout() {
    try {
        const response = await fetch("/api/admin/logout", {
            method: "POST",
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error(`Logout failed with status ${response.status}`);
        }

        redirectToLogin();
    } catch (error) {
        console.error("Logout failed:", error);
        showToast("Unable to log out. Please try again.", "error");
    }
}

/* ========================================
   QUOTES
   ======================================== */

function renderQuoteMessage(message) {
    const quoteList = getElement("quote-list");
    const status = createElement("p", { className: "quote-status", text: message });

    quoteList.replaceChildren(status);
}

function appendQuoteField(container, label, value) {
    const term = createElement("dt", { text: label });
    const description = document.createElement("dd");

    if (value instanceof Node) {
        description.append(value);
    } else {
        description.textContent = value || "Not provided";
    }

    container.append(term, description);
}

function createStatusBadge(status) {
    return createElement("span", {
        className: `quote-status-badge status-${status}`,
        text: getStatusLabel(status)
    });
}

function createQuoteCard(quote) {
    const article = createElement("article", { className: "quote-card" });
    const currentStatus = quote.status || "new";

    const header = createElement("div", { className: "quote-card-header" });
    const headingGroup = document.createElement("div");
    const heading = createElement("h2", { text: quote.name || "Unnamed request" });
    const submitted = createElement("p", {
        className: "quote-date",
        text: `${quote.reference || "No reference"} · ${formatQuoteDate(quote.createdAt)}`
    });

    headingGroup.append(heading, submitted);
    header.append(headingGroup, createStatusBadge(currentStatus));

    const details = createElement("dl", { className: "quote-card-details" });
    appendQuoteField(details, "Stone", quote.stoneName || "N/A");
    appendQuoteField(details, "Quantity", quote.quantity || "Not specified");
    appendQuoteField(details, "Email", quote.email);
    appendQuoteField(details, "Company", quote.company);

    const footer = createElement("div", { className: "quote-card-footer" });

    const statusSelectId = `quote-status-${quote._id}`;

    const statusContainer = createElement("div", { className: "quote-status-control" });

    const statusLabel = createElement("label", { text: "Status" });
    statusLabel.htmlFor = statusSelectId;

    const statusSelect = createElement("select", { className: "quote-status-select" });
    statusSelect.id = statusSelectId;

    QUOTE_STATUSES.forEach((status) => {
        const option = createElement("option", { text: status.label });

        option.value = status.value;
        option.selected = status.value === currentStatus;

        statusSelect.appendChild(option);
    });

    statusSelect.dataset.previousStatus = currentStatus;

    statusSelect.addEventListener("change", () => {
        updateQuoteStatus(quote._id, statusSelect.value, statusSelect);
    });

    statusContainer.append(statusLabel, statusSelect);

    const button = createElement("button", { text: "View Details" });
    button.type = "button";
    button.addEventListener("click", () => loadQuoteDetailAsync(String(quote._id)));

    footer.append(statusContainer, button);
    article.append(header, details, footer);

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

        if (response.status === 401) {
            redirectToLogin();
            return;
        }

        const data = await readJson(response);

        if (!response.ok) {
            throw new Error(data.error || "Failed to update quote status");
        }

        const quote = quotes.find(
            (item) => String(item._id) === String(quoteId)
        );

        if (quote) {
            quote.status = status;
            quote.updatedAt = data.quote?.updatedAt || quote.updatedAt;
        }

        selectElement.dataset.previousStatus = status;

        renderQuoteSummary();
        // Re-render so the badge and the active status filter reflect the change.
        filterQuotesByStatus(getCurrentStatusFilter());

        showToast(`Status updated to ${getStatusLabel(status)}.`, "success");
    } catch (error) {
        console.error("Unable to update quote status:", error);

        selectElement.value = previousStatus;

        showToast("Unable to update quote status. Please try again.", "error");
    } finally {
        selectElement.disabled = false;
    }
}

function displayQuotes(quoteList) {
    const quoteContainer = getElement("quote-list");

    quoteContainer.replaceChildren(...quoteList.map(createQuoteCard));
}

function renderQuoteDetailMessage(title, message) {
    const quoteDetail = getElement("quote-detail");
    const heading = createElement("h2", { text: title });
    heading.id = "quote-dialog-title";

    quoteDetail.replaceChildren(heading, createElement("p", { text: message }));
}

function createContactLink(href, text) {
    const link = createElement("a", { text });
    link.href = href;

    return link;
}

function displayQuoteDetail(quote) {
    const quoteDetail = getElement("quote-detail");

    const header = createElement("div", { className: "quote-detail-header" });
    const heading = createElement("h2", { text: quote.name || "Unnamed request" });
    heading.id = "quote-dialog-title";

    header.append(createStatusBadge(quote.status || "new"), heading);

    const details = document.createElement("dl");

    appendQuoteField(details, "Reference", quote.reference);
    appendQuoteField(details, "Stone", quote.stoneName);
    appendQuoteField(details, "Quantity", quote.quantity);
    appendQuoteField(
        details,
        "Email",
        quote.email ? createContactLink(`mailto:${quote.email}`, quote.email) : ""
    );
    appendQuoteField(
        details,
        "Phone",
        quote.phone ? createContactLink(`tel:${quote.phone.replace(/[^\d+]/g, "")}`, quote.phone) : ""
    );
    appendQuoteField(details, "Company", quote.company);
    appendQuoteField(details, "Submitted", formatQuoteDateTime(quote.createdAt));
    appendQuoteField(details, "Last Updated", formatQuoteDateTime(quote.updatedAt));

    const messageHeading = createElement("h3", { text: "Project Details" });
    const message = createElement("p", {
        className: "quote-message",
        text: quote.message || "Not provided"
    });

    quoteDetail.replaceChildren(header, details, messageHeading, message);
}

function renderQuoteSummary() {
    const summary = getElement("quote-summary");
    const activeFilter = getCurrentStatusFilter();

    const counts = {
        all: quotes.length,
        new: 0,
        "in-progress": 0,
        quoted: 0,
        completed: 0,
        cancelled: 0
    };

    quotes.forEach((quote) => {
        const status = quote.status || "new";

        if (counts[status] !== undefined) {
            counts[status]++;
        }
    });

    const summaryItems = [
        { value: "all", label: "All" },
        ...QUOTE_STATUSES
    ];

    summary.replaceChildren(
        ...summaryItems.map(({ value, label }) => {
            const item = createElement("button", {
                className: `quote-summary-item status-${value}`
            });
            item.type = "button";
            item.setAttribute("aria-pressed", String(activeFilter === value));
            item.addEventListener("click", () => setStatusFilter(value));

            item.append(
                createElement("strong", { text: String(counts[value]) }),
                createElement("span", { text: label })
            );

            return item;
        })
    );
}

function setStatusFilter(status) {
    const filter = getElement("quote-status-filter");

    filter.value = status;
    renderQuoteSummary();
    filterQuotesByStatus(status);
}

function filterQuotesByStatus(status) {
    if (quotes.length === 0) {
        renderQuoteMessage("No quote requests have been submitted yet.");
        return;
    }

    const filteredQuotes = status === "all"
        ? quotes
        : quotes.filter((quote) => (quote.status || "new") === status);

    if (filteredQuotes.length === 0) {
        renderQuoteMessage("No quotes found with this status.");
        return;
    }

    displayQuotes(filteredQuotes);
}

async function loadQuotesAsync() {
    renderQuoteMessage("Loading quote requests...");

    try {
        const response = await fetch("/api/quotes", {
            credentials: "include"
        });

        if (response.status === 401) {
            redirectToLogin();
            return;
        }

        if (!response.ok) {
            throw new Error(`Quote API request failed with status ${response.status}`);
        }

        const payload = await response.json();

        if (!Array.isArray(payload)) {
            throw new Error("Quote API returned an invalid response.");
        }

        quotes = payload;
        renderQuoteSummary();
        filterQuotesByStatus(getCurrentStatusFilter());
    } catch (error) {
        console.error("Unable to load quotes from API:", error);
        quotes = [];
        renderQuoteMessage("Unable to load quote requests. Please try again later.");
    }
}

async function loadQuoteDetailAsync(quoteId) {
    const dialog = getElement("quote-dialog");

    renderQuoteDetailMessage("Loading quote request...", "Retrieving quote details.");

    if (!dialog.open) {
        dialog.showModal();
    }

    try {
        const response = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}`, {
            credentials: "include"
        });

        if (response.status === 401) {
            redirectToLogin();
            return;
        }

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

function initQuoteDialog() {
    const dialog = getElement("quote-dialog");

    getElement("quote-dialog-close").addEventListener("click", () => dialog.close());

    dialog.addEventListener("click", (event) => {
        if (event.target === dialog) {
            dialog.close();
        }
    });
}

/* ========================================
   STONE FORM — PHOTO FIELD
   ======================================== */

function revokePendingPreview() {
    if (pendingImagePreviewUrl) {
        URL.revokeObjectURL(pendingImagePreviewUrl);
        pendingImagePreviewUrl = null;
    }
}

function showImagePreview(src, { removable }) {
    const preview = getElement("image-preview");
    const previewImage = getElement("image-preview-img");

    if (!src) {
        preview.hidden = true;
        previewImage.removeAttribute("src");
        getElement("image-placeholder").hidden = false;
        getElement("image-remove").hidden = true;
        getElement("image-choose-label").textContent = "Choose Photo";
        return;
    }

    previewImage.src = src;
    preview.hidden = false;
    getElement("image-placeholder").hidden = true;
    getElement("image-remove").hidden = !removable;
    getElement("image-choose-label").textContent = "Replace Photo";
}

function setPendingImage(file) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        showStoneMessage("Please choose a JPEG, PNG, WebP, GIF, or AVIF image.", "error");
        return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
        showStoneMessage(
            `That photo is ${formatFileSize(file.size)}. Please choose one that is 8 MB or smaller.`,
            "error"
        );
        return;
    }

    revokePendingPreview();

    pendingImageFile = file;
    pendingImagePreviewUrl = URL.createObjectURL(file);

    showImagePreview(pendingImagePreviewUrl, { removable: true });
    showStoneMessage(`${file.name} (${formatFileSize(file.size)}) will be uploaded when you save.`, "info");
}

function clearImageField() {
    revokePendingPreview();

    pendingImageFile = null;
    getElement("stone-image-file").value = "";
    getElement("stone-image").value = "";

    showImagePreview("", { removable: false });
}

function refreshPreviewFromPath() {
    if (pendingImageFile) {
        return;
    }

    const path = getElement("stone-image").value.trim();

    if (path) {
        showImagePreview(path, { removable: true });
    } else if (editingStoneId) {
        // Stones without an image fall back to images/<id>.jpg on the public site.
        showImagePreview(`images/${editingStoneId}.jpg`, { removable: false });
    } else {
        showImagePreview("", { removable: false });
    }
}

function initImageField() {
    const dropzone = getElement("image-dropzone");
    const fileInput = getElement("stone-image-file");
    const previewImage = getElement("image-preview-img");

    fileInput.addEventListener("change", () => {
        if (fileInput.files[0]) {
            setPendingImage(fileInput.files[0]);
        }
    });

    getElement("image-remove").addEventListener("click", clearImageField);
    getElement("stone-image").addEventListener("change", refreshPreviewFromPath);

    previewImage.addEventListener("error", () => {
        showImagePreview("", { removable: Boolean(getElement("stone-image").value.trim()) });
    });

    ["dragenter", "dragover"].forEach((type) => {
        dropzone.addEventListener(type, (event) => {
            event.preventDefault();
            dropzone.classList.add("dragging");
        });
    });

    ["dragleave", "drop"].forEach((type) => {
        dropzone.addEventListener(type, (event) => {
            event.preventDefault();

            if (type === "dragleave" && dropzone.contains(event.relatedTarget)) {
                return;
            }

            dropzone.classList.remove("dragging");
        });
    });

    dropzone.addEventListener("drop", (event) => {
        const file = event.dataTransfer.files[0];

        if (file) {
            setPendingImage(file);
        }
    });
}

// Uploads the pending photo with progress reporting. Resolves to { id, url }.
function uploadImage(file, onProgress) {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        const formData = new FormData();

        formData.append("image", file);

        request.open("POST", "/api/images");
        request.withCredentials = true;
        request.responseType = "json";

        request.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
                onProgress(Math.round((event.loaded / event.total) * 100));
            }
        });

        request.addEventListener("load", () => {
            const data = request.response || {};

            if (request.status === 401) {
                redirectToLogin();
                reject(new Error("Your session has expired. Please log in again."));
                return;
            }

            if (request.status !== 201) {
                reject(new Error(data.error || "Unable to upload the photo."));
                return;
            }

            resolve(data);
        });

        request.addEventListener("error", () => {
            reject(new Error("Network error while uploading the photo."));
        });

        request.send(formData);
    });
}

async function deleteUploadedImage(url) {
    try {
        await fetch(url, { method: "DELETE", credentials: "include" });
    } catch (error) {
        console.warn("Unable to clean up uploaded image:", error);
    }
}

/* ========================================
   STONE FORM
   ======================================== */

function showStoneMessage(message, type = "info") {
    const messageElement = getElement("stone-message");

    messageElement.textContent = message;
    messageElement.className = `admin-message ${type}`;
}

function clearStoneMessage() {
    showStoneMessage("", "");
}

function resetStoneForm() {
    getElement("stone-form").reset();

    getElement("stone-id").disabled = false;
    getElement("stone-submit").textContent = "Add Stone";
    getElement("stone-cancel").hidden = true;
    getElement("stone-form-title").textContent = "Add a Stone";

    editingStoneId = null;

    clearImageField();
    clearStoneMessage();
    renderStoneList();

    getElement("stone-form").scrollTop = 0;
}

function populateStoneForm(stone) {
    clearImageField();
    clearStoneMessage();

    getElement("stone-id").value = stone.id;
    getElement("stone-name").value = stone.name || "";
    getElement("stone-origin").value = stone.origin || "";
    getElement("stone-price").value = stone.price || "";
    getElement("stone-dimensions").value = stone.dimensions || "";
    getElement("stone-rating").value = stone.rating || "";
    getElement("stone-image").value = stone.image || "";
    getElement("stone-in-stock").checked = stone.inStock !== false;
    getElement("stone-description").value = stone.description || "";
    getElement("stone-certifications").value =
        Array.isArray(stone.certifications)
            ? stone.certifications.join(", ")
            : "";

    getElement("stone-id").disabled = true;
    getElement("stone-submit").textContent = "Update Stone";
    getElement("stone-cancel").hidden = false;
    getElement("stone-form-title").textContent = `Editing ${stone.name}`;

    editingStoneId = stone.id;

    refreshPreviewFromPath();
    renderStoneList();

    // The desktop form scrolls internally; show the photo field first.
    getElement("stone-form").scrollTop = 0;

    getElement("stone-form").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function readStoneForm() {
    return {
        id: getElement("stone-id").value.trim(),
        name: getElement("stone-name").value.trim(),
        origin: getElement("stone-origin").value.trim(),
        price: getElement("stone-price").value.trim(),
        dimensions: getElement("stone-dimensions").value.trim(),
        rating: Number(getElement("stone-rating").value),
        image: getElement("stone-image").value.trim(),
        inStock: getElement("stone-in-stock").checked,
        description: getElement("stone-description").value.trim(),
        certifications: getElement("stone-certifications")
            .value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
    };
}

async function handleStoneSubmit(event) {
    event.preventDefault();

    const form = event.target;

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const submitButton = getElement("stone-submit");
    const originalLabel = submitButton.textContent;
    const isEditing = Boolean(editingStoneId);
    const stone = readStoneForm();

    let uploadedUrl = null;

    submitButton.disabled = true;

    try {
        if (pendingImageFile) {
            submitButton.textContent = "Uploading photo…";

            const upload = await uploadImage(pendingImageFile, (percent) => {
                submitButton.textContent = `Uploading photo… ${percent}%`;
            });

            uploadedUrl = upload.url;
            stone.image = upload.url;
        }

        submitButton.textContent = "Saving…";

        const url = isEditing
            ? `/api/stones/${encodeURIComponent(editingStoneId)}`
            : "/api/stones";

        const response = await fetch(url, {
            method: isEditing ? "PUT" : "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify(stone)
        });

        if (response.status === 401) {
            redirectToLogin();
            return;
        }

        const data = await readJson(response);

        if (!response.ok) {
            throw new Error(data.message || data.error || "Unable to save stone.");
        }

        uploadedUrl = null;

        resetStoneForm();
        showToast(
            isEditing ? `${stone.name} updated.` : `${stone.name} added to the catalog.`,
            "success"
        );

        await loadStonesAsync();
    } catch (error) {
        console.error("Unable to save stone:", error);
        showStoneMessage(error.message, "error");

        // Don't leave an orphaned upload behind if the stone itself failed to save.
        if (uploadedUrl) {
            await deleteUploadedImage(uploadedUrl);
        }
    } finally {
        submitButton.disabled = false;

        if (submitButton.textContent !== "Add Stone") {
            submitButton.textContent = editingStoneId ? "Update Stone" : originalLabel;
        }
    }
}

/* ========================================
   STONE LIST
   ======================================== */

function createStoneCard(stone) {
    const card = createElement("article", { className: "stone-card" });

    if (stone.id === editingStoneId) {
        card.classList.add("editing");
    }

    const media = createElement("div", { className: "stone-card-media" });
    const image = document.createElement("img");
    image.src = stoneImageSource(stone);
    image.alt = stone.name || "Stone";
    image.loading = "lazy";
    image.addEventListener("error", () => {
        media.classList.add("no-image");
        image.remove();
    }, { once: true });

    const stock = createElement("span", {
        className: `stone-stock ${stone.inStock ? "in-stock" : "out-of-stock"}`,
        text: stone.inStock ? "In Stock" : "Out of Stock"
    });

    media.append(image, stock);

    const content = createElement("div", { className: "stone-card-content" });

    const title = createElement("h3", { text: stone.name });
    const meta = createElement("p", {
        text: [stone.origin, stone.dimensions].filter(Boolean).join(" · ") || "No details"
    });
    const price = createElement("p", {
        className: "stone-price",
        text: stone.price || "No price"
    });
    const id = createElement("code", { className: "stone-id", text: stone.id });

    const actions = createElement("div", { className: "stone-card-actions" });

    const editButton = createElement("button", { text: "Edit" });
    editButton.type = "button";
    editButton.addEventListener("click", () => populateStoneForm(stone));

    const deleteButton = createElement("button", { className: "button-secondary", text: "Delete" });
    deleteButton.type = "button";
    deleteButton.addEventListener("click", () => handleDeleteStone(stone));

    actions.append(editButton, deleteButton);
    content.append(title, id, meta, price, actions);
    card.append(media, content);

    return card;
}

async function handleDeleteStone(stone) {
    const confirmed = window.confirm(
        `Delete ${stone.name}? This also removes its uploaded photo and cannot be undone.`
    );

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(
            `/api/stones/${encodeURIComponent(stone.id)}`,
            {
                method: "DELETE",
                credentials: "include"
            }
        );

        if (response.status === 401) {
            redirectToLogin();
            return;
        }

        const data = await readJson(response);

        if (!response.ok) {
            throw new Error(data.message || data.error || "Unable to delete stone.");
        }

        if (editingStoneId === stone.id) {
            resetStoneForm();
        }

        showToast(`${stone.name} deleted.`, "success");

        await loadStonesAsync();
    } catch (error) {
        console.error("Unable to delete stone:", error);
        showToast(error.message, "error");
    }
}

function renderStoneList() {
    const stoneList = getElement("stone-list");
    const query = getElement("stone-search").value.trim().toLowerCase();

    const visibleStones = stones.filter((stone) =>
        [stone.name, stone.id, stone.origin]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(query))
    );

    const inStockCount = stones.filter((stone) => stone.inStock).length;

    getElement("stone-count").textContent =
        `${stones.length} stones · ${inStockCount} in stock`;

    if (stones.length === 0) {
        stoneList.replaceChildren(createElement("p", { className: "quote-status", text: "No stones yet. Add your first stone with the form." }));
        return;
    }

    if (visibleStones.length === 0) {
        stoneList.replaceChildren(createElement("p", { className: "quote-status", text: `No stones match "${query}".` }));
        return;
    }

    stoneList.replaceChildren(...visibleStones.map(createStoneCard));
}

async function loadStonesAsync() {
    const stoneList = getElement("stone-list");

    stoneList.replaceChildren(createElement("p", { className: "quote-status", text: "Loading stones..." }));

    try {
        const response = await fetch("/api/stones", {
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error(`Stone API request failed with status ${response.status}`);
        }

        const data = await response.json();

        stones = (Array.isArray(data)
            ? data
            : Object.entries(data).map(([id, stone]) => ({ ...stone, id: stone.id || id })))
            .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

        renderStoneList();
    } catch (error) {
        console.error("Unable to load stones:", error);
        stoneList.replaceChildren(createElement("p", { className: "quote-status", text: "Unable to load stones. Please try again." }));
    }
}

/* ========================================
   INITIALIZATION
   ======================================== */

document.addEventListener("DOMContentLoaded", async () => {
    const authenticated = await checkAdminAuthentication();

    if (!authenticated) {
        return;
    }

    initImageField();
    initQuoteDialog();

    getElement("stone-form").addEventListener("submit", handleStoneSubmit);
    getElement("stone-cancel").addEventListener("click", resetStoneForm);
    getElement("stone-search").addEventListener("input", renderStoneList);
    getElement("logout-button").addEventListener("click", handleLogout);
    getElement("quote-refresh").addEventListener("click", loadQuotesAsync);

    getElement("quote-status-filter").addEventListener("change", (event) => {
        setStatusFilter(event.target.value);
    });

    loadStonesAsync();
    loadQuotesAsync();
});
