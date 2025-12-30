/**
 * Transcript Filter Service
 *
 * Classifies and filters content from social media transcripts/OCR.
 * Separates actionable information (venues, prices, addresses) from
 * noise (music lyrics, promotional content, filler words).
 *
 * Also detects content type and weights sources appropriately:
 * - Cooking tutorial: audio is primary
 * - Restaurant review: audio + visual OCR
 * - Travel vlog: visual OCR is primary
 * - Recipe: visual OCR for ingredients
 */

import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// TYPES
// ============================================================================

export interface TranscriptSegment {
  text: string;
  source: 'audio' | 'ocr' | 'caption';
  timestamp?: number;
  frameIndex?: number;
}

export interface ExtractedEntity {
  type: 'venue' | 'price' | 'address' | 'phone' | 'hours' | 'tip' | 'date';
  value: string;
  raw: string;
  confidence: number;
}

export interface ClassifiedSegment {
  text: string;
  source: 'audio' | 'ocr' | 'caption';
  classification: 'actionable' | 'context' | 'promotional' | 'noise';
  confidence: number;
  entities: ExtractedEntity[];
}

export type ContentType =
  | 'cooking_tutorial'
  | 'restaurant_review'
  | 'travel_vlog'
  | 'recipe'
  | 'product_review'
  | 'fitness_routine'
  | 'shopping_haul'
  | 'other';

export interface ContentTypeWeights {
  contentType: ContentType;
  weights: {
    audio: number;
    ocr: number;
    caption: number;
  };
}

export interface FilteredContent {
  actionableContent: string;
  contextContent: string;
  entities: ExtractedEntity[];
  contentType: ContentType;
  sourceWeights: ContentTypeWeights;
  summary: string;
  rawWordCount: number;
  filteredWordCount: number;
}

export interface SocialMediaInput {
  platform: string;
  url: string;
  audioTranscript?: string;
  ocrText?: string;
  caption?: string;
  cached?: boolean;
}

// ============================================================================
// CONTENT TYPE WEIGHTS
// ============================================================================

const CONTENT_TYPE_WEIGHTS: Record<ContentType, { audio: number; ocr: number; caption: number }> = {
  cooking_tutorial: { audio: 0.9, ocr: 0.6, caption: 0.3 },
  restaurant_review: { audio: 0.7, ocr: 0.8, caption: 0.5 },
  travel_vlog: { audio: 0.4, ocr: 0.9, caption: 0.6 },
  recipe: { audio: 0.3, ocr: 0.95, caption: 0.2 },
  product_review: { audio: 0.8, ocr: 0.5, caption: 0.7 },
  fitness_routine: { audio: 0.7, ocr: 0.6, caption: 0.4 },
  shopping_haul: { audio: 0.6, ocr: 0.8, caption: 0.5 },
  other: { audio: 0.5, ocr: 0.5, caption: 0.5 }
};

// ============================================================================
// ENTITY EXTRACTION PATTERNS
// ============================================================================

// Price patterns for multiple currencies
const PRICE_PATTERNS = [
  /\$[\d,]+(?:\.\d{2})?(?:\s*-\s*\$[\d,]+(?:\.\d{2})?)?/gi,  // USD: $15, $15.00, $15-$20
  /₦[\d,]+(?:\s*-\s*₦[\d,]+)?/gi,  // Nigerian Naira
  /€[\d,]+(?:\.\d{2})?/gi,  // Euro
  /£[\d,]+(?:\.\d{2})?/gi,  // GBP
  /\d+\s*(?:dollars?|bucks?|usd)/gi,  // "15 dollars"
  /(?:around|about|roughly)\s*\$?\d+/gi,  // "around $15"
];

// Address patterns
const ADDRESS_PATTERNS = [
  /\d+\s+[\w\s]+(?:street|st|avenue|ave|boulevard|blvd|road|rd|drive|dr|lane|ln|way|place|pl)\b/gi,
  /(?:located|at|on)\s+[\w\s]+(?:street|st|avenue|ave|boulevard|blvd)/gi,
];

// Phone patterns
const PHONE_PATTERNS = [
  /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,  // US format
  /\+\d{1,3}[-.\s]?\d{3,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g,  // International
];

// Hours patterns
const HOURS_PATTERNS = [
  /(?:open|hours?|from)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:to|-)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?/gi,
  /\d{1,2}(?::\d{2})?\s*(?:am|pm)\s*(?:to|-)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)/gi,
];

// Promotional/noise indicators
const PROMOTIONAL_PATTERNS = [
  /link\s+in\s+(?:my\s+)?bio/gi,
  /follow\s+(?:me|us)\s+(?:on|for|@)/gi,
  /like\s+and\s+subscribe/gi,
  /use\s+(?:my\s+)?(?:code|coupon)\s+\w+/gi,
  /\d+%\s*off\s+(?:with|using)/gi,
  /sponsored\s+(?:by|post|content)/gi,
  /ad\s*[#@]|#ad\b|#sponsored/gi,
  /check\s+out\s+(?:my|the)\s+link/gi,
];

const NOISE_PATTERNS = [
  /(?:la\s+){2,}/gi,  // Music lyrics "la la la"
  /(?:na\s+){2,}/gi,
  /(?:oh\s+){2,}/gi,
  /baby\s+baby/gi,
  /^(?:um+|uh+|like|so|yeah|okay|right)\s*$/gi,
];

// ============================================================================
// SERVICE CLASS
// ============================================================================

class TranscriptFilterService {
  private anthropic: Anthropic | null = null;

  constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
    }
  }

  /**
   * Main entry point: Filter and weight content from social media
   */
  async filterAndWeightContent(input: SocialMediaInput): Promise<FilteredContent> {
    console.log(`[TRANSCRIPT_FILTER] Processing ${input.platform} content`);

    // Build segments from input
    const segments = this.buildSegments(input);

    if (segments.length === 0) {
      return this.createEmptyResult();
    }

    // Calculate raw word count
    const rawWordCount = segments.reduce((acc, seg) =>
      acc + (seg.text?.split(/\s+/).length || 0), 0);

    // Detect content type
    const contentTypeResult = await this.detectContentType(segments);

    // Classify segments
    const classifiedSegments = await this.classifySegments(segments, contentTypeResult.contentType);

    // Extract entities from actionable segments
    const actionableSegments = classifiedSegments.filter(s => s.classification === 'actionable');
    const contextSegments = classifiedSegments.filter(s => s.classification === 'context');

    // Combine all entities
    const allEntities = actionableSegments.flatMap(s => s.entities);
    const uniqueEntities = this.deduplicateEntities(allEntities);

    // Weight content based on content type
    const weightedActionable = this.weightContent(actionableSegments, contentTypeResult);
    const weightedContext = this.weightContent(contextSegments, contentTypeResult);

    const filteredWordCount = weightedActionable.split(/\s+/).length +
                              weightedContext.split(/\s+/).length;

    // Generate summary
    const summary = this.generateSummary(uniqueEntities, contentTypeResult.contentType);

    console.log(`[TRANSCRIPT_FILTER] Filtered ${rawWordCount} -> ${filteredWordCount} words, found ${uniqueEntities.length} entities`);

    return {
      actionableContent: weightedActionable,
      contextContent: weightedContext,
      entities: uniqueEntities,
      contentType: contentTypeResult.contentType,
      sourceWeights: contentTypeResult,
      summary,
      rawWordCount,
      filteredWordCount
    };
  }

  /**
   * Build TranscriptSegments from raw input
   */
  private buildSegments(input: SocialMediaInput): TranscriptSegment[] {
    const segments: TranscriptSegment[] = [];

    if (input.audioTranscript?.trim()) {
      segments.push({
        text: input.audioTranscript.trim(),
        source: 'audio'
      });
    }

    if (input.ocrText?.trim()) {
      segments.push({
        text: input.ocrText.trim(),
        source: 'ocr'
      });
    }

    if (input.caption?.trim()) {
      segments.push({
        text: input.caption.trim(),
        source: 'caption'
      });
    }

    return segments;
  }

  /**
   * Detect content type from segments
   */
  async detectContentType(segments: TranscriptSegment[]): Promise<ContentTypeWeights> {
    const combinedText = segments.map(s => s.text).join(' ').toLowerCase();

    // Simple keyword-based detection first
    if (/recipe|ingredient|cook|bake|stir|chop|heat|oven|pan|tablespoon|teaspoon|cup/i.test(combinedText)) {
      if (/step\s*\d|first|then|next|finally/.test(combinedText)) {
        return { contentType: 'cooking_tutorial', weights: CONTENT_TYPE_WEIGHTS.cooking_tutorial };
      }
      return { contentType: 'recipe', weights: CONTENT_TYPE_WEIGHTS.recipe };
    }

    if (/restaurant|cafe|bar|food|dish|order|menu|waiter|service|ambiance|taste|flavor/i.test(combinedText)) {
      return { contentType: 'restaurant_review', weights: CONTENT_TYPE_WEIGHTS.restaurant_review };
    }

    if (/travel|trip|visit|destination|hotel|flight|explore|tour|vacation|itinerary/i.test(combinedText)) {
      return { contentType: 'travel_vlog', weights: CONTENT_TYPE_WEIGHTS.travel_vlog };
    }

    if (/workout|exercise|gym|fitness|rep|set|squat|push|pull|cardio|muscle/i.test(combinedText)) {
      return { contentType: 'fitness_routine', weights: CONTENT_TYPE_WEIGHTS.fitness_routine };
    }

    if (/haul|bought|purchase|shop|store|try on|unbox|review|product/i.test(combinedText)) {
      if (/recommend|worth|quality|pro|con/.test(combinedText)) {
        return { contentType: 'product_review', weights: CONTENT_TYPE_WEIGHTS.product_review };
      }
      return { contentType: 'shopping_haul', weights: CONTENT_TYPE_WEIGHTS.shopping_haul };
    }

    return { contentType: 'other', weights: CONTENT_TYPE_WEIGHTS.other };
  }

  /**
   * Classify segments as actionable/context/promotional/noise
   */
  async classifySegments(
    segments: TranscriptSegment[],
    contentType: ContentType
  ): Promise<ClassifiedSegment[]> {
    const classifiedSegments: ClassifiedSegment[] = [];

    for (const segment of segments) {
      // Split into sentences for more granular classification
      const sentences = this.splitIntoSentences(segment.text);

      for (const sentence of sentences) {
        if (!sentence.trim()) continue;

        const classification = this.classifySentence(sentence);
        const entities = classification === 'actionable'
          ? this.extractEntitiesFromText(sentence)
          : [];

        classifiedSegments.push({
          text: sentence,
          source: segment.source,
          classification,
          confidence: 0.8, // Default confidence
          entities
        });
      }
    }

    return classifiedSegments;
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Split on sentence boundaries, but be careful with abbreviations
    return text
      .split(/(?<=[.!?])\s+/)
      .filter(s => s.trim().length > 0);
  }

  /**
   * Classify a single sentence
   */
  private classifySentence(sentence: string): 'actionable' | 'context' | 'promotional' | 'noise' {
    const lowerSentence = sentence.toLowerCase();

    // Check for promotional content first
    for (const pattern of PROMOTIONAL_PATTERNS) {
      if (pattern.test(sentence)) {
        return 'promotional';
      }
    }

    // Check for noise (music lyrics, filler words)
    for (const pattern of NOISE_PATTERNS) {
      if (pattern.test(sentence)) {
        return 'noise';
      }
    }

    // Check for actionable content (has specific entities)
    const hasPrice = PRICE_PATTERNS.some(p => p.test(sentence));
    const hasAddress = ADDRESS_PATTERNS.some(p => p.test(sentence));
    const hasPhone = PHONE_PATTERNS.some(p => p.test(sentence));
    const hasHours = HOURS_PATTERNS.some(p => p.test(sentence));

    // Check for venue/place mentions
    const hasVenueMention = /(?:called|named|at|visit|try|recommend|go to|check out)\s+[A-Z][\w\s']+/i.test(sentence);

    // Check for specific recommendations
    const hasRecommendation = /(?:must try|best|favorite|recommend|worth|amazing|incredible|delicious)/i.test(lowerSentence);

    // Check for tips
    const hasTip = /(?:tip|pro tip|advice|make sure|don't forget|remember to)/i.test(lowerSentence);

    if (hasPrice || hasAddress || hasPhone || hasHours || hasVenueMention || hasTip) {
      return 'actionable';
    }

    if (hasRecommendation) {
      return 'actionable';
    }

    // Default to context
    return 'context';
  }

  /**
   * Extract entities from text using regex patterns
   */
  private extractEntitiesFromText(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    // Extract prices
    for (const pattern of PRICE_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          entities.push({
            type: 'price',
            value: match.trim(),
            raw: match,
            confidence: 0.9
          });
        }
      }
    }

    // Extract addresses
    for (const pattern of ADDRESS_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          entities.push({
            type: 'address',
            value: match.replace(/^(?:located|at|on)\s+/i, '').trim(),
            raw: match,
            confidence: 0.85
          });
        }
      }
    }

    // Extract phone numbers
    for (const pattern of PHONE_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          entities.push({
            type: 'phone',
            value: match.trim(),
            raw: match,
            confidence: 0.95
          });
        }
      }
    }

    // Extract hours
    for (const pattern of HOURS_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          entities.push({
            type: 'hours',
            value: match.trim(),
            raw: match,
            confidence: 0.85
          });
        }
      }
    }

    // Extract venue names (pattern: "called X", "named X", "at X")
    const venuePatterns = [
      /(?:called|named)\s+["']?([A-Z][\w\s'&-]+)["']?/gi,
      /(?:at|visit|try)\s+["']?([A-Z][\w\s'&-]{2,30})["']?(?:\s+(?:restaurant|cafe|bar|hotel|resort))?/gi,
      /([A-Z][\w\s'&-]+)\s+(?:restaurant|cafe|bar|hotel|resort)/gi,
    ];

    for (const pattern of venuePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const venueName = match[1]?.trim();
        if (venueName && venueName.length > 2 && venueName.length < 50) {
          entities.push({
            type: 'venue',
            value: venueName,
            raw: match[0],
            confidence: 0.8
          });
        }
      }
    }

    // Extract tips
    const tipPattern = /(?:tip|pro tip|advice):\s*([^.!?]+[.!?]?)/gi;
    let tipMatch;
    while ((tipMatch = tipPattern.exec(text)) !== null) {
      entities.push({
        type: 'tip',
        value: tipMatch[1]?.trim() || '',
        raw: tipMatch[0],
        confidence: 0.85
      });
    }

    return entities;
  }

  /**
   * Deduplicate entities by value
   */
  private deduplicateEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
    const seen = new Map<string, ExtractedEntity>();

    for (const entity of entities) {
      const key = `${entity.type}:${entity.value.toLowerCase()}`;
      const existing = seen.get(key);

      if (!existing || entity.confidence > existing.confidence) {
        seen.set(key, entity);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Weight content based on content type
   */
  private weightContent(
    segments: ClassifiedSegment[],
    weights: ContentTypeWeights
  ): string {
    // Sort segments by weight
    const weightedSegments = segments.map(seg => ({
      ...seg,
      weight: weights.weights[seg.source]
    })).sort((a, b) => b.weight - a.weight);

    // Combine with high-weight content first
    return weightedSegments
      .filter(seg => seg.weight >= 0.5) // Only include if weight is significant
      .map(seg => seg.text)
      .join(' ');
  }

  /**
   * Generate a summary of extracted entities
   */
  private generateSummary(entities: ExtractedEntity[], contentType: ContentType): string {
    const venues = entities.filter(e => e.type === 'venue').map(e => e.value);
    const prices = entities.filter(e => e.type === 'price').map(e => e.value);
    const tips = entities.filter(e => e.type === 'tip').map(e => e.value);

    const parts: string[] = [];

    if (venues.length > 0) {
      parts.push(`Venues: ${venues.slice(0, 3).join(', ')}`);
    }
    if (prices.length > 0) {
      parts.push(`Prices: ${prices.slice(0, 3).join(', ')}`);
    }
    if (tips.length > 0) {
      parts.push(`Tips: ${tips.length} found`);
    }

    if (parts.length === 0) {
      return `${contentType} content with no specific entities extracted`;
    }

    return parts.join(' | ');
  }

  /**
   * Create empty result when no content available
   */
  private createEmptyResult(): FilteredContent {
    return {
      actionableContent: '',
      contextContent: '',
      entities: [],
      contentType: 'other',
      sourceWeights: { contentType: 'other', weights: CONTENT_TYPE_WEIGHTS.other },
      summary: 'No content available',
      rawWordCount: 0,
      filteredWordCount: 0
    };
  }

  /**
   * Use AI to classify content when regex-based classification is uncertain
   * This is more expensive but more accurate for complex content
   */
  async classifyWithAI(text: string): Promise<{
    classification: 'actionable' | 'context' | 'promotional' | 'noise';
    entities: ExtractedEntity[];
    confidence: number;
  }> {
    if (!this.anthropic) {
      // Fall back to regex-based classification
      const classification = this.classifySentence(text);
      const entities = classification === 'actionable'
        ? this.extractEntitiesFromText(text)
        : [];
      return { classification, entities, confidence: 0.7 };
    }

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Analyze this social media content segment and classify it.

Text: "${text}"

Classify as one of:
- ACTIONABLE: Contains specific recommendations, venue names, prices, addresses, times, tips
- CONTEXT: Background information, atmosphere descriptions, opinions without specifics
- PROMOTIONAL: Discount codes, affiliate links, "follow me", sponsor mentions
- NOISE: Music lyrics, filler words, unintelligible text

Also extract any entities found (venue names, prices, addresses, phone numbers, hours, tips).

Respond in JSON format:
{
  "classification": "actionable|context|promotional|noise",
  "confidence": 0.0-1.0,
  "entities": [
    { "type": "venue|price|address|phone|hours|tip", "value": "extracted value" }
  ]
}`
        }]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const parsed = JSON.parse(content.text);
        return {
          classification: parsed.classification,
          entities: (parsed.entities || []).map((e: any) => ({
            ...e,
            raw: e.value,
            confidence: parsed.confidence
          })),
          confidence: parsed.confidence
        };
      }
    } catch (error) {
      console.warn('[TRANSCRIPT_FILTER] AI classification failed, using regex:', error);
    }

    // Fall back to regex
    const classification = this.classifySentence(text);
    const entities = classification === 'actionable'
      ? this.extractEntitiesFromText(text)
      : [];
    return { classification, entities, confidence: 0.6 };
  }
}

// Export singleton instance
export const transcriptFilterService = new TranscriptFilterService();
