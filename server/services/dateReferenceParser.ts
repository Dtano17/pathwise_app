/**
 * Date Reference Parser
 *
 * Detects whether a user's goal/message refers to today or a future date.
 * Used to determine if today's theme should influence the planning.
 */

export interface DateReference {
  isTodayPlan: boolean;
  confidence: 'high' | 'medium' | 'low';
  matchedPhrase: string | null;
}

/**
 * Parse user message to detect date references
 *
 * @param text - User's goal or message text
 * @param userTimezone - User's timezone (optional, for future enhancement)
 * @returns DateReference indicating if this is a today plan
 */
export function parseDateReference(text: string, userTimezone?: string): DateReference {
  const lowerText = text.toLowerCase();

  // Explicit FUTURE date patterns - DO NOT apply today's theme
  const futurePatterns = [
    { pattern: /\btomorrow\b/, phrase: 'tomorrow' },
    { pattern: /\bnext\s+(week|month|year)\b/, phrase: 'next week/month/year' },
    { pattern: /\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/, phrase: 'next [weekday]' },
    { pattern: /\bthis\s+coming\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/, phrase: 'this coming [weekday]' },
    { pattern: /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(st|nd|rd|th)?\b/i, phrase: 'specific date' },
    { pattern: /\b\d{1,2}(st|nd|rd|th)?\s+(of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)\b/i, phrase: 'specific date' },
    { pattern: /\bin\s+(\d+|a|an)\s+(day|days|week|weeks|month|months)\b/, phrase: 'in X days/weeks' },
    { pattern: /\b(\d+|a|an)\s+(day|days|week|weeks|month|months)\s+from\s+now\b/, phrase: 'X days from now' },
    { pattern: /\bupcoming\s+(weekend|week|month)\b/, phrase: 'upcoming' },
    { pattern: /\bfor\s+the\s+weekend\b/, phrase: 'for the weekend' },
    { pattern: /\b(this|next)\s+weekend\b/, phrase: 'this/next weekend' },
  ];

  // Explicit TODAY patterns - APPLY today's theme
  const todayPatterns = [
    { pattern: /\btoday\b/, phrase: 'today' },
    { pattern: /\btonight\b/, phrase: 'tonight' },
    { pattern: /\bthis\s+evening\b/, phrase: 'this evening' },
    { pattern: /\bthis\s+morning\b/, phrase: 'this morning' },
    { pattern: /\bthis\s+afternoon\b/, phrase: 'this afternoon' },
    { pattern: /\bright\s+now\b/, phrase: 'right now' },
    { pattern: /\blater\s+today\b/, phrase: 'later today' },
    { pattern: /\brest\s+of\s+(the\s+)?day\b/, phrase: 'rest of day' },
    { pattern: /\bmy\s+day\b/, phrase: 'my day' },
    { pattern: /\bfor\s+today\b/, phrase: 'for today' },
  ];

  // Check for explicit future references first (higher priority)
  for (const { pattern, phrase } of futurePatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      // Special case: "this weekend" depends on current day
      if (phrase === 'this/next weekend') {
        const today = new Date().getDay();
        // If today is Saturday (6) or Sunday (0), "this weekend" means today
        if (today === 0 || today === 6) {
          return {
            isTodayPlan: true,
            confidence: 'medium',
            matchedPhrase: match[0]
          };
        }
      }

      return {
        isTodayPlan: false,
        confidence: 'high',
        matchedPhrase: match[0]
      };
    }
  }

  // Check for explicit today references
  for (const { pattern, phrase } of todayPatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      return {
        isTodayPlan: true,
        confidence: 'high',
        matchedPhrase: match[0]
      };
    }
  }

  // No date mentioned = default to today (theme applies)
  // Low confidence because we're assuming
  return {
    isTodayPlan: true,
    confidence: 'low',
    matchedPhrase: null
  };
}

/**
 * Check if the parsed date reference indicates theme should be applied
 *
 * @param dateRef - Parsed date reference
 * @returns true if today's theme should influence the plan
 */
export function shouldApplyTheme(dateRef: DateReference): boolean {
  return dateRef.isTodayPlan;
}
