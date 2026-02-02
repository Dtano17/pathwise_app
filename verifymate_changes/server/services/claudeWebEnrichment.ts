import Anthropic from "@anthropic-ai/sdk";
import type { User } from '@shared/schema';
import type { EnrichmentRule } from './domainRegistry';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Use Sonnet-4 for web enrichment (needs web search tool + intelligence for parsing)
const CLAUDE_SONNET = "claude-sonnet-4-20250514";
const DEFAULT_CLAUDE_MODEL = CLAUDE_SONNET;

export interface EnrichedData {
  fetchedAt?: Date;
  expiresAt?: Date;
  domain: string;

  // Universal critical details
  criticalActions?: {
    action: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    deadline?: string;
    reason: string;
    link?: string;
  }[];

  warnings?: {
    type: 'timing' | 'cost' | 'availability' | 'safety' | 'weather' | 'traffic';
    severity: 'critical' | 'warning' | 'info';
    message: string;
    suggestion?: string;
  }[];

  timing?: {
    optimalTiming: string;
    peakTimes?: string[];
    avoidTimes?: string[];
    leadTime?: string; // "Book 2-3 weeks early"
    bufferTime?: string; // "Add 30min buffer for traffic"
  };

  // Travel-specific
  weather?: {
    forecast: string;
    temperature?: { high: number; low: number };
    conditions: string;
    advice: string;
    fetchedAt?: Date;
  };

  flights?: {
    priceRange: string;
    optimalBookingWindow: string; // "3-8 weeks before departure"
    cheapestDays?: string[];
    priceAlert?: string;
    airportTiming: {
      arrivalTime: string; // "2 hours before domestic, 3 hours international"
      securityWait: string; // "Expect 30-45min TSA wait"
      parkingTime?: string;
      trafficBuffer: string;
    };
  };

  hotels?: {
    priceRange: string;
    optimalBooking: string;
    cancellationPolicies: string;
    peakSeason?: boolean;
    recommendations: Array<{
      name: string;
      priceRange: string;
      bookingLink?: string;
      cancellationPolicy?: string;
    }>;
  };

  // Restaurant/Dining-specific
  restaurants?: {
    recommendations: Array<{
      name: string;
      cuisine: string;
      priceRange: string;
      reservations: {
        required: boolean;
        recommended: boolean;
        bookingWindow: string; // "2-3 days advance"
        phone?: string;
        bookingLink?: string;
        walkInWait?: string; // "45-60min on weekends"
      };
      dressCode?: string;
      peakTimes?: string[];
    }>;
  };

  // Events-specific
  events?: {
    events: Array<{
      name: string;
      time: string;
      tickets: {
        required: boolean;
        priceRange: string;
        availability: string;
        bookingLink?: string;
        sellingOut?: boolean;
      };
      crowdLevel?: string;
    }>;
  };

  // Transportation-specific
  transportation?: {
    trafficPatterns: {
      current: string;
      expectedAtTime: string;
      peakHours: string[];
      estimatedDuration: string;
      buffer: string;
    };
    parking?: {
      availability: string;
      cost: string;
      recommendations: string;
      fillUpTime?: string; // "Lot fills by 7pm on weekends"
    };
    publicTransit?: {
      options: string[];
      schedule: string;
      cost: string;
      travelTime: string;
    };
  };

  // Interview prep-specific
  interviewPrep?: {
    companyResearch: string[];
    commonQuestions: string[];
    dresscode: string;
    interviewFormat: string;
    timing: {
      arrivalTime: string; // "15min early"
      parkingTime?: string;
      buildingAccessTime?: string;
    };
  };

  // Generic enrichments
  attractions?: {
    top: string[];
    hidden_gems?: string[];
    ticketing?: Record<string, any>;
  };

  packingList?: {
    essentials: string[];
    optional?: string[];
    weatherDependent?: string[];
  };

  localTips?: {
    tips: string[];
    warnings?: string[];
    culturalNotes?: string[];
  };

  [key: string]: any;
}

/**
 * Claude Web Enrichment - Uses Claude's web search tool to fetch
 * real-time data for plan enrichment
 */
export class ClaudeWebEnrichment {

  /**
   * Enrich plan with real-time web data based on domain and slots
   */
  async enrichPlan(
    domain: string,
    slots: Record<string, any>,
    rules: EnrichmentRule[],
    userProfile: User
  ): Promise<EnrichedData> {

    console.log(`[WEB ENRICHMENT] Starting enrichment for ${domain}`);

    // Check if web search is enabled (requires Claude API key)
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('[WEB ENRICHMENT] Claude API key not found, skipping enrichment');
      return {};
    }

    // Build search queries based on domain and slots
    const searchQueries = this.buildSearchQueries(domain, slots, rules, userProfile);

    if (searchQueries.length === 0) {
      console.log('[WEB ENRICHMENT] No applicable search queries, skipping enrichment');
      return {};
    }

    console.log(`[WEB ENRICHMENT] Executing ${searchQueries.length} searches`);

    try {
      const enrichedData = await this.executeWebSearches(domain, searchQueries, slots);
      console.log('[WEB ENRICHMENT] Enrichment complete:', Object.keys(enrichedData));
      return enrichedData;

    } catch (error) {
      console.error('[WEB ENRICHMENT] Error during enrichment:', error);
      return {};
    }
  }

  /**
   * Build search queries from enrichment rules and slots
   */
  private buildSearchQueries(
    domain: string,
    slots: Record<string, any>,
    rules: EnrichmentRule[],
    userProfile: User
  ): string[] {
    const queries: string[] = [];

    for (const rule of rules) {
      // Evaluate condition
      if (this.evaluateCondition(rule.condition, slots)) {
        console.log(`[WEB ENRICHMENT] Condition met: ${rule.condition}`);

        // Add web search queries from rule
        if (rule.web_searches) {
          for (const template of rule.web_searches) {
            const query = this.interpolate(template, slots, userProfile);
            queries.push(query);
          }
        }
      }
    }

    // Add domain-specific default queries if none from rules
    if (queries.length === 0) {
      queries.push(...this.getDefaultQueries(domain, slots));
    }

    return queries;
  }

  /**
   * Execute web searches using Claude's web search tool
   */
  private async executeWebSearches(
    domain: string,
    queries: string[],
    slots: Record<string, any>
  ): Promise<EnrichedData> {

    // Combine all queries into one comprehensive request
    const searchRequest = this.buildComprehensiveSearchRequest(domain, queries, slots);

    console.log('[WEB ENRICHMENT] Sending search request to Claude...');

    try {
      const response = await anthropic.messages.create({
        model: DEFAULT_CLAUDE_MODEL,
        max_tokens: 4096,
        temperature: 0.5,
        tools: [
          {
            type: "web_search_20241222" as any,
            name: "web_search"
          }
        ],
        messages: [{
          role: "user",
          content: searchRequest
        }]
      });

      // Parse Claude's response and extract enriched data
      const responseText = (response.content[0] as any).text;

      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          // If JSON parsing fails, structure the response manually
          return this.structureResponseText(responseText, domain);
        }
      }

      return this.structureResponseText(responseText, domain);

    } catch (error) {
      console.error('[WEB ENRICHMENT] Web search error:', error);
      // Return empty object if search fails
      return {};
    }
  }

  /**
   * Build comprehensive search request for Claude
   */
  private buildComprehensiveSearchRequest(
    domain: string,
    queries: string[],
    slots: Record<string, any>
  ): string {

    const destination = this.getNestedValue(slots, 'location.destination') || 'the destination';
    const dates = this.getNestedValue(slots, 'timing.date') || 'the dates';
    const budget = this.getNestedValue(slots, 'budget.range') || 'the budget';

    let request = `Use web search to gather current, real-world information for ${domain} planning.\n\n`;

    if (domain === 'travel') {
      request += `PLANNING DETAILS:
- Destination: ${destination}
- Dates: ${dates}
- Budget: ${budget}

SEARCH FOR AND PROVIDE (in JSON format):
{
  "weather": {
    "forecast": "Current weather forecast for ${destination} during ${dates}",
    "temperature": {"high": <number>, "low": <number>},
    "conditions": "Brief description",
    "advice": "What to pack/expect",
    "source": "Source URL"
  },
  "events": {
    "events": ["List of events happening during ${dates}"],
    "highlights": "Notable events or festivals",
    "source": "Source URL"
  },
  "flights": {
    "priceRange": "Typical flight price range to ${destination}",
    "cheapestDays": "Best days to fly for savings",
    "bookingAdvice": "When to book for best prices",
    "source": "Source URL"
  },
  "hotels": {
    "budget": "Budget hotel price range per night",
    "midRange": "Mid-range hotel price range",
    "luxury": "Luxury hotel price range",
    "recommendations": ["Recommended areas to stay"],
    "source": "Source URL"
  },
  "attractions": {
    "top": ["Top 5-7 must-see attractions in ${destination}"],
    "hidden_gems": ["Lesser-known but worthwhile spots"],
    "source": "Source URL"
  },
  "restaurants": {
    "recommendations": ["Top-rated restaurants or food experiences"],
    "cuisines": ["Popular local cuisines to try"],
    "priceRanges": ["Price ranges for different dining tiers"],
    "source": "Source URL"
  },
  "localTips": {
    "tips": ["Practical tips for visitors"],
    "warnings": ["Things to avoid or be aware of"],
    "culturalNotes": ["Important cultural customs"],
    "source": "Source URL"
  }
}`;

    } else if (domain === 'fitness') {
      const workoutType = this.getNestedValue(slots, 'workout.type') || 'the workout';
      request += `PLANNING DETAILS:
- Workout Type: ${workoutType}
- Timing: ${dates}

SEARCH FOR AND PROVIDE:
- Best practices for ${workoutType}
- Recommended exercises and routines
- Equipment needed
- Safety tips and form guidelines
- Progression recommendations

Format as structured JSON with sources.`;

    } else if (domain === 'interview_prep') {
      const company = this.getNestedValue(slots, 'company') || 'the company';
      const role = this.getNestedValue(slots, 'role') || 'the role';
      request += `PLANNING DETAILS:
- Company: ${company}
- Role: ${role}

SEARCH FOR AND PROVIDE:
- Recent company news and developments
- Common interview questions for ${role} at ${company}
- Company culture and values
- Technical requirements for ${role}
- Interview process insights

Format as structured JSON with sources.`;

    } else {
      // Generic domain
      request += `Search for relevant information based on these queries:\n${queries.join('\n')}\n\nProvide structured, actionable information with sources.`;
    }

    request += `\n\nIMPORTANT:
- Use web search to get CURRENT, REAL data (not from your training data)
- Include source URLs for verification
- Be specific with numbers, dates, and prices
- Return ONLY valid JSON`;

    return request;
  }

  /**
   * Structure response text into EnrichedData format
   */
  private structureResponseText(text: string, domain: string): EnrichedData {
    // Basic structuring if JSON parsing failed
    return {
      summary: text,
      domain: domain,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get default queries for a domain
   */
  private getDefaultQueries(domain: string, slots: Record<string, any>): string[] {
    const destination = this.getNestedValue(slots, 'location.destination');
    const date = this.getNestedValue(slots, 'timing.date');

    switch (domain) {
      case 'travel':
        if (destination && date) {
          return [
            `weather forecast ${destination} ${date}`,
            `top things to do in ${destination}`,
            `best restaurants ${destination}`
          ];
        }
        return [`popular ${domain} destinations`];

      case 'fitness':
        const workoutType = this.getNestedValue(slots, 'workout.type');
        return workoutType
          ? [`${workoutType} workout guide`, `${workoutType} best practices`]
          : ['effective workout routines'];

      default:
        return [`${domain} planning tips and best practices`];
    }
  }

  /**
   * Evaluate condition string against slots
   */
  private evaluateCondition(condition: string, slots: any): boolean {
    try {
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
      console.error('[WEB ENRICHMENT] Condition evaluation error:', error);
      return false;
    }
  }

  /**
   * Interpolate template string with slot values
   */
  private interpolate(template: string, slots: any, userProfile?: User): string {
    let result = template;

    result = result.replace(/\{([^}]+)\}/g, (_, path) => {
      if (path.startsWith('user.')) {
        const field = path.substring(5);
        return (userProfile as any)?.[field] || path;
      } else {
        return this.getNestedValue(slots, path) || path;
      }
    });

    return result;
  }

  /**
   * Get nested value from object
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
export const claudeWebEnrichment = new ClaudeWebEnrichment();
