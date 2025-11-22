/**
 * Generate Android app icons and splash screens for JournalMate
 * Run with: node scripts/generate-android-assets.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Colors from JournalMate theme
const BRAND_PURPLE = '#6C5CE7';
const BACKGROUND_DARK = '#0f0f23';

// Icon sizes for Android
const ICON_SIZES = {
  'mdpi': 48,
  'hdpi': 72,
  'xhdpi': 96,
  'xxhdpi': 144,
  'xxxhdpi': 192
};

// Splash screen sizes (portrait)
const SPLASH_SIZES_PORT = {
  'mdpi': { width: 320, height: 480 },
  'hdpi': { width: 480, height: 800 },
  'xhdpi': { width: 720, height: 1280 },
  'xxhdpi': { width: 1080, height: 1920 },
  'xxxhdpi': { width: 1440, height: 2560 }
};

// Splash screen sizes (landscape)
const SPLASH_SIZES_LAND = {
  'mdpi': { width: 480, height: 320 },
  'hdpi': { width: 800, height: 480 },
  'xhdpi': { width: 1280, height: 720 },
  'xxhdpi': { width: 1920, height: 1080 },
  'xxxhdpi': { width: 2560, height: 1440 }
};

async function generateIcons() {
  console.log('📱 Generating Android app icons...');
  
  const sourceIcon = path.join(__dirname, '../client/public/icons/pwa/icon-512x512.png');
  
  if (!fs.existsSync(sourceIcon)) {
    console.error('❌ Source icon not found:', sourceIcon);
    return;
  }

  for (const [density, size] of Object.entries(ICON_SIZES)) {
    const outputDir = path.join(__dirname, '../android/app/src/main/res', `mipmap-${density}`);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate launcher icon
    await sharp(sourceIcon)
      .resize(size, size)
      .toFile(path.join(outputDir, 'ic_launcher.png'));
    
    // Generate round launcher icon
    await sharp(sourceIcon)
      .resize(size, size)
      .toFile(path.join(outputDir, 'ic_launcher_round.png'));
    
    // Generate foreground icon (for adaptive icons)
    await sharp(sourceIcon)
      .resize(size, size)
      .toFile(path.join(outputDir, 'ic_launcher_foreground.png'));
    
    console.log(`  ✓ Generated ${density} icons (${size}x${size})`);
  }
}

async function generateSplashScreens() {
  console.log('\n🎨 Generating splash screens...');
  
  const logo = path.join(__dirname, '../client/public/journalmate-logo-transparent.png');
  
  if (!fs.existsSync(logo)) {
    console.error('❌ Logo not found:', logo);
    return;
  }

  // Generate portrait splash screens
  for (const [density, dimensions] of Object.entries(SPLASH_SIZES_PORT)) {
    const outputDir = path.join(__dirname, '../android/app/src/main/res', `drawable-port-${density}`);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create background
    const background = await sharp({
      create: {
        width: dimensions.width,
        height: dimensions.height,
        channels: 4,
        background: BRAND_PURPLE
      }
    }).png().toBuffer();

    // Resize logo to fit nicely
    const logoSize = Math.min(dimensions.width, dimensions.height) * 0.5;
    const resizedLogo = await sharp(logo)
      .resize(Math.floor(logoSize), Math.floor(logoSize), { fit: 'inside' })
      .toBuffer();

    // Composite logo on background (centered)
    const logoMetadata = await sharp(resizedLogo).metadata();
    const left = Math.floor((dimensions.width - logoMetadata.width) / 2);
    const top = Math.floor((dimensions.height - logoMetadata.height) / 2);

    await sharp(background)
      .composite([{ input: resizedLogo, left, top }])
      .toFile(path.join(outputDir, 'splash.png'));

    console.log(`  ✓ Generated ${density} portrait splash (${dimensions.width}x${dimensions.height})`);
  }

  // Generate landscape splash screens
  for (const [density, dimensions] of Object.entries(SPLASH_SIZES_LAND)) {
    const outputDir = path.join(__dirname, '../android/app/src/main/res', `drawable-land-${density}`);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create background
    const background = await sharp({
      create: {
        width: dimensions.width,
        height: dimensions.height,
        channels: 4,
        background: BRAND_PURPLE
      }
    }).png().toBuffer();

    // Resize logo to fit nicely
    const logoSize = Math.min(dimensions.width, dimensions.height) * 0.5;
    const resizedLogo = await sharp(logo)
      .resize(Math.floor(logoSize), Math.floor(logoSize), { fit: 'inside' })
      .toBuffer();

    // Composite logo on background (centered)
    const logoMetadata = await sharp(resizedLogo).metadata();
    const left = Math.floor((dimensions.width - logoMetadata.width) / 2);
    const top = Math.floor((dimensions.height - logoMetadata.height) / 2);

    await sharp(background)
      .composite([{ input: resizedLogo, left, top }])
      .toFile(path.join(outputDir, 'splash.png'));

    console.log(`  ✓ Generated ${density} landscape splash (${dimensions.width}x${dimensions.height})`);
  }

  // Also generate default splash in drawable
  const defaultSplashDir = path.join(__dirname, '../android/app/src/main/res/drawable');
  const defaultWidth = 1080;
  const defaultHeight = 1920;
  
  const defaultBackground = await sharp({
    create: {
      width: defaultWidth,
      height: defaultHeight,
      channels: 4,
      background: BRAND_PURPLE
    }
  }).png().toBuffer();

  const defaultLogoSize = Math.min(defaultWidth, defaultHeight) * 0.5;
  const defaultResizedLogo = await sharp(logo)
    .resize(Math.floor(defaultLogoSize), Math.floor(defaultLogoSize), { fit: 'inside' })
    .toBuffer();

  const defaultLogoMetadata = await sharp(defaultResizedLogo).metadata();
  const defaultLeft = Math.floor((defaultWidth - defaultLogoMetadata.width) / 2);
  const defaultTop = Math.floor((defaultHeight - defaultLogoMetadata.height) / 2);

  await sharp(defaultBackground)
    .composite([{ input: defaultResizedLogo, left: defaultLeft, top: defaultTop }])
    .toFile(path.join(defaultSplashDir, 'splash.png'));

  console.log(`  ✓ Generated default splash (${defaultWidth}x${defaultHeight})`);
}

async function main() {
  console.log('🚀 JournalMate Android Asset Generator\n');
  
  try {
    await generateIcons();
    await generateSplashScreens();
    console.log('\n✅ All assets generated successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Sync Capacitor: npx cap sync android');
    console.log('   2. Open in Android Studio: npx cap open android');
    console.log('   3. Build APK: Build → Build Bundle(s) / APK(s) → Build APK(s)');
  } catch (error) {
    console.error('\n❌ Error generating assets:', error);
    process.exit(1);
  }
}

main();
