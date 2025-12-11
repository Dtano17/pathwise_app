/**
 * Deploy Android Assets
 *
 * Copies generated assets from temp directory to Android native project:
 * - App icons (mipmap-*)
 * - Adaptive foreground layers
 * - Round icons
 * - Splash screens (drawable-*)
 * - Updates colors.xml and ic_launcher_background.xml
 *
 * Run: node scripts/deploy-android-assets.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMP_DIR = path.join(__dirname, '..', 'temp-android-assets');
const ANDROID_RES_DIR = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
const BRAND_PURPLE = '#6C5CE7';

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
      console.log(`  ✓ Copied: ${entry.name} → ${path.relative(ANDROID_RES_DIR, destPath)}`);
    }
  }
}

/**
 * Update colors.xml with brand purple
 */
async function updateColorsXml() {
  const colorsPath = path.join(ANDROID_RES_DIR, 'values', 'colors.xml');

  try {
    let colorsXml = await fs.readFile(colorsPath, 'utf-8');

    // Update ic_launcher_background color
    if (colorsXml.includes('ic_launcher_background')) {
      colorsXml = colorsXml.replace(
        /<color name="ic_launcher_background">#[0-9A-Fa-f]{6}<\/color>/,
        `<color name="ic_launcher_background">${BRAND_PURPLE}</color>`
      );
    } else {
      // Add if doesn't exist
      colorsXml = colorsXml.replace(
        '</resources>',
        `    <color name="ic_launcher_background">${BRAND_PURPLE}</color>\n</resources>`
      );
    }

    await fs.writeFile(colorsPath, colorsXml);
    console.log(`  ✓ Updated colors.xml with brand purple (${BRAND_PURPLE})`);
  } catch (error) {
    console.error(`  ⚠️  Warning: Could not update colors.xml: ${error.message}`);
  }
}

/**
 * Update ic_launcher_background.xml to use solid purple
 */
async function updateBackgroundDrawable() {
  const backgroundPath = path.join(ANDROID_RES_DIR, 'drawable', 'ic_launcher_background.xml');

  const purpleBackgroundXml = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="@color/ic_launcher_background" />
</shape>
`;

  try {
    await fs.writeFile(backgroundPath, purpleBackgroundXml);
    console.log('  ✓ Updated ic_launcher_background.xml with solid purple');
  } catch (error) {
    console.error(`  ⚠️  Warning: Could not update ic_launcher_background.xml: ${error.message}`);
  }
}

/**
 * Main deployment
 */
async function main() {
  console.log('\n🤖 Deploying Android Assets\n');
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

    // Check if Android directory exists
    try {
      await fs.access(ANDROID_RES_DIR);
    } catch {
      console.error(`\n❌ Error: Android res directory not found: ${ANDROID_RES_DIR}`);
      console.log('\n💡 Make sure you have run: npx cap add android\n');
      process.exit(1);
    }

    console.log('\n📱 Copying mipmap icons...\n');
    const mipmapDirs = await fs.readdir(TEMP_DIR);
    for (const dir of mipmapDirs) {
      if (dir.startsWith('mipmap-')) {
        const srcDir = path.join(TEMP_DIR, dir);
        const destDir = path.join(ANDROID_RES_DIR, dir);
        console.log(`📂 ${dir}/`);
        await copyDirectory(srcDir, destDir);
      }
    }

    console.log('\n🖼️  Copying splash screens...\n');
    const drawableDirs = await fs.readdir(TEMP_DIR);
    for (const dir of drawableDirs) {
      if (dir.startsWith('drawable')) {
        const srcDir = path.join(TEMP_DIR, dir);
        const destDir = path.join(ANDROID_RES_DIR, dir);
        console.log(`📂 ${dir}/`);
        await copyDirectory(srcDir, destDir);
      }
    }

    console.log('\n🎨 Updating brand colors...\n');
    await updateColorsXml();
    await updateBackgroundDrawable();

    console.log('\n═'.repeat(50));
    console.log('\n✅ Android assets deployed successfully!\n');
    console.log('💡 Next steps:');
    console.log('   1. Run: npm run build');
    console.log('   2. Run: npx cap sync android');
    console.log('   3. Build APK: cd android && ./gradlew assembleRelease\n');

  } catch (error) {
    console.error('\n❌ Error deploying assets:', error);
    process.exit(1);
  }
}

main();
