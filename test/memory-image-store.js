// In-memory image store with the same interface as createGridFsImageStore().
const { Readable } = require("stream");
const { ObjectId } = require("mongodb");

function createMemoryImageStore() {
    const files = new Map();

    return {
        files,

        async save(buffer, { contentType, metadata }) {
            const id = String(new ObjectId());

            files.set(id, { buffer, contentType, metadata });

            return id;
        },

        async open(id) {
            const file = files.get(id);

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
            return files.delete(id);
        }
    };
}

module.exports = createMemoryImageStore;
