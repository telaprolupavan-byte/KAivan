const express = require("express");
const path = require("path");
const connectToDatabase = require("./DB");

const app = express();

let db;

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

// Get all stones from MongoDB
app.get("/api/stones", async (req, res) => {
    try {
        const stones = await db
            .collection("stones")
            .find({})
            .toArray();

        const result = {};

        for (const stone of stones) {
            const { _id, ...data } = stone;
            result[_id] = data;
        }

        res.json(result);
    } catch (error) {
        console.error("Failed to fetch stones:", error);

        res.status(500).json({
            error: "Failed to fetch stones"
        });
    }
});

// Get one stone from MongoDB
app.get("/api/stones/:id", async (req, res) => {
    try {
        const stone = await db
            .collection("stones")
            .findOne({ _id: req.params.id });

        if (!stone) {
            return res.status(404).json({
                error: "Stone not found"
            });
        }

        const { _id, ...data } = stone;

        res.json(data);
    } catch (error) {
        console.error("Failed to fetch stone:", error);

        res.status(500).json({
            error: "Failed to fetch stone"
        });
    }
});

// Create quote request
// Create quote request
app.post("/api/quotes", async (req, res) => {
    try {
        const { name, email, company, phone, message } = req.body;

        if (!name || !email || !phone || !message) {
            return res.status(400).json({
                error: "Name, email, phone, and message are required."
            });
        }

        const quote = {
            name,
            email,
            company: company || "",
            phone,
            message,
            createdAt: new Date().toISOString()
        };

        const result = await db.collection("quotes").insertOne(quote);

        return res.status(201).json({
            message: "Quote request received successfully.",
            quote: {
                id: result.insertedId,
                ...quote
            }
        });
    } catch (error) {
        console.error("Failed to create quote:", error);

        return res.status(500).json({
            error: "Failed to create quote request"
        });
    }
});

// Get all quote requests
app.get("/api/quotes", async (req, res) => {
    try {
        const quotes = await db
            .collection("quotes")
            .find({})
            .toArray();

        res.json(quotes);
    } catch (error) {
        console.error("Failed to fetch quotes:", error);

        res.status(500).json({
            error: "Failed to fetch quotes"
        });
    }
});

// Serve homepage
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "index.html"));
});

// Start server
async function startServer() {
    try {
        db = await connectToDatabase();

        app.listen(PORT, () => {
            console.log(`Kaivan backend running on port ${PORT}`);
        });
    } catch (error) {
        console.error("MongoDB connection failed:", error);
        process.exitCode = 1;
    }
}

startServer();