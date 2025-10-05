import Anthropic from "@anthropic-ai/sdk";
import type { User } from '@shared/schema';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const CLAUDE_SONNET = "claude-sonnet-4-20250514";

export interface UniversalEnrichedData {
  fetchedAt: Date;
  expiresAt: Date;
  domain: string;

  // Universal critical actions
  criticalActions: {
    action: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    deadline?: string;
    reason: string;
    link?: string;
  }[];

  // Universal warnings
  warnings: {
    type: 'timing' | 'cost' | 'availability' | 'safety' | 'weather' | 'traffic';
    severity: 'critical' | 'warning' | 'info';
    message: string;
    suggestion?: string;
  }[];

  // Universal timing guidance
  timing: {
    optimalTiming: string;
    peakTimes?: string[];
    avoidTimes?: string[];
    leadTime?: string;
    bufferTime?: string;
  };

  // Domain-specific data (dynamically populated)
  [key: string]: any;
}

/**
 * Universal Enrichment Service
 * Provides comprehensive, actionable, real-time information for ANY domain
 * with critical details like reservations, timing, traffic, costs, etc.
 */
export class UniversalEnrichment {

  /**
   * Enrich plan with comprehensive real-time data
   */
  async enrichPlan(
    domain: string,
    slots: Record<string, any>,
    userProfile: User
  ): Promise<UniversalEnrichedData> {

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6 hours default

    console.log(`[UNIVERSAL ENRICHMENT] Enriching ${domain} plan...`);

    // Build comprehensive search request
    const searchRequest = this.buildUniversalSearchRequest(domain, slots, userProfile, now);

    try {
      const response = await anthropic.messages.create({
        model: CLAUDE_SONNET,
        max_tokens: 4096,
        temperature: 0.5,
        tools: [{
          type: "web_search_20241222" as any,
          name: "web_search"
        }],
        messages: [{
          role: "user",
          content: searchRequest
        }]
      });

      const responseText = (response.content[0] as any).text;

      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const enrichedData = JSON.parse(jsonMatch[0]);
        enrichedData.fetchedAt = now;
        enrichedData.expiresAt = expiresAt;
        return enrichedData;
      }

      // Fallback if no JSON found
      return this.createFallbackEnrichment(domain, now, expiresAt);

    } catch (error) {
      console.error('[UNIVERSAL ENRICHMENT] Error:', error);
      return this.createFallbackEnrichment(domain, now, expiresAt);
    }
  }

  /**
   * Build universal search request that works for ANY domain
   */
  private buildUniversalSearchRequest(
    domain: string,
    slots: Record<string, any>,
    userProfile: User,
    now: Date
  ): string {

    const fetchedAt = now.toISOString();

    // Extract common slot values
    const destination = slots?.location?.destination || slots?.location?.city || slots?.location?.venue || '';
    const origin = slots?.location?.origin || slots?.location?.current || userProfile.location || '';
    const dates = slots?.timing?.date || slots?.timing?.time || '';
    const budget = slots?.budget?.range || slots?.budget?.perPerson || slots?.budget || '';

    let request = `🔍 COMPREHENSIVE REAL-TIME PLANNING ENRICHMENT

TODAY: ${now.toDateString()}
TIME: ${now.toLocaleTimeString()}
DOMAIN: ${domain}

${this.getDomainSpecificContext(domain, slots)}

🎯 YOUR MISSION:
Use web search to provide ACTIONABLE, SPECIFIC, CURRENT information that helps the user execute this plan successfully.

⚠️ CRITICAL REQUIREMENTS:
1. IDENTIFY URGENT ACTIONS - Things that MUST be done NOW (reservations, bookings, tickets)
2. PROVIDE SPECIFIC TIMING - Exact times, not "arrive early" (say "arrive 2.5 hours before flight")
3. CALCULATE BUFFERS - Traffic delays, wait times, security lines (with current data)
4. FLAG AVAILABILITY ISSUES - Sold out? Requires reservation? Limited spots?
5. WARN ABOUT COSTS - Hidden fees, surge pricing, optimal booking windows
6. INCLUDE ACTIONABLE LINKS - Phone numbers, booking URLs, reservation systems

📋 RETURN THIS EXACT JSON STRUCTURE:
{
  "domain": "${domain}",
  "fetchedAt": "${fetchedAt}",

  "criticalActions": [
    {
      "action": "SPECIFIC ACTION USER MUST TAKE",
      "priority": "urgent",
      "deadline": "WHEN (be specific: 'within 24 hours', 'before Friday 5pm')",
      "reason": "WHY it's critical with consequences if not done",
      "link": "Phone number or URL to take action"
    }
  ],

  "warnings": [
    {
      "type": "timing|cost|availability|safety|weather|traffic",
      "severity": "critical|warning|info",
      "message": "WHAT user needs to know (be specific)",
      "suggestion": "WHAT to do about it (actionable)"
    }
  ],

  "timing": {
    "optimalTiming": "Best time/window for this activity with reasoning",
    "peakTimes": ["Specific busy times with impact"],
    "avoidTimes": ["Times to avoid with reasoning"],
    "leadTime": "How far ahead to book/plan (e.g., '2-3 weeks for best prices')",
    "bufferTime": "Extra time needed (e.g., 'add 45min for airport security + traffic')"
  },

  ${this.getDomainSpecificFields(domain)}
}

🔍 SEARCH FOCUS AREAS:
${this.getSearchFocusAreas(domain, slots)}

📏 QUALITY STANDARDS:
- ✅ "Arrive 2.5 hours before domestic flight" NOT "arrive early"
- ✅ "Expect 30-45min TSA wait at peak" NOT "security takes time"
- ✅ "Book 3-8 weeks out for $200 savings" NOT "book in advance"
- ✅ "Restaurant requires reservation 2-3 days ahead" NOT "reservations recommended"
- ✅ "Traffic adds 30min during rush hour" NOT "check traffic"
- ✅ "$450-750 round trip currently" NOT "moderate prices"

RETURN ONLY VALID JSON (no markdown, no code blocks, just raw JSON).`;

    return request;
  }

  /**
   * Get domain-specific context
   */
  private getDomainSpecificContext(domain: string, slots: Record<string, any>): string {
    const contexts: Record<string, string> = {
      'travel': `TRAVEL DETAILS:
- Destination: ${slots?.location?.destination || 'TBD'}
- Dates: ${slots?.timing?.date || 'TBD'}
- Budget: ${slots?.budget?.range || 'TBD'}
- Departing from: ${slots?.location?.origin || 'TBD'}`,

      'date_night': `DATE NIGHT DETAILS:
- Location/Venue: ${slots?.location?.venue || slots?.location?.city || 'TBD'}
- Time: ${slots?.timing?.time || 'TBD'}
- Date: ${slots?.timing?.date || 'TBD'}
- Budget per person: ${slots?.budget?.perPerson || 'TBD'}`,

      'interview_prep': `INTERVIEW DETAILS:
- Company: ${slots?.company || 'TBD'}
- Role: ${slots?.role || 'TBD'}
- Interview Date: ${slots?.timing?.date || 'TBD'}
- Location: ${slots?.location || 'TBD'}`,

      'fitness': `FITNESS DETAILS:
- Workout Type: ${slots?.workout?.type || slots?.preferences?.type || 'TBD'}
- Goal: ${slots?.goal || 'TBD'}
- Experience Level: ${slots?.experience || 'TBD'}`,
    };

    return contexts[domain] || `PLANNING DETAILS:\n${JSON.stringify(slots, null, 2)}`;
  }

  /**
   * Get domain-specific JSON fields to include
   */
  private getDomainSpecificFields(domain: string): string {
    const fields: Record<string, string> = {
      'travel': `"flights": {
    "priceRange": "Current price range with specific numbers",
    "optimalBookingWindow": "3-8 weeks before = optimal / current status",
    "cheapestDays": ["Tuesday/Wednesday departures save $80-120"],
    "priceAlert": "Current vs average pricing",
    "airportTiming": {
      "arrivalTime": "2-2.5 hours domestic, 3 hours international",
      "securityWait": "Current TSA wait times at this airport",
      "parkingTime": "15-20min for parking + shuttle",
      "trafficBuffer": "30-45min rush hour buffer to airport"
    }
  },
  "hotels": {
    "priceRange": "Specific nightly rates by tier",
    "optimalBooking": "When to book for savings",
    "cancellationPolicies": "Typical policies",
    "peakSeason": true/false
  },
  "weather": {
    "forecast": "Specific forecast for dates",
    "temperature": {"high": <number>, "low": <number>},
    "conditions": "Description",
    "advice": "What to pack"
  }`,

      'date_night': `"restaurants": {
    "recommendations": [
      {
        "name": "Restaurant name",
        "cuisine": "Type",
        "priceRange": "$40-60 per person",
        "reservations": {
          "required": true/false,
          "recommended": true/false,
          "bookingWindow": "2-3 days advance for weekends",
          "phone": "(XXX) XXX-XXXX",
          "bookingLink": "OpenTable or Resy link",
          "walkInWait": "60-90min weekend peak times"
        },
        "dressCode": "Specific dress code",
        "peakTimes": ["6-8pm Friday/Saturday"]
      }
    ]
  },
  "transportation": {
    "trafficPatterns": {
      "expectedAtTime": "Traffic level at planned time",
      "estimatedDuration": "20min normal, 40min peak",
      "buffer": "Leave 40min early vs 20min"
    },
    "parking": {
      "availability": "Street parking status",
      "cost": "$15-25 garage, $30 valet",
      "fillUpTime": "Lots fill by 6:30pm weekends"
    }
  }`,

      'interview_prep': `"interviewPrep": {
    "companyResearch": ["Recent news", "Products", "Culture"],
    "commonQuestions": ["Top interview questions for this role"],
    "dresscode": "Specific dress code for this company",
    "interviewFormat": "Typical process stages",
    "timing": {
      "arrivalTime": "15 minutes early (not more, not less)",
      "parkingTime": "10-15min to park + walk",
      "buildingAccessTime": "5-10min security/checkin"
    }
  }`,

      'fitness': `"fitnessGuidance": {
    "optimalSchedule": "Frequency and timing",
    "gymCrowdTimes": ["Peak hours to avoid"],
    "formGuidance": ["Critical safety points"],
    "progressionPlan": "How to advance safely"
  }`,
    };

    return fields[domain] || `"domainSpecific": {
    "guidance": ["Relevant tips and information"],
    "resources": ["Helpful links or contacts"]
  }`;
  }

  /**
   * Get search focus areas by domain
   */
  private getSearchFocusAreas(domain: string, slots: Record<string, any>): string {
    const focuses: Record<string, string> = {
      'travel': `- Current flight prices and optimal booking window
- Hotel availability and pricing trends
- Weather forecast for destination during travel dates
- Airport security wait times and traffic patterns
- Events/festivals happening during dates
- Packing recommendations based on weather`,

      'date_night': `- Restaurant reservation requirements and booking windows
- Current wait times for walk-ins
- Traffic patterns at planned time
- Parking availability and costs
- Dress codes
- Alternative venues if first choice unavailable`,

      'interview_prep': `- Recent company news and developments
- Interview format and process for this company
- Traffic to interview location at interview time
- Parking options and timing
- Building access/security procedures
- Dress code expectations`,

      'fitness': `- Gym crowd patterns (peak vs off-peak)
- Form and safety guidelines for this workout type
- Equipment availability at popular times
- Progression recommendations for experience level`,
    };

    return focuses[domain] || `- Relevant current information for ${domain}
- Timing and availability details
- Cost considerations
- Safety or logistical factors`;
  }

  /**
   * Create fallback enrichment if web search fails
   */
  private createFallbackEnrichment(domain: string, now: Date, expiresAt: Date): UniversalEnrichedData {
    return {
      fetchedAt: now,
      expiresAt,
      domain,
      criticalActions: [],
      warnings: [{
        type: 'availability',
        severity: 'warning',
        message: 'Unable to fetch real-time data. Recommendations may not reflect current conditions.',
        suggestion: 'Verify availability and timing independently before proceeding.'
      }],
      timing: {
        optimalTiming: 'Plan ahead and verify details before committing'
      }
    };
  }
}

// Export singleton
export const universalEnrichment = new UniversalEnrichment();
