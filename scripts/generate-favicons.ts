import sharp from 'sharp';
import path from 'path';

async function generateFavicons() {
  // Use the tightly-cropped email logo (no padding) for crisp favicons
  const sourceIcon = 'client/public/icons/email/email-logo-512.png';
  const outputDir = 'client/public';
  
  console.log('Generating favicons from:', sourceIcon);
  
  // Generate 16x16
  await sharp(sourceIcon)
    .resize(16, 16, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toFile(path.join(outputDir, 'favicon-16x16.png'));
  console.log('✓ Generated favicon-16x16.png');
  
  // Generate 32x32
  await sharp(sourceIcon)
    .resize(32, 32, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toFile(path.join(outputDir, 'favicon-32x32.png'));
  console.log('✓ Generated favicon-32x32.png');
  
  // Generate 48x48
  await sharp(sourceIcon)
    .resize(48, 48, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toFile(path.join(outputDir, 'favicon-48x48.png'));
  console.log('✓ Generated favicon-48x48.png');
  
  console.log('\n✅ All favicons generated successfully!');
}

generateFavicons().catch(console.error);
