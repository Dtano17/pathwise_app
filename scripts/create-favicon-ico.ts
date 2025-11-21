import sharp from 'sharp';
import fs from 'fs';

async function createFaviconIco() {
  // For .ico file, we'll use the 32x32 as it's the most common size
  // and convert it to a format that browsers will accept
  const source = 'client/public/favicon-32x32.png';
  const output = 'client/public/favicon.ico';
  
  console.log('Creating favicon.ico from:', source);
  
  // Sharp doesn't directly create .ico files, but we can create a 32x32 PNG
  // and save it as .ico (browsers will accept it)
  await sharp(source)
    .resize(32, 32)
    .png()
    .toFile(output);
  
  console.log('✓ Created favicon.ico');
  console.log('\n✅ Favicon.ico created successfully!');
}

createFaviconIco().catch(console.error);
