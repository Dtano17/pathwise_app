/**
 * Stock Image Download Helper
 *
 * This script helps automate downloading stock images from Unsplash
 *
 * Usage:
 * 1. Get Unsplash API key from https://unsplash.com/developers
 * 2. Set UNSPLASH_ACCESS_KEY environment variable
 * 3. Run: node scripts/download-stock-images.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const OUTPUT_DIR = path.join(__dirname, '../attached_assets/stock_images');

// Search queries for each image - optimized for best results
const imageSpecs = [
  { filename: 'romantic_paris_citys_dfc7c798.jpg', query: 'romantic paris cityscape eiffel tower sunset golden hour' },
  { filename: 'fitness_workout_gym__2325ee98.jpg', query: 'gym workout fitness person exercising equipment' },
  { filename: 'elegant_wedding_cere_9aa2c585.jpg', query: 'elegant wedding ceremony beautiful venue romantic' },
  { filename: 'modern_tech_workspac_ef8fa108.jpg', query: 'modern tech workspace desk computer minimalist' },
  { filename: 'beautiful_modern_hom_0f24a3e6.jpg', query: 'beautiful modern home architecture exterior interior' },
  { filename: 'organized_productivi_df70e725.jpg', query: 'organized productivity desk planner notebook workspace' },
  { filename: 'tokyo_japan_travel_d_8a196170.jpg', query: 'tokyo japan cityscape night shibuya neon lights' },
  { filename: 'bali_indonesia_tropi_95575be5.jpg', query: 'bali indonesia tropical beach paradise palm trees' },
  { filename: 'new_york_city_times__e09e766b.jpg', query: 'new york city times square manhattan skyline urban' },
  { filename: 'paris_eiffel_tower_f_fce5772c.jpg', query: 'paris eiffel tower landmark trocadero view majestic' },
  { filename: 'iceland_northern_lig_9fbbf14d.jpg', query: 'iceland northern lights aurora borealis landscape night' },
  { filename: 'runner_jogging_on_tr_9a63ddad.jpg', query: 'runner jogging trail outdoor nature fitness running' },
  { filename: 'yoga_studio_peaceful_84f9a366.jpg', query: 'yoga studio peaceful meditation zen calm practice' },
  { filename: 'cyclist_riding_bike__9ae17ca2.jpg', query: 'cyclist riding bike outdoor road nature cycling' },
  { filename: 'modern_gym_workout_w_99dc5406.jpg', query: 'modern gym interior equipment fitness center contemporary' },
  { filename: 'modern_workspace_des_9f6c2608.jpg', query: 'modern workspace desk office clean professional setup' },
  { filename: 'business_presentatio_aee687af.jpg', query: 'business presentation meeting team professional office' },
  { filename: 'professional_network_48ccc448.jpg', query: 'professional networking event business people conference' },
  { filename: 'person_reading_book__bc916131.jpg', query: 'person reading book cozy comfortable peaceful study' },
  { filename: 'birthday_party_celeb_414d649e.jpg', query: 'birthday party celebration cake balloons happy joyful' },
  { filename: 'concert_music_festiv_18316657.jpg', query: 'concert music festival crowd stage lights performance' },
  { filename: 'person_coding_on_lap_ba381062.jpg', query: 'person coding laptop developer programming workspace' },
  { filename: 'home_renovation_kitc_0ceb0522.jpg', query: 'home renovation kitchen remodel construction improvement' },
  { filename: 'spanish_language_lea_2d2edb39.jpg', query: 'spanish language learning study books education spain' },
  { filename: 'modern_kitchen_renov_a5563863.jpg', query: 'modern kitchen renovation interior design contemporary clean' },
  { filename: 'professional_develop_960cd8cf.jpg', query: 'professional developer programmer office coding computer' },
  { filename: 'spanish_language_lea_269b1aa7.jpg', query: 'spanish language class learning group students education' },
  { filename: 'person_meditating_pe_43f13693.jpg', query: 'person meditating peaceful nature outdoor zen mindfulness' },
];

/**
 * Search Unsplash for an image matching the query
 */
async function searchUnsplash(query) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.unsplash.com',
      path: `/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.results && json.results.length > 0) {
            const result = json.results[0];
            resolve({
              url: result.urls.full,
              author: result.user.name,
              link: result.links.html
            });
          } else {
            reject(new Error('No results found'));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Download an image from URL to filepath
 */
async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // Delete incomplete file
      reject(err);
    });
  });
}

/**
 * Main execution function
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  JournalMate Stock Image Download Tool');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Check for API key
  if (!UNSPLASH_ACCESS_KEY) {
    console.error('❌ ERROR: UNSPLASH_ACCESS_KEY environment variable not set\n');
    console.error('To get your free Unsplash API key:');
    console.error('1. Visit: https://unsplash.com/developers');
    console.error('2. Create a new application');
    console.error('3. Copy your Access Key');
    console.error('4. Set environment variable:');
    console.error('   Windows: set UNSPLASH_ACCESS_KEY=your_key_here');
    console.error('   Mac/Linux: export UNSPLASH_ACCESS_KEY=your_key_here\n');
    process.exit(1);
  }

  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`✓ Created directory: ${OUTPUT_DIR}\n`);
  }

  console.log(`Downloading ${imageSpecs.length} stock images from Unsplash...\n`);
  console.log('This will take approximately 2-3 minutes.\n');

  const results = {
    success: 0,
    failed: 0,
    errors: []
  };

  // Download each image
  for (let i = 0; i < imageSpecs.length; i++) {
    const spec = imageSpecs[i];
    const filepath = path.join(OUTPUT_DIR, spec.filename);
    const progress = `[${i + 1}/${imageSpecs.length}]`;

    console.log(`${progress} ${spec.filename}`);
    console.log(`   🔍 Searching: "${spec.query}"`);

    try {
      // Search for image
      const imageData = await searchUnsplash(spec.query);
      console.log(`   📸 Found by: ${imageData.author}`);

      // Download image
      await downloadImage(imageData.url, filepath);

      // Check file size
      const stats = fs.statSync(filepath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`   ✅ Downloaded: ${sizeMB} MB`);
      console.log(`   🔗 Credits: ${imageData.link}\n`);

      results.success++;
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`);
      results.failed++;
      results.errors.push({
        filename: spec.filename,
        error: error.message
      });
    }

    // Rate limiting - wait 1 second between requests to respect API limits
    if (i < imageSpecs.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Print summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Download Complete!');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`✅ Successful: ${results.success}/${imageSpecs.length}`);
  console.log(`❌ Failed: ${results.failed}/${imageSpecs.length}\n`);

  if (results.failed > 0) {
    console.log('Failed downloads:');
    results.errors.forEach(err => {
      console.log(`  - ${err.filename}: ${err.error}`);
    });
    console.log('\nTip: You can manually download failed images from https://unsplash.com\n');
  }

  if (results.success === imageSpecs.length) {
    console.log('🎉 All images downloaded successfully!');
    console.log('\nNext steps:');
    console.log('1. Run: npm run build');
    console.log('2. Check Community Plans page in the app');
    console.log('3. Verify images display correctly\n');
  } else if (results.success > 0) {
    console.log('⚠️  Some images downloaded successfully.');
    console.log('Please manually download the failed images.\n');
  } else {
    console.log('❌ All downloads failed. Please check:');
    console.log('1. Your internet connection');
    console.log('2. Your Unsplash API key is valid');
    console.log('3. You haven\'t exceeded API rate limits\n');
  }

  console.log('═══════════════════════════════════════════════════════════════\n');
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
