
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ICON_PATH = path.join(__dirname, '..', 'client', 'public', 'icons', 'web', 'favicon-32x32.png');

async function analyzeIcon() {
    console.log(`Checking Generated: ${ICON_PATH}`);
    try {
        const image = sharp(ICON_PATH);
        const metadata = await image.metadata();
        const { width, height } = metadata;
        console.log(`Dimensions: ${width}x${height}`);

        const rawBuffer = await image.ensureAlpha().raw().toBuffer();
        let minX = width, minY = height, maxX = 0, maxY = 0;
        let hasPixels = false;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const alpha = rawBuffer[idx + 3];
                if (alpha > 10) {
                    hasPixels = true;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        if (hasPixels) {
            const contentW = maxX - minX + 1;
            const contentH = maxY - minY + 1;
            console.log(`Content Box: ${contentW}x${contentH}`);
            console.log(`Padding: Top=${minY}, Bottom=${height - maxY - 1}, Left=${minX}, Right=${width - maxX - 1}`);

            const fillRatio = (contentW * contentH) / (width * height);
            console.log(`Fill Ratio: ${(fillRatio * 100).toFixed(1)}%`);
        } else {
            console.log('Image is empty/transparent');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

analyzeIcon();
