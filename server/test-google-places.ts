/**
 * Test script for Google Places API restaurant photos
 *
 * Usage:
 *   npx tsx server/test-google-places.ts
 *   npx tsx server/test-google-places.ts "Pizzeria Mozza Los Angeles"
 */

import 'dotenv/config';
import {
  searchPlaceWithPhotos,
  isGooglePlacesConfigured,
  priceLevelToSymbol,
  getRestaurantPhoto,
} from './services/googlePlacesService';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

async function testRestaurant(query: string) {
  console.log(`\n${colors.cyan}Searching for: "${query}"${colors.reset}\n`);

  const result = await searchPlaceWithPhotos(query, { type: 'restaurant' });

  if (!result) {
    console.log(`${colors.red}No results found${colors.reset}`);
    return;
  }

  console.log(`${colors.green}Found: ${result.name}${colors.reset}`);
  console.log(`  Address: ${result.address || 'N/A'}`);
  console.log(`  Rating: ${result.rating ? `${result.rating}⭐ (${result.userRatingsTotal} reviews)` : 'N/A'}`);
  console.log(`  Price: ${priceLevelToSymbol(result.priceLevel) || 'N/A'}`);
  console.log(`  Website: ${result.website || 'N/A'}`);
  console.log(`  Phone: ${result.phoneNumber || 'N/A'}`);
  console.log(`  Photos: ${result.photos.length} found`);

  if (result.photos.length > 0) {
    console.log(`\n${colors.blue}Photo URLs:${colors.reset}`);
    result.photos.forEach((photo, i) => {
      console.log(`  ${i + 1}. ${photo.url.substring(0, 100)}...`);
      if (photo.attributions.length > 0) {
        console.log(`     Attribution: ${photo.attributions.join(', ')}`);
      }
    });
  }
}

async function main() {
  console.log(`${colors.bright}${colors.cyan}=== Google Places API Test ===${colors.reset}\n`);

  if (!isGooglePlacesConfigured()) {
    console.log(`${colors.red}Error: GOOGLE_API_KEY not set in environment${colors.reset}`);
    console.log('This uses the same API key as Gemini.');
    process.exit(1);
  }

  console.log(`${colors.green}✓ Google Places API configured${colors.reset}`);

  // Custom query from command line
  const customQuery = process.argv[2];
  if (customQuery) {
    await testRestaurant(customQuery);
    return;
  }

  // Default test restaurants
  const testQueries = [
    'Pizzeria Mozza Los Angeles',
    'Nobu Malibu',
    'The French Laundry Yountville',
    'In-N-Out Burger Hollywood',
  ];

  for (const query of testQueries) {
    await testRestaurant(query);
    console.log('\n' + '─'.repeat(50));
  }

  // Test the simple photo URL function
  console.log(`\n${colors.bright}Testing getRestaurantPhoto():${colors.reset}`);
  const photoUrl = await getRestaurantPhoto('Bestia', 'Los Angeles');
  console.log(`Bestia Los Angeles photo: ${photoUrl ? photoUrl.substring(0, 80) + '...' : 'Not found'}`);
}

main().catch(console.error);
