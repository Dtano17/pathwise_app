
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ICONS_DIR = path.join(__dirname, '..', 'client', 'public', 'icons');

async function validateIcons() {
    console.log('🔍 Validating Icon Assets...\n');

    const checks = [
        { path: 'web/favicon-32x32.png', expectedSize: 32, type: 'Favicon' },
        { path: 'web/apple-touch-icon.png', expectedSize: 180, type: 'Apple Touch Icon' },
        { path: 'pwa/icon-192x192.png', expectedSize: 192, type: 'PWA Icon' },
        { path: 'pwa/icon-maskable-192x192.png', expectedSize: 192, type: 'Maskable Icon' },
        { path: 'pwa/icon-512x512.png', expectedSize: 512, type: 'PWA Large Icon' }
    ];

    let allPassed = true;

    for (const check of checks) {
        const fullPath = path.join(ICONS_DIR, check.path);
        try {
            const metadata = await sharp(fullPath).metadata();
            const isSizeCorrect = metadata.width === check.expectedSize && metadata.height === check.expectedSize;

            console.log(`${check.type} (${check.path}):`);
            console.log(`  - Exists: ✅`);
            console.log(`  - Dimensions: ${metadata.width}x${metadata.height} ${isSizeCorrect ? '✅' : '❌'}`);
            console.log(`  - Format: ${metadata.format} ✅`);

            if (!isSizeCorrect) allPassed = false;

        } catch (error) {
            console.log(`${check.type} (${check.path}):`);
            console.log(`  - Exists: ❌ (${error.message})`);
            allPassed = false;
        }
        console.log('---');
    }

    if (allPassed) {
        console.log('\n✅ All critical icons passed validation.');
    } else {
        console.log('\n❌ Some icons failed validation.');
        process.exit(1);
    }
}

validateIcons();
