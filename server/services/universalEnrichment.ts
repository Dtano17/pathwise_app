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

    // Build temporal context for relative dates
    const temporalContext = this.buildTemporalContext(dates, now);
    const budgetContext = this.buildBudgetContext(budget);

    let request = `🔍 COMPREHENSIVE REAL-TIME PLANNING ENRICHMENT

📅 CURRENT DATE & TIME CONTEXT:
TODAY: ${now.toDateString()} (${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })})
TIME: ${now.toLocaleTimeString()}
CURRENT MONTH: ${now.toLocaleString('en-US', { month: 'long' })} ${now.getFullYear()}
CURRENT SEASON: ${this.getCurrentSeason(now)}

${temporalContext}
${budgetContext}

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
7. WEATHER FORECASTS - Specific temperature, conditions, precipitation for the exact dates and location
8. TRAFFIC PATTERNS - Rush hour times, best/worst times to travel in the specific location
9. BUDGET-AWARE RECOMMENDATIONS - Match accommodation and activity suggestions to user's budget tier

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
- ✅ "Weather: 75°F high, 55°F low, 20% rain chance" NOT "nice weather expected"
- ✅ "Budget hostels $25-45/night, Airbnb $60-90, hotels $120-180" NOT "various price points"
- ✅ "Rush hour 7-9am and 4-7pm adds 45min" NOT "traffic varies"

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
  "accommodation": {
    "budgetTier": "Based on user budget - recommend appropriate tier",
    "recommendedType": "Hotels for $250+/night, Airbnb/boutique for $100-250, hostels/coliving/budget Airbnb for <$100",
    "options": [
      {
        "type": "Hotel/Airbnb/Hostel/Coliving",
        "priceRange": "Specific nightly rates",
        "location": "Neighborhood",
        "pros": ["List specific advantages"],
        "cons": ["List specific drawbacks"],
        "bookingWindow": "How far in advance to book",
        "link": "Booking URL if available"
      }
    ],
    "optimalBooking": "When to book for savings based on dates and destination",
    "cancellationPolicies": "Typical policies for this tier",
    "peakSeason": true/false
  },
  "weather": {
    "forecast": "Specific forecast for destination during travel dates",
    "temperature": {"high": <number>, "low": <number>},
    "conditions": "Description with precipitation chance",
    "advice": "What to pack based on weather",
    "timezone": "Timezone difference if traveling from origin"
  },
  "traffic": {
    "patterns": "Rush hour times and typical traffic in destination",
    "bestTimes": "Best times to travel/explore",
    "avoidTimes": "Times to avoid based on congestion",
    "transportation": "Best local transit options"
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
    const destination = slots?.location?.destination || slots?.location?.city || slots?.location?.venue || '[destination]';
    const origin = slots?.location?.origin || slots?.location?.current || '[origin]';
    const dates = slots?.timing?.date || '[dates]';
    const time = slots?.timing?.time || '';

    const focuses: Record<string, string> = {
      'travel': `🔍 SEARCH FOR THESE SPECIFIC ITEMS:
- Weather forecast for ${destination} during ${dates} (specific temperatures, conditions, rainfall)
- Current flight prices from ${origin} to ${destination} for ${dates}
- Traffic patterns in ${destination} (rush hours, best times to travel)
- Hotel vs Airbnb pricing comparison in ${destination} for ${dates}
- Events/festivals happening in ${destination} during ${dates}
- Time zone differences between ${origin} and ${destination}
- Best times to visit attractions in ${destination} (crowd patterns)
- Local transportation options and costs in ${destination}
- Packing recommendations based on ${destination} weather in ${dates}`,

      'date_night': `🔍 SEARCH FOR THESE SPECIFIC ITEMS:
- Weather forecast for ${destination} on ${dates} at ${time}
- Restaurant reservation requirements in ${destination} (specific booking windows)
- Traffic patterns to ${destination} at ${time} (specific drive times)
- Current wait times for walk-ins at restaurants in ${destination}
- Parking availability and costs near ${destination} at ${time}
- Public transit options to ${destination} at ${time}
- Dress codes for restaurants in ${destination}
- Alternative venues if first choice unavailable in ${destination}`,

      'interview_prep': `🔍 SEARCH FOR THESE SPECIFIC ITEMS:
- Recent news about ${slots?.company || '[company]'} (last 30 days)
- Weather forecast for ${destination} on ${dates} at ${time}
- Traffic to ${destination} at ${time} (specific drive times, rush hour impact)
- Parking options near ${destination} (cost, availability, walking time)
- Public transit routes to ${destination} arriving by ${time}
- Building access/security procedures at ${destination}
- Interview format and process for ${slots?.role || '[role]'} at ${slots?.company || '[company]'}
- Dress code expectations at ${slots?.company || '[company]'}`,

      'fitness': `🔍 SEARCH FOR THESE SPECIFIC ITEMS:
- Gym crowd patterns at ${destination} at ${time} (peak vs off-peak)
- Weather for outdoor workout in ${destination} on ${dates} at ${time}
- Form and safety guidelines for ${slots?.workout?.type || slots?.preferences?.type || '[workout type]'}
- Equipment availability at popular times at ${destination}
- Progression recommendations for ${slots?.experience || '[experience level]'} level`,
    };

    return focuses[domain] || `🔍 SEARCH FOR THESE SPECIFIC ITEMS:
- Relevant current information for ${destination} on ${dates}
- Weather forecast for ${destination} during ${dates}
- Traffic patterns in ${destination} at ${time}
- Timing and availability details
- Cost considerations specific to ${destination}
- Safety or logistical factors`;
  }

  /**
   * Build temporal context - converts relative dates to absolute
   */
  private buildTemporalContext(dates: string, now: Date): string {
    if (!dates) return '';

    const lowerDates = dates.toLowerCase();
    let temporalInfo = `\n🕐 TEMPORAL CONTEXT FOR "${dates}":\n`;

    // Parse relative dates
    if (lowerDates.includes('tomorrow')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      temporalInfo += `- "tomorrow" = ${tomorrow.toDateString()}\n`;
    } else if (lowerDates.includes('next week')) {
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      temporalInfo += `- "next week" = Week of ${nextWeek.toDateString()}\n`;
    } else if (lowerDates.includes('next month')) {
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      temporalInfo += `- "next month" = ${nextMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}\n`;
    } else if (lowerDates.includes('next year')) {
      const nextYear = new Date(now);
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      temporalInfo += `- "next year" = ${nextYear.getFullYear()}\n`;
    } else if (lowerDates.includes('next weekend')) {
      const daysUntilFriday = (5 - now.getDay() + 7) % 7;
      const nextFriday = new Date(now);
      nextFriday.setDate(nextFriday.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
      temporalInfo += `- "next weekend" = ${nextFriday.toDateString()} - ${new Date(nextFriday.getTime() + 2 * 24 * 60 * 60 * 1000).toDateString()}\n`;
    }

    // Add season/holiday awareness
    const month = now.getMonth();
    if (month === 11 || month === 0) {
      temporalInfo += `- ⚠️ PEAK HOLIDAY SEASON (Dec-Jan): Expect higher prices, limited availability, more crowds\n`;
    } else if (month >= 5 && month <= 7) {
      temporalInfo += `- ☀️ SUMMER SEASON: Peak travel time, book early for best prices\n`;
    }

    return temporalInfo;
  }

  /**
   * Build budget context - provides budget tier and recommendations
   */
  private buildBudgetContext(budget: string): string {
    if (!budget || budget.toLowerCase().includes('flexible')) {
      return '\n💰 BUDGET CONTEXT: Flexible budget - provide options across price ranges\n';
    }

    // Extract numeric budget
    const budgetMatch = budget.match(/\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (!budgetMatch) {
      return `\n💰 BUDGET CONTEXT: ${budget}\n`;
    }

    const amount = parseInt(budgetMatch[1].replace(/,/g, ''));
    let tier = '';
    let recommendations = '';

    // Budget tiers (assuming per night for accommodation)
    if (amount < 100) {
      tier = 'BUDGET-CONSCIOUS';
      recommendations = `
- Prioritize: Airbnb, hostels, budget hotels, coliving spaces
- Avoid: Luxury hotels, high-end restaurants
- Focus: Free/cheap activities, public transit, meal prep options`;
    } else if (amount < 250) {
      tier = 'MID-RANGE';
      recommendations = `
- Good fit: 3-star hotels, mid-range Airbnb, boutique stays
- Balance: Some nice dining, mix of activities
- Options: Mix of paid attractions and free experiences`;
    } else {
      tier = 'PREMIUM/LUXURY';
      recommendations = `
- Recommended: 4-5 star hotels, luxury Airbnb, resorts
- Include: Fine dining, premium experiences, private tours
- Priority: Quality and convenience over cost`;
    }

    return `\n💰 BUDGET CONTEXT: ${budget} (${tier})${recommendations}\n`;
  }

  /**
   * Get current season for context
   */
  private getCurrentSeason(now: Date): string {
    const month = now.getMonth();
    if (month >= 2 && month <= 4) return 'Spring';
    if (month >= 5 && month <= 7) return 'Summer';
    if (month >= 8 && month <= 10) return 'Fall';
    return 'Winter';
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
