/**
 * Generate Google Workspace Custom Logo
 *
 * Requirements:
 * - 320 x 132 pixels (exact)
 * - PNG with transparent background
 * - Under 30 KB file size
 * - Logo only (centered) - Option B
 */

import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateGoogleWorkspaceLogo() {
  try {
    console.log('🎨 Generating Google Workspace Logo...\n');

    // Google Workspace requirements
    const WIDTH = 320;
    const HEIGHT = 132;
    const MAX_FILE_SIZE = 30 * 1024; // 30 KB

    // Paths
    const inputPath = join(__dirname, '../client/public/icon-transparent-512.png');
    const outputPath = join(__dirname, '../client/public/journalmate-google-workspace-logo.png');

    console.log('📁 Input:', inputPath);
    console.log('📁 Output:', outputPath);
    console.log('📐 Dimensions: 320 x 132 pixels');
    console.log('📦 Max Size: 30 KB\n');

    // Read the source logo
    const sourceImage = sharp(inputPath);
    const metadata = await sourceImage.metadata();

    console.log(`✅ Source image loaded: ${metadata.width}x${metadata.height}px\n`);

    // Calculate logo size to fit within canvas
    // Use 80% of height to leave padding
    const logoHeight = Math.floor(HEIGHT * 0.8);
    const logoWidth = logoHeight; // Keep it square

    console.log(`📏 Logo will be resized to: ${logoWidth}x${logoHeight}px\n`);

    // Resize the logo
    const resizedLogo = await sourceImage
      .resize(logoWidth, logoHeight, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();

    // Create canvas with transparent background
    // Center the logo
    const leftOffset = Math.floor((WIDTH - logoWidth) / 2);
    const topOffset = Math.floor((HEIGHT - logoHeight) / 2);

    console.log(`🎯 Positioning logo at: left=${leftOffset}px, top=${topOffset}px\n`);

    // Composite the logo onto a transparent canvas
    let finalImage = await sharp({
      create: {
        width: WIDTH,
        height: HEIGHT,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([{
      input: resizedLogo,
      left: leftOffset,
      top: topOffset
    }])
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: true
    })
    .toBuffer();

    // Check file size and compress more if needed
    let fileSize = finalImage.length;
    console.log(`📊 Initial file size: ${(fileSize / 1024).toFixed(2)} KB`);

    if (fileSize > MAX_FILE_SIZE) {
      console.log('⚠️  File too large, applying additional compression...\n');

      // Try with quality reduction
      finalImage = await sharp(finalImage)
        .png({
          quality: 85,
          compressionLevel: 9,
          adaptiveFiltering: true,
          palette: true
        })
        .toBuffer();

      fileSize = finalImage.length;
      console.log(`📊 Compressed file size: ${(fileSize / 1024).toFixed(2)} KB`);
    }

    // Save the final image
    await sharp(finalImage).toFile(outputPath);

    // Verify final file
    const finalMetadata = await sharp(outputPath).metadata();
    const stats = await import('fs').then(fs => fs.promises.stat(outputPath));

    console.log('\n✅ Google Workspace Logo Generated Successfully!\n');
    console.log('📋 Final Specifications:');
    console.log(`   ✓ Dimensions: ${finalMetadata.width} x ${finalMetadata.height}px`);
    console.log(`   ✓ File Size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`   ✓ Format: ${finalMetadata.format.toUpperCase()}`);
    console.log(`   ✓ Transparent: ${finalMetadata.hasAlpha ? 'Yes' : 'No'}`);
    console.log(`   ✓ File: ${outputPath}\n`);

    if (stats.size > MAX_FILE_SIZE) {
      console.log('⚠️  WARNING: File size exceeds 30 KB limit!');
      console.log('   You may need to simplify the logo or reduce colors.\n');
    } else {
      console.log('🎉 Ready to upload to Google Workspace Admin Console!\n');
      console.log('📝 Upload Instructions:');
      console.log('   1. Go to admin.google.com');
      console.log('   2. Navigate to Account > Personalization');
      console.log('   3. Under "Logo", select "Custom logo"');
      console.log('   4. Click "Upload from device"');
      console.log('   5. Select: journalmate-google-workspace-logo.png');
      console.log('   6. Wait 3-4 days for logo to propagate\n');
    }

  } catch (error) {
    console.error('❌ Error generating logo:', error);
    process.exit(1);
  }
}

// Run the generator
generateGoogleWorkspaceLogo();
