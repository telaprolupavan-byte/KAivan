const { Readable } = require("stream");
const { GridFSBucket, ObjectId } = require("mongodb");
const sharp = require("sharp");

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_DIMENSION = 1600;
// Smaller renditions for cards and phones, served at /api/images/<id>?w=<width>.
const VARIANT_WIDTHS = [800];
const PIXEL_LIMIT = { limitInputPixels: 50_000_000 };
const ALLOWED_INPUT_FORMATS = new Set(["jpeg", "png", "webp", "gif", "heif"]);
const IMAGE_URL_PATTERN = /^\/api\/images\/([a-f0-9]{24})$/;

class ImageProcessingError extends Error {}

/**
 * Normalizes an uploaded photo: validates it is a real raster image, applies EXIF
 * orientation, strips metadata (e.g. GPS), resizes, and re-encodes as WebP.
 * Also returns smaller `variants` for every VARIANT_WIDTHS entry below the full width.
 */
async function processImage(buffer) {
    let metadata;

    try {
        metadata = await sharp(buffer, PIXEL_LIMIT).metadata();
    } catch {
        throw new ImageProcessingError("The uploaded file is not a valid image.");
    }

    if (!ALLOWED_INPUT_FORMATS.has(metadata.format)) {
        throw new ImageProcessingError("Please upload a JPEG, PNG, WebP, GIF, or AVIF image.");
    }

    try {
        const output = await sharp(buffer, PIXEL_LIMIT)
            .rotate()
            .resize({
                width: MAX_DIMENSION,
                height: MAX_DIMENSION,
                fit: "inside",
                withoutEnlargement: true
            })
            .webp({ quality: 82 })
            .toBuffer({ resolveWithObject: true });

        const variants = [];

        for (const width of VARIANT_WIDTHS.filter((size) => size < output.info.width)) {
            const variant = await sharp(buffer, PIXEL_LIMIT)
                .rotate()
                .resize({ width })
                .webp({ quality: 80 })
                .toBuffer();

            variants.push({ width, buffer: variant });
        }

        return {
            buffer: output.data,
            contentType: "image/webp",
            width: output.info.width,
            height: output.info.height,
            variants
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

function isFileNotFound(error) {
    return /FileNotFound|File not found/i.test(error.message);
}

/**
 * Stores stone photos in MongoDB GridFS so they persist across deploys.
 * Variants are separate files whose metadata points at their parent photo.
 */
function createGridFsImageStore(db) {
    const bucket = new GridFSBucket(db, { bucketName: "stoneImages" });

    function upload(id, filename, buffer, metadata) {
        return new Promise((resolve, reject) => {
            Readable.from(buffer)
                .pipe(bucket.openUploadStreamWithId(id, filename, { metadata }))
                .on("finish", resolve)
                .on("error", reject);
        });
    }

    function describe(file) {
        return {
            contentType: file.metadata?.contentType || "application/octet-stream",
            length: file.length,
            stream: bucket.openDownloadStream(file._id)
        };
    }

    return {
        async save(buffer, { contentType, metadata }) {
            const id = new ObjectId();

            await upload(id, `${id}.webp`, buffer, { contentType, ...metadata });

            return String(id);
        },

        async saveVariant(parentId, width, buffer, contentType) {
            await upload(new ObjectId(), `${parentId}-${width}.webp`, buffer, {
                contentType,
                parentId,
                width
            });
        },

        // Returns the requested width when a variant exists, otherwise the full photo.
        async open(id, { width } = {}) {
            if (width) {
                const [variant] = await bucket
                    .find({ "metadata.parentId": id, "metadata.width": width })
                    .limit(1)
                    .toArray();

                if (variant) {
                    return describe(variant);
                }
            }

            const [file] = await bucket.find({ _id: new ObjectId(id) }).limit(1).toArray();

            return file ? describe(file) : null;
        },

        async remove(id) {
            const variants = await bucket.find({ "metadata.parentId": id }).toArray();

            await Promise.all(variants.map((variant) =>
                bucket.delete(variant._id).catch((error) => {
                    if (!isFileNotFound(error)) {
                        throw error;
                    }
                })
            ));

            try {
                await bucket.delete(new ObjectId(id));

                return true;
            } catch (error) {
                if (isFileNotFound(error)) {
                    return false;
                }

                throw error;
            }
        }
    };
}

module.exports = {
    MAX_UPLOAD_BYTES,
    VARIANT_WIDTHS,
    ImageProcessingError,
    processImage,
    uploadedImageId,
    createGridFsImageStore
};
