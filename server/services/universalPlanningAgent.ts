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
   * Extract slots from user message using Claude
   */
  private async extractSlotsFromMessage(message: string, domain: string): Promise<any> {
    try {
      const prompt = `Extract all relevant information from this user message for ${domain} planning.

User message: "${message}"

Extract information like:
- Locations/destinations
- Dates and times
- Durations
- Budgets
- Purposes/goals
- Preferences
- Any other relevant details

Respond with JSON only:
{
  "location": {"destination": "..."},
  "timing": {"date": "...", "duration": "..."},
  "budget": {"range": "..."},
  ...
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
      return {};
    }
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
