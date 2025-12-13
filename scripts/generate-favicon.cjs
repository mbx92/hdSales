const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../public/logo.png');
const faviconPath = path.join(__dirname, '../public/favicon.ico');
const favicon32 = path.join(__dirname, '../public/favicon-32x32.png');
const favicon16 = path.join(__dirname, '../public/favicon-16x16.png');
const apple = path.join(__dirname, '../public/apple-touch-icon.png');

async function generateFavicons() {
    console.log('Generating favicons from logo...');

    // Generate 32x32 PNG
    await sharp(inputPath)
        .resize(32, 32)
        .png()
        .toFile(favicon32);
    console.log('✓ favicon-32x32.png');

    // Generate 16x16 PNG
    await sharp(inputPath)
        .resize(16, 16)
        .png()
        .toFile(favicon16);
    console.log('✓ favicon-16x16.png');

    // Generate Apple Touch Icon (180x180)
    await sharp(inputPath)
        .resize(180, 180)
        .png()
        .toFile(apple);
    console.log('✓ apple-touch-icon.png');

    // Generate favicon.ico (use 32x32 as base)
    await sharp(inputPath)
        .resize(32, 32)
        .toFormat('png')
        .toFile(faviconPath.replace('.ico', '.png'));

    // Rename to .ico (browsers accept PNG as ico)
    fs.renameSync(faviconPath.replace('.ico', '.png'), faviconPath);
    console.log('✓ favicon.ico');

    console.log('\nAll favicons generated successfully!');
}

generateFavicons().catch(console.error);
