/**
 * Enrichment Service - Fetches real-time data to enhance planning
 * Supports: Weather, Events, Flight Prices, Web Search, etc.
 */

import type { EnrichmentRule } from './domainRegistry';
import type { User } from '@shared/schema';

export interface EnrichedData {
  [key: string]: any;
}

export class EnrichmentService {

  /**
   * Enrich plan with real-time data based on domain rules
   */
  async enrichPlan(
    domain: string,
    slots: any,
    rules: EnrichmentRule[],
    userProfile: User
  ): Promise<EnrichedData> {

    const enrichedData: EnrichedData = {};

    console.log(`[ENRICHMENT] Starting enrichment for ${domain} with ${rules.length} rules`);

    for (const rule of rules) {
      try {
        // Evaluate condition
        if (this.evaluateCondition(rule.condition, slots)) {
          console.log(`[ENRICHMENT] Condition met: ${rule.condition}`);

          // Fetch from APIs
          if (rule.apis) {
            for (const api of rule.apis) {
              try {
                const result = await this.callAPI(api, slots, userProfile);
                enrichedData[api.type] = result;
              } catch (error) {
                console.error(`[ENRICHMENT] API call failed for ${api.type}:`, error);
                enrichedData[api.type] = { error: 'Failed to fetch data' };
              }
            }
          }

          // Perform web searches
          if (rule.web_searches) {
            for (const searchTemplate of rule.web_searches) {
              try {
                const query = this.interpolate(searchTemplate, slots, userProfile);
                console.log(`[ENRICHMENT] Web search: ${query}`);

                // For now, store the query - actual search implementation can be added later
                enrichedData[`search_query_${searchTemplate}`] = query;

                // TODO: Implement actual web search when API is available
                // const results = await this.webSearch(query);
                // enrichedData[`search_${searchTemplate}`] = results;
              } catch (error) {
                console.error(`[ENRICHMENT] Web search failed:`, error);
              }
            }
          }
        }
      } catch (error) {
        console.error(`[ENRICHMENT] Error processing rule:`, error);
      }
    }

    console.log('[ENRICHMENT] Enrichment complete:', Object.keys(enrichedData));
    return enrichedData;
  }

  /**
   * Evaluate a condition string against slots
   */
  private evaluateCondition(condition: string, slots: any): boolean {
    try {
      // Simple condition evaluation
      // Format: "has_destination && has_dates" or "transportation == 'flying'"

      // Replace has_* with actual checks
      let evalStr = condition.replace(/has_(\w+)/g, (_, field) => {
        return this.hasValue(slots, field) ? 'true' : 'false';
      });

      // Replace field references with actual values for comparison
      evalStr = evalStr.replace(/(\w+)\s*(==|!=)\s*'([^']+)'/g, (_, field, op, value) => {
        const actual = this.getNestedValue(slots, field);
        if (op === '==') {
          return actual === value ? 'true' : 'false';
        } else {
          return actual !== value ? 'true' : 'false';
        }
      });

      // Evaluate the boolean expression
      // eslint-disable-next-line no-eval
      return eval(evalStr);
    } catch (error) {
      console.error('[ENRICHMENT] Condition evaluation error:', error);
      return false;
    }
  }

  /**
   * Call external API based on configuration
   */
  private async callAPI(
    api: { type: string; params: Record<string, string> },
    slots: any,
    userProfile: User
  ): Promise<any> {

    // Interpolate parameters
    const params: Record<string, any> = {};
    for (const [key, value] of Object.entries(api.params)) {
      params[key] = this.interpolate(value, slots, userProfile);
    }

    console.log(`[ENRICHMENT] Calling ${api.type} with params:`, params);

    // Route to appropriate API handler
    switch (api.type) {
      case 'weather':
        return await this.fetchWeather(params);

      case 'events':
        return await this.fetchEvents(params);

      case 'flight_prices':
        return await this.fetchFlightPrices(params);

      default:
        console.warn(`[ENRICHMENT] Unknown API type: ${api.type}`);
        return { error: 'Unknown API type' };
    }
  }

  /**
   * Fetch weather data
   */
  private async fetchWeather(params: any): Promise<any> {
    // TODO: Integrate with OpenWeatherMap or similar API
    // For now, return mock data
    console.log('[ENRICHMENT] Fetching weather for:', params.location);

    return {
      location: params.location,
      forecast: 'Sunny, 85°F with clear skies',
      temperature: { high: 85, low: 68 },
      conditions: 'Clear',
      advice: 'Perfect weather for outdoor activities!',
      mock: true
    };
  }

  /**
   * Fetch local events
   */
  private async fetchEvents(params: any): Promise<any> {
    // TODO: Integrate with Ticketmaster/Eventbrite API
    console.log('[ENRICHMENT] Fetching events for:', params.location);

    return {
      location: params.location,
      events: [
        'State Fair of Texas (Seasonal Event)',
        'Local Art Gallery Openings',
        'Live Music Venues'
      ],
      mock: true
    };
  }

  /**
   * Fetch flight prices
   */
  private async fetchFlightPrices(params: any): Promise<any> {
    // TODO: Integrate with flight API (Skyscanner, Amadeus, etc.)
    console.log('[ENRICHMENT] Fetching flight prices:', params);

    return {
      from: params.from,
      to: params.to,
      estimatedPrice: '$200-300 round trip',
      advice: 'Book early for best prices',
      mock: true
    };
  }

  /**
   * Interpolate template string with values from slots and user profile
   */
  private interpolate(template: string, slots: any, userProfile?: User): string {
    let result = template;

    // Replace {field.path} with actual values from slots
    result = result.replace(/\{([^}]+)\}/g, (_, path) => {
      if (path.startsWith('user.')) {
        // User profile field
        const field = path.substring(5);
        return (userProfile as any)?.[field] || path;
      } else {
        // Slot field
        return this.getNestedValue(slots, path) || path;
      }
    });

    return result;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Check if a field has a value
   */
  private hasValue(obj: any, field: string): boolean {
    const value = this.getNestedValue(obj, field);
    return value !== null && value !== undefined && value !== '';
  }
}

// Export singleton instance
export const enrichmentService = new EnrichmentService();
