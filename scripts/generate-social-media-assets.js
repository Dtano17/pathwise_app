import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SOURCE_LOGO = join(__dirname, '../client/public/journalmate-logo-transparent.png');
const OUTPUT_BASE = join(__dirname, '../client/public/social-media-assets');

// Platform specifications with exact requirements
const PLATFORMS = {
  instagram: [
    { name: 'profile', width: 1080, height: 1080, fit: 'contain' },
    { name: 'story', width: 1080, height: 1920, fit: 'contain' }
  ],
  linkedin: [
    { name: 'profile', width: 800, height: 800, fit: 'contain' },
    { name: 'cover', width: 1584, height: 396, fit: 'contain' }
  ],
  'twitter-x': [
    { name: 'profile', width: 400, height: 400, fit: 'contain' },
    { name: 'header', width: 1500, height: 500, fit: 'contain' }
  ],
  facebook: [
    { name: 'profile', width: 500, height: 500, fit: 'contain' },
    { name: 'cover', width: 820, height: 312, fit: 'contain' }
  ],
  youtube: [
    { name: 'profile', width: 800, height: 800, fit: 'contain' },
    { name: 'banner', width: 2560, height: 1440, fit: 'contain' }
  ],
  google: [
    { name: 'profile', width: 800, height: 800, fit: 'contain' }
  ],
  'app-icons': [
    { name: 'ios-1024x1024', width: 1024, height: 1024, fit: 'contain' },
    { name: 'android-512x512', width: 512, height: 512, fit: 'contain' }
  ],
  web: [
    { name: 'og-image-1200x630', width: 1200, height: 630, fit: 'contain' },
    { name: 'thumbnail-1920x1080', width: 1920, height: 1080, fit: 'contain' }
  ]
};

async function generateAsset(platform, spec) {
  const outputPath = join(OUTPUT_BASE, platform, `${spec.name}.png`);
  
  console.log(`📸 Generating ${platform}/${spec.name}.png (${spec.width}x${spec.height})`);
  
  try {
    await sharp(SOURCE_LOGO)
      .resize({
        width: spec.width,
        height: spec.height,
        fit: spec.fit,
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .png({
        quality: 100,
        compressionLevel: 9,
        adaptiveFiltering: true,
        force: true
      })
      .toFile(outputPath);
    
    console.log(`✅ Created: ${platform}/${spec.name}.png`);
  } catch (error) {
    console.error(`❌ Error generating ${platform}/${spec.name}.png:`, error.message);
  }
}

async function main() {
  console.log('🎨 JournalMate Social Media Assets Generator');
  console.log('═'.repeat(60));
  console.log(`📁 Source Logo: ${SOURCE_LOGO}`);
  console.log(`📂 Output Directory: ${OUTPUT_BASE}`);
  console.log('═'.repeat(60));
  console.log();

  // Create output directories
  for (const platform of Object.keys(PLATFORMS)) {
    await mkdir(join(OUTPUT_BASE, platform), { recursive: true });
  }

  // Generate all assets
  const tasks = [];
  for (const [platform, specs] of Object.entries(PLATFORMS)) {
    for (const spec of specs) {
      tasks.push(generateAsset(platform, spec));
    }
  }

  await Promise.all(tasks);

  console.log();
  console.log('═'.repeat(60));
  console.log('✨ All assets generated successfully!');
  console.log(`📍 Location: client/public/social-media-assets/`);
  console.log('═'.repeat(60));
}

main().catch(console.error);
