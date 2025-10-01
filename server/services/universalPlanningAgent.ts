import Anthropic from "@anthropic-ai/sdk";
import { domainRegistry, type Question, type DomainConfig } from './domainRegistry';
import { enrichmentService } from './enrichmentService';
import { contextualEnrichmentAgent } from './contextualEnrichmentAgent';
import type { User } from '@shared/schema';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/*
<important_code_snippet_instructions>
The newest Anthropic model is "claude-sonnet-4-20250514"
</important_code_snippet_instructions>
*/

const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-20250514";

export interface ContextRecognition {
  domain: string;
  confidence: number;
  extractedSlots: any;
  isContextSwitch: boolean;
}

export interface GapAnalysis {
  answeredQuestions: Question[];
  remainingQuestions: Question[];
  answeredCount: number;
  totalCount: number;
  allQuestionsAnswered: boolean;
  collectedSlots: any;
  progress: {
    percentage: number;
    answered: number;
    total: number;
  };
}

export interface UniversalPlanningResponse {
  message: string;
  phase: 'context_recognition' | 'gathering' | 'enrichment' | 'synthesis' | 'completed';
  progress?: {
    answered: number;
    total: number;
    percentage: number;
  };
  contextChips?: Array<{
    label: string;
    value: string;
    category: 'required' | 'optional';
    filled: boolean;
  }>;
  readyToGenerate?: boolean;
  planReady?: boolean;
  showGenerateButton?: boolean;
  enrichedPlan?: any;
  updatedSlots?: any;
  domain?: string;
}

/**
 * Universal Planning Agent - Domain-agnostic 5-phase planning engine
 *
 * Phase 1: Recognize Context Switch
 * Phase 2: Generate Top Questions (5 for quick, 7 for smart)
 * Phase 3: Identify Information Needs (gap analysis)
 * Phase 4: Real-time Information Enrichment
 * Phase 5: Generate Beautiful, Actionable Plan
 */
export class UniversalPlanningAgent {

  constructor() {
    // Ensure domains are loaded on startup
    domainRegistry.loadDomains().catch(err => {
      console.error('[UNIVERSAL AGENT] Failed to load domains:', err);
    });
  }

  /**
   * Main entry point - process user request through 5-phase flow
   */
  async processUserRequest(
    userMessage: string,
    conversationHistory: any[],
    currentSlots: any,
    userProfile: User,
    planMode: 'quick' | 'smart',
    currentDomain?: string
  ): Promise<UniversalPlanningResponse> {

    console.log('\n===== UNIVERSAL PLANNING AGENT =====');
    console.log('Mode:', planMode);
    console.log('Message:', userMessage);
    console.log('Current Domain:', currentDomain);
    console.log('Current Slots:', JSON.stringify(currentSlots, null, 2));

    try {
      // PHASE 1: Recognize Context Switch
      const context = await this.recognizeContext(
        userMessage,
        conversationHistory,
        currentDomain
      );

      console.log('[PHASE 1] Context:', context);

      // Check if user is asking about non-planning topic (low confidence)
      if (context.confidence < 0.5) {
        return {
          message: "I'm sorry, I don't understand. This is a planning assistant designed to help you plan activities like travel, interviews, dates, workouts, and daily tasks. How can I help you plan something today?",
          phase: 'context_recognition',
          readyToGenerate: false,
          planReady: false,
          showGenerateButton: false,
          updatedSlots: currentSlots,
          domain: undefined
        };
      }

      // PHASE 2: Generate Top Questions
      const questions = domainRegistry.getQuestions(context.domain, planMode);

      console.log(`[PHASE 2] Generated ${questions.length} questions for ${planMode} plan`);

      // Merge extracted slots with existing slots
      const mergedSlots = this.mergeSlots(currentSlots || {}, context.extractedSlots);

      // PHASE 3: Identify Information Needs (Gap Analysis)
      const gapAnalysis = await this.analyzeGaps(
        userMessage,
        questions,
        mergedSlots
      );

      console.log(`[PHASE 3] Gap Analysis: ${gapAnalysis.answeredCount}/${gapAnalysis.totalCount} questions answered`);

      // Generate context chips for UI
      const contextChips = this.generateContextChips(mergedSlots, questions);

      // If all questions answered, proceed to enrichment and synthesis
      if (gapAnalysis.allQuestionsAnswered) {

        console.log('[PHASE 4] All questions answered - starting enrichment');

        // PHASE 4: Real-time Information Enrichment
        const enrichmentRules = domainRegistry.getEnrichmentRules(context.domain);
        const enrichedData = await enrichmentService.enrichPlan(
          context.domain,
          gapAnalysis.collectedSlots,
          enrichmentRules,
          userProfile
        );

        console.log('[PHASE 5] Generating beautiful plan');

        // PHASE 5: Generate Beautiful, Actionable Plan
        const beautifulPlan = await this.synthesizePlan(
          context.domain,
          gapAnalysis.collectedSlots,
          enrichedData,
          userProfile
        );

        return {
          message: beautifulPlan.richContent,
          phase: 'synthesis',
          progress: gapAnalysis.progress,
          contextChips,
          readyToGenerate: true,
          planReady: true,
          showGenerateButton: true,
          enrichedPlan: beautifulPlan,
          updatedSlots: gapAnalysis.collectedSlots,
          domain: context.domain
        };

      } else {
        // Ask remaining questions
        console.log(`[PHASE 3] Asking remaining questions: ${gapAnalysis.remainingQuestions.length}`);

        const responseMessage = this.formatRemainingQuestions(
          gapAnalysis,
          context.domain,
          planMode
        );

        return {
          message: responseMessage,
          phase: 'gathering',
          progress: gapAnalysis.progress,
          contextChips,
          readyToGenerate: false,
          planReady: false,
          showGenerateButton: false,
          updatedSlots: gapAnalysis.collectedSlots,
          domain: context.domain
        };
      }

    } catch (error) {
      console.error('[UNIVERSAL AGENT] Error:', error);
      return {
        message: "I encountered an error processing your request. Could you try rephrasing that?",
        phase: 'context_recognition',
        readyToGenerate: false,
        updatedSlots: currentSlots
      };
    }
  }

  /**
   * PHASE 1: Recognize Context Switch
   */
  private async recognizeContext(
    userMessage: string,
    conversationHistory: any[],
    currentDomain?: string
  ): Promise<ContextRecognition> {

    // Detect domain using domain registry
    const detection = await domainRegistry.detectDomain(userMessage);

    // Check if this is a context switch
    const isContextSwitch = currentDomain && currentDomain !== detection.domain;

    // Also extract slots from the message using Claude
    const extractedSlots = await this.extractSlotsFromMessage(userMessage, detection.domain);

    // Merge with detected slots
    const mergedExtracted = this.mergeSlots(detection.extractedSlots || {}, extractedSlots);

    return {
      domain: detection.domain,
      confidence: detection.confidence,
      extractedSlots: mergedExtracted,
      isContextSwitch
    };
  }

  /**
   * Extract slots from user message using Claude (domain-aware)
   */
  private async extractSlotsFromMessage(message: string, domain: string): Promise<any> {
    try {
      // Get the domain's questions to know what slot paths to extract
      const quickQuestions = domainRegistry.getQuestions(domain, 'quick');
      const smartQuestions = domainRegistry.getQuestions(domain, 'smart');
      const allQuestions = [...quickQuestions, ...smartQuestions];

      // Build slot path descriptions
      const slotDescriptions = allQuestions
        .map(q => `- ${q.slot_path}: ${q.question}`)
        .join('\n');

      const prompt = `Extract all relevant information from this user message for ${domain} planning.

User message: "${message}"

Extract information that answers these questions and map to the correct slot paths:
${slotDescriptions}

Respond with JSON using the exact slot paths. Use nested objects for paths with dots (e.g., "timing.date" becomes {"timing": {"date": "..."}}).
Only include fields that are mentioned in the user's message. If nothing relevant is mentioned, return {}.

Example for interview_prep:
{
  "company": "Disney",
  "role": "streaming data engineering position",
  "timing": {"date": "Friday 5pm PST"},
  "interviewType": "technical",
  "techStack": "Scala"
}`;

      const response = await anthropic.messages.create({
        model: DEFAULT_CLAUDE_MODEL,
        max_tokens: 800,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }]
      });

      const aiResponse = response.content[0].type === 'text' ? response.content[0].text : '{}';

      // Extract JSON
      let jsonStr = aiResponse;
      if (aiResponse.includes('```json')) {
        const match = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) jsonStr = match[1];
      }

      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('[SLOT EXTRACTION] Error:', error);

      // Fallback: Use regex-based extraction as a safety net
      return this.extractSlotsWithRegex(message, domain);
    }
  }

  /**
   * Fallback regex-based slot extraction (domain-aware)
   */
  private extractSlotsWithRegex(message: string, domain: string): any {
    const extracted: any = {};
    const lowerMessage = message.toLowerCase();

    // Common patterns across domains

    // Interview prep specific
    if (domain === 'interview_prep') {
      // Company detection - improved to avoid false matches
      const companyPatterns = [
        /(?:at|with|for)\s+(disney|google|amazon|microsoft|apple|meta|netflix|uber|airbnb)/i,
        /\b(disney|google|amazon|microsoft|apple|meta|netflix|uber|airbnb)\s+interview/i,
        /my\s+(disney|google|amazon|microsoft|apple|meta|netflix|uber|airbnb)\s+interview/i
      ];
      for (const pattern of companyPatterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
          extracted.company = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
          break;
        }
      }

      // Role detection - improved
      const rolePatterns = [
        /(?:for|as)\s+(?:a\s+)?([a-z\s]+(?:data\s+)?(?:streaming\s+)?(?:engineer|developer|analyst|manager|designer|scientist|architect)(?:ing)?(?:\s+position)?)/i,
        /\b(data engineer|software engineer|frontend developer|backend developer|full stack|devops|ml engineer|data scientist|streaming.*?engineer)/i
      ];
      for (const pattern of rolePatterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
          extracted.role = match[1].trim();
          break;
        }
      }

      // Tech stack detection
      const techMatch = message.match(/\b(?:using\s+)?(python|java|scala|javascript|typescript|react|vue|angular|node|go|rust|aws|gcp|azure|kubernetes|docker|spark|kafka|flink|airflow|sql|nosql|mongodb|postgres)\b/i);
      if (techMatch) extracted.techStack = techMatch[1];

      // Interview type detection
      if (lowerMessage.includes('technical')) extracted.interviewType = 'technical';
      else if (lowerMessage.includes('behavioral')) extracted.interviewType = 'behavioral';
      else if (lowerMessage.includes('system design')) extracted.interviewType = 'system_design';
    }

    // Date/time patterns (common across domains)
    const datePatterns = [
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
      /\b(today|tomorrow|next week|this week)\b/i,
      /\b(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/,
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i
    ];

    for (const pattern of datePatterns) {
      const match = message.match(pattern);
      if (match) {
        if (!extracted.timing) extracted.timing = {};
        extracted.timing.date = match[0];
        break;
      }
    }

    // Time patterns
    const timeMatch = message.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)(?:\s+[A-Z]{3})?)\b/);
    if (timeMatch) {
      if (!extracted.timing) extracted.timing = {};
      extracted.timing.time = timeMatch[0];
    }

    // Duration patterns
    const durationMatch = message.match(/(\d+)\s*(day|night|week|month|hour)s?/i);
    if (durationMatch) {
      if (!extracted.timing) extracted.timing = {};
      extracted.timing.duration = durationMatch[0];
    }

    // Budget patterns
    const budgetMatch = message.match(/\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (budgetMatch) {
      if (!extracted.budget) extracted.budget = {};
      extracted.budget.range = budgetMatch[0];
    }

    return extracted;
  }

  /**
   * PHASE 3: Identify Information Needs (Gap Analysis)
   */
  private async analyzeGaps(
    userMessage: string,
    questions: Question[],
    currentSlots: any
  ): Promise<GapAnalysis> {

    const answeredQuestions: Question[] = [];
    const remainingQuestions: Question[] = [];

    for (const question of questions) {
      const value = this.getNestedValue(currentSlots, question.slot_path);

      if (value && value !== '' && value !== null && value !== undefined) {
        answeredQuestions.push(question);
      } else {
        remainingQuestions.push(question);
      }
    }

    const percentage = questions.length > 0
      ? Math.round((answeredQuestions.length / questions.length) * 100)
      : 0;

    return {
      answeredQuestions,
      remainingQuestions,
      answeredCount: answeredQuestions.length,
      totalCount: questions.length,
      allQuestionsAnswered: remainingQuestions.length === 0,
      collectedSlots: currentSlots,
      progress: {
        percentage,
        answered: answeredQuestions.length,
        total: questions.length
      }
    };
  }

  /**
   * PHASE 5: Generate Beautiful, Actionable Plan
   */
  private async synthesizePlan(
    domain: string,
    slots: any,
    enrichedData: any,
    userProfile: User
  ): Promise<any> {

    console.log('[SYNTHESIS] Using contextualEnrichmentAgent for beautiful plan');

    // Use the existing contextual enrichment agent
    const enrichedPlan = await contextualEnrichmentAgent.generateRichPlan(
      slots,
      userProfile,
      domain
    );

    return enrichedPlan;
  }

  /**
   * Format remaining questions for user
   */
  private formatRemainingQuestions(
    gapAnalysis: GapAnalysis,
    domain: string,
    mode: 'quick' | 'smart'
  ): string {

    const { answeredQuestions, remainingQuestions, progress } = gapAnalysis;

    let message = '';

    // If first question
    if (answeredQuestions.length === 0) {
      message = `Great! Let's plan your ${domain.replace('_', ' ')}. `;
      message += `I have ${remainingQuestions.length} ${mode === 'quick' ? 'quick' : 'smart'} questions:\n\n`;
    } else {
      message = `Perfect! Just ${remainingQuestions.length} more ${remainingQuestions.length === 1 ? 'question' : 'questions'}:\n\n`;
    }

    // List remaining questions (max 3 at a time to avoid overwhelming)
    const questionsToShow = remainingQuestions.slice(0, 3);
    questionsToShow.forEach((q, i) => {
      message += `${i + 1}. ${q.question}\n`;
    });

    if (remainingQuestions.length > 3) {
      message += `\n...and ${remainingQuestions.length - 3} more.`;
    }

    // Add progress indicator
    message += `\n\n📊 Progress: ${progress.answered}/${progress.total} (${progress.percentage}%)`;

    return message;
  }

  /**
   * Generate context chips for UI display
   */
  private generateContextChips(slots: any, questions: Question[]): Array<any> {
    const chips: Array<any> = [];

    for (const question of questions) {
      const value = this.getNestedValue(slots, question.slot_path);
      const filled = !!value;

      chips.push({
        label: question.id.replace(/_/g, ' '),
        value: filled ? String(value) : 'Not set',
        category: question.required ? 'required' : 'optional',
        filled
      });
    }

    return chips;
  }

  /**
   * Deep merge two objects (slots)
   */
  private mergeSlots(existing: any, newSlots: any): any {
    if (!newSlots) return existing;

    const merged = { ...existing };

    for (const [key, value] of Object.entries(newSlots)) {
      if (value !== null && value !== undefined) {
        if (
          typeof value === 'object' &&
          !Array.isArray(value) &&
          merged[key] &&
          typeof merged[key] === 'object'
        ) {
          // Deep merge for nested objects
          merged[key] = { ...merged[key], ...value };
        } else {
          // Direct assignment
          merged[key] = value;
        }
      }
    }

    return merged;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

// Export singleton instance
export const universalPlanningAgent = new UniversalPlanningAgent();
