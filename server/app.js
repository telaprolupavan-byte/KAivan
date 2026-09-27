const crypto = require("crypto");
const path = require("path");
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");
const {
    VALID_QUOTE_STATUSES,
    validateQuote,
    validateStone
} = require("./validation");

const PUBLIC_DIR = path.join(__dirname, "..", "public");
const SESSION_COOKIE_NAME = "kaivan.sid";
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

// Seeded stones use the slug as `_id`; admin-created stones store it in `id`.
function stoneFilter(stoneId) {
    return {
        $or: [
            { id: stoneId },
            { _id: stoneId }
        ]
    };
}

function serializeStone(stone) {
    const { _id, ...data } = stone;

    return {
        ...data,
        id: stone.id || String(_id)
    };
}

function createQuoteReference() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const suffix = crypto.randomBytes(2).toString("hex").toUpperCase();

    return `KAI-${timestamp}-${suffix}`;
}

function sha256(value) {
    return crypto.createHash("sha256").update(String(value)).digest();
}

function jsonRateLimit(options) {
    return rateLimit({
        standardHeaders: "draft-7",
        legacyHeaders: false,
        ...options,
        handler: (req, res, next, limitOptions) => {
            res.status(limitOptions.statusCode).json({
                error: options.message
            });
        }
    });
}

/**
 * Builds the Express application.
 *
 * @param {object} options
 * @param {import("mongodb").Db} options.db
 * @param {object} options.config - result of loadConfig()
 * @param {import("express-session").Store} [options.sessionStore]
 */
function createApp({ db, config, sessionStore }) {
    const app = express();

    const stonesCollection = db.collection("stones");
    const quotesCollection = db.collection("quotes");

    app.disable("x-powered-by");
    app.set("trust proxy", config.trustProxy);

    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    "img-src": ["'self'", "data:", "https:"],
                    "upgrade-insecure-requests": config.isProduction ? [] : null
                }
            },
            strictTransportSecurity: config.isProduction
        })
    );

    app.use(express.json({ limit: "20kb" }));

    app.use(
        session({
            name: SESSION_COOKIE_NAME,
            secret: config.sessionSecret,
            store: sessionStore,
            resave: false,
            saveUninitialized: false,
            cookie: {
                httpOnly: true,
                secure: config.isProduction,
                sameSite: "lax",
                maxAge: SESSION_MAX_AGE_MS
            }
        })
    );

    const apiLimiter = jsonRateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 300,
        message: "Too many requests. Please try again later."
    });

    const loginLimiter = jsonRateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 10,
        skipSuccessfulRequests: true,
        message: "Too many login attempts. Please try again in 15 minutes."
    });

    const quoteLimiter = jsonRateLimit({
        windowMs: 60 * 60 * 1000,
        limit: 10,
        message: "Too many quote requests. Please try again later."
    });

    app.use("/api", apiLimiter);

    function requireAdmin(req, res, next) {
        if (req.session.isAdmin !== true) {
            return res.status(401).json({
                error: "Authentication required"
            });
        }

        next();
    }

    // =========================
    // ADMIN PAGES
    // =========================

    // Redirect unauthenticated visitors before the dashboard is served.
    app.get(["/admin", "/admin.html"], (req, res) => {
        if (req.session.isAdmin !== true) {
            return res.redirect("/admin-login.html");
        }

        res.set("Cache-Control", "no-store");
        res.sendFile(path.join(PUBLIC_DIR, "admin.html"));
    });

    app.get("/admin-login.html", (req, res, next) => {
        if (req.session.isAdmin === true) {
            return res.redirect("/admin.html");
        }

        next();
    });

    app.use(
        express.static(PUBLIC_DIR, {
            index: "index.html",
            maxAge: config.isProduction ? "1h" : 0
        })
    );

    // =========================
    // HEALTH CHECK
    // =========================

    app.get("/api/health", async (req, res) => {
        try {
            await db.command({ ping: 1 });

            res.json({
                status: "ok",
                message: "Kaivan backend is running"
            });
        } catch (error) {
            console.error("Health check failed:", error);

            res.status(503).json({
                status: "error",
                message: "Database unavailable"
            });
        }
    });

    // =========================
    // STONES
    // =========================

    app.get("/api/stones", async (req, res) => {
        try {
            const stones = await stonesCollection
                .find({})
                .sort({ name: 1 })
                .toArray();

            const result = {};

            for (const stone of stones) {
                const data = serializeStone(stone);

                result[data.id] = data;
            }

            res.json(result);
        } catch (error) {
            console.error("Failed to fetch stones:", error);

            res.status(500).json({
                error: "Failed to fetch stones"
            });
        }
    });

    app.get("/api/stones/:id", async (req, res) => {
        try {
            const stone = await stonesCollection.findOne(stoneFilter(req.params.id));

            if (!stone) {
                return res.status(404).json({
                    error: "Stone not found"
                });
            }

            res.json(serializeStone(stone));
        } catch (error) {
            console.error("Failed to fetch stone:", error);

            res.status(500).json({
                error: "Failed to fetch stone"
            });
        }
    });

    app.post("/api/stones", requireAdmin, async (req, res) => {
        try {
            const { values, error } = validateStone(req.body, { includeId: true });

            if (error) {
                return res.status(400).json({ error });
            }

            const existingStone = await stonesCollection.findOne(stoneFilter(values.id));

            if (existingStone) {
                return res.status(409).json({
                    error: "A stone with this ID already exists."
                });
            }

            const now = new Date().toISOString();

            const stone = {
                ...values,
                createdAt: now,
                updatedAt: now
            };

            await stonesCollection.insertOne(stone);

            res.status(201).json({
                message: "Stone created successfully.",
                stone: serializeStone(stone)
            });
        } catch (error) {
            if (error.code === 11000) {
                return res.status(409).json({
                    error: "A stone with this ID already exists."
                });
            }

            console.error("Failed to create stone:", error);

            res.status(500).json({
                error: "Failed to create stone"
            });
        }
    });

    app.put("/api/stones/:id", requireAdmin, async (req, res) => {
        try {
            const existingStone = await stonesCollection.findOne(stoneFilter(req.params.id));

            if (!existingStone) {
                return res.status(404).json({
                    error: "Stone not found."
                });
            }

            const { values, error } = validateStone(req.body);

            if (error) {
                return res.status(400).json({ error });
            }

            const updatedStone = {
                ...existingStone,
                ...values,
                id: existingStone.id || String(existingStone._id),
                updatedAt: new Date().toISOString()
            };

            await stonesCollection.replaceOne(
                { _id: existingStone._id },
                updatedStone
            );

            res.json({
                message: "Stone updated successfully.",
                stone: serializeStone(updatedStone)
            });
        } catch (error) {
            console.error("Failed to update stone:", error);

            res.status(500).json({
                error: "Failed to update stone"
            });
        }
    });

    app.delete("/api/stones/:id", requireAdmin, async (req, res) => {
        try {
            const result = await stonesCollection.deleteOne(stoneFilter(req.params.id));

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    error: "Stone not found."
                });
            }

            res.json({
                message: "Stone deleted successfully."
            });
        } catch (error) {
            console.error("Failed to delete stone:", error);

            res.status(500).json({
                error: "Failed to delete stone"
            });
        }
    });

    // =========================
    // QUOTES
    // =========================

    app.post("/api/quotes", quoteLimiter, async (req, res) => {
        try {
            const { values, error } = validateQuote(req.body);

            if (error) {
                return res.status(400).json({ error });
            }

            const stone = await stonesCollection.findOne(stoneFilter(values.stoneId));

            if (!stone) {
                return res.status(400).json({
                    error: "Selected stone was not found."
                });
            }

            if (stone.inStock === false) {
                return res.status(400).json({
                    error: "Selected stone is currently out of stock."
                });
            }

            const now = new Date().toISOString();

            const quote = {
                reference: createQuoteReference(),
                ...values,
                stoneId: serializeStone(stone).id,
                stoneName: stone.name,
                status: "new",
                createdAt: now,
                updatedAt: now
            };

            const result = await quotesCollection.insertOne(quote);

            res.status(201).json({
                message: "Your quote request has been submitted successfully.",
                quote: {
                    _id: result.insertedId,
                    reference: quote.reference,
                    stoneName: quote.stoneName,
                    status: quote.status,
                    createdAt: quote.createdAt
                }
            });
        } catch (error) {
            console.error("Failed to create quote:", error);

            res.status(500).json({
                error: "Failed to submit quote request."
            });
        }
    });

    app.get("/api/quotes", requireAdmin, async (req, res) => {
        try {
            const quotes = await quotesCollection
                .find({})
                .sort({ createdAt: -1 })
                .toArray();

            res.json(quotes);
        } catch (error) {
            console.error("Failed to fetch quotes:", error);

            res.status(500).json({
                error: "Failed to fetch quotes"
            });
        }
    });

    app.get("/api/quotes/:id", requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    error: "Invalid quote ID"
                });
            }

            const quote = await quotesCollection.findOne({
                _id: new ObjectId(id)
            });

            if (!quote) {
                return res.status(404).json({
                    error: "Quote not found"
                });
            }

            res.json(quote);
        } catch (error) {
            console.error("Failed to fetch quote:", error);

            res.status(500).json({
                error: "Failed to fetch quote"
            });
        }
    });

    app.patch("/api/quotes/:id/status", requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body || {};

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    error: "Invalid quote ID"
                });
            }

            if (!VALID_QUOTE_STATUSES.includes(status)) {
                return res.status(400).json({
                    error: "Invalid quote status"
                });
            }

            const updatedQuote = await quotesCollection.findOneAndUpdate(
                { _id: new ObjectId(id) },
                {
                    $set: {
                        status,
                        updatedAt: new Date().toISOString()
                    }
                },
                { returnDocument: "after" }
            );

            if (!updatedQuote) {
                return res.status(404).json({
                    error: "Quote not found"
                });
            }

            res.json({
                message: "Quote status updated successfully",
                quote: updatedQuote
            });
        } catch (error) {
            console.error("Failed to update quote status:", error);

            res.status(500).json({
                error: "Failed to update quote status"
            });
        }
    });

    // =========================
    // ADMIN AUTHENTICATION
    // =========================

    const expectedUsernameHash = sha256(config.adminUsername);

    app.post("/api/admin/login", loginLimiter, async (req, res) => {
        try {
            const { username, password } = req.body || {};

            if (
                typeof username !== "string" ||
                typeof password !== "string" ||
                !username ||
                !password
            ) {
                return res.status(400).json({
                    error: "Username and password are required"
                });
            }

            // Always run bcrypt so response time does not reveal whether the username exists.
            const usernameMatches = crypto.timingSafeEqual(
                sha256(username),
                expectedUsernameHash
            );

            const passwordMatches = await bcrypt.compare(
                password.slice(0, 256),
                config.adminPasswordHash
            );

            if (!usernameMatches || !passwordMatches) {
                return res.status(401).json({
                    error: "Invalid username or password"
                });
            }

            // Issue a fresh session id on login to prevent session fixation.
            req.session.regenerate((regenerateError) => {
                if (regenerateError) {
                    console.error("Session regeneration failed:", regenerateError);

                    return res.status(500).json({
                        error: "Unable to process login"
                    });
                }

                req.session.isAdmin = true;

                req.session.save((saveError) => {
                    if (saveError) {
                        console.error("Session save failed:", saveError);

                        return res.status(500).json({
                            error: "Unable to process login"
                        });
                    }

                    res.json({
                        message: "Admin login successful"
                    });
                });
            });
        } catch (error) {
            console.error("Admin login failed:", error);

            res.status(500).json({
                error: "Unable to process login"
            });
        }
    });

    app.get("/api/admin/me", (req, res) => {
        res.set("Cache-Control", "no-store");

        res.json({
            authenticated: req.session.isAdmin === true
        });
    });

    app.post("/api/admin/logout", (req, res) => {
        req.session.destroy((error) => {
            if (error) {
                console.error("Admin logout failed:", error);

                return res.status(500).json({
                    error: "Unable to log out"
                });
            }

            res.clearCookie(SESSION_COOKIE_NAME, {
                httpOnly: true,
                secure: config.isProduction,
                sameSite: "lax"
            });

            res.json({
                message: "Admin logout successful"
            });
        });
    });

    // =========================
    // FALLBACKS
    // =========================

    app.use("/api", (req, res) => {
        res.status(404).json({
            error: "Not found"
        });
    });

    app.use((req, res) => {
        res.status(404).sendFile(path.join(PUBLIC_DIR, "404.html"));
    });

    // eslint-disable-next-line no-unused-vars
    app.use((error, req, res, next) => {
        if (error.type === "entity.parse.failed") {
            return res.status(400).json({
                error: "Request body must be valid JSON."
            });
        }

        if (error.type === "entity.too.large") {
            return res.status(413).json({
                error: "Request body is too large."
            });
        }

        console.error("Unhandled error:", error);

        res.status(500).json({
            error: "Internal server error"
        });
    });

    return app;
}

module.exports = createApp;
