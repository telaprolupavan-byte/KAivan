// Regenerates the web-optimized images the public site uses:
//   public/images/<stone>.webp (1200px) and <stone>-800.webp for each bundled
//   public/images/<stone>.jpg, plus the hero, statistics-band, logo and social-share images.
// Run after replacing a bundled image: npm run optimize-images
// (Photos uploaded through the admin dashboard are optimized automatically.)
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const IMAGES = path.join(__dirname, "..", "public", "images");
const LOGO_SOURCE = "hero.jpg";
const SHARE_IMAGE = "og-image.jpg";

function imagePath(file) {
    return path.join(IMAGES, file);
}

async function main() {
    const stonePhotos = fs
        .readdirSync(IMAGES)
        .filter((file) => file.endsWith(".jpg") && file !== LOGO_SOURCE && file !== SHARE_IMAGE);

    for (const file of stonePhotos) {
        const source = imagePath(file);
        const { width } = await sharp(source).metadata();

        await sharp(source)
            .resize({ width: Math.min(1200, width) })
            .webp({ quality: 80 })
            .toFile(source.replace(/\.jpg$/, ".webp"));

        await sharp(source)
            .resize({ width: Math.min(800, width) })
            .webp({ quality: 78 })
            .toFile(source.replace(/\.jpg$/, "-800.webp"));
    }

    await sharp(imagePath("black-galaxy.jpg")).resize({ width: 1536 }).webp({ quality: 70 }).toFile(imagePath("hero-stone.webp"));
    await sharp(imagePath("black-galaxy.jpg")).resize({ width: 960 }).webp({ quality: 70 }).toFile(imagePath("hero-stone-960.webp"));
    await sharp(imagePath("burgundy.jpg")).resize({ width: 1440 }).modulate({ brightness: 0.9 }).webp({ quality: 60 }).toFile(imagePath("band-stone.webp"));
    await sharp(imagePath(LOGO_SOURCE)).resize({ width: 1200 }).webp({ quality: 92 }).toFile(imagePath("logo.webp"));

    // 1200x630 social-share image: the logo, unchanged, centred on its own background colour.
    const logo = await sharp(imagePath(LOGO_SOURCE)).resize({ height: 630 }).toBuffer();

    await sharp({
        create: { width: 1200, height: 630, channels: 3, background: "#f9f5f0" }
    })
        .composite([{ input: logo, gravity: "center" }])
        .jpeg({ quality: 88, mozjpeg: true })
        .toFile(imagePath(SHARE_IMAGE));

    console.log(`Optimized ${stonePhotos.length} stone photos plus the hero, band, logo, and share images.`);
}

main().catch((error) => {
    console.error("Image optimization failed:", error);
    process.exit(1);
});
