/**
 * JournalMate Icon Generator
 *
 * Generates all required icon sizes for:
 * - Web/PWA
 * - iOS
 * - Android
 * - Social Media (Facebook, Twitter, LinkedIn, Instagram, etc.)
 * - Email & Marketing
 * - Desktop (Windows, macOS)
 *
 * Run: node scripts/generate-icons.js
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Source files
const SOURCE_DIR = path.join(__dirname, '..', 'client', 'public');
const OUTPUT_DIR = path.join(__dirname, '..', 'client', 'public', 'icons');
const SOURCE_ICON = path.join(SOURCE_DIR, 'journalmate-logo-transparent.png');

// Brand colors
const BRAND_COLORS = {
  gradient: {
    start: '#7C3AED', // Purple
    end: '#14B8A6'    // Teal
  },
  background: '#1e1b4b', // Deep purple
  accent: '#10b981'      // Emerald
};

// Icon specifications for all platforms
const ICON_SPECS = {
  // Web & PWA Icons
  web: [
    { size: 16, name: 'favicon-16x16.png', transparent: true, padding: 0 },
    { size: 32, name: 'favicon-32x32.png', transparent: true, padding: 0 },
    { size: 48, name: 'favicon-48x48.png', transparent: true, padding: 0 },
    { size: 180, name: 'apple-touch-icon.png', transparent: false, padding: 0 }, // Apple icons look better full bleed
    { size: 192, name: 'android-chrome-192x192.png', transparent: true, padding: 0 },
    { size: 512, name: 'android-chrome-512x512.png', transparent: true, padding: 0 },
  ],

  pwa: [
    { size: 72, name: 'icon-72x72.png', transparent: true },
    { size: 96, name: 'icon-96x96.png', transparent: true },
    { size: 128, name: 'icon-128x128.png', transparent: true },
    { size: 144, name: 'icon-144x144.png', transparent: true },
    { size: 152, name: 'icon-152x152.png', transparent: true },
    { size: 192, name: 'icon-192x192.png', transparent: true },
    { size: 384, name: 'icon-384x384.png', transparent: true },
    { size: 512, name: 'icon-512x512.png', transparent: true },
    // Maskable icons (solid background, no padding for max size)
    { size: 192, name: 'icon-maskable-192x192.png', transparent: false, padding: 0.15 }, // Slight padding for maskable to avoid cutting logo
    { size: 512, name: 'icon-maskable-512x512.png', transparent: false, padding: 0.15 },
  ],

  // iOS Icons (no transparency)
  ios: [
    { size: 120, name: 'icon-60@2x.png', transparent: false },
    { size: 180, name: 'icon-60@3x.png', transparent: false },
    { size: 152, name: 'icon-76@2x.png', transparent: false },
    { size: 120, name: 'icon-120.png', transparent: false },
    { size: 180, name: 'icon-180.png', transparent: false },
    { size: 40, name: 'icon-20@2x.png', transparent: false },
    { size: 58, name: 'icon-29@2x.png', transparent: false },
    { size: 80, name: 'icon-40@2x.png', transparent: false },
    { size: 167, name: 'icon-83.5@2x.png', transparent: false },
    { size: 1024, name: 'ios-app-store-1024.png', transparent: false },
  ],

  // Android Icons (transparent)
  android: [
    { size: 36, name: 'mipmap-ldpi-ic_launcher.png', transparent: true },
    { size: 48, name: 'mipmap-mdpi-ic_launcher.png', transparent: true },
    { size: 72, name: 'mipmap-hdpi-ic_launcher.png', transparent: true },
    { size: 96, name: 'mipmap-xhdpi-ic_launcher.png', transparent: true },
    { size: 144, name: 'mipmap-xxhdpi-ic_launcher.png', transparent: true },
    { size: 192, name: 'mipmap-xxxhdpi-ic_launcher.png', transparent: true },
    { size: 512, name: 'android-play-store-512.png', transparent: false },
  ],

  // Social Media - Profile Images (Square)
  social: [
    // Facebook
    { size: 180, name: 'facebook-profile-180.png', transparent: false },
    { size: 360, name: 'facebook-profile-360.png', transparent: false },

    // Twitter/X
    { size: 400, name: 'twitter-profile-400.png', transparent: false },

    // LinkedIn
    { size: 300, name: 'linkedin-profile-300.png', transparent: false },
    { size: 400, name: 'linkedin-profile-400.png', transparent: false },

    // Instagram
    { size: 320, name: 'instagram-profile-320.png', transparent: false },
    { size: 180, name: 'instagram-profile-180.png', transparent: false },
    { size: 1080, name: 'instagram-post-1080.png', transparent: false },

    // YouTube
    { size: 800, name: 'youtube-profile-800.png', transparent: false },

    // TikTok
    { size: 200, name: 'tiktok-profile-200.png', transparent: false },

    // Discord
    { size: 512, name: 'discord-server-512.png', transparent: false },
  ],

  // Email & Marketing
  email: [
    { size: 100, name: 'email-profile-100.png', transparent: true }, // Profile should be transparent
    { width: 150, height: 40, name: 'email-signature-150x40.png', transparent: false },
    { width: 200, height: 53, name: 'email-signature-200x53.png', transparent: false },
  ],

  // Windows
  windows: [
    { size: 44, name: 'windows-icon-44.png', transparent: true },
    { size: 71, name: 'windows-icon-71.png', transparent: true },
    { size: 150, name: 'windows-icon-150.png', transparent: true },
    { size: 310, name: 'windows-icon-310.png', transparent: true },
  ],

  // macOS
  macos: [
    { size: 16, name: 'icon_16x16.png', transparent: true },
    { size: 32, name: 'icon_16x16@2x.png', transparent: true },
    { size: 32, name: 'icon_32x32.png', transparent: true },
    { size: 64, name: 'icon_32x32@2x.png', transparent: true },
    { size: 128, name: 'icon_128x128.png', transparent: true },
    { size: 256, name: 'icon_128x128@2x.png', transparent: true },
    { size: 256, name: 'icon_256x256.png', transparent: true },
    { size: 512, name: 'icon_256x256@2x.png', transparent: true },
    { size: 512, name: 'icon_512x512.png', transparent: true },
    { size: 1024, name: 'icon_512x512@2x.png', transparent: true },
  ],
};

// Rectangular social media banners
const BANNER_SPECS = [
  // Facebook cover
  { width: 820, height: 312, name: 'facebook-cover-820x312.png' },

  // Twitter header
  { width: 1500, height: 500, name: 'twitter-header-1500x500.png' },

  // LinkedIn cover
  { width: 1128, height: 191, name: 'linkedin-cover-1128x191.png' },

  // YouTube banner
  { width: 2560, height: 1440, name: 'youtube-banner-2560x1440.png' },

  // Discord banner
  { width: 1920, height: 1080, name: 'discord-banner-1920x1080.png' },

  // Email header
  { width: 600, height: 200, name: 'email-header-600x200.png' },
  { width: 1200, height: 400, name: 'email-header-1200x400.png' },

  // Windows Store
  { width: 1240, height: 600, name: 'windows-store-1240x600.png' },
];

/**
 * Create gradient background for icons that don't support transparency
 */
async function createGradientBackground(width, height) {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${BRAND_COLORS.gradient.start};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${BRAND_COLORS.gradient.end};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bgGradient)" />
    </svg>
  `;

  return Buffer.from(svg);
}

/**
 * Generate square icon
 */
async function generateSquareIcon(sourceBuffer, spec, outputPath) {
  const size = spec.size;
  // Use spec-specific padding if defined, otherwise default to 10%
  const paddingFactor = spec.padding !== undefined ? spec.padding : 0.1;
  const iconPadding = Math.floor(size * paddingFactor);
  const iconSize = size - (iconPadding * 2);

  let pipeline = sharp(sourceBuffer)
    .resize(iconSize, iconSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    });

  if (!spec.transparent) {
    // Create gradient background
    const background = await createGradientBackground(size, size);

    // Composite logo on gradient background
    pipeline = sharp(background)
      .composite([{
        input: await pipeline.toBuffer(),
        top: iconPadding,
        left: iconPadding
      }]);
  } else {
    // Add padding with transparent background
    pipeline = pipeline.extend({
      top: iconPadding,
      bottom: iconPadding,
      left: iconPadding,
      right: iconPadding,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    });
  }

  await pipeline.png().toFile(outputPath);
  console.log(`✓ Generated: ${path.basename(outputPath)} (${size}x${size})`);
}

/**
 * Generate rectangular icon (for email signatures)
 */
async function generateRectangularIcon(sourceBuffer, spec, outputPath) {
  const { width, height } = spec;
  const iconHeight = Math.floor(height * 0.8); // 80% of height
  const iconPadding = Math.floor((height - iconHeight) / 2);

  let pipeline = sharp(sourceBuffer)
    .resize(null, iconHeight, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    });

  if (!spec.transparent) {
    // Create gradient background
    const background = await createGradientBackground(width, height);
    const iconBuffer = await pipeline.toBuffer();
    const iconMetadata = await sharp(iconBuffer).metadata();
    const left = Math.floor((width - iconMetadata.width) / 2);

    // Composite logo on gradient background
    pipeline = sharp(background)
      .composite([{
        input: iconBuffer,
        top: iconPadding,
        left: left
      }]);
  } else {
    // Center with padding
    const iconBuffer = await pipeline.toBuffer();
    const iconMetadata = await sharp(iconBuffer).metadata();
    const left = Math.floor((width - iconMetadata.width) / 2);

    pipeline = sharp({
      create: {
        width: width,
        height: height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    }).composite([{
      input: iconBuffer,
      top: iconPadding,
      left: left
    }]);
  }

  await pipeline.png().toFile(outputPath);
  console.log(`✓ Generated: ${path.basename(outputPath)} (${width}x${height})`);
}

/**
 * Generate social media banner
 */
async function generateBanner(sourceBuffer, spec, outputPath) {
  const { width, height } = spec;

  // Logo should be 30% of banner height
  const logoHeight = Math.floor(height * 0.3);
  const padding = Math.floor(height * 0.1);

  // Create gradient background
  const background = await createGradientBackground(width, height);

  // Resize logo
  const logoBuffer = await sharp(sourceBuffer)
    .resize(null, logoHeight, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toBuffer();

  const logoMetadata = await sharp(logoBuffer).metadata();

  // Add tagline
  const tagline = 'Transform Goals Into Reality';
  const taglineSvg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text
        x="${padding + logoMetadata.width + 30}"
        y="${height / 2 + 10}"
        font-family="Arial, sans-serif"
        font-size="${Math.floor(height * 0.08)}"
        fill="white"
        font-weight="300"
        style="text-shadow: 0 2px 8px rgba(0,0,0,0.5);">
        ${tagline}
      </text>
    </svg>
  `;

  // Composite everything
  await sharp(background)
    .composite([
      {
        input: logoBuffer,
        top: Math.floor((height - logoHeight) / 2),
        left: padding
      },
      {
        input: Buffer.from(taglineSvg),
        top: 0,
        left: 0
      }
    ])
    .png()
    .toFile(outputPath);

  console.log(`✓ Generated banner: ${path.basename(outputPath)} (${width}x${height})`);
}

/**
 * Main generation function
 */
async function generateAllIcons() {
  console.log('🚀 JournalMate Icon Generator\n');

  try {
    // Check if source file exists
    await fs.access(SOURCE_ICON);
    console.log(`✓ Source icon found: ${SOURCE_ICON}\n`);

    // Load source image
    const rawImage = sharp(SOURCE_ICON);
    const { width, height } = await rawImage.metadata();

    // Manually find bounding box to crop (since sharp.trim() was failing on this image)
    const rawBuffer = await rawImage.ensureAlpha().raw().toBuffer();
    let minX = width, minY = height, maxX = 0, maxY = 0;
    let hasPixels = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const alpha = rawBuffer[idx + 3];
        if (alpha > 100) { // Threshold increased to ignore faint shadows/noise
          hasPixels = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    let sourceBuffer;
    if (hasPixels) {
      const cropWidth = maxX - minX + 1;
      const cropHeight = maxY - minY + 1;
      let finalCropWidth = cropWidth;
      let finalCropHeight = cropHeight;

      // Check for wide logo (Icon + Text)
      if (cropWidth > cropHeight * 1.2) {
        console.log(`⚠️  Wide logo detected (${cropWidth}x${cropHeight}). Assuming Icon + Text.`);
        console.log(`✂️  Cropping to leftmost square for icons...`);
        finalCropWidth = cropHeight; // Take a square from the left
      }

      // 1. Extract the leftmost square (or full content if not wide)
      let squareBuffer = await sharp(SOURCE_ICON)
        .extract({ left: minX, top: minY, width: finalCropWidth, height: finalCropHeight })
        .toBuffer();

      // 2. Now find the tight bounding box of the content *within* this square
      // This handles cases where the icon mark itself has padding inside the logo layout
      const squareImage = sharp(squareBuffer);
      const squareMeta = await squareImage.metadata();
      const squareRaw = await squareImage.ensureAlpha().raw().toBuffer();

      let sqMinX = squareMeta.width, sqMinY = squareMeta.height, sqMaxX = 0, sqMaxY = 0;
      let sqHasPixels = false;

      for (let y = 0; y < squareMeta.height; y++) {
        for (let x = 0; x < squareMeta.width; x++) {
          const idx = (y * squareMeta.width + x) * 4;
          const alpha = squareRaw[idx + 3];
          if (alpha > 100) { // High threshold for noise
            sqHasPixels = true;
            if (x < sqMinX) sqMinX = x;
            if (x > sqMaxX) sqMaxX = x;
            if (y < sqMinY) sqMinY = y;
            if (y > sqMaxY) sqMaxY = y;
          }
        }
      }

      if (sqHasPixels) {
        const tightWidth = sqMaxX - sqMinX + 1;
        const tightHeight = sqMaxY - sqMinY + 1;
        console.log(`✂️  Tightening crop: ${tightWidth}x${tightHeight} (from ${finalCropWidth}x${finalCropHeight})`);

        sourceBuffer = await squareImage
          .extract({ left: sqMinX, top: sqMinY, width: tightWidth, height: tightHeight })
          .toBuffer();
      } else {
        sourceBuffer = squareBuffer;
      }
    } else {
      console.warn('⚠️  Source image appears empty! Using original.');
      sourceBuffer = await sharp(SOURCE_ICON).toBuffer();
    }

    // Create output directory structure
    const dirs = ['web', 'pwa', 'ios', 'android', 'social', 'email', 'windows', 'macos', 'banners'];
    for (const dir of dirs) {
      const dirPath = path.join(OUTPUT_DIR, dir);
      await fs.mkdir(dirPath, { recursive: true });
    }

    console.log('📁 Output directories created\n');

    // Generate icons for each platform
    let totalGenerated = 0;

    for (const [platform, specs] of Object.entries(ICON_SPECS)) {
      console.log(`\n📱 Generating ${platform.toUpperCase()} icons...`);
      const platformDir = path.join(OUTPUT_DIR, platform);

      for (const spec of specs) {
        const outputPath = path.join(platformDir, spec.name);

        if (spec.width && spec.height) {
          // Rectangular icon
          await generateRectangularIcon(sourceBuffer, spec, outputPath);
        } else {
          // Square icon
          await generateSquareIcon(sourceBuffer, spec, outputPath);
        }

        totalGenerated++;
      }
    }

    // Generate banners
    console.log(`\n🎨 Generating social media banners...`);
    const bannerDir = path.join(OUTPUT_DIR, 'banners');

    for (const spec of BANNER_SPECS) {
      const outputPath = path.join(bannerDir, spec.name);
      await generateBanner(sourceBuffer, spec, outputPath);
      totalGenerated++;
    }

    // Generate multi-size favicon.ico
    console.log(`\n🌐 Generating favicon.ico...`);
    const faviconSizes = [16, 32, 48];
    const faviconBuffers = [];

    for (const size of faviconSizes) {
      const buffer = await sharp(sourceBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer();
      faviconBuffers.push(buffer);
    }

    // Note: Sharp doesn't support ICO format directly
    // You'll need to use a tool like "png-to-ico" npm package or online converter
    console.log('⚠️  Note: favicon.ico needs to be created from the PNG files using an ICO converter');
    console.log('   Use: favicon-16x16.png, favicon-32x32.png, favicon-48x48.png');

    console.log(`\n\n✅ Successfully generated ${totalGenerated} icons!`);
    console.log(`\n📂 Output directory: ${OUTPUT_DIR}`);
    console.log(`\nNext steps:`);
    console.log(`1. Review generated icons in: ${OUTPUT_DIR}`);
    console.log(`2. Convert multi-size favicon using: npx png-to-ico ${path.join(OUTPUT_DIR, 'web', 'favicon-*.png')} > favicon.ico`);
    console.log(`3. Update manifest.json with new icon paths`);
    console.log(`4. Test icons on target platforms`);
    console.log(`5. Upload to app stores and social media platforms`);

  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

// Run the generator
generateAllIcons();
