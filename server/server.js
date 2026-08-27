const express = require("express");
const path = require("path");
const stones = require("./data/stones");
const quotes = require("./data/quotes");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "..")));

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "Kaivan backend is running"
    });
});

// Get all stones
app.get("/api/stones", (req, res) => {
    res.json(stones);
});

// Get one stone
app.get("/api/stones/:id", (req, res) => {
    const stone = stones[req.params.id];

    if (!stone) {
        return res.status(404).json({
            error: "Stone not found"
        });
    }

    res.json(stone);
});

// Create quote request
app.post("/api/quotes", (req, res) => {
    const { name, email, company, phone, message } = req.body;

    if (!name || !email || !phone || !message) {
        return res.status(400).json({
            error: "Name, email, phone, and message are required."
        });
    }

    const quote = {
        id: quotes.length + 1,
        name,
        email,
        company: company || "",
        phone,
        message,
        createdAt: new Date().toISOString()
    };

    quotes.push(quote);

    return res.status(201).json({
        message: "Quote request received successfully.",
        quote
    });
});

// Get all quote requests
app.get("/api/quotes", (req, res) => {
    res.json(quotes);
});

// Serve homepage
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "index.html"));
});

app.listen(PORT, () => {
    console.log(`Kaivan backend running on port ${PORT}`);
});