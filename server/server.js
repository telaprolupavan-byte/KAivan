require("dotenv").config();

const express = require("express");
const path = require("path");
const { ObjectId } = require("mongodb");
const connectToDatabase = require("./DB");
const session = require("express-session");
const bcrypt = require("bcrypt");

const app = express();

let db;

app.use(express.json());

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: false,
            sameSite: "lax"
        }
    })
);

function requireAdmin(req, res, next) {
    if (!req.session.isAdmin) {
        return res.status(401).json({
            error: "Authentication required"
        });
    }

    next();
}

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "..")));

// =========================
// HEALTH CHECK
// =========================

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "Kaivan backend is running"
    });
});

// =========================
// GET ALL STONES
// =========================

app.get("/api/stones", async (req, res) => {
    try {
        const stones = await db
            .collection("stones")
            .find({})
            .toArray();

        const result = {};

        for (const stone of stones) {
            const { _id, ...data } = stone;

            result[stone.id || String(_id)] = data;
        }

        res.json(result);
    } catch (error) {
        console.error("Failed to fetch stones:", error);

        res.status(500).json({
            error: "Failed to fetch stones"
        });
    }
});

// =========================
// GET ONE STONE
// =========================

app.get("/api/stones/:id", async (req, res) => {
    try {
        const stone = await db
            .collection("stones")
            .findOne({
                id: req.params.id
            });

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


// ==================================================
// KAIVAN-015
// ADMIN STONE MANAGEMENT
// ==================================================


// =========================
// CREATE STONE
// =========================

app.post("/api/stones", requireAdmin, async (req, res) => {
    try {
        const {
            id,
            name,
            description,
            origin,
            price,
            dimensions,
            rating,
            certifications,
            inStock,
            image
        } = req.body;

        // Validate required fields
        if (
            !id ||
            !name ||
            !description ||
            !origin ||
            !price ||
            !dimensions
        ) {
            return res.status(400).json({
                error:
                    "ID, name, description, origin, price, and dimensions are required."
            });
        }

        // Check whether the stone already exists
        const existingStone = await db
            .collection("stones")
            .findOne({
                id
            });

        if (existingStone) {
            return res.status(409).json({
                error:
                    "A stone with this ID already exists."
            });
        }

        // Create stone object
        const stone = {
            id,
            name,
            description,
            origin,
            price,
            dimensions,
            rating: Number(rating) || 0,
            certifications: Array.isArray(certifications)
                ? certifications
                : [],
            inStock: Boolean(inStock),
            image: image || "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Save stone to MongoDB
        await db
            .collection("stones")
            .insertOne(stone);

        res.status(201).json({
            message: "Stone created successfully.",
            stone
        });
    } catch (error) {
        console.error(
            "Failed to create stone:",
            error
        );

        res.status(500).json({
            error: "Failed to create stone"
        });
    }
});


// =========================
// UPDATE STONE
// =========================

app.put("/api/stones/:id", requireAdmin, async (req, res) => {
    try {
        const stoneId = req.params.id;

        // Find existing stone
        const existingStone = await db
            .collection("stones")
            .findOne({
                id: stoneId
            });

        if (!existingStone) {
            return res.status(404).json({
                error: "Stone not found."
            });
        }

        const {
            name,
            description,
            origin,
            price,
            dimensions,
            rating,
            certifications,
            inStock,
            image
        } = req.body;

        // Validate required fields
        if (
            !name ||
            !description ||
            !origin ||
            !price ||
            !dimensions
        ) {
            return res.status(400).json({
                error:
                    "Name, description, origin, price, and dimensions are required."
            });
        }

        // Create updated stone
        const updatedStone = {
            ...existingStone,
            name,
            description,
            origin,
            price,
            dimensions,
            rating: Number(rating) || 0,
            certifications: Array.isArray(certifications)
                ? certifications
                : [],
            inStock: Boolean(inStock),
            image: image || "",
            updatedAt: new Date().toISOString()
        };

        // Replace old MongoDB document
        await db
            .collection("stones")
            .replaceOne(
                {
                    id: stoneId
                },
                updatedStone
            );

        res.json({
            message: "Stone updated successfully.",
            stone: updatedStone
        });
    } catch (error) {
        console.error(
            "Failed to update stone:",
            error
        );

        res.status(500).json({
            error: "Failed to update stone"
        });
    }
});


// =========================
// DELETE STONE
// =========================

app.delete("/api/stones/:id", requireAdmin, async (req, res) => {
    try {
        const stoneId = req.params.id;

        // Delete stone from MongoDB
        const result = await db
            .collection("stones")
            .deleteOne({
                id: stoneId
            });

        // Stone doesn't exist
        if (result.deletedCount === 0) {
            return res.status(404).json({
                error: "Stone not found."
            });
        }

        res.json({
            message: "Stone deleted successfully."
        });
    } catch (error) {
        console.error(
            "Failed to delete stone:",
            error
        );

        res.status(500).json({
            error: "Failed to delete stone"
        });
    }
});


// ==================================================
// QUOTE MANAGEMENT
// ==================================================


// =========================
// CREATE QUOTE REQUEST
// =========================

app.post("/api/quotes", async (req, res) => {
    try {
        const {
            name,
            email,
            company,
            phone,
            message
        } = req.body;

        if (
            !name ||
            !email ||
            !phone ||
            !message
        ) {
            return res.status(400).json({
                error:
                    "Name, email, phone, and message are required."
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

        const result = await db
            .collection("quotes")
            .insertOne(quote);

        return res.status(201).json({
            message:
                "Quote request received successfully.",
            quote: {
                id: result.insertedId,
                ...quote
            }
        });
    } catch (error) {
        console.error(
            "Failed to create quote:",
            error
        );

        return res.status(500).json({
            error:
                "Failed to create quote request"
        });
    }
});


// =========================
// GET ALL QUOTES
// =========================

app.get("/api/quotes", requireAdmin, async (req, res) => {
    try {
        const quotes = await db
            .collection("quotes")
            .find({})
            .toArray();

        res.json(quotes);
    } catch (error) {
        console.error(
            "Failed to fetch quotes:",
            error
        );

        res.status(500).json({
            error: "Failed to fetch quotes"
        });
    }
});


// =========================
// GET ONE QUOTE
// =========================

app.get("/api/quotes/:id", requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                error: "Invalid quote ID"
            });
        }

        const quote = await db
            .collection("quotes")
            .findOne({
                _id: new ObjectId(id)
            });

        if (!quote) {
            return res.status(404).json({
                error: "Quote not found"
            });
        }

        res.json(quote);
    } catch (error) {
        console.error(
            "Failed to fetch quote:",
            error
        );

        res.status(500).json({
            error: "Failed to fetch quote"
        });
    }
});


// ==================================================
// ADMIN AUTHENTICATION
// ==================================================


// =========================
// ADMIN LOGIN
// =========================

app.post("/api/admin/login", async (req, res) => {
    try {
        const {
            username,
            password
        } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                error:
                    "Username and password are required"
            });
        }

        const usernameMatches =
            username ===
            process.env.ADMIN_USERNAME;

        const passwordMatches =
            usernameMatches &&
            await bcrypt.compare(
                password,
                process.env.ADMIN_PASSWORD_HASH
            );

        if (
            !usernameMatches ||
            !passwordMatches
        ) {
            return res.status(401).json({
                error:
                    "Invalid username or password"
            });
        }

        req.session.isAdmin = true;

        res.json({
            message:
                "Admin login successful"
        });
    } catch (error) {
        console.error(
            "Admin login failed:",
            error
        );

        res.status(500).json({
            error:
                "Unable to process login"
        });
    }
});


// =========================
// CHECK ADMIN SESSION
// =========================

app.get("/api/admin/me", (req, res) => {
    res.json({
        authenticated:
            req.session.isAdmin === true
    });
});


// =========================
// ADMIN LOGOUT
// =========================

app.post("/api/admin/logout", (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            console.error(
                "Admin logout failed:",
                error
            );

            return res.status(500).json({
                error:
                    "Unable to log out"
            });
        }

        res.clearCookie("connect.sid");

        res.json({
            message:
                "Admin logout successful"
        });
    });
});


// ==================================================
// HOMEPAGE
// ==================================================

app.get("/", (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            "..",
            "index.html"
        )
    );
});


// ==================================================
// START SERVER
// ==================================================

async function startServer() {
    try {
        db = await connectToDatabase();

        app.listen(PORT, () => {
            console.log(
                `Kaivan backend running on port ${PORT}`
            );
        });
    } catch (error) {
        console.error(
            "MongoDB connection failed:",
            error
        );

        process.exitCode = 1;
    }
}

startServer();