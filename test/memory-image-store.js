// In-memory image store with the same interface as createGridFsImageStore().
const { Readable } = require("stream");
const { ObjectId } = require("mongodb");

function createMemoryImageStore() {
    const files = new Map();
    const variants = new Map();

    return {
        files,
        variants,

        async save(buffer, { contentType, metadata }) {
            const id = String(new ObjectId());

            files.set(id, { buffer, contentType, metadata });

            return id;
        },

        async saveVariant(parentId, width, buffer, contentType) {
            variants.set(`${parentId}:${width}`, { buffer, contentType });
        },

        async open(id, { width } = {}) {
            const file = (width && variants.get(`${id}:${width}`)) || files.get(id);

            if (!file) {
                return null;
            }

            return {
                contentType: file.contentType,
                length: file.buffer.length,
                stream: Readable.from(file.buffer)
            };
        },

        async remove(id) {
            for (const key of variants.keys()) {
                if (key.startsWith(`${id}:`)) {
                    variants.delete(key);
                }
            }

            return files.delete(id);
        }
    };
}

module.exports = createMemoryImageStore;
