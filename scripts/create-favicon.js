
import fs from 'fs/promises';
import path from 'path';
import toIco from 'to-ico';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ICONS_DIR = path.join(__dirname, '..', 'client', 'public', 'icons', 'web');
const OUTPUT_FILE = path.join(__dirname, '..', 'client', 'public', 'favicon.ico');

async function createFavicon() {
    console.log('🏗️  Creating favicon.ico...');

    try {
        const files = await Promise.all([
            fs.readFile(path.join(ICONS_DIR, 'favicon-16x16.png')),
            fs.readFile(path.join(ICONS_DIR, 'favicon-32x32.png')),
            fs.readFile(path.join(ICONS_DIR, 'favicon-48x48.png'))
        ]);

        const buf = await toIco(files);
        await fs.writeFile(OUTPUT_FILE, buf);

        console.log('✅ favicon.ico created successfully!');
    } catch (error) {
        console.error('❌ Error creating favicon.ico:', error);
        process.exit(1);
    }
}

createFavicon();
