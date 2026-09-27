const { Readable } = require("stream");
const { GridFSBucket, ObjectId } = require("mongodb");
const sharp = require("sharp");

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_DIMENSION = 1600;
const ALLOWED_INPUT_FORMATS = new Set(["jpeg", "png", "webp", "gif", "heif"]);
const IMAGE_URL_PATTERN = /^\/api\/images\/([a-f0-9]{24})$/;

class ImageProcessingError extends Error {}

/**
 * Normalizes an uploaded photo: validates it is a real raster image, applies EXIF
 * orientation, strips metadata (e.g. GPS), resizes, and re-encodes as WebP.
 */
async function processImage(buffer) {
    let metadata;

    try {
        metadata = await sharp(buffer, { limitInputPixels: 50_000_000 }).metadata();
    } catch {
        throw new ImageProcessingError("The uploaded file is not a valid image.");
    }

    if (!ALLOWED_INPUT_FORMATS.has(metadata.format)) {
        throw new ImageProcessingError("Please upload a JPEG, PNG, WebP, GIF, or AVIF image.");
    }

    try {
        const output = await sharp(buffer, { limitInputPixels: 50_000_000 })
            .rotate()
            .resize({
                width: MAX_DIMENSION,
                height: MAX_DIMENSION,
                fit: "inside",
                withoutEnlargement: true
            })
            .webp({ quality: 82 })
            .toBuffer({ resolveWithObject: true });

        return {
            buffer: output.data,
            contentType: "image/webp",
            width: output.info.width,
            height: output.info.height
        };
    } catch {
        throw new ImageProcessingError("The uploaded image could not be processed.");
    }
}

/** Returns the GridFS id for an uploaded-image URL, or null for any other image value. */
function uploadedImageId(imageUrl) {
    const match = IMAGE_URL_PATTERN.exec(imageUrl || "");

    return match ? match[1] : null;
}

/** Stores stone photos in MongoDB GridFS so they persist across deploys. */
function createGridFsImageStore(db) {
    const bucket = new GridFSBucket(db, { bucketName: "stoneImages" });

    return {
        async save(buffer, { contentType, metadata }) {
            const id = new ObjectId();

            await new Promise((resolve, reject) => {
                Readable.from(buffer)
                    .pipe(bucket.openUploadStreamWithId(id, `${id}.webp`, {
                        metadata: { contentType, ...metadata }
                    }))
                    .on("finish", resolve)
                    .on("error", reject);
            });

            return String(id);
        },

        async open(id) {
            const _id = new ObjectId(id);
            const [file] = await bucket.find({ _id }).limit(1).toArray();

            if (!file) {
                return null;
            }

            return {
                contentType: file.metadata?.contentType || "application/octet-stream",
                length: file.length,
                stream: bucket.openDownloadStream(_id)
            };
        },

        async remove(id) {
            try {
                await bucket.delete(new ObjectId(id));

                return true;
            } catch (error) {
                if (/FileNotFound|File not found/i.test(error.message)) {
                    return false;
                }

                throw error;
            }
        }
    };
}

module.exports = {
    MAX_UPLOAD_BYTES,
    ImageProcessingError,
    processImage,
    uploadedImageId,
    createGridFsImageStore
};
