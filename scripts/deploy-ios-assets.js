/**
 * Deploy iOS Assets
 *
 * Copies generated assets from temp directory to iOS native project:
 * - App icons with Contents.json
 * - Splash screen with Contents.json
 *
 * Run: node scripts/deploy-ios-assets.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMP_DIR = path.join(__dirname, '..', 'temp-ios-assets');
const IOS_ASSETS_DIR = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets');

/**
 * Copy directory recursively
 */
async function copyDirectory(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
      console.log(`  ✓ Copied: ${entry.name}`);
    }
  }
}

/**
 * Main deployment
 */
async function main() {
  console.log('\n🍎 Deploying iOS Assets\n');
  console.log('═'.repeat(50));

  try {
    // Check if temp directory exists
    try {
      await fs.access(TEMP_DIR);
    } catch {
      console.error(`\n❌ Error: Temp directory not found: ${TEMP_DIR}`);
      console.log('\n💡 Run this first: node scripts/generate-mobile-assets.js\n');
      process.exit(1);
    }

    // Check if iOS directory exists
    try {
      await fs.access(IOS_ASSETS_DIR);
    } catch {
      console.error(`\n❌ Error: iOS assets directory not found: ${IOS_ASSETS_DIR}`);
      console.log('\n💡 Make sure you have run: npx cap add ios\n');
      process.exit(1);
    }

    console.log('\n📱 Deploying App Icons...\n');
    const appIconSrc = path.join(TEMP_DIR, 'AppIcon.appiconset');
    const appIconDest = path.join(IOS_ASSETS_DIR, 'AppIcon.appiconset');

    // Remove old app icon directory
    try {
      await fs.rm(appIconDest, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist, that's ok
    }

    await copyDirectory(appIconSrc, appIconDest);

    console.log('\n🖼️  Deploying Splash Screen...\n');
    const splashSrc = path.join(TEMP_DIR, 'Splash.imageset');
    const splashDest = path.join(IOS_ASSETS_DIR, 'Splash.imageset');

    // Remove old splash directory
    try {
      await fs.rm(splashDest, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist, that's ok
    }

    await copyDirectory(splashSrc, splashDest);

    console.log('\n═'.repeat(50));
    console.log('\n✅ iOS assets deployed successfully!\n');
    console.log('💡 Next steps:');
    console.log('   1. Run: npm run build');
    console.log('   2. Run: npx cap sync ios');
    console.log('   3. Open in Xcode: npx cap open ios\n');

  } catch (error) {
    console.error('\n❌ Error deploying assets:', error);
    process.exit(1);
  }
}

main();
