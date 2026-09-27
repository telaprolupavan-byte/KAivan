// Minimal in-memory stand-in for the subset of the MongoDB driver the app uses.
const { ObjectId } = require("mongodb");

// Shallow copy that keeps ObjectId instances intact (structuredClone would not).
function clone(document) {
    return Object.fromEntries(
        Object.entries(document).map(([key, value]) => [
            key,
            Array.isArray(value) ? [...value] : value
        ])
    );
}

function valuesEqual(a, b) {
    if (a instanceof ObjectId || b instanceof ObjectId) {
        return String(a) === String(b);
    }

    return a === b;
}

function matches(document, filter) {
    return Object.entries(filter).every(([key, condition]) => {
        if (key === "$or") {
            return condition.some((clause) => matches(document, clause));
        }

        return valuesEqual(document[key], condition);
    });
}

class FakeCursor {
    constructor(documents) {
        this.documents = documents;
    }

    sort(spec) {
        const [[field, direction]] = Object.entries(spec);

        this.documents.sort((a, b) => {
            if (a[field] === b[field]) {
                return 0;
            }

            return (a[field] > b[field] ? 1 : -1) * direction;
        });

        return this;
    }

    async toArray() {
        return this.documents.map((document) => clone(document));
    }
}

class FakeCollection {
    constructor() {
        this.documents = [];
    }

    find(filter = {}) {
        return new FakeCursor(this.documents.filter((document) => matches(document, filter)));
    }

    async findOne(filter) {
        const document = this.documents.find((item) => matches(item, filter));

        return document ? clone(document) : null;
    }

    async insertOne(document) {
        if (document._id === undefined) {
            document._id = new ObjectId();
        }

        this.documents.push(clone(document));

        return { insertedId: document._id };
    }

    async replaceOne(filter, replacement) {
        const index = this.documents.findIndex((item) => matches(item, filter));

        if (index !== -1) {
            this.documents[index] = clone(replacement);
        }

        return { matchedCount: index === -1 ? 0 : 1 };
    }

    async deleteOne(filter) {
        const index = this.documents.findIndex((item) => matches(item, filter));

        if (index !== -1) {
            this.documents.splice(index, 1);
        }

        return { deletedCount: index === -1 ? 0 : 1 };
    }

    async findOneAndUpdate(filter, update) {
        const document = this.documents.find((item) => matches(item, filter));

        if (!document) {
            return null;
        }

        Object.assign(document, update.$set);

        return clone(document);
    }
}

function createFakeDb() {
    const collections = new Map();

    return {
        collection(name) {
            if (!collections.has(name)) {
                collections.set(name, new FakeCollection());
            }

            return collections.get(name);
        },

        async command() {
            return { ok: 1 };
        }
    };
}

module.exports = createFakeDb;
