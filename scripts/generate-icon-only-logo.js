/**
 * Generate Google Workspace Logo - Icon Only (No Background Box)
 *
 * Creates a 320x132 logo with ONLY the book icon, no purple background
 * This prevents the "box cutoff" issue in Google's circular profile frames
 */

import sharp from 'sharp';
import { createCanvas } from 'canvas';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateIconOnlyLogo() {
  try {
    console.log('🎨 Generating Icon-Only Google Workspace Logo...\n');

    const WIDTH = 320;
    const HEIGHT = 132;
    const MAX_FILE_SIZE = 30 * 1024;

    const outputPath = join(__dirname, '../client/public/journalmate-google-workspace-logo.png');

    // Create a canvas to draw the book icon manually
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    // Clear canvas (transparent background)
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Calculate icon size and position
    const iconSize = Math.floor(HEIGHT * 0.7); // 70% of height
    const centerX = WIDTH / 2;
    const centerY = HEIGHT / 2;

    // Draw the book icon (simplified version)
    // Using your brand color purple: #6C5CE7
    ctx.strokeStyle = '#6C5CE7';
    ctx.fillStyle = '#6C5CE7';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Scale factor for the icon
    const scale = iconSize / 120;

    // Center the drawing
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);

    // Draw book icon path (simplified from your logo)
    ctx.beginPath();

    // Left page
    ctx.moveTo(-40, -35);
    ctx.lineTo(-40, 35);
    ctx.quadraticCurveTo(-35, 40, 0, 40);

    // Right page
    ctx.lineTo(0, 40);
    ctx.quadraticCurveTo(35, 40, 40, 35);
    ctx.lineTo(40, -35);

    // Top binding
    ctx.lineTo(40, -35);
    ctx.quadraticCurveTo(35, -40, 0, -40);
    ctx.quadraticCurveTo(-35, -40, -40, -35);

    // Center spine
    ctx.moveTo(0, -40);
    ctx.lineTo(0, 40);

    ctx.stroke();

    // Add the pink accent dot (from your original logo)
    ctx.resetTransform();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);

    ctx.fillStyle = '#E91E63'; // Pink accent
    ctx.beginPath();
    ctx.arc(25, -25, 8, 0, Math.PI * 2);
    ctx.fill();

    // Convert canvas to buffer
    const buffer = canvas.toBuffer('image/png', {
      compressionLevel: 9,
      filters: canvas.PNG_FILTER_NONE
    });

    // Optimize with Sharp
    let finalImage = await sharp(buffer)
      .png({
        compressionLevel: 9,
        adaptiveFiltering: true,
        palette: true,
        quality: 90
      })
      .toBuffer();

    let fileSize = finalImage.length;
    console.log(`📊 Initial file size: ${(fileSize / 1024).toFixed(2)} KB`);

    if (fileSize > MAX_FILE_SIZE) {
      console.log('⚠️  Applying additional compression...\n');
      finalImage = await sharp(finalImage)
        .png({
          quality: 80,
          compressionLevel: 9
        })
        .toBuffer();
      fileSize = finalImage.length;
      console.log(`📊 Compressed file size: ${(fileSize / 1024).toFixed(2)} KB`);
    }

    // Save the file
    await sharp(finalImage).toFile(outputPath);

    // Verify
    const stats = await import('fs').then(fs => fs.promises.stat(outputPath));
    const metadata = await sharp(outputPath).metadata();

    console.log('\n✅ Icon-Only Logo Generated Successfully!\n');
    console.log('📋 Final Specifications:');
    console.log(`   ✓ Dimensions: ${metadata.width} x ${metadata.height}px`);
    console.log(`   ✓ File Size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`   ✓ Transparent: Yes (no background box!)`);
    console.log(`   ✓ Design: Book icon + pink accent only`);
    console.log(`   ✓ File: ${outputPath}\n`);

    if (stats.size <= MAX_FILE_SIZE) {
      console.log('🎉 Ready for Google Workspace upload!\n');
      console.log('✨ This version has NO purple box background');
      console.log('✨ Will display perfectly in circular frames\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

generateIconOnlyLogo();
