// Regenerates the web-optimized images the public site uses:
//   public/images/<stone>.webp for each bundled public/images/<stone>.jpg,
//   plus the hero, statistics-band, and logo images.
// Run after replacing a bundled image: npm run optimize-images
// (Photos uploaded through the admin dashboard are optimized automatically.)
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const IMAGES = path.join(__dirname, "..", "public", "images");
const LOGO_SOURCE = "hero.jpg";

function imagePath(file) {
    return path.join(IMAGES, file);
}

async function main() {
    const stonePhotos = fs
        .readdirSync(IMAGES)
        .filter((file) => file.endsWith(".jpg") && file !== LOGO_SOURCE);

    for (const file of stonePhotos) {
        const source = imagePath(file);
        const { width } = await sharp(source).metadata();

        await sharp(source)
            .resize({ width: Math.min(1200, width) })
            .webp({ quality: 80 })
            .toFile(source.replace(/\.jpg$/, ".webp"));
    }

    await sharp(imagePath("black-galaxy.jpg")).resize({ width: 1536 }).webp({ quality: 70 }).toFile(imagePath("hero-stone.webp"));
    await sharp(imagePath("black-galaxy.jpg")).resize({ width: 960 }).webp({ quality: 70 }).toFile(imagePath("hero-stone-960.webp"));
    await sharp(imagePath("burgundy.jpg")).resize({ width: 1440 }).modulate({ brightness: 0.9 }).webp({ quality: 60 }).toFile(imagePath("band-stone.webp"));
    await sharp(imagePath(LOGO_SOURCE)).resize({ width: 1200 }).webp({ quality: 92 }).toFile(imagePath("logo.webp"));

    console.log(`Optimized ${stonePhotos.length} stone photos plus the hero, band, and logo images.`);
}

main().catch((error) => {
    console.error("Image optimization failed:", error);
    process.exit(1);
});
