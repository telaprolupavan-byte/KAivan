const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STONE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// Relative image paths (images/foo.jpg, /images/foo.jpg) or absolute http(s) URLs.
const IMAGE_PATTERN = /^(?:https?:\/\/[^\s"'<>]+|\/?(?!.*\.\.)[A-Za-z0-9_\-./]+)$/;

const VALID_QUOTE_STATUSES = [
    "new",
    "in-progress",
    "quoted",
    "completed",
    "cancelled"
];

/**
 * Validates string fields in `body` against `schema`.
 * Returns { values } on success or { error } describing the first invalid field.
 */
function validateStrings(body, schema) {
    const values = {};

    for (const [field, rules] of Object.entries(schema)) {
        const raw = body[field];

        if (raw !== undefined && raw !== null && typeof raw !== "string") {
            return { error: `${rules.label} must be text.` };
        }

        const value = (raw || "").trim();

        if (!value) {
            if (rules.required) {
                return { error: `${rules.label} is required.` };
            }

            values[field] = "";
            continue;
        }

        if (rules.minLength && value.length < rules.minLength) {
            return { error: `${rules.label} must be at least ${rules.minLength} characters.` };
        }

        if (rules.maxLength && value.length > rules.maxLength) {
            return { error: `${rules.label} must be at most ${rules.maxLength} characters.` };
        }

        if (rules.pattern && !rules.pattern.test(value)) {
            return { error: rules.patternMessage || `${rules.label} is invalid.` };
        }

        if (rules.check && !rules.check(value)) {
            return { error: rules.patternMessage || `${rules.label} is invalid.` };
        }

        values[field] = value;
    }

    return { values };
}

const quoteSchema = {
    name: { label: "Name", required: true, minLength: 2, maxLength: 100 },
    email: {
        label: "Email",
        required: true,
        maxLength: 254,
        pattern: EMAIL_PATTERN,
        patternMessage: "Please enter a valid email address."
    },
    phone: {
        label: "Phone",
        required: true,
        maxLength: 30,
        check: (value) => value.replace(/\D/g, "").length >= 10,
        patternMessage: "Please enter a valid phone number."
    },
    company: { label: "Company", maxLength: 150 },
    stoneId: { label: "Stone", required: true, maxLength: 64 },
    quantity: { label: "Quantity", maxLength: 100 },
    message: { label: "Message", required: true, minLength: 10, maxLength: 5000 }
};

const stoneSchema = {
    name: { label: "Name", required: true, maxLength: 100 },
    description: { label: "Description", required: true, maxLength: 2000 },
    origin: { label: "Origin", required: true, maxLength: 100 },
    price: { label: "Price", required: true, maxLength: 50 },
    dimensions: { label: "Dimensions", required: true, maxLength: 100 },
    image: {
        label: "Image",
        maxLength: 500,
        pattern: IMAGE_PATTERN,
        patternMessage: "Image must be a relative path (images/stone.jpg) or an http(s) URL."
    }
};

const stoneIdSchema = {
    id: {
        label: "ID",
        required: true,
        maxLength: 64,
        pattern: STONE_ID_PATTERN,
        patternMessage: "ID may only contain lowercase letters, numbers, and single hyphens."
    }
};

function validateQuote(body) {
    return validateStrings(body || {}, quoteSchema);
}

/**
 * Validates a stone payload. When `includeId` is true the `id` field is validated too.
 */
function validateStone(body, { includeId = false } = {}) {
    const payload = body || {};
    const schema = includeId ? { ...stoneIdSchema, ...stoneSchema } : stoneSchema;
    const result = validateStrings(payload, schema);

    if (result.error) {
        return result;
    }

    const { values } = result;

    let rating = 0;

    if (payload.rating !== undefined && payload.rating !== null && payload.rating !== "") {
        rating = Number(payload.rating);

        if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
            return { error: "Rating must be a number between 0 and 5." };
        }
    }

    let certifications = [];

    if (payload.certifications !== undefined && payload.certifications !== null) {
        if (
            !Array.isArray(payload.certifications) ||
            payload.certifications.length > 20 ||
            payload.certifications.some((item) => typeof item !== "string" || item.length > 50)
        ) {
            return { error: "Certifications must be a list of up to 20 short labels." };
        }

        certifications = payload.certifications
            .map((item) => item.trim())
            .filter(Boolean);
    }

    if (payload.inStock !== undefined && typeof payload.inStock !== "boolean") {
        return { error: "In stock must be true or false." };
    }

    return {
        values: {
            ...values,
            rating,
            certifications,
            inStock: payload.inStock === true
        }
    };
}

module.exports = {
    VALID_QUOTE_STATUSES,
    validateQuote,
    validateStone
};
