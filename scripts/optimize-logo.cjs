const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../public/logo.png');
const outputPath = path.join(__dirname, '../public/logo-optimized.png');

async function optimizeLogo() {
    const originalSize = fs.statSync(inputPath).size;

    await sharp(inputPath)
        .png({
            quality: 90,
            compressionLevel: 9,
            palette: true
        })
        .toFile(outputPath);

    const optimizedSize = fs.statSync(outputPath).size;

    console.log(`Original: ${(originalSize / 1024).toFixed(2)} KB`);
    console.log(`Optimized: ${(optimizedSize / 1024).toFixed(2)} KB`);
    console.log(`Saved: ${((1 - optimizedSize / originalSize) * 100).toFixed(1)}%`);
    console.log(`\nOptimized logo saved to: ${outputPath}`);
}

optimizeLogo().catch(console.error);
