let quotes = [];

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

    const button = document.createElement("button");
    button.type = "button";
    button.dataset.quoteId = String(quote._id);
    button.textContent = "View Details";
    button.addEventListener("click", () => loadQuoteDetailAsync(button.dataset.quoteId));

    article.append(heading, email, button);
    return article;
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
    appendQuoteField(details, "Email", quote.email);
    appendQuoteField(details, "Company", quote.company);
    appendQuoteField(details, "Phone", quote.phone);
    appendQuoteField(details, "Message", quote.message);
    appendQuoteField(details, "Submitted", formatQuoteDate(quote.createdAt));
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

document.addEventListener("DOMContentLoaded", loadQuotesAsync);