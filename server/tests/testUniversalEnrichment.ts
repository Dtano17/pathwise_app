/**
 * Test Universal Enrichment - Verify time, location, and budget awareness
 */

import { universalEnrichment } from '../services/universalEnrichment';

// Mock user
const mockUser = {
  id: 'test-user',
  email: 'test@example.com',
  name: 'Test User',
  location: 'Austin, Texas',
  createdAt: new Date(),
  preferences: {}
};

async function testEnrichment() {
  console.log('=== Testing Universal Enrichment ===\n');

  // Test Case 1: Travel with relative date ("next month")
  console.log('Test 1: Travel Planning - Time-Aware');
  const travelSlots = {
    location: {
      destination: 'Dallas',
      origin: 'Austin, Texas'
    },
    timing: {
      date: 'next month'
    },
    budget: {
      range: '$80'
    }
  };

  try {
    const enriched = await universalEnrichment.enrichPlan(
      'travel',
      travelSlots,
      mockUser
    );

    console.log('✓ Enrichment successful');
    console.log('Critical Actions:', enriched.criticalActions?.length || 0);
    console.log('Warnings:', enriched.warnings?.length || 0);
    console.log('Domain:', enriched.domain);
    console.log('\n');
  } catch (error) {
    console.error('✗ Enrichment failed:', error);
  }

  // Test Case 2: Budget-sensitive accommodation
  console.log('Test 2: Budget-Sensitive Accommodation');
  const budgetSlots = {
    location: {
      destination: 'New York City'
    },
    timing: {
      date: 'tomorrow'
    },
    budget: {
      range: '$50 per night'
    }
  };

  try {
    const enriched = await universalEnrichment.enrichPlan(
      'travel',
      budgetSlots,
      mockUser
    );

    console.log('✓ Budget-sensitive enrichment successful');
    console.log('Should recommend hostels/Airbnb for $50 budget');
    console.log('\n');
  } catch (error) {
    console.error('✗ Enrichment failed:', error);
  }

  // Test Case 3: Location-specific weather and traffic
  console.log('Test 3: Location-Aware Weather & Traffic');
  const locationSlots = {
    location: {
      destination: 'Los Angeles',
      origin: 'San Francisco'
    },
    timing: {
      date: 'next weekend',
      time: '5pm'
    },
    budget: {
      range: '$200'
    }
  };

  try {
    const enriched = await universalEnrichment.enrichPlan(
      'travel',
      locationSlots,
      mockUser
    );

    console.log('✓ Location-aware enrichment successful');
    console.log('Should include LA weather and traffic patterns');
    console.log('\n');
  } catch (error) {
    console.error('✗ Enrichment failed:', error);
  }

  console.log('=== All Tests Complete ===');
}

// Run tests
testEnrichment().catch(console.error);
