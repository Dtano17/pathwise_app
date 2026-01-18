import Anthropic from "@anthropic-ai/sdk";
import type { User, InsertUrlContentCache, InsertContentImport, ContentImport } from '@shared/schema';
import axios from 'axios';
import { tavily } from '@tavily/core';
import { storage } from '../storage';
import { socialMediaVideoService } from './socialMediaVideoService';
import crypto from 'crypto';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Initialize Tavily client for advanced URL content extraction
const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

// Patterns to detect social media content
const SOCIAL_MEDIA_PATTERNS = [
  'Platform: INSTAGRAM',
  'Platform: TIKTOK', 
  'Platform: YOUTUBE',
  'On-Screen Text (OCR)',
  'Audio Transcript'
];

// Use Sonnet-4 for direct plan generation (needs high quality output)
const CLAUDE_SONNET = "claude-sonnet-4-20250514";

export interface DirectPlanResult {
  activity: {
    title: string;
    description: string;
    category: string;
    startDate?: string | null;  // ISO 8601 date: "YYYY-MM-DD"
    endDate?: string | null;    // ISO 8601 date: "YYYY-MM-DD"
  };
  tasks: Array<{
    title: string;
    description: string;
    category: string;
    priority: 'high' | 'medium' | 'low';
    contentItemId?: string;
    estimatedCost?: number;
    scheduledDate?: string | null;  // ISO 8601 date: "YYYY-MM-DD"
    startTime?: string | null;      // 24-hour time: "HH:MM"
    endTime?: string | null;        // 24-hour time: "HH:MM"
  }>;
  importId?: string;
  sourceUrl?: string;
  sourceName?: string;
}

export interface UserPreferences {
  location: string;
  savedItems: number;
  venues: Array<{
    name: string;
    type: string;
    priceRange?: string;
  }>;
  categories: string[];
  budgetTiers: string[];
}

/**
 * Direct Plan Generator - No questions, no validation, just generate!
 *
 * User gives input (text or image) → Claude generates plan → Done!
 */
export class DirectPlanGenerator {

  /**
   * Detect if input is a URL (entire input is just a URL)
   */
  private isUrl(input: string): boolean {
    try {
      new URL(input.trim());
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Normalize URL for consistent cache keys
   * Strips tracking params (igsh, utm_*, etc.) that don't affect content
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const paramsToRemove = [
        'igsh', 'igshid', 'ig_mid', 'ig_cache_key',
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'fbclid', 'gclid', 'ref', 'ref_src', 's', 't'
      ];
      paramsToRemove.forEach(param => urlObj.searchParams.delete(param));
      return urlObj.toString().replace(/\/$/, ''); // Remove trailing slash
    } catch {
      return url.trim().toLowerCase();
    }
  }

  /**
   * Extract URLs from text input
   * Returns array of URLs found in the text
   */
  private extractUrls(input: string): string[] {
    // Match URLs starting with http:// or https://
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    const matches = input.match(urlRegex) || [];
    return matches.map(url => {
      // Clean up trailing punctuation that might have been captured
      return url.replace(/[.,;:!?)]+$/, '');
    });
  }

  /**
   * Check if content is from social media (extracted via our services)
   */
  private isSocialMediaContent(content: string): boolean {
    return SOCIAL_MEDIA_PATTERNS.some(pattern => content.includes(pattern));
  }

  /**
   * Extract location/destination info from content using comprehensive patterns
   * Supports major cities worldwide plus user input location detection
   */
  private extractLocationsFromContent(content: string, userInput?: string): { destination: string | null; areas: string[] } {
    const areas: string[] = [];
    let destination: string | null = null;

    // Comprehensive list of major cities and destinations
    const cityList = [
      // Africa
      'Lagos', 'Abuja', 'Cairo', 'Cape Town', 'Johannesburg', 'Nairobi', 'Accra', 'Casablanca', 'Marrakech',
      // Europe  
      'London', 'Paris', 'Berlin', 'Rome', 'Madrid', 'Barcelona', 'Amsterdam', 'Vienna', 'Prague', 'Lisbon',
      'Milan', 'Munich', 'Zurich', 'Geneva', 'Brussels', 'Dublin', 'Edinburgh', 'Athens', 'Copenhagen', 'Stockholm',
      // Asia
      'Tokyo', 'Singapore', 'Hong Kong', 'Bangkok', 'Bali', 'Dubai', 'Abu Dhabi', 'Mumbai', 'Delhi', 'Shanghai',
      'Beijing', 'Seoul', 'Taipei', 'Osaka', 'Kuala Lumpur', 'Jakarta', 'Manila', 'Hanoi', 'Ho Chi Minh',
      // Americas
      'New York', 'Los Angeles', 'Miami', 'Las Vegas', 'San Francisco', 'Chicago', 'Boston', 'Seattle', 'Austin',
      'Toronto', 'Vancouver', 'Montreal', 'Mexico City', 'Cancun', 'Tulum', 'Buenos Aires', 'Rio de Janeiro',
      'Sao Paulo', 'Lima', 'Bogota', 'Cartagena', 'Havana',
      // Oceania
      'Sydney', 'Melbourne', 'Auckland', 'Brisbane', 'Perth', 'Queenstown',
      // Middle East
      'Tel Aviv', 'Jerusalem', 'Beirut', 'Istanbul', 'Doha', 'Kuwait', 'Riyadh', 'Jeddah'
    ];

    // Neighborhood/area patterns
    const neighborhoodPatterns: { pattern: RegExp; normalized: string }[] = [
      { pattern: /\bVI\b/gi, normalized: 'Victoria Island' },
      { pattern: /\bVictoria Island\b/gi, normalized: 'Victoria Island' },
      { pattern: /\bIkoyi\b/gi, normalized: 'Ikoyi' },
      { pattern: /\bIkeja\b/gi, normalized: 'Ikeja' },
      { pattern: /\bLekki\b/gi, normalized: 'Lekki' },
      { pattern: /\bIlashe\b/gi, normalized: 'Ilashe' },
      { pattern: /\bSoho\b/gi, normalized: 'Soho' },
      { pattern: /\bWest Hollywood\b/gi, normalized: 'West Hollywood' },
      { pattern: /\bSanta Monica\b/gi, normalized: 'Santa Monica' },
      { pattern: /\bBeverly Hills\b/gi, normalized: 'Beverly Hills' },
      { pattern: /\bManhattan\b/gi, normalized: 'Manhattan' },
      { pattern: /\bBrooklyn\b/gi, normalized: 'Brooklyn' },
      { pattern: /\bSouth Beach\b/gi, normalized: 'South Beach' },
      { pattern: /\bWynwood\b/gi, normalized: 'Wynwood' },
      { pattern: /\bMayfair\b/gi, normalized: 'Mayfair' },
      { pattern: /\bChelsea\b/gi, normalized: 'Chelsea' },
      { pattern: /\bNotting Hill\b/gi, normalized: 'Notting Hill' },
      { pattern: /\bMarais\b/gi, normalized: 'Marais' },
      { pattern: /\bMontmartre\b/gi, normalized: 'Montmartre' },
      { pattern: /\bMedina\b/gi, normalized: 'Medina' },
    ];

    // Search both content and user input
    const searchText = `${content} ${userInput || ''}`;

    // Find neighborhoods first
    for (const { pattern, normalized } of neighborhoodPatterns) {
      if (pattern.test(searchText)) {
        if (!areas.includes(normalized)) {
          areas.push(normalized);
        }
      }
    }

    // Find cities - create case-insensitive patterns
    for (const city of cityList) {
      const cityPattern = new RegExp(`\\b${city}\\b`, 'gi');
      if (cityPattern.test(searchText)) {
        if (!destination) {
          destination = city;
        }
        if (!areas.includes(city)) {
          areas.push(city);
        }
      }
    }

    // Also check for country mentions as fallback destinations
    const countryPatterns: { pattern: RegExp; city: string }[] = [
      { pattern: /\bNigeria\b/gi, city: 'Lagos' },
      { pattern: /\bFrance\b/gi, city: 'Paris' },
      { pattern: /\bMorocco\b/gi, city: 'Marrakech' },
      { pattern: /\bUAE\b/gi, city: 'Dubai' },
      { pattern: /\bUnited Arab Emirates\b/gi, city: 'Dubai' },
      { pattern: /\bJapan\b/gi, city: 'Tokyo' },
      { pattern: /\bItaly\b/gi, city: 'Rome' },
      { pattern: /\bSpain\b/gi, city: 'Barcelona' },
      { pattern: /\bThailand\b/gi, city: 'Bangkok' },
      { pattern: /\bIndonesia\b/gi, city: 'Bali' },
      { pattern: /\bUK\b/gi, city: 'London' },
      { pattern: /\bUnited Kingdom\b/gi, city: 'London' },
      { pattern: /\bMexico\b/gi, city: 'Mexico City' },
      { pattern: /\bBrazil\b/gi, city: 'Rio de Janeiro' },
      { pattern: /\bAustralia\b/gi, city: 'Sydney' },
      { pattern: /\bSouth Korea\b/gi, city: 'Seoul' },
      { pattern: /\bGermany\b/gi, city: 'Berlin' },
      { pattern: /\bNetherlands\b/gi, city: 'Amsterdam' },
      { pattern: /\bSwitzerland\b/gi, city: 'Zurich' },
      { pattern: /\bGreece\b/gi, city: 'Athens' },
      { pattern: /\bPortugal\b/gi, city: 'Lisbon' },
      { pattern: /\bEgypt\b/gi, city: 'Cairo' },
      { pattern: /\bSouth Africa\b/gi, city: 'Cape Town' },
      { pattern: /\bKenya\b/gi, city: 'Nairobi' },
      { pattern: /\bGhana\b/gi, city: 'Accra' },
    ];

    if (!destination) {
      for (const { pattern, city } of countryPatterns) {
        if (pattern.test(searchText)) {
          destination = city;
          // Also add the city to areas when inferred from country
          if (!areas.includes(city)) {
            areas.push(city);
          }
          break;
        }
      }
    }

    // Look for "trip to X", "plan for X", "visiting X" patterns
    const tripPatterns = [
      /(?:trip|travel|going|visit(?:ing)?|plan(?:ning)?)\s+(?:to|for)\s+([A-Z][a-zA-Z\s]+?)(?:\s|$|,|\.)/gi,
      /(?:my|our|a)\s+([A-Z][a-zA-Z]+)\s+(?:trip|vacation|holiday|getaway)/gi,
    ];

    for (const tripPattern of tripPatterns) {
      const matches = searchText.matchAll(tripPattern);
      for (const match of matches) {
        const potentialCity = match[1]?.trim();
        if (potentialCity && potentialCity.length > 2 && potentialCity.length < 30) {
          // Check if this matches any known city
          const foundCity = cityList.find(c => 
            c.toLowerCase() === potentialCity.toLowerCase()
          );
          if (foundCity && !destination) {
            destination = foundCity;
          }
        }
      }
    }

    // If no destination found, the caller can use fallback to stored preference locations
    console.log(`[LOCATION] Extracted destination: ${destination || 'none'}, areas: ${areas.join(', ') || 'none'}`);
    return { destination, areas };
  }

  /**
   * Get unique cities from user's stored preferences
   * Used as fallback when location detection from content fails
   */
  private async getUserPreferenceCities(userId: number): Promise<string[]> {
    try {
      // Get all user's saved content with non-null cities
      const savedContent = await storage.getUserSavedContent(userId, undefined, undefined);
      
      if (!savedContent || savedContent.length === 0) {
        return [];
      }
      
      // Extract unique cities
      const cities = new Set<string>();
      for (const content of savedContent) {
        if (content.city) {
          cities.add(content.city);
        }
        if (content.location) {
          // Try to extract city from location string (e.g., "Lagos, Nigeria" -> "Lagos")
          const locationParts = content.location.split(',');
          if (locationParts.length > 0) {
            const city = locationParts[0].trim();
            if (city) cities.add(city);
          }
        }
      }
      
      return Array.from(cities);
    } catch (error) {
      console.error('[LOCATION] Failed to get user preference cities:', error);
      return [];
    }
  }

  /**
   * Extract all venue/item mentions from content (OCR text, captions, transcripts)
   * Returns structured array of extracted items for ContentImport storage
   */
  private extractVenuesFromContent(
    content: string, 
    platform: string | null,
    locationInfo: { destination: string | null; areas: string[] }
  ): Array<{
    id: string;
    venueName: string;
    venueType: string;
    location?: { city?: string; neighborhood?: string };
    priceRange?: string;
    budgetTier?: string;
    estimatedCost?: number;
    category?: string;
    notes?: string;
  }> {
    const venues: Array<{
      id: string;
      venueName: string;
      venueType: string;
      location?: { city?: string; neighborhood?: string };
      priceRange?: string;
      budgetTier?: string;
      estimatedCost?: number;
      category?: string;
      notes?: string;
    }> = [];

    // Pattern to find venue entries like "PILATES - Lo Studio, VI - ₦100,000"
    // or "BRUNCH - Knowhere, VI - ₦50,000" or just "KREMLIN LOUNGE"
    const venuePatterns = [
      // Pattern: "CATEGORY - Venue Name, Location - Price"
      /([A-Z][A-Z\s]+?)\s*[-–]\s*([^,\-₦$€£\n]+?)(?:,\s*([A-Za-z\s]+?))?\s*[-–]?\s*([₦$€£][\d,]+(?:\s*[-–]\s*[₦$€£]?[\d,]+)?)?/g,
      // Pattern: "Venue Name (Location) - Price" or "Venue Name - Price" (including names without price)
      /(?:^|\n)(?:\d+\.\s*)?([A-Z][a-zA-Z\s&']+?)(?:\s*\(([^)]+)\))?\s*(?:[-–]\s*([₦$€£][\d,]+(?:\s*[-–]\s*[₦$€£]?[\d,]+)?))?(?=\n|$)/gm,
      // Pattern: Simple "Name - $$" or "Name - $50-100"
      /([A-Z][a-zA-Z\s&']+?)\s*[-–]\s*(\$+|\${1,4}|[₦$€£]\d+(?:\s*[-–]\s*\d+)?)/g,
      // Pattern: Standalone venue names (lines with just capitalized words, no trailing dashes)
      /^([A-Z][A-Z\s&']+?)(?:\s+([A-Z][A-Z\s&']+?))*\s*$/gm,
    ];

    const seenNames = new Set<string>();

    for (const pattern of venuePatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        let venueName = '';
        let venueType = 'venue';
        let location: { city?: string; neighborhood?: string } | undefined;
        let priceRange: string | undefined;

        // Parse based on pattern structure
        if (pattern.source.includes('CATEGORY')) {
          // First pattern: "CATEGORY - Venue - Location - Price"
          venueType = match[1]?.trim().toLowerCase() || 'venue';
          venueName = match[2]?.trim() || '';
          if (match[3]) {
            location = { neighborhood: match[3].trim() };
          }
          priceRange = match[4]?.trim();
        } else if (pattern.source.includes('\\(')) {
          // Second pattern: "Venue Name (Location) - Price"
          venueName = match[1]?.trim() || '';
          if (match[2]) {
            location = { neighborhood: match[2].trim() };
          }
          priceRange = match[3]?.trim();
        } else {
          // Simple pattern: "Name - Price"
          venueName = match[1]?.trim() || '';
          priceRange = match[2]?.trim();
        }

        // Skip if no valid venue name or too short
        if (!venueName || venueName.length < 3 || seenNames.has(venueName.toLowerCase())) {
          continue;
        }

        // Skip common false positives
        const skipPatterns = ['SAVE', 'SHARE', 'FOLLOW', 'LIKE', 'COMMENT', 'TAG', 'DM', 'LINK', 'BIO', 'PROFILE'];
        if (skipPatterns.includes(venueName.toUpperCase())) {
          continue;
        }

        seenNames.add(venueName.toLowerCase());

        // Parse price to estimate cost
        let estimatedCost: number | undefined;
        let budgetTier: string | undefined;

        if (priceRange) {
          // Extract numeric value from price
          const numMatch = priceRange.match(/[\d,]+/g);
          if (numMatch) {
            const num = parseInt(numMatch[0].replace(/,/g, ''), 10);
            if (!isNaN(num)) {
              // Convert Nigerian Naira to USD (rough estimate: 1600 NGN = 1 USD)
              if (priceRange.includes('₦')) {
                estimatedCost = Math.round(num / 1600);
              } else {
                estimatedCost = num;
              }
            }
          }
          // Parse $ symbols
          if (priceRange.match(/^\$+$/)) {
            const dollarCount = priceRange.length;
            budgetTier = dollarCount <= 1 ? 'budget' : dollarCount === 2 ? 'moderate' : dollarCount === 3 ? 'luxury' : 'ultra_luxury';
            estimatedCost = dollarCount <= 1 ? 25 : dollarCount === 2 ? 50 : dollarCount === 3 ? 100 : 200;
          }
        }

        // Infer budget tier from cost
        if (estimatedCost && !budgetTier) {
          budgetTier = estimatedCost < 30 ? 'budget' : estimatedCost < 75 ? 'moderate' : estimatedCost < 150 ? 'luxury' : 'ultra_luxury';
        }

        // Add location info if we detected it
        if (!location && locationInfo.destination) {
          location = { city: locationInfo.destination };
          if (locationInfo.areas.length > 0) {
            location.neighborhood = locationInfo.areas[0];
          }
        }

        // Map venue type to category
        let category: string | undefined;
        const typeMap: Record<string, string> = {
          'pilates': 'wellness_spa',
          'yoga': 'wellness_spa',
          'gym': 'wellness_spa',
          'spa': 'wellness_spa',
          'brunch': 'restaurants',
          'dinner': 'restaurants',
          'lunch': 'restaurants',
          'breakfast': 'restaurants',
          'restaurant': 'restaurants',
          'cafe': 'restaurants',
          'coffee': 'restaurants',
          'bar': 'bars_nightlife',
          'club': 'bars_nightlife',
          'lounge': 'bars_nightlife',
          'hotel': 'hotels_accommodation',
          'resort': 'hotels_accommodation',
          'padel': 'attractions_activities',
          'tennis': 'attractions_activities',
          'golf': 'attractions_activities',
          'museum': 'attractions_activities',
          'tour': 'attractions_activities',
          'shopping': 'shopping',
          'market': 'shopping',
          'matcha': 'restaurants',
          'date': 'restaurants',
        };

        const lowerType = venueType.toLowerCase();
        for (const [keyword, cat] of Object.entries(typeMap)) {
          if (lowerType.includes(keyword) || venueName.toLowerCase().includes(keyword)) {
            category = cat;
            break;
          }
        }

        venues.push({
          id: crypto.randomUUID(),
          venueName,
          venueType,
          location,
          priceRange,
          budgetTier,
          estimatedCost,
          category,
        });
      }
    }

    // Fallback: Extract any remaining capitalized lines as potential venues
    // This captures names that didn't match the specific patterns above
    const remainingLines = content.split('\n');
    for (const line of remainingLines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines, lines with too many words (likely not venues), or lines we've seen
      if (!trimmedLine || trimmedLine.length < 3 || trimmedLine.split(' ').length > 8 || seenNames.has(trimmedLine.toLowerCase())) {
        continue;
      }
      
      // Check if line looks like a venue name (mostly capitalized, could have numbers for currency)
      // Match: "KREMLIN LOUNGE", "ORA LOUNGE NG", "POMELO PASTRIES CAFE", etc.
      const capMatch = trimmedLine.match(/^([A-Z][A-Z\s&'0-9]+?)(?:\s*[-–]\s*([₦$€£][\d,\s\-]+))?(?:\s*\(([^)]+)\))?$/);
      
      if (capMatch) {
        const venueName = capMatch[1]?.trim();
        const priceRange = capMatch[2]?.trim();
        const locationText = capMatch[3]?.trim();
        
        // Skip if too short, already seen, or is a skip pattern
        if (!venueName || venueName.length < 3 || seenNames.has(venueName.toLowerCase())) {
          continue;
        }
        
        const skipPatterns = ['SAVE', 'SHARE', 'FOLLOW', 'LIKE', 'COMMENT', 'TAG', 'DM', 'LINK', 'BIO', 'PROFILE', 'SHOWING', 'FROM'];
        if (skipPatterns.includes(venueName.toUpperCase())) {
          continue;
        }
        
        seenNames.add(venueName.toLowerCase());
        
        // Parse price
        let estimatedCost: number | undefined;
        let budgetTier: string | undefined;
        
        if (priceRange) {
          const numMatch = priceRange.match(/[\d,]+/g);
          if (numMatch) {
            const num = parseInt(numMatch[0].replace(/,/g, ''), 10);
            if (!isNaN(num) && num > 0) {
              if (priceRange.includes('₦')) {
                estimatedCost = Math.round(num / 1600);
              } else {
                estimatedCost = num;
              }
              // Infer budget tier from cost
              budgetTier = estimatedCost < 30 ? 'budget' : estimatedCost < 75 ? 'moderate' : estimatedCost < 150 ? 'luxury' : 'ultra_luxury';
            }
          }
        }
        
        // Infer category from venue name
        let category = 'other';
        const lowerName = venueName.toLowerCase();
        if (lowerName.includes('cafe') || lowerName.includes('restaurant') || lowerName.includes('bakery') || lowerName.includes('bistro')) {
          category = 'restaurants';
        } else if (lowerName.includes('lounge') || lowerName.includes('bar') || lowerName.includes('club')) {
          category = 'bars_nightlife';
        } else if (lowerName.includes('spa') || lowerName.includes('yoga') || lowerName.includes('gym')) {
          category = 'wellness_spa';
        }
        
        venues.push({
          id: crypto.randomUUID(),
          venueName,
          venueType: 'venue',
          location: locationText ? { neighborhood: locationText } : locationInfo.destination ? { city: locationInfo.destination } : undefined,
          priceRange,
          budgetTier,
          estimatedCost,
          category,
        });
      }
    }

    console.log(`[CONTENT IMPORT] Extracted ${venues.length} venues from content`);
    return venues;
  }

  /**
   * Get friendly source name for platform
   */
  private getSourceName(platform: string | null, url: string): string {
    if (platform === 'instagram') {
      if (url.includes('/reel/')) return 'Instagram Reel';
      if (url.includes('/stories/')) return 'Instagram Story';
      return 'Instagram Post';
    }
    if (platform === 'tiktok') return 'TikTok Video';
    if (platform === 'youtube') {
      if (url.includes('/shorts/')) return 'YouTube Short';
      return 'YouTube Video';
    }
    if (platform === 'twitter' || platform === 'x') return 'X Post';
    if (platform === 'facebook') return 'Facebook Post';
    if (platform === 'reddit') return 'Reddit Post';
    
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'Web Content';
    }
  }

  /**
   * Search for contextual additions (hotels, transport) near extracted locations
   */
  private async searchContextualAdditions(destination: string, areas: string[]): Promise<string> {
    if (!destination || areas.length === 0) {
      return '';
    }

    const areaList = areas.slice(0, 3).join(', ');
    console.log(`[DIRECT PLAN] Searching for hotels/transport near: ${areaList} in ${destination}`);

    try {
      const searchQuery = `best hotels accommodations near ${areaList} ${destination} prices 2024`;
      const response = await tavilyClient.search(searchQuery, {
        maxResults: 5,
        searchDepth: 'basic'
      });

      if (response.results && response.results.length > 0) {
        const hotelInfo = response.results
          .slice(0, 3)
          .map((r: any) => `- ${r.title}: ${r.content?.substring(0, 200) || 'No details'}`)
          .join('\n');

        console.log(`[DIRECT PLAN] Found contextual hotel info: ${hotelInfo.length} chars`);
        return `\n\n=== CONTEXTUAL ADDITIONS (for complementary logistics) ===\n**Destination:** ${destination}\n**Key Areas:** ${areaList}\n\n**Nearby Accommodation Options (from web search):**\n${hotelInfo}\n\nUse this to suggest contextual accommodation NEAR the extracted venues.`;
      }
    } catch (error) {
      console.warn('[DIRECT PLAN] Contextual search failed:', error);
    }

    return '';
  }

  /**
   * Extract content from URL using Tavily Extract API
   * Handles JavaScript-rendered pages, CAPTCHAs, and anti-bot measures
   */
  private async extractUrlContentWithTavily(url: string): Promise<string> {
    try {
      console.log(`[DIRECT PLAN] Extracting URL with Tavily (advanced mode): ${url}`);
      
      const response = await tavilyClient.extract([url], {
        extractDepth: 'advanced', // Handles JS rendering, CAPTCHAs, anti-bot
        format: 'markdown', // Get clean markdown format
        timeout: 30 // 30 second timeout for advanced extraction
      });

      if (response.results && response.results.length > 0) {
        const content = response.results[0].rawContent;
        if (content) {
          console.log(`[DIRECT PLAN] Successfully extracted ${content.length} chars from URL via Tavily`);
          return content.substring(0, 5000); // Limit to 5000 chars
        }
      }

      if (response.failedResults && response.failedResults.length > 0) {
        throw new Error(`Tavily extraction failed: ${response.failedResults[0]}`);
      }

      throw new Error('Tavily extraction returned no content');
    } catch (error) {
      console.error('[DIRECT PLAN] Tavily extraction failed:', error);
      throw error;
    }
  }

  /**
   * Fetch content from URL with smart caching and fallback chain:
   * 1. Check database cache first (instant, free)
   * 2. Try social media service for Instagram/TikTok (Apify + OCR + transcription)
   * 3. Fall back to Tavily Extract for other URLs
   * 4. Fall back to axios
   * 5. Cache successful extractions permanently
   */
  private async fetchUrlContent(url: string): Promise<string> {
    const normalizedUrl = this.normalizeUrl(url);
    
    // Step 1: Check cache FIRST - this is FREE and instant!
    try {
      const cached = await storage.getUrlContentCache(normalizedUrl);
      if (cached) {
        console.log(`[DIRECT PLAN] 💾 CACHE HIT for URL: ${normalizedUrl}`);
        console.log(`[DIRECT PLAN] Returning ${cached.wordCount} words from cache (source: ${cached.extractionSource})`);
        return cached.extractedContent;
      }
      console.log(`[DIRECT PLAN] Cache MISS for URL: ${normalizedUrl}`);
    } catch (cacheError) {
      console.warn('[DIRECT PLAN] Cache lookup failed:', cacheError);
    }
    
    // Step 2: Determine extraction method based on platform
    const platform = socialMediaVideoService.detectPlatform(url);
    let extractedContent: string | null = null;
    let extractionSource: string = 'unknown';
    let metadata: InsertUrlContentCache['metadata'] = {};
    
    // Step 3: Use social media service for Instagram/TikTok/YouTube (Apify + Whisper + OCR)
    if (platform) {
      console.log(`[DIRECT PLAN] 🎬 Detected ${platform} - using social media extraction service...`);
      try {
        const socialResult = await socialMediaVideoService.extractContent(url);
        
        if (socialResult.success) {
          extractedContent = socialMediaVideoService.combineExtractedContent(socialResult);
          extractionSource = 'social_media_service';
          metadata = {
            title: socialResult.metadata?.title,
            author: socialResult.metadata?.author,
            caption: socialResult.caption,
            hasAudioTranscript: !!socialResult.audioTranscript,
            hasOcrText: !!socialResult.ocrText,
            carouselItemCount: socialResult.carouselItems?.length
          };
          console.log(`[DIRECT PLAN] ✅ Social media extraction SUCCESS: ${extractedContent.length} chars`);
        } else {
          console.warn(`[DIRECT PLAN] Social media extraction failed: ${socialResult.error}`);
        }
      } catch (socialError: any) {
        console.warn(`[DIRECT PLAN] Social media service error: ${socialError.message}`);
      }
    }
    
    // Step 4: Fall back to Tavily if social media extraction failed or unsupported platform
    if (!extractedContent) {
      console.log(`[DIRECT PLAN] Trying Tavily extraction...`);
      try {
        extractedContent = await this.extractUrlContentWithTavily(url);
        extractionSource = 'tavily';
        console.log(`[DIRECT PLAN] Tavily extraction SUCCESS: ${extractedContent.length} chars`);
      } catch (tavilyError: any) {
        console.warn(`[DIRECT PLAN] Tavily failed: ${tavilyError.message}`);
        
        // Step 5: Last resort - axios
        try {
          console.log(`[DIRECT PLAN] Trying axios fallback...`);
          const response = await axios.get(url, { timeout: 10000 });
          const content = response.data;
          if (typeof content === 'string' && content.includes('<html')) {
            extractedContent = content
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 15000);
          } else {
            extractedContent = content.toString().substring(0, 15000);
          }
          extractionSource = 'axios';
          console.log(`[DIRECT PLAN] Axios extraction SUCCESS: ${extractedContent?.length || 0} chars`);
        } catch (axiosError: any) {
          console.error(`[DIRECT PLAN] All extraction methods failed for ${url}`);
          throw new Error(`Failed to extract content from URL: ${url}`);
        }
      }
    }
    
    // Step 6: Cache the successful extraction permanently for future users!
    if (extractedContent) {
      const wordCount = extractedContent.split(/\s+/).length;
      try {
        await storage.createUrlContentCache({
          normalizedUrl,
          originalUrl: url,
          platform: platform || undefined,
          extractedContent,
          extractionSource,
          wordCount,
          metadata
        });
        console.log(`[DIRECT PLAN] 💾 CACHED content for URL: ${normalizedUrl} (${wordCount} words)`);
      } catch (cacheError: any) {
        // Don't fail on cache errors - content was still extracted
        if (cacheError.code === '23505') {
          console.log(`[DIRECT PLAN] URL already cached (race condition), continuing...`);
        } else {
          console.warn('[DIRECT PLAN] Failed to cache content:', cacheError.message);
        }
      }
    }
    
    return extractedContent || '';
  }

  /**
   * Generate a plan directly from user input
   * No questions, no back-and-forth, just create the plan!
   */
  async generatePlan(
    userInput: string,
    contentType: 'text' | 'image',
    userProfile: User,
    existingPlan?: DirectPlanResult, // For modifications
    userPreferences?: UserPreferences // User's saved preferences for the destination
  ): Promise<DirectPlanResult> {

    console.log(`[DIRECT PLAN] Generating plan from ${contentType} input`);
    console.log(`[DIRECT PLAN] User input: ${userInput.substring(0, 100)}...`);

    const isModification = !!existingPlan;

    if (isModification) {
      console.log(`[DIRECT PLAN] Modifying existing plan: "${existingPlan.activity.title}"`);
    }

    // Step 0: Check if input contains URLs and fetch content from them
    let processedInput = userInput;
    if (!isModification && contentType === 'text') {
      // First check if entire input is a URL
      if (this.isUrl(userInput.trim())) {
        console.log('[DIRECT PLAN] Single URL detected, fetching content...');
        try {
          const urlContent = await this.fetchUrlContent(userInput.trim());
          processedInput = `URL: ${userInput.trim()}\n\nContent from URL:\n${urlContent}`;
          console.log(`[DIRECT PLAN] Fetched ${urlContent.length} chars from URL`);
        } catch (error) {
          console.error('[DIRECT PLAN] URL fetch failed:', error);
          // Don't throw - continue with original input and let AI handle it
          processedInput = `User wants to create a plan from this URL (content could not be fetched): ${userInput}`;
        }
      } else {
        // Check if input contains URLs within text
        const urls = this.extractUrls(userInput);
        if (urls.length > 0) {
          console.log(`[DIRECT PLAN] Found ${urls.length} URL(s) in text:`, urls);
          
          // Fetch content from all URLs (limit to first 3)
          const urlContents: string[] = [];
          for (const url of urls.slice(0, 3)) {
            try {
              console.log(`[DIRECT PLAN] Fetching content from: ${url}`);
              const content = await this.fetchUrlContent(url);
              urlContents.push(`\n--- Content from ${url} ---\n${content}`);
              console.log(`[DIRECT PLAN] Fetched ${content.length} chars from ${url}`);
            } catch (error) {
              console.error(`[DIRECT PLAN] Failed to fetch ${url}:`, error);
              urlContents.push(`\n--- Could not fetch content from ${url} ---`);
            }
          }
          
          if (urlContents.length > 0) {
            // Combine user's text with fetched URL content
            processedInput = `${userInput}\n\n=== FETCHED URL CONTENT ===\n${urlContents.join('\n')}`;
          }
        }
      }
    }

    // Step 1: Validate if input is plan-related (guardrail check)
    if (!isModification && contentType === 'text') {
      const isPlanRelated = await this.validatePlanIntent(processedInput);
      if (!isPlanRelated) {
        throw new Error('INPUT_NOT_PLAN_RELATED: Your input doesn\'t appear to be requesting a plan. Please describe what you want to plan or accomplish.');
      }
    }

    // Step 1.5: Extract location for user preferences lookup and contextual additions
    // Do this BEFORE social media check so we always try to find user preferences
    let detectedDestination: string | null = null;
    let detectedAreas: string[] = [];
    const { destination, areas } = this.extractLocationsFromContent(processedInput, userInput);
    detectedDestination = destination;
    detectedAreas = areas;
    
    // Fallback: If no destination detected but user has saved preferences, 
    // check if any saved city is mentioned in the input
    if (!destination && userProfile?.id) {
      try {
        const userCities = await this.getUserPreferenceCities(userProfile.id);
        if (userCities.length > 0) {
          const lowerInput = (processedInput + ' ' + userInput).toLowerCase();
          for (const city of userCities) {
            if (lowerInput.includes(city.toLowerCase())) {
              detectedDestination = city;
              detectedAreas = [city];
              console.log(`[LOCATION FALLBACK] Matched city from user preferences: ${city}`);
              break;
            }
          }
        }
      } catch (error) {
        console.error('[LOCATION FALLBACK] Failed:', error);
      }
    }
    
    // If we found a destination and user is authenticated, look up their saved preferences
    if (detectedDestination && userProfile?.id && !userPreferences) {
      try {
        console.log(`[DIRECT PLAN] Looking up user preferences for: ${detectedDestination}`);
        const savedContent = await storage.getUserSavedContent(userProfile.id, detectedDestination, undefined);
        
        if (savedContent && savedContent.length > 0) {
          // Build preferences from saved content
          const venues: Array<{ name: string; type: string; priceRange?: string }> = [];
          const categories = new Set<string>();
          const budgetTiers = new Set<string>();
          
          for (const content of savedContent) {
            if (content.venues && Array.isArray(content.venues)) {
              for (const venue of content.venues as any[]) {
                venues.push({
                  name: venue.name || 'Unknown',
                  type: venue.type || 'venue',
                  priceRange: venue.priceRange
                });
              }
            }
            if (content.category) categories.add(content.category);
            if (content.budgetTier) budgetTiers.add(content.budgetTier);
          }
          
          userPreferences = {
            location: detectedDestination,
            savedItems: savedContent.length,
            venues: venues.slice(0, 15),
            categories: Array.from(categories),
            budgetTiers: Array.from(budgetTiers)
          };
          
          console.log(`[DIRECT PLAN] Found ${savedContent.length} saved items with ${venues.length} venues for ${detectedDestination}`);
        }
      } catch (error) {
        console.error('[DIRECT PLAN] Failed to lookup user preferences:', error);
      }
    }
    
    // If social media content detected, search for contextual additions
    if (!isModification && this.isSocialMediaContent(processedInput)) {
      console.log('[DIRECT PLAN] Social media content detected');
      
      if (detectedDestination && detectedAreas.length > 0) {
        console.log(`[DIRECT PLAN] Found destination: ${detectedDestination}, areas: ${detectedAreas.join(', ')}`);
        const contextualInfo = await this.searchContextualAdditions(detectedDestination, detectedAreas);
        if (contextualInfo) {
          processedInput += contextualInfo;
          console.log('[DIRECT PLAN] Added contextual hotel/transport info to input');
        }
      }
    }

    // Step 2: Extract venues and create ContentImport for URL content
    let contentImportId: string | undefined;
    let extractedSourceUrl: string | undefined;
    let extractedSourceName: string | undefined;
    let extractedVenues: Array<{
      id: string;
      venueName: string;
      venueType: string;
      location?: { city?: string; neighborhood?: string };
      priceRange?: string;
      budgetTier?: string;
      estimatedCost?: number;
      category?: string;
      notes?: string;
    }> = [];

    if (!isModification && contentType === 'text') {
      // Get the URL if present
      const urls = this.extractUrls(userInput);
      const singleUrl = this.isUrl(userInput.trim()) ? userInput.trim() : urls[0];
      
      if (singleUrl) {
        const platform = socialMediaVideoService.detectPlatform(singleUrl);
        extractedSourceUrl = singleUrl;
        extractedSourceName = this.getSourceName(platform, singleUrl);
        
        // Extract venues from the content
        extractedVenues = this.extractVenuesFromContent(
          processedInput,
          platform,
          { destination: detectedDestination, areas: detectedAreas }
        );
        
        if (extractedVenues.length > 0 && userProfile?.id) {
          try {
            const normalizedUrl = this.normalizeUrl(singleUrl);
            // Safety check: filter out any items without venueName (should not happen, but just in case)
            const validVenues = extractedVenues.filter(v => v.venueName && v.venueName.trim().length > 0);
            const contentImport = await storage.createContentImport({
              userId: userProfile.id,
              sourceUrl: singleUrl,
              normalizedUrl,
              platform: platform || undefined,
              sourceName: extractedSourceName,
              totalItemsExtracted: extractedVenues.length,
              extractedItems: validVenues.map(v => ({ ...v, selectedForPlan: false })),
            });
            contentImportId = contentImport.id;
            console.log(`[CONTENT IMPORT] Created import ${contentImportId} with ${validVenues.length} items (${extractedVenues.length - validVenues.length} filtered out due to missing venueName)`);
          } catch (error) {
            console.error('[CONTENT IMPORT] Failed to create:', error);
          }
        } else {
          console.log(`[CONTENT IMPORT] No venues extracted or no user profile (venues: ${extractedVenues.length})`);
        }
      }
    }

    // Build prompt based on whether it's new or modification
    const prompt = isModification
      ? this.buildModificationPrompt(processedInput, existingPlan, userProfile)
      : this.buildCreationPrompt(processedInput, contentType, userProfile, userPreferences);

    try {
      const messageContent = contentType === 'image'
        ? this.buildImageMessage(userInput, prompt)
        : [{ type: "text" as const, text: prompt }];

      const response = await anthropic.messages.create({
        model: CLAUDE_SONNET,
        max_tokens: 4096,
        temperature: 0.7,
        system: [
          {
            type: "text",
            text: `You are a plan generation expert. Your job is to convert user requests into actionable activity plans with specific tasks. Be direct, clear, and actionable. Format everything as proper activities and tasks that can be tracked.`,
            cache_control: { type: "ephemeral" as any }
          }
        ],
        messages: [{
          role: "user",
          content: messageContent
        }]
      });

      const responseText = (response.content[0] as any).text;

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
      }

      const result: DirectPlanResult = JSON.parse(jsonMatch[0]);

      // Add import info to result
      result.importId = contentImportId;
      result.sourceUrl = extractedSourceUrl;
      result.sourceName = extractedSourceName;

      // Match tasks to extracted venues and add contentItemId
      if (extractedVenues.length > 0 && contentImportId) {
        const matchedItemIds: string[] = [];
        
        for (const task of result.tasks) {
          const taskTitle = task.title.toLowerCase();
          const taskDesc = task.description.toLowerCase();
          
          // Find matching venue by name
          for (const venue of extractedVenues) {
            const venueName = venue.venueName.toLowerCase();
            if (taskTitle.includes(venueName) || taskDesc.includes(venueName)) {
              task.contentItemId = venue.id;
              task.estimatedCost = venue.estimatedCost;
              matchedItemIds.push(venue.id);
              console.log(`[TASK MATCHING] Matched task "${task.title}" to venue "${venue.venueName}" (${venue.id})`);
              break; // Only match one venue per task
            }
          }
        }
        
        // Update ContentImport to mark matched items as selectedForPlan
        if (matchedItemIds.length > 0 && userProfile?.id) {
          try {
            const userId = String(userProfile.id);
            const contentImport = await storage.getContentImport(contentImportId, userId);
            if (contentImport && contentImport.extractedItems) {
              const updatedItems = (contentImport.extractedItems as any[]).map((item: any) => ({
                ...item,
                selectedForPlan: matchedItemIds.includes(item.id)
              }));
              await storage.updateContentImport(contentImportId, userId, {
                extractedItems: updatedItems,
                itemsUsedInPlan: matchedItemIds.length
              });
              console.log(`[CONTENT IMPORT] Marked ${matchedItemIds.length} items as selected for plan`);
            }
          } catch (error) {
            console.error('[CONTENT IMPORT] Failed to update selected items:', error);
          }
        }
      }

      console.log(`[DIRECT PLAN] Generated: "${result.activity.title}" with ${result.tasks.length} tasks`);
      if (contentImportId) {
        console.log(`[DIRECT PLAN] Linked to ContentImport: ${contentImportId} from ${extractedSourceName}`);
      }

      return result;

    } catch (error) {
      console.error('[DIRECT PLAN] Error:', error);
      throw error;
    }
  }

  /**
   * Validate if user input is actually requesting a plan (guardrail)
   */
  private async validatePlanIntent(userInput: string): Promise<boolean> {
    console.log('[GUARDRAIL] Checking if input is plan-related...');

    try {
      const response = await anthropic.messages.create({
        model: "claude-3-5-haiku-20241022", // Use Haiku for fast, cheap validation
        max_tokens: 50,
        temperature: 0,
        messages: [{
          role: "user",
          content: `Analyze this user input and determine if they are requesting help to CREATE, PLAN, or ORGANIZE something.

INPUT: "${userInput}"

PLAN-RELATED INDICATORS:
✅ "plan my..." / "help me plan..."
✅ "organize..." / "prepare for..."
✅ "I need to..." / "I want to..."
✅ Pasted steps/tasks/lists (numbered, bulleted)
✅ Goals, objectives, projects
✅ "create a..." / "build a..."

NOT PLAN-RELATED:
❌ Random statements ("fall on ice", "it's cold")
❌ Questions without action intent ("what is...?", "how does...?")
❌ Observations or facts
❌ Single-word inputs without context

Answer with ONLY "YES" or "NO".`
        }]
      });

      const answer = (response.content[0] as any).text.trim().toLowerCase();
      const isPlanRelated = answer.includes('yes');

      console.log(`[GUARDRAIL] Result: ${isPlanRelated ? 'PLAN-RELATED ✅' : 'NOT PLAN-RELATED ❌'}`);

      return isPlanRelated;
    } catch (error) {
      // If validation fails, assume it's plan-related (fail-open)
      console.warn('[GUARDRAIL] Validation error, assuming plan-related:', error);
      return true;
    }
  }

  /**
   * Build prompt for creating NEW plan
   */
  private buildCreationPrompt(
    userInput: string,
    contentType: 'text' | 'image',
    userProfile: User,
    userPreferences?: UserPreferences
  ): string {

    const userName = userProfile.firstName || userProfile.username || 'User';
    const userContext = `User: ${userName}
Location: ${userProfile.location || 'Unknown'}
Timezone: ${userProfile.timezone || 'Unknown'}`;
    
    // Build user preferences section if available
    let userPreferencesSection = '';
    if (userPreferences && userPreferences.savedItems > 0) {
      const venuesList = userPreferences.venues
        .slice(0, 10)
        .map(v => `- ${v.name} (${v.type}${v.priceRange ? `, ${v.priceRange}` : ''})`)
        .join('\n');
      
      userPreferencesSection = `

## 🌟 USER'S SAVED PREFERENCES FOR ${userPreferences.location.toUpperCase()} 🌟

The user has previously saved ${userPreferences.savedItems} items for ${userPreferences.location}.
These are places/activities they're interested in visiting:

${venuesList}

Categories of interest: ${userPreferences.categories.join(', ')}
Budget preference: ${userPreferences.budgetTiers.join(', ') || 'Not specified'}

**INSTRUCTIONS FOR USING PREFERENCES:**
1. PRIORITIZE these saved venues/activities in your plan
2. Include at least 2-3 of their saved spots as specific tasks
3. Use their saved preferences to understand their taste and recommend similar venues
4. Match their budget preference when suggesting additional options
5. DO NOT ignore their saved preferences - they specifically saved these for a reason!
`;
    }

    return `Generate an actionable plan based on the user's request.

USER CONTEXT:
${userContext}
${userPreferencesSection}
USER REQUEST:
"${userInput}"

TASK:
1. Create an activity with a CLEAR, SPECIFIC, USER-FRIENDLY title
2. Break down into 6-9 actionable tasks (occasionally 5 for very simple goals)
3. Each task MUST include SPECIFIC details - real prices, budgets, named recommendations
4. Use appropriate priorities (high/medium/low)

CRITICAL - ACTIVITY TITLE REQUIREMENTS:
- MUST be clear, concise, and immediately understandable
- MUST reflect the main goal/objective from the user's request
- MUST be natural language (like a human would say it)
- Extract and use ANY header/title from the pasted content
- Include timeframes if mentioned (weekend, today, next week, etc.)
- Preserve emojis if present in request
- BAD: "Clear intuitive title based on the user request with what was generated from claude"
- GOOD: "Weekend: IP Protection Tasks"
- GOOD: "Google Interview Prep - Next Week"
- GOOD: "🏋️ 30-Day Fitness Challenge"

OUTPUT FORMAT (JSON only, no markdown):
{
  "activity": {
    "title": "SPECIFIC, CLEAR TITLE HERE",
    "description": "Brief description of the overall plan",
    "category": "Work|Personal|Health|Learning|Finance|Social|Other",
    "startDate": "YYYY-MM-DD or null if no date mentioned",
    "endDate": "YYYY-MM-DD or null if no date mentioned"
  },
  "tasks": [
    {
      "title": "Specific, actionable task title with concrete details",
      "description": "Detailed description including specific prices ($X-Y), named recommendations, quantities, and actionable steps",
      "category": "Same as activity or more specific",
      "priority": "high|medium|low",
      "scheduledDate": "YYYY-MM-DD or null if no date",
      "startTime": "HH:MM (24-hour) or null if no time",
      "endTime": "HH:MM (24-hour) or null if no time"
    }
  ]
}

## CRITICAL STEP 1 REQUIREMENT - COMPLETE LIST TASK

When content contains a LIST of items (books, restaurants, movies, exercises, etc.):
Your FIRST task (tasks[0]) MUST be a "Complete List" summary that:
1. Lists EVERY SINGLE item mentioned in the source content by name
2. Title format: "Complete list of [N] [items] from this post"
3. Description format: Numbered list with ALL items and their authors/creators if known
4. Include ALL items even if there are 20, 50, or 100+ of them
5. This task is for journaling - it captures the complete curated content

Example for 20 books:
{
  "title": "Complete list of 20 business books from this post",
  "description": "1. Atomic Habits by James Clear\\n2. Start With Why by Simon Sinek\\n3. $100M Offers by Alex Hormozi\\n4. The Psychology of Money by Morgan Housel\\n5. Deep Work by Cal Newport\\n... (continue for ALL 20 books)",
  "priority": "high",
  "category": "reference"
}

Example for 15 restaurants:
{
  "title": "Complete list of 15 restaurants from this post",
  "description": "1. Blue Bottle Coffee - Arts District LA\\n2. Verve Coffee - Santa Monica\\n3. Intelligentsia - Silver Lake\\n... (continue for ALL 15 restaurants)",
  "priority": "high",
  "category": "reference"
}

Tasks 2-N are supplementary action plans (reading schedule, visit itinerary, purchase strategy, etc.)

## DATETIME EXTRACTION RULES (IMPORTANT!)

Today's date is: ${new Date().toISOString().split('T')[0]}

**PARSE ALL DATES AND TIMES into structured fields. Accept MULTIPLE input formats:**

### 1. RELATIVE DATES - Calculate actual dates from today:
- "today", "tonight" → ${new Date().toISOString().split('T')[0]}
- "tomorrow", "tmrw" → next day from today
- "next Friday", "this Friday" → calculate actual Friday date
- "in 2 weeks", "2 weeks from now" → today + 14 days
- "Day 1, Day 2, Day 3" → sequential days starting from tomorrow
- "this weekend" → upcoming Saturday/Sunday
- "next week", "next month" → calculate appropriately

### 2. SPECIFIC DATE FORMATS - Recognize and convert ALL these to YYYY-MM-DD:
**US formats:**
- "January 20th", "January 20, 2025" → 2025-01-20
- "Jan 20", "Jan 20th" → YYYY-01-20
- "1/20/25", "01/20/2025" → 2025-01-20
- "1-20-25", "01-20-2025" → 2025-01-20

**International formats:**
- "20 January 2025", "20 Jan 2025" → 2025-01-20
- "20/01/25", "20/01/2025" → 2025-01-20
- "20-01-25", "20-01-2025" → 2025-01-20
- "20.01.2025" → 2025-01-20

**ISO format (already correct):**
- "2025-01-20" → 2025-01-20

**Date ranges:**
- "Jan 20-22", "January 20-22" → startDate: Jan 20, endDate: Jan 22
- "Jan 20 - Jan 25" → startDate: Jan 20, endDate: Jan 25
- "20th-22nd January" → startDate: Jan 20, endDate: Jan 22

### 3. TIME FORMATS - Recognize and convert ALL these to HH:MM (24-hour):
**12-hour formats:**
- "2:30 PM", "2:30pm", "2:30 pm" → "14:30"
- "9 AM", "9am", "9:00 AM" → "09:00"
- "12 PM", "12:00 PM" → "12:00" (noon)
- "12 AM", "12:00 AM" → "00:00" (midnight)

**24-hour formats:**
- "14:30", "1430" → "14:30"
- "09:00", "0900" → "09:00"

**Natural language times:**
- "morning", "in the morning" → "09:00"
- "afternoon" → "14:00"
- "evening" → "18:00"
- "night", "at night" → "20:00"
- "noon", "midday" → "12:00"
- "midnight" → "00:00"

**Time ranges:**
- "9 AM - 5 PM", "9am-5pm" → startTime: "09:00", endTime: "17:00"
- "09:00-17:00" → startTime: "09:00", endTime: "17:00"
- "2-4 PM" → startTime: "14:00", endTime: "16:00"

**Combined datetime formats:**
- "Jan 20 at 2:30 PM" → scheduledDate: "2025-01-20", startTime: "14:30"
- "2025-01-20T14:30:00" → scheduledDate: "2025-01-20", startTime: "14:30"
- "January 20, 2025 2:30 PM" → scheduledDate: "2025-01-20", startTime: "14:30"

### 4. MULTI-DAY ACTIVITIES - Create ONE task per day:
- "3-day hiking trip" → 3 separate tasks, each with its own scheduledDate
- "Weekend trip to Paris" → Saturday task + Sunday task
- "Week-long vacation" → 7 separate daily tasks

### 5. OUTPUT FORMAT (always output in these formats):
- scheduledDate: "YYYY-MM-DD" (ISO 8601 date only)
- startTime: "HH:MM" or null (24-hour format, no seconds)
- endTime: "HH:MM" or null
- Activity startDate/endDate: "YYYY-MM-DD" for multi-day plans

### 6. IMPORTANT RULES:
- If NO time is mentioned → leave startTime as null (date only)
- If date is ambiguous (e.g., "next week") → calculate best estimate from today
- If year is not specified → use current year (or next year if date has passed)
- Always output dates in ISO format regardless of input format

## TASK SPECIFICITY REQUIREMENTS

ALL tasks MUST include:
1. **Specific dollar amounts** when relevant (hotels: $80-120/night, flights: $300-500, etc.)
2. **Named recommendations** (specific restaurants, hotels, apps, tools by name)
3. **Concrete quantities** (3 hours, 5 pages, 2 weeks, 30 minutes)
4. **Actionable steps** - not "research X" but "do X using Y method"

❌ FORBIDDEN VAGUE PATTERNS:
- "Research prices for hotels" → Instead: "Book hotel ($80-120/night, try Booking.com for Medina riads)"
- "Find flights" → Instead: "Book roundtrip flights ($400-600, check Google Flights/Kayak)"
- "Set a budget" → Instead: "Allocate $500 for dining, $300 for activities, $200 for shopping"
- "Look into transportation" → Instead: "Rent car via Avis ($45/day) or use Uber ($15-25 avg ride)"

RULES FOR TITLE EXTRACTION:
1. If user's request starts with a title/header → USE IT as activity title
2. If request says "plan my [X]" → Activity: "[X] Plan" or just "[X]"
3. If request mentions goal → USE THE GOAL as title
4. If pasted content has markdown headers (# Title) → USE THAT HEADER
5. If timeframe mentioned → INCLUDE IT in title
6. If request is a list without title → CREATE descriptive title from context
7. NEVER use generic titles like "Action Plan" or "Your Tasks"
8. NEVER use meta descriptions about generating or creating

⚠️ CRITICAL: URL CONTENT HANDLING ⚠️
When the input contains "FETCHED URL CONTENT" or "Content from URL":
- You HAVE the actual content already - it's provided above!
- Generate actionable tasks DIRECTLY FROM the content
- DO NOT create tasks like "Access the URL", "Navigate to the link", "Read the content"
- DO NOT create tasks that tell the user to visit/review/access the URL
- The content HAS BEEN extracted for you - work with it directly!

## 🔒 STRICT GROUNDING RULES FOR SOCIAL MEDIA CONTENT 🔒

When the input contains "Platform: INSTAGRAM", "Platform: TIKTOK", "Platform: YOUTUBE" or "On-Screen Text (OCR)":
This is EXTRACTED SOCIAL MEDIA CONTENT. You MUST follow these MANDATORY rules:

### RULE 1: PRESERVE ALL EXTRACTED CONTENT (NEVER SUBSTITUTE)
- Every venue/activity/location mentioned in the OCR or caption MUST become a task
- Use the EXACT names from the content (e.g., "Lo Studio", "Knowhere", "Ounje Co", "Dulce")
- Use the EXACT prices from the content (e.g., "₦100,000", "₦50,000", "₦20,000")
- NEVER substitute extracted venues with generic recommendations
- NEVER replace specific restaurants/venues with ones from your training data

### RULE 2: ADDITIVE ONLY (ADD, NEVER REDUCE)
You MAY add complementary logistics that support the extracted content:
- ✅ Flights/transportation TO the destination mentioned in content
- ✅ Accommodation NEAR the venues mentioned in content (use same area/neighborhood)
- ✅ Transportation BETWEEN the extracted venues
- ✅ Pre-trip preparation (packing, booking)

### RULE 3: CONTEXTUAL ADDITIONS (LOCATION-AWARE)
When adding logistics, they must be CONTEXTUAL to the extracted locations:
- If venues are in "Victoria Island" → suggest hotels IN Victoria Island
- If venues are in "Ikoyi" → suggest staying near Ikoyi
- Reference specific venues: "Stay near Victoria Island to access Lo Studio, Knowhere, and Dulce easily"

### RULE 4: NO HALLUCINATED ALTERNATIVES
❌ FORBIDDEN: Adding restaurants/venues NOT in the extracted content
❌ FORBIDDEN: Suggesting "alternatives" like "or try Nok by Alara" (not from source)
❌ FORBIDDEN: Generic recommendations like "premium dining experiences at Lagos' top restaurants"
❌ FORBIDDEN: Replacing extracted prices with your own estimates

### EXAMPLE - CORRECT GROUNDING:

**Source Content (OCR):**
- PILATES - Lo Studio, VI - ₦100,000
- PADEL - Padel House, Ikoyi
- BRUNCH - Knowhere, VI - ₦50,000
- DINNER - Ounje Co - ₦100,000
- MATCHA DATE - Dulce, Ikoyi - ₦20,000

**✅ CORRECT PLAN:**
1. Book flights to Lagos (₦450,000-650,000) [ADDED - logistics]
2. Stay in Victoria Island/Ikoyi area near venues (₦150,000-250,000/night) [ADDED - contextual]
3. Pilates session at Lo Studio, VI (₦100,000 as per source) [FROM SOURCE]
4. Padel at Padel House, Ikoyi (contact for booking) [FROM SOURCE]
5. Premium brunch at Knowhere, VI (₦50,000) [FROM SOURCE]
6. Private dinner at Ounje Co (₦100,000) [FROM SOURCE]
7. Matcha date at Dulce, Ikoyi (₦20,000) [FROM SOURCE]
8. Arrange transport between venues (Uber/Bolt) [ADDED - logistics]

**❌ WRONG PLAN (violates grounding):**
1. Book flights to Lagos
2. Stay at Marriott or Radisson
3. Try pilates at Lo Studio
4. Book dining at Nok by Alara, Yellow Chilli ← NOT IN SOURCE!
5. Visit spa for wellness day ← NOT IN SOURCE!
6. Premium shopping at Palms Mall ← NOT IN SOURCE!

FORBIDDEN TASK PATTERNS (never generate these):
❌ "Access the shared URL"
❌ "Navigate to [URL] and verify..."
❌ "Extract and document key information"
❌ "Review your notes to identify..."
❌ "Read through all content in the shared link"
❌ "Take note of any access requirements"
❌ "Research prices for X"
❌ "Look up options for Y"
❌ "Try [restaurant not mentioned in source]"
❌ "Book dining at [generic recommendations]"

CORRECT TASK PATTERNS (generate these instead):
✅ "Book flights to Paris ($450-650 roundtrip via Google Flights)"
✅ "Reserve hotel in Le Marais ($150-200/night, try Hotel du Petit Moulin)"
✅ "Allocate $200 budget for museum passes (Louvre $17, Orsay $16, etc.)"
✅ "Complete 30-minute HIIT session (YouTube: Heather Robertson or Sydney Cummings)"
✅ "Set up Node.js project with Express + TypeScript (2 hours)"
✅ "Create 5 Instagram Reels for brand launch ($0 using Canva free tier)"
✅ "Book [EXACT venue name from source] - [EXACT price from source]"

EXAMPLES:

Request: "plan my weekend: 1. Document workflow 2. File trademark 3. Register copyright"
✅ Activity Title: "Weekend: IP Protection Tasks"

Request: "I need to prep for my interview at Google next week"
✅ Activity Title: "Google Interview Prep - Next Week"

Request: "🏋️ 30-day fitness challenge..."
✅ Activity Title: "🏋️ 30-Day Fitness Challenge"

Request: "# Weekend Shopping List\n1. Buy groceries\n2. Get new shoes"
✅ Activity Title: "Weekend Shopping List"

Request: "organize my home office this week"
✅ Activity Title: "Home Office Organization - This Week"

Request: "Learn React basics, build a todo app, deploy it"
✅ Activity Title: "React Learning Project"

Return ONLY valid JSON, no markdown blocks.`;
  }

  /**
   * Build prompt for MODIFYING existing plan
   */
  private buildModificationPrompt(
    userInput: string,
    existingPlan: DirectPlanResult,
    userProfile: User
  ): string {

    return `Modify the existing plan based on the user's request.

EXISTING PLAN:
${JSON.stringify(existingPlan, null, 2)}

USER'S MODIFICATION REQUEST:
"${userInput}"

TASK:
Update the plan based on the request. This could mean:
- Adding new tasks
- Removing tasks
- Changing task details (title, description, priority)
- Updating activity title or description
- Reordering tasks

Apply the requested changes and return the UPDATED plan.

OUTPUT FORMAT (JSON only):
{
  "activity": {
    "title": "Updated title (if changed)",
    "description": "Updated description (if changed)",
    "category": "Updated category (if changed)",
    "startDate": "YYYY-MM-DD or null",
    "endDate": "YYYY-MM-DD or null"
  },
  "tasks": [
    // All tasks (existing + new, minus removed)
    {
      "title": "Task title",
      "description": "Task description",
      "category": "Category",
      "priority": "high|medium|low",
      "scheduledDate": "YYYY-MM-DD or null",
      "startTime": "HH:MM or null",
      "endTime": "HH:MM or null"
    }
  ]
}

RULES:
- Keep existing tasks unless explicitly asked to remove them
- If adding, append new tasks to the list
- If removing, identify by title/description and exclude
- If modifying, update the matching task
- Preserve task order unless asked to reorder

Return ONLY valid JSON, no markdown blocks.`;
  }

  /**
   * Build image message content
   */
  private buildImageMessage(base64Image: string, textPrompt: string): any[] {
    // Extract media type from base64 string
    const mediaTypeMatch = base64Image.match(/data:image\/(.*?);/);
    const mediaType = mediaTypeMatch ? mediaTypeMatch[1] : 'jpeg';

    // Extract base64 data (remove data:image/...;base64, prefix)
    const base64Data = base64Image.includes('base64,')
      ? base64Image.split('base64,')[1]
      : base64Image;

    return [
      {
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: `image/${mediaType}` as any,
          data: base64Data
        }
      },
      {
        type: "text" as const,
        text: textPrompt
      }
    ];
  }
}

// Export singleton instance
export const directPlanGenerator = new DirectPlanGenerator();
