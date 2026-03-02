const jimp = require('jimp-compact');
const fs = require('fs');
const path = require('path');

const INPUT_PATH = path.join(__dirname, '../assets/icon_proposals/icon.png'); // Original transparent icon
const OUTPUT_PATH = path.join(__dirname, '../assets/adaptive-icon-foreground.png');
const SCALE_FACTOR = 0.65; // Same as before to keep it safe

console.log(`Starting adaptive icon foreground generation...`);
console.log(`Input: ${INPUT_PATH}`);

async function generateForeground() {
    try {
        const image = await jimp.read(INPUT_PATH);
        const width = image.getWidth();
        const height = image.getHeight();

        console.log(`Original Size: ${width}x${height}`);

        // 1. Aggressive Autocrop/Trim to remove extra space/artifacts
        image.autocrop(0.15, false);

        // 2. Manual "shave" to be safe (same logic as before)
        const w = image.getWidth();
        const h = image.getHeight();
        const cropAmount = Math.floor(Math.min(w, h) * 0.05);
        image.crop(cropAmount, cropAmount, w - (cropAmount * 2), h - (cropAmount * 2));

        // 3. Make sure it's transparent (it should be, but let's just proceed)

        // 4. Create transparent canvas of original size (1024x1024)
        // 0x00000000 is fully transparent black
        const canvas = new jimp(width, height, 0x00000000);

        // 5. Resize ball
        image.resize(width * SCALE_FACTOR, jimp.AUTO);

        const newWidth = image.getWidth();
        const newHeight = image.getHeight();
        console.log(`Resized ball to: ${newWidth}x${newHeight}`);

        // 6. Center on transparent canvas
        const x = (width - newWidth) / 2;
        const y = (height - newHeight) / 2;

        canvas.composite(image, x, y);

        // 7. Save
        await canvas.writeAsync(OUTPUT_PATH);
        console.log(`Success! Saved to ${OUTPUT_PATH}`);

    } catch (error) {
        console.error("Error generating adaptive icon:", error);
        process.exit(1);
    }
}

generateForeground();
