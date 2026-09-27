require("dotenv").config({ quiet: true });

const REQUIRED_VARIABLES = [
    "MONGODB_URI",
    "ADMIN_USERNAME",
    "ADMIN_PASSWORD_HASH",
    "SESSION_SECRET"
];

function parseTrustProxy(value) {
    if (value === undefined || value === "") {
        return 0;
    }

    if (value === "true") {
        return true;
    }

    if (value === "false") {
        return false;
    }

    const hops = Number(value);

    // Anything that is not a hop count (e.g. "loopback") is passed through to Express.
    return Number.isInteger(hops) ? hops : value;
}

function loadConfig(env = process.env) {
    const missing = REQUIRED_VARIABLES.filter((name) => !env[name]);

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missing.join(", ")}. ` +
            "Copy .env.example to .env and fill in the values."
        );
    }

    const isProduction = env.NODE_ENV === "production";

    if (isProduction && env.SESSION_SECRET.length < 32) {
        throw new Error("SESSION_SECRET must be at least 32 characters in production.");
    }

    if (!/^\$2[aby]\$\d{2}\$/.test(env.ADMIN_PASSWORD_HASH)) {
        throw new Error(
            "ADMIN_PASSWORD_HASH must be a bcrypt hash. Generate one with: npm run hash-password -- \"<password>\""
        );
    }

    return {
        isProduction,
        port: Number(env.PORT) || 3000,
        mongoUri: env.MONGODB_URI,
        mongoDbName: env.MONGODB_DB || "kaivan",
        adminUsername: env.ADMIN_USERNAME,
        adminPasswordHash: env.ADMIN_PASSWORD_HASH,
        sessionSecret: env.SESSION_SECRET,
        trustProxy: parseTrustProxy(env.TRUST_PROXY)
    };
}

module.exports = loadConfig;
