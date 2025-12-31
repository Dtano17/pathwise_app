/**
 * Transcript Filter Service v2
 *
 * Enhanced multi-modal content filtering for social media planning.
 * Implements ContentAtom schema for unified content signals and
 * robust classification/filtering pipeline.
 *
 * Pipeline: extractContent() → classifyContent() → filterContent() → extractEntities() → generatePlan()
 */

import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// CONTENT ATOM SCHEMA (Step 1: Unified format for content signals)
// ============================================================================

export interface ContentAtom {
  id: string;
  source: 'audio' | 'ocr' | 'caption' | 'metadata' | 'image';
  text: string;
  timestamp?: { start: number; end: number };
  confidence: number;
  classification?: 'actionable' | 'promotional' | 'context' | 'noise';
  plannabilityScore?: number;
  entities?: ExtractedEntity[];
}

// ============================================================================
// ENTITY EXTRACTION TYPES (Step 3)
// ============================================================================

export interface ExtractedEntity {
  type: 'venue' | 'price' | 'address' | 'phone' | 'hours' | 'tip' | 'date' | 'time' | 'location';
  value: string;
  raw: string;
  confidence: number;
}

export interface ExtractedEntities {
  venues: { name: string; type: string; address?: string; confidence: number }[];
  prices: { item: string; amount: string; confidence: number }[];
  times: { description: string; datetime?: string; confidence: number }[];
  locations: { name: string; coordinates?: { lat: number; lng: number }; confidence: number }[];
  tips: { text: string; confidence: number }[];
  contacts: { type: 'phone' | 'email' | 'website'; value: string; confidence: number }[];
}

// ============================================================================
// CLASSIFICATION TYPES (Step 2)
// ============================================================================

export interface ClassificationResult {
  classification: 'actionable' | 'promotional' | 'context' | 'noise';
  confidence: number;
  reason?: string;
}

export type ContentType =
  | 'cooking_tutorial'
  | 'restaurant_review'
  | 'travel_vlog'
  | 'recipe'
  | 'product_review'
  | 'fitness_routine'
  | 'shopping_haul'
  | 'event_guide'
  | 'other';

export interface ContentTypeWeights {
  contentType: ContentType;
  weights: {
    audio: number;
    ocr: number;
    caption: number;
  };
}

// ============================================================================
// FILTERED CONTENT OUTPUT (Final output for planner)
// ============================================================================

export interface FilteredContent {
  // Core filtered content
  actionableContent: string;
  contextContent: string;

  // Structured entities
  entities: ExtractedEntity[];
  structuredEntities: ExtractedEntities;

  // Content classification
  contentType: ContentType;
  sourceWeights: ContentTypeWeights;

  // Atoms for granular access
  atoms: ContentAtom[];

  // Statistics
  summary: string;
  rawWordCount: number;
  filteredWordCount: number;

  // Quality metrics
  overallConfidence: number;
  promotionalPercentage: number;
  actionablePercentage: number;

  // Warnings for UI (Step 7)
  warnings: ContentWarning[];
}

export interface ContentWarning {
  type: 'low_confidence' | 'mostly_promotional' | 'no_actionable' | 'extraction_failed';
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface SocialMediaInput {
  platform: string;
  url: string;
  audioTranscript?: string;
  ocrText?: string;
  caption?: string;
  metadata?: Record<string, any>;
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
  event_guide: { audio: 0.5, ocr: 0.8, caption: 0.6 },
  other: { audio: 0.5, ocr: 0.5, caption: 0.5 }
};

// ============================================================================
// STEP 4: PROMOTIONAL DETECTION HEURISTICS (Fast regex before LLM)
// ============================================================================

const PROMOTIONAL_PATTERNS = [
  // Call to action
  /link\s+in\s+(?:my\s+)?bio/gi,
  /check\s+(?:out\s+)?(?:the\s+)?link/gi,
  /click\s+(?:the\s+)?link/gi,
  /tap\s+(?:the\s+)?link/gi,
  /swipe\s+up/gi,

  // Follow requests
  /follow\s+(?:me|us)\s+(?:on|for|@)/gi,
  /don'?t\s+forget\s+to\s+follow/gi,
  /make\s+sure\s+(?:to\s+)?follow/gi,
  /hit\s+(?:the\s+)?follow/gi,

  // Engagement requests
  /like\s+(?:and\s+)?subscribe/gi,
  /smash\s+(?:that\s+)?like/gi,
  /hit\s+(?:the\s+)?like/gi,
  /leave\s+a\s+comment/gi,
  /comment\s+below/gi,
  /share\s+(?:this\s+)?(?:video|post)/gi,
  /turn\s+on\s+(?:post\s+)?notifications/gi,

  // Discount/affiliate
  /use\s+(?:my\s+)?(?:code|coupon)\s+\w+/gi,
  /\d+%\s*off\s+(?:with|using)/gi,
  /discount\s+code/gi,
  /affiliate\s+link/gi,
  /sponsored\s+(?:by|post|content)/gi,
  /partnership\s+with/gi,
  /paid\s+promotion/gi,

  // Hashtag indicators
  /#ad\b/gi,
  /#sponsored\b/gi,
  /#partner(?:ship)?\b/gi,
  /#gifted\b/gi,
  /#collab\b/gi,

  // App/download prompts
  /download\s+(?:the\s+)?app/gi,
  /get\s+(?:the\s+)?app/gi,
  /available\s+(?:on|in)\s+(?:the\s+)?app\s+store/gi,

  // Merch/shop
  /(?:my|our)\s+merch/gi,
  /shop\s+(?:my|our|the)\s+(?:link|collection)/gi,
  /available\s+(?:on|at)\s+(?:my|our)\s+(?:shop|store)/gi,
];

const NOISE_PATTERNS = [
  // Music lyrics indicators
  /(?:la\s+){2,}/gi,
  /(?:na\s+){2,}/gi,
  /(?:oh\s+){2,}/gi,
  /(?:yeah\s+){2,}/gi,
  /baby\s+baby/gi,
  /\[music\]/gi,
  /\[singing\]/gi,
  /♪|♫|🎵|🎶/g,

  // Filler words (standalone)
  /^(?:um+|uh+|like|so|yeah|okay|right|anyway|basically)\s*$/gi,

  // Transcription artifacts
  /\[inaudible\]/gi,
  /\[unclear\]/gi,
  /\[crosstalk\]/gi,
  /\.\.\./g,

  // Empty/meaningless
  /^[^a-zA-Z0-9]*$/g,
];

// ============================================================================
// ENTITY EXTRACTION PATTERNS (Step 3)
// ============================================================================

const PRICE_PATTERNS = [
  /\$[\d,]+(?:\.\d{2})?(?:\s*[-–]\s*\$[\d,]+(?:\.\d{2})?)?/gi,
  /₦[\d,]+(?:\s*[-–]\s*₦[\d,]+)?/gi,
  /€[\d,]+(?:\.\d{2})?/gi,
  /£[\d,]+(?:\.\d{2})?/gi,
  /\d+\s*(?:dollars?|bucks?|usd)/gi,
  /(?:around|about|roughly|approximately)\s*\$?\d+/gi,
  /(?:costs?|priced?\s+at|runs?\s+you)\s*\$?\d+/gi,
];

const ADDRESS_PATTERNS = [
  /\d+\s+[\w\s]+(?:street|st|avenue|ave|boulevard|blvd|road|rd|drive|dr|lane|ln|way|place|pl|court|ct)\b/gi,
  /(?:located\s+)?(?:at|on)\s+[\w\s]+(?:street|st|avenue|ave|boulevard|blvd)/gi,
  /corner\s+of\s+[\w\s]+(?:and|&)\s+[\w\s]+/gi,
];

const PHONE_PATTERNS = [
  /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  /\+\d{1,3}[-.\s]?\d{3,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g,
];

const HOURS_PATTERNS = [
  /(?:open|hours?|from)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:to|[-–])\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?/gi,
  /\d{1,2}(?::\d{2})?\s*(?:am|pm)\s*(?:to|[-–])\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)/gi,
  /(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?\s*(?:to|[-–])\s*(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?/gi,
  /(?:open|closed)\s+(?:on\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?/gi,
];

const DATE_PATTERNS = [
  /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?/gi,
  /\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/g,
  /(?:this|next|last)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|weekend|month)/gi,
];

const TIME_PATTERNS = [
  /\d{1,2}(?::\d{2})?\s*(?:am|pm)/gi,
  /(?:at|around|by)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?/gi,
  /(?:morning|afternoon|evening|night|noon|midnight)/gi,
];

const VENUE_PATTERNS = [
  /(?:called|named)\s+["']?([A-Z][\w\s'&-]+)["']?/gi,
  /(?:at|visit|try|went\s+to|checked\s+out)\s+["']?([A-Z][\w\s'&-]{2,30})["']?(?:\s+(?:restaurant|cafe|bar|hotel|resort|spa|gym|studio))?/gi,
  /([A-Z][\w\s'&-]+)\s+(?:restaurant|cafe|bar|hotel|resort|spa|gym|studio|museum|gallery|park)/gi,
  /(?:is|was)\s+(?:called|named)\s+["']?([A-Z][\w\s'&-]+)["']?/gi,
];

const TIP_PATTERNS = [
  /(?:pro\s+)?tip:\s*([^.!?]+[.!?]?)/gi,
  /(?:my\s+)?advice:\s*([^.!?]+[.!?]?)/gi,
  /make\s+sure\s+(?:to\s+)?([^.!?]+[.!?]?)/gi,
  /don'?t\s+forget\s+(?:to\s+)?([^.!?]+[.!?]?)/gi,
  /(?:one\s+)?thing\s+(?:to\s+)?(?:know|remember):\s*([^.!?]+[.!?]?)/gi,
];

// ============================================================================
// SERVICE CLASS
// ============================================================================

class TranscriptFilterService {
  private anthropic: Anthropic | null = null;
  private atomIdCounter = 0;

  constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
    }
  }

  /**
   * Generate unique atom ID
   */
  private generateAtomId(): string {
    return `atom_${Date.now()}_${++this.atomIdCounter}`;
  }

  // ==========================================================================
  // MAIN PIPELINE (Step 5: Filter content before sending)
  // ==========================================================================

  /**
   * Main entry point: Complete filtering pipeline
   * extractContent() → classifyContent() → filterContent() → extractEntities()
   */
  async filterAndWeightContent(input: SocialMediaInput): Promise<FilteredContent> {
    console.log(`[TRANSCRIPT_FILTER] Processing ${input.platform} content from ${input.url}`);
    console.log(`[TRANSCRIPT_FILTER] Raw input sources: audio=${!!input.audioTranscript}, ocr=${!!input.ocrText}, caption=${!!input.caption}`);
    if (input.audioTranscript) {
      console.log(`[TRANSCRIPT_FILTER] Audio Sample (first 100 chars): "${input.audioTranscript.substring(0, 100)}..."`);
    }
    const startTime = Date.now();

    // Step 1: Build ContentAtoms from raw input
    const atoms = this.buildContentAtoms(input);

    if (atoms.length === 0) {
      console.log(`[TRANSCRIPT_FILTER] No content to process`);
      return this.createEmptyResult('No content available for processing');
    }

    const rawWordCount = atoms.reduce((acc, atom) =>
      acc + (atom.text?.split(/\s+/).length || 0), 0);

    console.log(`[TRANSCRIPT_FILTER] Built ${atoms.length} atoms, ${rawWordCount} words`);

    // Step 2: Detect content type
    const contentTypeResult = this.detectContentType(atoms);
    console.log(`[TRANSCRIPT_FILTER] Detected content type: ${contentTypeResult.contentType}`);

    // Step 3: Fast promotional/noise filtering (regex-based)
    const preFilteredAtoms = this.preFilterAtoms(atoms);
    const promoCount = preFilteredAtoms.filter(a => a.classification === 'promotional').length;
    const noiseCount = preFilteredAtoms.filter(a => a.classification === 'noise').length;
    console.log(`[TRANSCRIPT_FILTER] Pre-filter stats: ${promoCount} promo, ${noiseCount} noise filtered`);

    // Step 4: Classify remaining atoms
    const classifiedAtoms = await this.classifyAtoms(preFilteredAtoms, contentTypeResult.contentType);

    // Step 5: Extract entities from actionable atoms
    const atomsWithEntities = this.extractEntitiesFromAtoms(classifiedAtoms);
    const entityCount = atomsWithEntities.reduce((acc, a) => acc + (a.entities?.length || 0), 0);
    console.log(`[TRANSCRIPT_FILTER] Entity extraction: found ${entityCount} entities`);
    if (entityCount > 0) {
      const sampleEntities = atomsWithEntities.flatMap(a => a.entities || []).slice(0, 5);
      console.log(`[TRANSCRIPT_FILTER] Sample entities:`, JSON.stringify(sampleEntities, null, 2));
    }

    // Step 6: Calculate metrics
    const actionableAtoms = atomsWithEntities.filter(a => a.classification === 'actionable');
    const contextAtoms = atomsWithEntities.filter(a => a.classification === 'context');
    const promotionalAtoms = atomsWithEntities.filter(a => a.classification === 'promotional');
    const noiseAtoms = atomsWithEntities.filter(a => a.classification === 'noise');

    const totalClassified = atomsWithEntities.length;
    const promotionalPercentage = totalClassified > 0
      ? (promotionalAtoms.length / totalClassified) * 100
      : 0;
    const actionablePercentage = totalClassified > 0
      ? (actionableAtoms.length / totalClassified) * 100
      : 0;

    // Step 7: Weight and combine content
    const weightedActionable = this.weightAndCombineContent(actionableAtoms, contentTypeResult);
    const weightedContext = this.weightAndCombineContent(contextAtoms, contentTypeResult);

    const filteredWordCount = weightedActionable.split(/\s+/).filter(Boolean).length +
                              weightedContext.split(/\s+/).filter(Boolean).length;

    // Step 8: Build structured entities
    const allEntities = atomsWithEntities.flatMap(a => a.entities || []);
    const structuredEntities = this.buildStructuredEntities(allEntities);
    const uniqueEntities = this.deduplicateEntities(allEntities);

    // Step 9: Generate warnings (Step 7 in spec)
    const warnings = this.generateWarnings({
      actionablePercentage,
      promotionalPercentage,
      totalEntities: uniqueEntities.length,
      rawWordCount,
      filteredWordCount
    });

    // Step 10: Generate summary
    const summary = this.generateSummary(structuredEntities, contentTypeResult.contentType, {
      actionableCount: actionableAtoms.length,
      filteredCount: promotionalAtoms.length + noiseAtoms.length,
      entityCount: uniqueEntities.length
    });

    // Calculate overall confidence
    const confidenceScores = atomsWithEntities.map(a => a.confidence);
    const overallConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
      : 0;

    const elapsed = Date.now() - startTime;
    console.log(`[TRANSCRIPT_FILTER] Completed in ${elapsed}ms: ${actionableAtoms.length} actionable, ${promotionalAtoms.length} promotional filtered, ${uniqueEntities.length} entities`);

    return {
      actionableContent: weightedActionable,
      contextContent: weightedContext,
      entities: uniqueEntities,
      structuredEntities,
      contentType: contentTypeResult.contentType,
      sourceWeights: contentTypeResult,
      atoms: atomsWithEntities,
      summary,
      rawWordCount,
      filteredWordCount,
      overallConfidence,
      promotionalPercentage,
      actionablePercentage,
      warnings
    };
  }

  // ==========================================================================
  // STEP 1: BUILD CONTENT ATOMS
  // ==========================================================================

  private buildContentAtoms(input: SocialMediaInput): ContentAtom[] {
    const atoms: ContentAtom[] = [];

    // Audio transcript - split into sentences
    if (input.audioTranscript?.trim()) {
      const sentences = this.splitIntoSentences(input.audioTranscript);
      for (const sentence of sentences) {
        if (sentence.trim()) {
          atoms.push({
            id: this.generateAtomId(),
            source: 'audio',
            text: sentence.trim(),
            confidence: 0.85 // Audio transcription confidence
          });
        }
      }
    }

    // OCR text - split into lines/sentences
    if (input.ocrText?.trim()) {
      const segments = this.splitOcrText(input.ocrText);
      for (const segment of segments) {
        if (segment.trim()) {
          atoms.push({
            id: this.generateAtomId(),
            source: 'ocr',
            text: segment.trim(),
            confidence: 0.75 // OCR confidence (lower due to potential errors)
          });
        }
      }
    }

    // Caption - usually already well-formatted
    if (input.caption?.trim()) {
      const sentences = this.splitIntoSentences(input.caption);
      for (const sentence of sentences) {
        if (sentence.trim()) {
          atoms.push({
            id: this.generateAtomId(),
            source: 'caption',
            text: sentence.trim(),
            confidence: 0.95 // Caption is author-written, high confidence
          });
        }
      }
    }

    // Metadata (if available)
    if (input.metadata) {
      if (input.metadata.title) {
        atoms.push({
          id: this.generateAtomId(),
          source: 'metadata',
          text: input.metadata.title,
          confidence: 0.95
        });
      }
      if (input.metadata.description) {
        atoms.push({
          id: this.generateAtomId(),
          source: 'metadata',
          text: input.metadata.description,
          confidence: 0.90
        });
      }
    }

    return atoms;
  }

  private splitIntoSentences(text: string): string[] {
    // Split on sentence boundaries, preserving abbreviations
    return text
      .replace(/([.!?])\s+/g, '$1\n')
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  private splitOcrText(text: string): string[] {
    // OCR text often has newlines for visual separation
    return text
      .split(/\n+/)
      .map(line => line.trim())
      .filter(line => line.length > 2);
  }

  // ==========================================================================
  // STEP 2: DETECT CONTENT TYPE
  // ==========================================================================

  private detectContentType(atoms: ContentAtom[]): ContentTypeWeights {
    const combinedText = atoms.map(a => a.text).join(' ').toLowerCase();

    // Recipe/cooking detection
    if (/recipe|ingredient|cook|bake|stir|chop|heat|oven|pan|tablespoon|teaspoon|cup\s+of/i.test(combinedText)) {
      if (/step\s*\d|first|then|next|finally|instructions?/.test(combinedText)) {
        return { contentType: 'cooking_tutorial', weights: CONTENT_TYPE_WEIGHTS.cooking_tutorial };
      }
      return { contentType: 'recipe', weights: CONTENT_TYPE_WEIGHTS.recipe };
    }

    // Restaurant/food review
    if (/restaurant|cafe|bar|food|dish|order|menu|waiter|service|ambiance|taste|flavor|delicious/i.test(combinedText)) {
      return { contentType: 'restaurant_review', weights: CONTENT_TYPE_WEIGHTS.restaurant_review };
    }

    // Travel content
    if (/travel|trip|visit|destination|hotel|flight|explore|tour|vacation|itinerary|road\s*trip/i.test(combinedText)) {
      return { contentType: 'travel_vlog', weights: CONTENT_TYPE_WEIGHTS.travel_vlog };
    }

    // Fitness
    if (/workout|exercise|gym|fitness|rep|set|squat|push|pull|cardio|muscle|weight/i.test(combinedText)) {
      return { contentType: 'fitness_routine', weights: CONTENT_TYPE_WEIGHTS.fitness_routine };
    }

    // Event guide
    if (/event|concert|festival|show|performance|ticket|venue|lineup/i.test(combinedText)) {
      return { contentType: 'event_guide', weights: CONTENT_TYPE_WEIGHTS.event_guide };
    }

    // Shopping/product
    if (/haul|bought|purchase|shop|store|try\s+on|unbox|review|product/i.test(combinedText)) {
      if (/recommend|worth|quality|pro|con|honest/.test(combinedText)) {
        return { contentType: 'product_review', weights: CONTENT_TYPE_WEIGHTS.product_review };
      }
      return { contentType: 'shopping_haul', weights: CONTENT_TYPE_WEIGHTS.shopping_haul };
    }

    return { contentType: 'other', weights: CONTENT_TYPE_WEIGHTS.other };
  }

  // ==========================================================================
  // STEP 4: PRE-FILTER (Fast regex before LLM)
  // ==========================================================================

  private preFilterAtoms(atoms: ContentAtom[]): ContentAtom[] {
    return atoms.map(atom => {
      // Check promotional patterns
      for (const pattern of PROMOTIONAL_PATTERNS) {
        pattern.lastIndex = 0; // Reset regex state
        if (pattern.test(atom.text)) {
          return {
            ...atom,
            classification: 'promotional' as const,
            plannabilityScore: 0
          };
        }
      }

      // Check noise patterns
      for (const pattern of NOISE_PATTERNS) {
        pattern.lastIndex = 0;
        if (pattern.test(atom.text)) {
          return {
            ...atom,
            classification: 'noise' as const,
            plannabilityScore: 0
          };
        }
      }

      // Not pre-classified
      return atom;
    });
  }

  // ==========================================================================
  // STEP 2 (continued): CLASSIFY ATOMS
  // ==========================================================================

  private async classifyAtoms(atoms: ContentAtom[], contentType: ContentType): Promise<ContentAtom[]> {
    const results: ContentAtom[] = [];

    for (const atom of atoms) {
      // Skip already classified atoms (from pre-filter)
      if (atom.classification) {
        results.push(atom);
        continue;
      }

      // Classify unclassified atoms
      const classification = this.classifyText(atom.text);
      results.push({
        ...atom,
        classification: classification.classification,
        plannabilityScore: this.calculatePlannabilityScore(classification, atom.source, contentType)
      });
    }

    return results;
  }

  private classifyText(text: string): ClassificationResult {
    const lowerText = text.toLowerCase();

    // Check for actionable indicators
    const hasPrice = PRICE_PATTERNS.some(p => { p.lastIndex = 0; return p.test(text); });
    const hasAddress = ADDRESS_PATTERNS.some(p => { p.lastIndex = 0; return p.test(text); });
    const hasPhone = PHONE_PATTERNS.some(p => { p.lastIndex = 0; return p.test(text); });
    const hasHours = HOURS_PATTERNS.some(p => { p.lastIndex = 0; return p.test(text); });
    const hasDate = DATE_PATTERNS.some(p => { p.lastIndex = 0; return p.test(text); });
    const hasTime = TIME_PATTERNS.some(p => { p.lastIndex = 0; return p.test(text); });
    const hasVenue = VENUE_PATTERNS.some(p => { p.lastIndex = 0; return p.test(text); });
    const hasTip = TIP_PATTERNS.some(p => { p.lastIndex = 0; return p.test(text); });

    // Strong actionable indicators
    const hasRecommendation = /(?:must\s+try|highly\s+recommend|best|favorite|worth|amazing|incredible|delicious|definitely\s+(?:go|visit|try))/i.test(lowerText);
    const hasDirective = /(?:make\s+sure|don'?t\s+miss|be\s+sure\s+to|you\s+(?:have|need)\s+to)/i.test(lowerText);

    // Count actionable signals
    const actionableSignals = [
      hasPrice, hasAddress, hasPhone, hasHours, hasDate,
      hasTime, hasVenue, hasTip, hasRecommendation, hasDirective
    ].filter(Boolean).length;

    if (actionableSignals >= 2) {
      return { classification: 'actionable', confidence: 0.9 };
    }

    if (actionableSignals === 1) {
      return { classification: 'actionable', confidence: 0.75 };
    }

    // Context indicators (opinions, descriptions without specifics)
    const isContext = /(?:i\s+(?:love|like|think|feel)|really|honestly|personally|(?:was|is)\s+(?:so\s+)?(?:good|great|nice|cool|fun))/i.test(lowerText);

    if (isContext && text.length > 15) {
      return { classification: 'context', confidence: 0.7 };
    }

    // Very short text is likely noise
    if (text.length < 10) {
      return { classification: 'noise', confidence: 0.6 };
    }

    // Default to context
    return { classification: 'context', confidence: 0.5 };
  }

  private calculatePlannabilityScore(
    classification: ClassificationResult,
    source: ContentAtom['source'],
    contentType: ContentType
  ): number {
    const weights = CONTENT_TYPE_WEIGHTS[contentType];
    const sourceWeight = source === 'metadata' || source === 'image'
      ? 0.7
      : weights[source as 'audio' | 'ocr' | 'caption'] || 0.5;

    const classificationMultiplier = {
      actionable: 1.0,
      context: 0.5,
      promotional: 0.0,
      noise: 0.0
    }[classification.classification];

    return sourceWeight * classificationMultiplier * classification.confidence;
  }

  // ==========================================================================
  // STEP 3: ENTITY EXTRACTION
  // ==========================================================================

  private extractEntitiesFromAtoms(atoms: ContentAtom[]): ContentAtom[] {
    return atoms.map(atom => {
      if (atom.classification === 'actionable' || atom.classification === 'context') {
        const entities = this.extractEntitiesFromText(atom.text);
        return { ...atom, entities };
      }
      return { ...atom, entities: [] };
    });
  }

  private extractEntitiesFromText(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    // Extract prices
    for (const pattern of PRICE_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          type: 'price',
          value: match[0].trim(),
          raw: match[0],
          confidence: 0.9
        });
      }
    }

    // Extract addresses
    for (const pattern of ADDRESS_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const value = match[0].replace(/^(?:located\s+)?(?:at|on)\s+/i, '').trim();
        entities.push({
          type: 'address',
          value,
          raw: match[0],
          confidence: 0.85
        });
      }
    }

    // Extract phone numbers
    for (const pattern of PHONE_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          type: 'phone',
          value: match[0].trim(),
          raw: match[0],
          confidence: 0.95
        });
      }
    }

    // Extract hours
    for (const pattern of HOURS_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          type: 'hours',
          value: match[0].trim(),
          raw: match[0],
          confidence: 0.85
        });
      }
    }

    // Extract dates
    for (const pattern of DATE_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          type: 'date',
          value: match[0].trim(),
          raw: match[0],
          confidence: 0.8
        });
      }
    }

    // Extract times
    for (const pattern of TIME_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          type: 'time',
          value: match[0].trim(),
          raw: match[0],
          confidence: 0.8
        });
      }
    }

    // Extract venues
    for (const pattern of VENUE_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const venueName = match[1]?.trim() || match[0].trim();
        if (venueName && venueName.length > 2 && venueName.length < 50) {
          // Filter out common false positives
          if (!/^(the|a|an|this|that|my|your|our|their|i|you|we|they)$/i.test(venueName)) {
            entities.push({
              type: 'venue',
              value: venueName,
              raw: match[0],
              confidence: 0.8
            });
          }
        }
      }
    }

    // Extract tips
    for (const pattern of TIP_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const tipText = match[1]?.trim() || match[0].trim();
        if (tipText && tipText.length > 5) {
          entities.push({
            type: 'tip',
            value: tipText,
            raw: match[0],
            confidence: 0.85
          });
        }
      }
    }

    // Extract locations (cities, neighborhoods, landmarks)
    const locationPattern = /(?:in|at|near|around)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
    let locMatch;
    while ((locMatch = locationPattern.exec(text)) !== null) {
      const location = locMatch[1]?.trim();
      if (location && location.length > 2 && location.length < 40) {
        entities.push({
          type: 'location',
          value: location,
          raw: locMatch[0],
          confidence: 0.7
        });
      }
    }

    return entities;
  }

  private buildStructuredEntities(entities: ExtractedEntity[]): ExtractedEntities {
    const structured: ExtractedEntities = {
      venues: [],
      prices: [],
      times: [],
      locations: [],
      tips: [],
      contacts: []
    };

    for (const entity of entities) {
      switch (entity.type) {
        case 'venue':
          if (!structured.venues.some(v => v.name.toLowerCase() === entity.value.toLowerCase())) {
            structured.venues.push({
              name: entity.value,
              type: 'unknown',
              confidence: entity.confidence
            });
          }
          break;

        case 'price':
          structured.prices.push({
            item: 'general',
            amount: entity.value,
            confidence: entity.confidence
          });
          break;

        case 'date':
        case 'time':
        case 'hours':
          structured.times.push({
            description: entity.value,
            confidence: entity.confidence
          });
          break;

        case 'location':
        case 'address':
          structured.locations.push({
            name: entity.value,
            confidence: entity.confidence
          });
          break;

        case 'tip':
          structured.tips.push({
            text: entity.value,
            confidence: entity.confidence
          });
          break;

        case 'phone':
          structured.contacts.push({
            type: 'phone',
            value: entity.value,
            confidence: entity.confidence
          });
          break;
      }
    }

    return structured;
  }

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

  // ==========================================================================
  // STEP 6: WEIGHT AND COMBINE CONTENT
  // ==========================================================================

  private weightAndCombineContent(atoms: ContentAtom[], weights: ContentTypeWeights): string {
    // Sort by plannability score (high to low)
    const sortedAtoms = [...atoms].sort((a, b) =>
      (b.plannabilityScore || 0) - (a.plannabilityScore || 0)
    );

    // Filter out low-weight content
    const significantAtoms = sortedAtoms.filter(atom => {
      const sourceWeight = atom.source === 'metadata' || atom.source === 'image'
        ? 0.7
        : weights.weights[atom.source as 'audio' | 'ocr' | 'caption'] || 0.5;
      return sourceWeight >= 0.4;
    });

    return significantAtoms
      .map(atom => atom.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ==========================================================================
  // STEP 7: GENERATE WARNINGS
  // ==========================================================================

  private generateWarnings(metrics: {
    actionablePercentage: number;
    promotionalPercentage: number;
    totalEntities: number;
    rawWordCount: number;
    filteredWordCount: number;
  }): ContentWarning[] {
    const warnings: ContentWarning[] = [];

    if (metrics.promotionalPercentage > 50) {
      warnings.push({
        type: 'mostly_promotional',
        message: `Content is ${Math.round(metrics.promotionalPercentage)}% promotional - filtered ${Math.round(metrics.promotionalPercentage)}% of segments`,
        severity: 'warning'
      });
    }

    if (metrics.actionablePercentage < 20 && metrics.rawWordCount > 50) {
      warnings.push({
        type: 'low_confidence',
        message: 'Low confidence - content may be primarily opinion/entertainment without specific recommendations',
        severity: 'warning'
      });
    }

    if (metrics.totalEntities === 0 && metrics.rawWordCount > 30) {
      warnings.push({
        type: 'no_actionable',
        message: 'No specific venues, prices, or addresses found - plan may be generic',
        severity: 'info'
      });
    }

    if (metrics.filteredWordCount < 20 && metrics.rawWordCount > 100) {
      warnings.push({
        type: 'extraction_failed',
        message: 'Most content was filtered as noise/promotional - limited planning data available',
        severity: 'warning'
      });
    }

    return warnings;
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private generateSummary(
    entities: ExtractedEntities,
    contentType: ContentType,
    stats: { actionableCount: number; filteredCount: number; entityCount: number }
  ): string {
    const parts: string[] = [];

    if (entities.venues.length > 0) {
      parts.push(`📍 ${entities.venues.length} venue${entities.venues.length > 1 ? 's' : ''}: ${entities.venues.slice(0, 3).map(v => v.name).join(', ')}`);
    }

    if (entities.prices.length > 0) {
      parts.push(`💰 ${entities.prices.length} price${entities.prices.length > 1 ? 's' : ''}: ${entities.prices.slice(0, 3).map(p => p.amount).join(', ')}`);
    }

    if (entities.times.length > 0) {
      parts.push(`🕐 ${entities.times.length} time reference${entities.times.length > 1 ? 's' : ''}`);
    }

    if (entities.tips.length > 0) {
      parts.push(`💡 ${entities.tips.length} tip${entities.tips.length > 1 ? 's' : ''}`);
    }

    if (stats.filteredCount > 0) {
      parts.push(`🚫 Filtered ${stats.filteredCount} promotional segment${stats.filteredCount > 1 ? 's' : ''}`);
    }

    if (parts.length === 0) {
      return `${contentType} content analyzed - no specific plannable entities found`;
    }

    return parts.join(' | ');
  }

  private createEmptyResult(reason: string): FilteredContent {
    return {
      actionableContent: '',
      contextContent: '',
      entities: [],
      structuredEntities: {
        venues: [],
        prices: [],
        times: [],
        locations: [],
        tips: [],
        contacts: []
      },
      contentType: 'other',
      sourceWeights: { contentType: 'other', weights: CONTENT_TYPE_WEIGHTS.other },
      atoms: [],
      summary: reason,
      rawWordCount: 0,
      filteredWordCount: 0,
      overallConfidence: 0,
      promotionalPercentage: 0,
      actionablePercentage: 0,
      warnings: [{
        type: 'extraction_failed',
        message: reason,
        severity: 'error'
      }]
    };
  }

  // ==========================================================================
  // AI CLASSIFICATION (Optional - for complex content)
  // ==========================================================================

  async classifyWithAI(text: string): Promise<{
    classification: 'actionable' | 'context' | 'promotional' | 'noise';
    entities: ExtractedEntity[];
    confidence: number;
  }> {
    if (!this.anthropic) {
      const classification = this.classifyText(text);
      const entities = classification.classification === 'actionable'
        ? this.extractEntitiesFromText(text)
        : [];
      return {
        classification: classification.classification,
        entities,
        confidence: classification.confidence
      };
    }

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Analyze this social media content segment for planning purposes.

Text: "${text}"

Classify as:
- ACTIONABLE: Specific recommendations, venue names, prices, addresses, times, tips
- CONTEXT: Background info, atmosphere descriptions, opinions without specifics
- PROMOTIONAL: Discount codes, affiliate links, "follow me", sponsor mentions
- NOISE: Music lyrics, filler words, unintelligible text

Extract any entities: venue names, prices ($X), addresses, phone numbers, hours, tips.

Respond in JSON:
{
  "classification": "actionable|context|promotional|noise",
  "confidence": 0.0-1.0,
  "entities": [{ "type": "venue|price|address|phone|hours|tip", "value": "..." }]
}`
        }]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        // Extract JSON from response
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
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
      }
    } catch (error) {
      console.warn('[TRANSCRIPT_FILTER] AI classification failed:', error);
    }

    // Fallback to regex
    const classification = this.classifyText(text);
    const entities = classification.classification === 'actionable'
      ? this.extractEntitiesFromText(text)
      : [];
    return {
      classification: classification.classification,
      entities,
      confidence: classification.confidence * 0.8
    };
  }
}

// Export singleton instance
export const transcriptFilterService = new TranscriptFilterService();
