import toIco from 'to-ico';
import fs from 'fs';

async function createFaviconIco() {
  // Read the PNG files
  const files = [
    fs.readFileSync('client/public/favicon-16x16.png'),
    fs.readFileSync('client/public/favicon-32x32.png'),
    fs.readFileSync('client/public/favicon-48x48.png'),
  ];
  
  console.log('Creating multi-resolution favicon.ico...');
  
  // Create ICO file with multiple resolutions
  const icoBuffer = await toIco(files);
  
  // Write to file
  fs.writeFileSync('client/public/favicon.ico', icoBuffer);
  
  console.log('✓ Created favicon.ico with 16x16, 32x32, and 48x48 resolutions');
  console.log('\n✅ Favicon.ico created successfully!');
}

createFaviconIco().catch(console.error);
