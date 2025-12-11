/**
 * JournalMate Mobile Assets Generator
 *
 * Generates production-grade assets for Android and iOS:
 * - Adaptive icon layers (foreground + background)
 * - Round icons for Android
 * - Splash screens for multiple densities
 * - iOS Contents.json configuration
 *
 * Run: node scripts/generate-mobile-assets.js
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Source files
const SOURCE_DIR = path.join(__dirname, '..', 'client', 'public');
const SOURCE_ICON = path.join(SOURCE_DIR, 'journalmate-logo-transparent.png');
const ANDROID_RES_DIR = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
const IOS_ASSETS_DIR = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets');

// Brand colors
const BRAND_PURPLE = '#6C5CE7';
const BRAND_DARK_BG = '#0f0f23';

// Density configurations
const DENSITIES = {
  ldpi: { scale: 0.75, size: 36 },
  mdpi: { scale: 1.0, size: 48 },
  hdpi: { scale: 1.5, size: 72 },
  xhdpi: { scale: 2.0, size: 96 },
  xxhdpi: { scale: 3.0, size: 144 },
  xxxhdpi: { scale: 4.0, size: 192 }
};

// Splash screen sizes
const SPLASH_SIZES = {
  'drawable': { width: 480, height: 320 },
  'drawable-port-mdpi': { width: 320, height: 480 },
  'drawable-port-hdpi': { width: 480, height: 800 },
  'drawable-port-xhdpi': { width: 720, height: 1280 },
  'drawable-port-xxhdpi': { width: 1080, height: 1920 },
  'drawable-port-xxxhdpi': { width: 1440, height: 2560 },
  'drawable-land-mdpi': { width: 480, height: 320 },
  'drawable-land-hdpi': { width: 800, height: 480 },
  'drawable-land-xhdpi': { width: 1280, height: 720 },
  'drawable-land-xxhdpi': { width: 1920, height: 1080 },
  'drawable-land-xxxhdpi': { width: 2560, height: 1440 }
};

// iOS icon sizes
const IOS_ICON_SIZES = [
  { size: 20, scale: 2, idiom: 'iphone', filename: 'Icon-App-20x20@2x.png' },
  { size: 20, scale: 3, idiom: 'iphone', filename: 'Icon-App-20x20@3x.png' },
  { size: 29, scale: 2, idiom: 'iphone', filename: 'Icon-App-29x29@2x.png' },
  { size: 29, scale: 3, idiom: 'iphone', filename: 'Icon-App-29x29@3x.png' },
  { size: 40, scale: 2, idiom: 'iphone', filename: 'Icon-App-40x40@2x.png' },
  { size: 40, scale: 3, idiom: 'iphone', filename: 'Icon-App-40x40@3x.png' },
  { size: 60, scale: 2, idiom: 'iphone', filename: 'Icon-App-60x60@2x.png' },
  { size: 60, scale: 3, idiom: 'iphone', filename: 'Icon-App-60x60@3x.png' },
  { size: 20, scale: 1, idiom: 'ipad', filename: 'Icon-App-20x20@1x.png' },
  { size: 20, scale: 2, idiom: 'ipad', filename: 'Icon-App-20x20@2x-1.png' },
  { size: 29, scale: 1, idiom: 'ipad', filename: 'Icon-App-29x29@1x.png' },
  { size: 29, scale: 2, idiom: 'ipad', filename: 'Icon-App-29x29@2x-1.png' },
  { size: 40, scale: 1, idiom: 'ipad', filename: 'Icon-App-40x40@1x.png' },
  { size: 40, scale: 2, idiom: 'ipad', filename: 'Icon-App-40x40@2x-1.png' },
  { size: 76, scale: 1, idiom: 'ipad', filename: 'Icon-App-76x76@1x.png' },
  { size: 76, scale: 2, idiom: 'ipad', filename: 'Icon-App-76x76@2x.png' },
  { size: 83.5, scale: 2, idiom: 'ipad', filename: 'Icon-App-83.5x83.5@2x.png' },
  { size: 1024, scale: 1, idiom: 'ios-marketing', filename: 'Icon-App-1024x1024@1x.png' }
];

/**
 * Create solid color background SVG
 */
function createSolidBackground(width, height, color) {
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${color}" />
    </svg>
  `;
}

/**
 * Generate Android adaptive icon foreground layer (transparent logo only)
 */
async function generateAdaptiveForeground(sourceBuffer, size, outputPath) {
  // Adaptive icons should have 25% safe zone padding (108dp icon with 72dp safe zone)
  const safePadding = Math.floor(size * 0.25);
  const logoSize = size - (safePadding * 2);

  await sharp(sourceBuffer)
    .resize(logoSize, logoSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .extend({
      top: safePadding,
      bottom: safePadding,
      left: safePadding,
      right: safePadding,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toFile(outputPath);

  console.log(`✓ Generated adaptive foreground: ${path.basename(outputPath)} (${size}x${size})`);
}

/**
 * Generate regular app icon with purple background
 */
async function generateAppIcon(sourceBuffer, size, outputPath) {
  const padding = Math.floor(size * 0.15); // 15% padding
  const logoSize = size - (padding * 2);

  // Create purple background
  const background = Buffer.from(createSolidBackground(size, size, BRAND_PURPLE));

  // Resize logo
  const logo = await sharp(sourceBuffer)
    .resize(logoSize, logoSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toBuffer();

  // Composite logo on purple background
  await sharp(background)
    .composite([{
      input: logo,
      top: padding,
      left: padding
    }])
    .png()
    .toFile(outputPath);

  console.log(`✓ Generated app icon: ${path.basename(outputPath)} (${size}x${size})`);
}

/**
 * Generate round icon with circular mask
 */
async function generateRoundIcon(sourceBuffer, size, outputPath) {
  const padding = Math.floor(size * 0.15);
  const logoSize = size - (padding * 2);

  // Create circular mask SVG
  const circleMask = `
    <svg width="${size}" height="${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="${BRAND_PURPLE}"/>
    </svg>
  `;

  // Resize logo
  const logo = await sharp(sourceBuffer)
    .resize(logoSize, logoSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toBuffer();

  // Create circular background with logo
  await sharp(Buffer.from(circleMask))
    .composite([{
      input: logo,
      top: padding,
      left: padding
    }])
    .png()
    .toFile(outputPath);

  console.log(`✓ Generated round icon: ${path.basename(outputPath)} (${size}x${size})`);
}

/**
 * Generate splash screen with logo centered on purple background
 */
async function generateSplashScreen(sourceBuffer, width, height, outputPath) {
  // Logo should be ~20-25% of smaller dimension
  const minDimension = Math.min(width, height);
  const logoSize = Math.floor(minDimension * 0.23);

  // Create purple background
  const background = Buffer.from(createSolidBackground(width, height, BRAND_PURPLE));

  // Resize logo
  const logo = await sharp(sourceBuffer)
    .resize(logoSize, logoSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toBuffer();

  // Center logo on background
  const left = Math.floor((width - logoSize) / 2);
  const top = Math.floor((height - logoSize) / 2);

  await sharp(background)
    .composite([{
      input: logo,
      top,
      left
    }])
    .png()
    .toFile(outputPath);

  console.log(`✓ Generated splash: ${path.basename(outputPath)} (${width}x${height})`);
}

/**
 * Generate all Android assets
 */
async function generateAndroidAssets(sourceBuffer) {
  console.log('\n📱 Generating Android Assets...\n');

  // Create temp output directory
  const tempDir = path.join(__dirname, '..', 'temp-android-assets');
  await fs.mkdir(tempDir, { recursive: true });

  // Generate assets for each density
  for (const [density, config] of Object.entries(DENSITIES)) {
    const densityDir = path.join(tempDir, `mipmap-${density}`);
    await fs.mkdir(densityDir, { recursive: true });

    // Regular app icon (with purple background)
    await generateAppIcon(
      sourceBuffer,
      config.size,
      path.join(densityDir, 'ic_launcher.png')
    );

    // Adaptive foreground (transparent logo only)
    await generateAdaptiveForeground(
      sourceBuffer,
      config.size,
      path.join(densityDir, 'ic_launcher_foreground.png')
    );

    // Round icon
    await generateRoundIcon(
      sourceBuffer,
      config.size,
      path.join(densityDir, 'ic_launcher_round.png')
    );
  }

  // Generate splash screens
  for (const [drawableDir, dimensions] of Object.entries(SPLASH_SIZES)) {
    const splashDir = path.join(tempDir, drawableDir);
    await fs.mkdir(splashDir, { recursive: true });

    await generateSplashScreen(
      sourceBuffer,
      dimensions.width,
      dimensions.height,
      path.join(splashDir, 'splash.png')
    );
  }

  console.log(`\n✅ Android assets generated in: ${tempDir}\n`);
  return tempDir;
}

/**
 * Generate iOS app icons with Contents.json
 */
async function generateIOSAssets(sourceBuffer) {
  console.log('\n🍎 Generating iOS Assets...\n');

  const tempDir = path.join(__dirname, '..', 'temp-ios-assets');
  const appIconDir = path.join(tempDir, 'AppIcon.appiconset');
  await fs.mkdir(appIconDir, { recursive: true });

  // Generate each icon size
  const contentsImages = [];
  for (const iconSpec of IOS_ICON_SIZES) {
    const pixelSize = Math.round(iconSpec.size * iconSpec.scale);
    const outputPath = path.join(appIconDir, iconSpec.filename);

    await generateAppIcon(sourceBuffer, pixelSize, outputPath);

    contentsImages.push({
      filename: iconSpec.filename,
      idiom: iconSpec.idiom,
      scale: `${iconSpec.scale}x`,
      size: `${iconSpec.size}x${iconSpec.size}`
    });
  }

  // Create Contents.json
  const contentsJson = {
    images: contentsImages,
    info: {
      author: 'xcode',
      version: 1
    }
  };

  await fs.writeFile(
    path.join(appIconDir, 'Contents.json'),
    JSON.stringify(contentsJson, null, 2)
  );

  console.log(`✓ Generated Contents.json with ${contentsImages.length} icons`);

  // Generate universal splash screen (2732x2732 for iPad Pro)
  const splashDir = path.join(tempDir, 'Splash.imageset');
  await fs.mkdir(splashDir, { recursive: true });

  await generateSplashScreen(
    sourceBuffer,
    2732,
    2732,
    path.join(splashDir, 'splash.png')
  );

  // Create Contents.json for splash
  const splashContents = {
    images: [
      {
        filename: 'splash.png',
        idiom: 'universal',
        scale: '1x'
      },
      {
        filename: 'splash.png',
        idiom: 'universal',
        scale: '2x'
      },
      {
        filename: 'splash.png',
        idiom: 'universal',
        scale: '3x'
      }
    ],
    info: {
      author: 'xcode',
      version: 1
    }
  };

  await fs.writeFile(
    path.join(splashDir, 'Contents.json'),
    JSON.stringify(splashContents, null, 2)
  );

  console.log(`\n✅ iOS assets generated in: ${tempDir}\n`);
  return tempDir;
}

/**
 * Main execution
 */
async function main() {
  console.log('🎨 JournalMate Mobile Assets Generator\n');
  console.log('═'.repeat(50));

  try {
    // Load source logo
    console.log(`📂 Loading source logo: ${SOURCE_ICON}`);
    const sourceBuffer = await fs.readFile(SOURCE_ICON);
    console.log('✓ Logo loaded successfully\n');

    // Generate Android assets
    const androidTempDir = await generateAndroidAssets(sourceBuffer);

    // Generate iOS assets
    const iosTempDir = await generateIOSAssets(sourceBuffer);

    console.log('═'.repeat(50));
    console.log('\n🎉 All assets generated successfully!\n');
    console.log('📁 Temporary directories:');
    console.log(`   Android: ${androidTempDir}`);
    console.log(`   iOS: ${iosTempDir}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Run: node scripts/deploy-android-assets.js');
    console.log('   2. Run: node scripts/deploy-ios-assets.js');
    console.log('   3. Or run: npm run deploy:mobile-assets (to deploy both)\n');

  } catch (error) {
    console.error('\n❌ Error generating assets:', error);
    process.exit(1);
  }
}

main();
