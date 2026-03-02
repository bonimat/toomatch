const jimp = require('jimp-compact');
const fs = require('fs');
const path = require('path');

const INPUT_PATH = path.join(__dirname, '../assets/icon.png');
const OUTPUT_DIR = path.join(__dirname, '../assets/icon_proposals');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'icon_bk_blue.png');
const BLUE_COLOR = '#1E90FF'; // Dodger Blue
const SCALE_FACTOR = 0.65;

console.log(`Starting icon modification...`);
console.log(`Input: ${INPUT_PATH}`);

async function modifyIcon() {
    try {
        // Ensure output directory exists
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        // Read the image
        const image = await jimp.read(INPUT_PATH);
        const width = image.getWidth();
        const height = image.getHeight();

        console.log(`Original Size: ${width}x${height}`);

        // scale down the original image slightly to create padding
        const background = new jimp(width, height, BLUE_COLOR);

        // 1. Aggressive Autocrop to remove uniform background
        // Increased tolerance to 0.15 to eat into the anti-aliasing/halo
        image.autocrop(0.15, false);

        // 2. Manual "shave" - crop 5% from edges to remove the specific black halo artifact
        // The user says there is still a "smudge", so we cut deeper.
        const w = image.getWidth();
        const h = image.getHeight();
        const cropAmount = Math.floor(Math.min(w, h) * 0.05); // 5% shave
        image.crop(cropAmount, cropAmount, w - (cropAmount * 2), h - (cropAmount * 2));

        // 3. Circle mask
        image.circle();

        // 4. Scale down
        image.resize(width * SCALE_FACTOR, jimp.AUTO);

        const newWidth = image.getWidth();
        const newHeight = image.getHeight();
        console.log(`Resized to: ${newWidth}x${newHeight}`);

        // Center on the blue background
        const x = (width - newWidth) / 2;
        const y = (height - newHeight) / 2;

        background.composite(image, x, y);

        // Save the result
        await background.writeAsync(OUTPUT_PATH);
        console.log(`Success! Saved to ${OUTPUT_PATH}`);

    } catch (error) {
        console.error("Error modifying icon:", error);
    }
}

modifyIcon();
