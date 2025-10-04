import Anthropic from "@anthropic-ai/sdk";
import { domainRegistry, type Question, type DomainConfig } from './domainRegistry';
import { enrichmentService } from './enrichmentService';
import { contextualEnrichmentAgent } from './contextualEnrichmentAgent';
import { claudeQuestionGenerator } from './claudeQuestionGenerator';
import { claudeGapAnalyzer } from './claudeGapAnalyzer';
import { claudeWebEnrichment } from './claudeWebEnrichment';
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
  phase: 'context_recognition' | 'gathering' | 'enrichment' | 'synthesis' | 'completed' | 'confirming' | 'confirmed' | 'refining';
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
   * Detect if message looks like a pasted conversation with numbered steps
   */
  private detectPastedConversation(message: string): { isPasted: boolean; steps: string[] } {
    const steps: string[] = [];
    
    // Method 1: Check for numbered steps on separate lines (original format)
    const lineBasedSteps = /(?:^|\n)\s*\d+\.\s*(.+?)(?=\n|$)/gm;
    const lineMatches = Array.from(message.matchAll(lineBasedSteps));
    
    // Method 2: Check for numbered steps in continuous text (emoji or space-separated)
    // Matches patterns like "🧠 1. Document" or "1. Document" anywhere in text
    const inlineStepsRegex = /[🔐🧠™️©️🧪🧾🔧📋💡]?\s*\d+\.\s*([A-Z][^.!?]*(?:[.!?]|(?=\s*\d+\.|$)))/g;
    const inlineMatches = Array.from(message.matchAll(inlineStepsRegex));
    
    // Determine if this looks like a pasted conversation
    const hasMultipleSteps = lineMatches.length >= 3 || inlineMatches.length >= 3;
    const hasLongText = message.length > 200;
    const hasKeywords = /step|plan|action|workflow|process|guide/i.test(message);
    
    const isPasted = hasMultipleSteps && (hasLongText || hasKeywords);
    
    if (isPasted) {
      // Extract from line-based matches first
      for (const match of lineMatches) {
        if (match[1]) {
          const stepText = match[1].trim();
          if (stepText.length > 5 && !stepText.match(/^(Step-by-Step|Steps?:|Here'?s|Perfect|Important|Note:)/i)) {
            steps.push(stepText);
          }
        }
      }
      
      // If no line-based steps, try inline steps
      if (steps.length === 0 && inlineMatches.length >= 3) {
        for (const match of inlineMatches) {
          if (match[1]) {
            let stepText = match[1].trim();
            // Clean up the step text
            stepText = stepText.replace(/\s*Steps?:?\s*-?\s*/g, '').trim();
            if (stepText.length > 10 && !stepText.match(/^(Step-by-Step|Here'?s|Perfect|Important|Note:)/i)) {
              steps.push(stepText);
            }
          }
        }
      }
      
      return { isPasted: true, steps: steps.slice(0, 15) }; // Limit to 15 steps max
    }
    
    return { isPasted: false, steps: [] };
  }

  /**
   * Convert pasted conversation steps into a plan
   */
  private async convertPastedConversation(
    steps: string[],
    originalMessage: string,
    userProfile: User
  ): Promise<UniversalPlanningResponse> {
    console.log('[PASTED CONVERSATION] Detected', steps.length, 'steps');
    
    // Use Claude to extract a title and organize the steps
    const response = await anthropic.messages.create({
      model: DEFAULT_CLAUDE_MODEL,
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `The user pasted the following conversation with action steps. Extract a concise title for the overall plan and organize the steps:

${originalMessage}

Return a JSON object with:
{
  "title": "concise plan title (max 60 chars)",
  "description": "brief summary (max 150 chars)",
  "steps": [
    {"title": "step title", "description": "step description", "priority": "high|medium|low"}
  ]
}

Make sure each step has a clear, actionable title and helpful description.`
      }]
    });

    // Fallback plan data in case parsing fails
    const fallbackPlanData = {
      title: "Action Plan from Pasted Conversation",
      description: "Converted from pasted conversation",
      steps: steps.slice(0, 10).map((step, i) => ({
        title: step.slice(0, 80),
        description: `Step ${i + 1}`,
        priority: i < 3 ? 'high' : 'medium'
      }))
    };

    let planData = fallbackPlanData;
    
    // Guard against non-text responses or empty content
    if (response.content.length > 0 && response.content[0].type === 'text') {
      const contentBlock = response.content[0];
      try {
        const jsonMatch = contentBlock.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          // Validate that parsed data has required fields
          if (parsed.title && parsed.steps && Array.isArray(parsed.steps)) {
            planData = parsed;
          }
        }
      } catch (e) {
        console.warn('[PASTED CONVERSATION] JSON parsing failed, using fallback:', e);
        // planData already set to fallbackPlanData
      }
    } else {
      console.warn('[PASTED CONVERSATION] Non-text response, using fallback');
    }

    // Create enriched plan structure
    const enrichedPlan = {
      richContent: `# ${planData.title}\n\n${planData.description}\n\n` +
        planData.steps.map((step: any, i: number) => 
          `**${i + 1}. ${step.title}**\n${step.description || ''}`
        ).join('\n\n'),
      structuredData: {
        activity: {
          title: planData.title,
          description: planData.description,
          category: 'productivity'
        },
        tasks: planData.steps.map((step: any) => ({
          title: step.title,
          description: step.description || '',
          priority: step.priority || 'medium'
        }))
      }
    };

    return {
      message: enrichedPlan.richContent + "\n\n---\n\n**I've converted your pasted conversation into an action plan!**\n\n• Say **'yes'** or **'generate plan'** to create it\n• Say **'no'** if you want to make changes",
      phase: 'confirming',
      progress: { answered: steps.length, total: steps.length, percentage: 100 },
      readyToGenerate: false,
      planReady: false,
      showGenerateButton: false,
      enrichedPlan,
      updatedSlots: { 
        _generatedPlan: enrichedPlan, 
        _planState: 'confirming',
        _pastedConversation: true 
      },
      domain: 'productivity'
    };
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
      // Check if this is a pasted conversation (first message only)
      if (conversationHistory.length === 0) {
        const pastedCheck = this.detectPastedConversation(userMessage);
        if (pastedCheck.isPasted && pastedCheck.steps.length >= 3) {
          console.log('[PASTED CONVERSATION] Converting to action plan');
          return await this.convertPastedConversation(
            pastedCheck.steps,
            userMessage,
            userProfile
          );
        }
      }
      // PHASE 1: Recognize Context Switch
      const context = await this.recognizeContext(
        userMessage,
        conversationHistory,
        currentDomain
      );

      console.log('[PHASE 1] Context:', context);

      // Check if user is asking about non-planning topic (low confidence)
      if (context.confidence < 0.5) {
        // If we have conversation history, don't reset - just ask for clarification
        if (conversationHistory && conversationHistory.length > 0) {
          return {
            message: "I didn't quite catch that. Could you rephrase what you said?",
            phase: 'gathering',
            readyToGenerate: false,
            planReady: false,
            showGenerateButton: false,
            updatedSlots: currentSlots,
            domain: currentDomain
          };
        }
        
        // First message with low confidence - explain what we do
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

      // PHASE 2: Generate Top Questions (Dynamic with Claude)
      console.log(`[PHASE 2] Generating ${planMode} questions for ${context.domain} using Claude...`);

      const questionResult = await claudeQuestionGenerator.generateQuestions(
        context.domain,
        planMode,
        userProfile,
        userMessage
      );

      const questions = questionResult.questions;
      console.log(`[PHASE 2] Generated ${questions.length} questions (Claude-powered, ordered by priority)`);

      // Merge extracted slots with existing slots
      const mergedSlots = this.mergeSlots(currentSlots || {}, context.extractedSlots);

      // PHASE 3: Identify Information Needs (Intelligent Gap Analysis with Claude)
      console.log(`[PHASE 3] Analyzing gaps using Claude NLU...`);

      const gapAnalysisResult = await claudeGapAnalyzer.analyzeGaps(
        userMessage,
        conversationHistory,
        questions,
        mergedSlots
      );

      // Map to old structure for compatibility
      const gapAnalysis = {
        answeredQuestions: gapAnalysisResult.answeredQuestions,
        remainingQuestions: gapAnalysisResult.unansweredQuestions,
        answeredCount: gapAnalysisResult.answeredQuestions.length,
        totalCount: questions.length,
        allQuestionsAnswered: gapAnalysisResult.readyToGenerate,
        collectedSlots: gapAnalysisResult.extractedSlots,
        progress: {
          percentage: gapAnalysisResult.completionPercentage,
          answered: gapAnalysisResult.answeredQuestions.length,
          total: questions.length
        }
      };

      console.log(`[PHASE 3] Gap Analysis: ${gapAnalysis.answeredCount}/${gapAnalysis.totalCount} questions answered`);
      console.log(`[PHASE 3] Completion: ${gapAnalysis.progress.percentage}% | Ready: ${gapAnalysis.allQuestionsAnswered}`);

      // Generate context chips for UI
      const contextChips = this.generateContextChips(mergedSlots, questions);

      // USE CLAUDE TO INFER USER INTENT - This is the smart contextual layer
      const intentInference = await this.inferUserIntent(
        userMessage,
        conversationHistory,
        currentSlots,
        currentDomain
      );

      console.log('[INTENT INFERENCE]', intentInference);

      // Handle "none" responses - user indicating suggestions don't apply
      if (intentInference.isNoneResponse && !currentSlots?._generatedPlan && gapAnalysis.answeredCount < gapAnalysis.totalCount) {
        console.log('[NONE RESPONSE] User indicated none of the suggestions apply');
        return {
          message: "I understand none of those options work for you. Could you tell me more about what you're looking for? This will help me provide better suggestions tailored to your needs.",
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

      // If Claude detected a planning intent that doesn't match current domain OR it's a new session
      if (intentInference.isPlanningRequest && intentInference.inferredDomain) {
        const isDomainSwitch = currentDomain && intentInference.inferredDomain !== currentDomain;
        const isNewSession = !currentDomain;

        if (isDomainSwitch || isNewSession) {
          console.log(`[${isDomainSwitch ? 'DOMAIN SWITCH' : 'NEW SESSION'}] Using inferred domain:`, intentInference.inferredDomain);

          // Override with Claude's inference
          context.domain = intentInference.inferredDomain;
          context.extractedSlots = { ...context.extractedSlots, ...intentInference.extractedInfo };

          // Get questions for inferred domain
          const newQuestions = domainRegistry.getQuestions(intentInference.inferredDomain, planMode);

          // Merge extracted info and re-analyze gaps
          const mergedWithInference = this.mergeSlots(currentSlots || {}, intentInference.extractedInfo);
          const newGapAnalysis = await this.analyzeGaps(userMessage, newQuestions, mergedWithInference);

          console.log(`[GAP ANALYSIS] ${newGapAnalysis.answeredCount}/${newGapAnalysis.totalCount} for ${intentInference.inferredDomain}`);

          if (newGapAnalysis.allQuestionsAnswered) {
            // All questions answered - generate plan
            const enrichmentRules = domainRegistry.getEnrichmentRules(intentInference.inferredDomain);
            const enrichedData = await enrichmentService.enrichPlan(
              intentInference.inferredDomain,
              mergedWithInference,
              enrichmentRules,
              userProfile
            );

            const beautifulPlan = await this.synthesizePlan(
              intentInference.inferredDomain,
              mergedWithInference,
              enrichedData,
              userProfile
            );

            return {
              message: beautifulPlan.richContent + "\n\n---\n\n**Are you comfortable with this plan?**\n\n• Say **'yes'** to proceed with generating\n• Say **'no'** to make changes",
              phase: 'confirming',
              progress: newGapAnalysis.progress,
              contextChips: this.generateContextChips(mergedWithInference, newQuestions),
              readyToGenerate: false,
              planReady: false,
              showGenerateButton: false,
              enrichedPlan: beautifulPlan,
              updatedSlots: { ...mergedWithInference, _generatedPlan: beautifulPlan, _planState: 'confirming' },
              domain: intentInference.inferredDomain
            };
          } else {
            // Ask remaining questions
            const responseMessage = this.formatRemainingQuestions(
              newGapAnalysis,
              intentInference.inferredDomain,
              planMode
            );

            return {
              message: responseMessage,
              phase: 'gathering',
              progress: newGapAnalysis.progress,
              contextChips: this.generateContextChips(mergedWithInference, newQuestions),
              readyToGenerate: false,
              planReady: false,
              showGenerateButton: false,
              updatedSlots: mergedWithInference,
              domain: intentInference.inferredDomain
            };
          }
        }
      }

      // If NOT a planning request and we're confident about it
      if (!intentInference.isPlanningRequest && intentInference.confidence > 0.7 && !currentDomain) {
        console.log('[NOT PLANNING] User request is not planning-related');
        return {
          message: intentInference.clarificationNeeded
            ? `I'm not quite sure what you're asking for. ${intentInference.suggestedClarification || 'Could you clarify what you\'d like to plan?'}`
            : "I'm a planning assistant designed to help you plan activities like:\n• 🗓️ Travel & trips\n• 💼 Interview preparation\n• 🌹 Date nights & romantic evenings\n• 💪 Workouts & fitness goals\n• 📋 Daily tasks & routines\n\nWhat would you like to plan today?",
          phase: 'context_recognition',
          readyToGenerate: false,
          planReady: false,
          showGenerateButton: false,
          updatedSlots: currentSlots,
          domain: undefined
        };
      }

      // Check if user is in refinement mode (adding changes to plan)
      const isRefinementMode = currentSlots?._planState === 'refining';
      const hasGeneratedPlan = currentSlots?._generatedPlan;

      // Handle user confirmation response
      const userConfirmation = this.detectConfirmation(userMessage);

      if (hasGeneratedPlan && userConfirmation === 'yes') {
        console.log('[CONFIRMATION] User approved plan - ready to generate');
        return {
          message: "Perfect! Click the **Generate Plan** button below to create your actionable plan! 🚀",
          phase: 'confirmed',
          progress: { percentage: 100, answered: gapAnalysis.totalCount, total: gapAnalysis.totalCount },
          contextChips,
          readyToGenerate: true,
          planReady: true,
          showGenerateButton: true,
          enrichedPlan: currentSlots._generatedPlan,
          updatedSlots: { ...mergedSlots, _planState: 'confirmed' },
          domain: context.domain
        };
      }

      if (hasGeneratedPlan && userConfirmation === 'no') {
        console.log('[REFINEMENT] User wants changes - entering refinement mode');
        return {
          message: "No problem! What would you like to add or change? (You can also say 'none' if you changed your mind)",
          phase: 'refining',
          progress: gapAnalysis.progress,
          contextChips,
          readyToGenerate: false,
          planReady: false,
          showGenerateButton: false,
          updatedSlots: { ...mergedSlots, _planState: 'refining' },
          domain: context.domain
        };
      }

      // Handle refinement input (user providing changes one at a time)
      if (isRefinementMode && userMessage.toLowerCase() !== 'none') {
        console.log('[REFINEMENT] Processing user changes:', userMessage);

        // Extract refinement from user message
        const refinements = mergedSlots._refinements || [];
        refinements.push(userMessage);

        // Use CACHED enriched data (don't re-run enrichment - saves API calls!)
        const enrichedData = mergedSlots._enrichedData || {};
        console.log('[REFINEMENT] Using cached enrichment data (no API calls)');

        // Regenerate plan with refinements using cached data
        const refinedPlan = await this.synthesizePlan(
          context.domain,
          mergedSlots,
          enrichedData,
          userProfile,
          refinements
        );

        // Show refinement history to user
        const refinementHistory = refinements.length > 0
          ? `\n\n**Changes applied (${refinements.length}):**\n${refinements.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}\n`
          : '';

        return {
          message: refinedPlan.richContent + refinementHistory + "\n\n---\n\n**Are you comfortable with this updated plan?**\n\n• Say **'yes'** to proceed with generating\n• Say **'no'** to make more changes",
          phase: 'confirming',
          progress: gapAnalysis.progress,
          contextChips,
          readyToGenerate: false,
          planReady: false,
          showGenerateButton: false,
          updatedSlots: {
            ...mergedSlots,
            _generatedPlan: refinedPlan,
            _refinements: refinements,
            _enrichedData: enrichedData, // Keep cached enrichment
            _planState: 'confirming'
          },
          domain: context.domain
        };
      }

      if (isRefinementMode && userMessage.toLowerCase() === 'none') {
        console.log('[REFINEMENT] User chose "none" - back to confirmation');
        return {
          message: currentSlots._generatedPlan.richContent + "\n\n---\n\n**Are you comfortable with this plan?**\n\n• Say **'yes'** to proceed with generating\n• Say **'no'** to make changes",
          phase: 'confirming',
          progress: gapAnalysis.progress,
          contextChips,
          readyToGenerate: false,
          planReady: false,
          showGenerateButton: false,
          updatedSlots: { ...mergedSlots, _planState: 'confirming' },
          domain: context.domain
        };
      }

      // If all questions answered, proceed to enrichment and synthesis
      if (gapAnalysis.allQuestionsAnswered) {

        console.log('[PHASE 4] All questions answered - starting Claude web search enrichment');

        // PHASE 4: Real-time Information Enrichment (Claude Web Search)
        const enrichmentRules = domainRegistry.getEnrichmentRules(context.domain);
        const enrichedData = await claudeWebEnrichment.enrichPlan(
          context.domain,
          gapAnalysis.collectedSlots,
          enrichmentRules,
          userProfile
        );

        console.log('[PHASE 4] Enrichment complete:', Object.keys(enrichedData));
        console.log('[PHASE 5] Generating beautiful plan with enriched data');

        // PHASE 5: Generate Beautiful, Actionable Plan
        const beautifulPlan = await this.synthesizePlan(
          context.domain,
          gapAnalysis.collectedSlots,
          enrichedData,
          userProfile
        );

        return {
          message: beautifulPlan.richContent + "\n\n---\n\n**Are you comfortable with this plan?**\n\n• Say **'yes'** to proceed with generating\n• Say **'no'** to make changes",
          phase: 'confirming',
          progress: gapAnalysis.progress,
          contextChips,
          readyToGenerate: false,
          planReady: false,
          showGenerateButton: false,
          enrichedPlan: beautifulPlan,
          updatedSlots: {
            ...gapAnalysis.collectedSlots,
            _generatedPlan: beautifulPlan,
            _enrichedData: enrichedData, // Cache for refinements
            _planState: 'confirming'
          },
          domain: context.domain
        };

      } else {
        // INTELLIGENT INFERENCE: Check if we have enough info to generate plan
        const completionPercentage = gapAnalysis.progress.percentage;
        const requiredQuestions = questions.filter(q => q.required);
        const requiredAnswered = requiredQuestions.filter(rq => 
          gapAnalysis.answeredQuestions.some(aq => aq.id === rq.id)
        ).length;
        const allRequiredAnswered = requiredAnswered === requiredQuestions.length;

        // Generate plan if:
        // 1. All required questions answered, OR
        // 2. 85%+ overall completion (enough context to infer)
        const shouldInferAndGenerate = allRequiredAnswered || completionPercentage >= 85;

        if (shouldInferAndGenerate) {
          console.log(`[SMART INFERENCE] Sufficient info to generate plan (${completionPercentage}% complete, ${requiredAnswered}/${requiredQuestions.length} required answered)`);

          // Generate plan with available information
          const enrichmentRules = domainRegistry.getEnrichmentRules(context.domain);
          const enrichedData = await claudeWebEnrichment.enrichPlan(
            context.domain,
            gapAnalysis.collectedSlots,
            enrichmentRules,
            userProfile
          );

          const beautifulPlan = await this.synthesizePlan(
            context.domain,
            gapAnalysis.collectedSlots,
            enrichedData,
            userProfile
          );

          return {
            message: beautifulPlan.richContent + "\n\n---\n\n**Are you comfortable with this plan?**\n\n• Say **'yes'** to proceed with generating\n• Say **'no'** to make changes",
            phase: 'confirming',
            progress: gapAnalysis.progress,
            contextChips,
            readyToGenerate: false,
            planReady: false,
            showGenerateButton: false,
            enrichedPlan: beautifulPlan,
            updatedSlots: {
              ...gapAnalysis.collectedSlots,
              _generatedPlan: beautifulPlan,
              _enrichedData: enrichedData,
              _planState: 'confirming'
            },
            domain: context.domain
          };
        }

        // Track questions that have been asked to prevent repeats
        const askedQuestionIds = new Set(mergedSlots._askedQuestions || []);
        console.log(`[ASKED QUESTIONS] Already asked: ${Array.from(askedQuestionIds).join(', ')}`);

        // Use Claude's next question recommendation, but ensure it hasn't been asked before
        let nextQuestion = gapAnalysisResult.nextQuestionToAsk;

        // CRITICAL: Never ask a question that's already been asked
        if (nextQuestion && askedQuestionIds.has(nextQuestion.id)) {
          console.warn(`[DUPLICATE PREVENTION] Question "${nextQuestion.id}" already asked, finding alternative...`);
          
          // Find first unanswered question that hasn't been asked yet
          nextQuestion = gapAnalysis.remainingQuestions.find(q => !askedQuestionIds.has(q.id)) || null;
          
          if (!nextQuestion) {
            // All questions have been asked - generate plan with what we have
            console.log(`[INFERENCE] All questions asked, generating plan with available info`);
            const enrichmentRules = domainRegistry.getEnrichmentRules(context.domain);
            const enrichedData = await claudeWebEnrichment.enrichPlan(
              context.domain,
              gapAnalysis.collectedSlots,
              enrichmentRules,
              userProfile
            );

            const beautifulPlan = await this.synthesizePlan(
              context.domain,
              gapAnalysis.collectedSlots,
              enrichedData,
              userProfile
            );

            return {
              message: beautifulPlan.richContent + "\n\n---\n\n**Are you comfortable with this plan?**\n\n• Say **'yes'** to proceed with generating\n• Say **'no'** to make changes",
              phase: 'confirming',
              progress: gapAnalysis.progress,
              contextChips,
              readyToGenerate: false,
              planReady: false,
              showGenerateButton: false,
              enrichedPlan: beautifulPlan,
              updatedSlots: {
                ...gapAnalysis.collectedSlots,
                _generatedPlan: beautifulPlan,
                _enrichedData: enrichedData,
                _planState: 'confirming'
              },
              domain: context.domain
            };
          }
        }

        console.log(`[PHASE 3] Asking next question: ${gapAnalysis.remainingQuestions.length} remaining`);

        let responseMessage = '';
        if (gapAnalysis.answeredCount === 0) {
          responseMessage = `Great! Let's plan your ${context.domain.replace('_', ' ')}. `;
        } else {
          responseMessage = `Perfect! `;
        }

        if (nextQuestion) {
          responseMessage += `${nextQuestion.question}`;
          
          // Track this question as asked
          askedQuestionIds.add(nextQuestion.id);
          
          if (nextQuestion.why_needs_asking && gapAnalysis.answeredCount > 0) {
            console.log(`[NEXT QUESTION WHY] ${nextQuestion.why_needs_asking}`);
          }
        } else {
          responseMessage += `Could you tell me more about your plans?`;
        }

        responseMessage += `\n\n📊 Progress: ${gapAnalysis.progress.answered}/${gapAnalysis.progress.total} (${gapAnalysis.progress.percentage}%)`;

        return {
          message: responseMessage,
          phase: 'gathering',
          progress: gapAnalysis.progress,
          contextChips,
          readyToGenerate: false,
          planReady: false,
          showGenerateButton: false,
          updatedSlots: {
            ...gapAnalysis.collectedSlots,
            _askedQuestions: Array.from(askedQuestionIds)
          },
          domain: context.domain
        };
      }

    } catch (error) {
      console.error('[UNIVERSAL AGENT] Error:', error);
      return {
        message: "I didn't quite catch that. Could you rephrase what you said?",
        phase: 'gathering',
        readyToGenerate: false,
        updatedSlots: currentSlots,
        domain: currentDomain
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
    const isContextSwitch = !!currentDomain && currentDomain !== detection.domain;

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
    userProfile: User,
    refinements?: string[]
  ): Promise<any> {

    console.log('[SYNTHESIS] Using contextualEnrichmentAgent for beautiful plan');

    // Use the existing contextual enrichment agent
    const enrichedPlan = await contextualEnrichmentAgent.generateRichPlan(
      slots,
      userProfile,
      domain,
      refinements
    );

    return enrichedPlan;
  }

  /**
   * Detect user confirmation (yes/no)
   */
  private detectConfirmation(message: string): 'yes' | 'no' | null {
    const lower = message.toLowerCase().trim();

    // Yes patterns
    const yesPatterns = [
      /^yes$/i,
      /^yeah$/i,
      /^yep$/i,
      /^sure$/i,
      /^okay$/i,
      /^ok$/i,
      /^perfect$/i,
      /^sounds good$/i,
      /^looks good$/i,
      /^i'm comfortable$/i,
      /^comfortable$/i,
      /^proceed$/i,
      /^let's do it$/i,
      /^let's go$/i,
      /^create it$/i,
      /^generate it$/i
    ];

    // No patterns
    const noPatterns = [
      /^no$/i,
      /^nope$/i,
      /^nah$/i,
      /^not yet$/i,
      /^not comfortable$/i,
      /^i want.*change/i,
      /^i'd like.*change/i,
      /^i want.*add/i,
      /^i'd like.*add/i,
      /^let me.*change/i,
      /^wait$/i,
      /^hold on$/i
    ];

    if (yesPatterns.some(p => p.test(lower))) return 'yes';
    if (noPatterns.some(p => p.test(lower))) return 'no';

    return null;
  }

  /**
   * Detect if user is saying "none" to indicate suggestions don't apply
   */
  private detectNoneResponse(message: string): boolean {
    const lower = message.toLowerCase().trim();

    const nonePatterns = [
      /^none$/i,
      /^none of (these|those|them|that)$/i,
      /^none of (these|those|them|that) (work|apply|fit)$/i,
      /^not any of (these|those|them|that)$/i,
      /^neither$/i,
      /^nothing (here|there)$/i,
      /^none (apply|work|fit)/i,
      /^none (of them )?work/i,
      /^that (doesn't|does not) work/i,
      /^those (don't|do not) work/i
    ];

    return nonePatterns.some(p => p.test(lower));
  }

  /**
   * Use Claude to infer user intent - the smart contextual understanding layer
   */
  private async inferUserIntent(
    userMessage: string,
    conversationHistory: any[],
    currentSlots: any,
    currentDomain?: string
  ): Promise<{
    isPlanningRequest: boolean;
    isNoneResponse: boolean;
    inferredDomain?: string;
    extractedInfo?: any;
    confidence: number;
    clarificationNeeded?: boolean;
    suggestedClarification?: string;
  }> {
    try {
      const availableDomains = domainRegistry.getAvailableDomains();
      const conversationContext = conversationHistory.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n');

      const prompt = `You are an intelligent planning assistant. Analyze the user's message to determine their intent.

AVAILABLE PLANNING DOMAINS:
${availableDomains.map(d => `- ${d}: ${domainRegistry.getDomain(d)?.description || ''}`).join('\n')}

CONVERSATION CONTEXT:
${conversationContext || 'No previous context'}

CURRENT DOMAIN: ${currentDomain || 'None (new session)'}

CURRENT COLLECTED INFO:
${JSON.stringify(currentSlots || {}, null, 2)}

USER'S LATEST MESSAGE: "${userMessage}"

ANALYZE AND RESPOND WITH JSON:
{
  "isPlanningRequest": true/false,
  "isNoneResponse": true/false,  // True if user said "none", "none of these", "nothing", etc.
  "inferredDomain": "domain_name or null",
  "extractedInfo": {
    // Any information you can extract from the message (dates, times, locations, etc.)
    // Map to slot paths: "timing.date", "location.destination", "budget.range", etc.
  },
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of your analysis",
  "clarificationNeeded": true/false,
  "suggestedClarification": "What to ask the user if clarification is needed"
}

EXAMPLES:

User: "dinner by 5"
Response: {
  "isPlanningRequest": true,
  "isNoneResponse": false,
  "inferredDomain": "date_night",
  "extractedInfo": {"timing": {"time": "5pm"}, "mealType": "dinner"},
  "confidence": 0.9,
  "reasoning": "User wants to plan dinner by 5pm - this is date night planning",
  "clarificationNeeded": false
}

User: "none of these"
Response: {
  "isPlanningRequest": false,
  "isNoneResponse": true,
  "inferredDomain": null,
  "extractedInfo": {},
  "confidence": 0.95,
  "reasoning": "User indicated none of the suggestions apply",
  "clarificationNeeded": true,
  "suggestedClarification": "Could you tell me more about what you're looking for?"
}

User: "what's the weather"
Response: {
  "isPlanningRequest": false,
  "isNoneResponse": false,
  "inferredDomain": null,
  "extractedInfo": {},
  "confidence": 0.9,
  "reasoning": "This is a weather query, not a planning request",
  "clarificationNeeded": true,
  "suggestedClarification": "I'm a planning assistant. Would you like to plan an activity?"
}

User: "workout tomorrow morning"
Response: {
  "isPlanningRequest": true,
  "isNoneResponse": false,
  "inferredDomain": "fitness",
  "extractedInfo": {"timing": {"date": "tomorrow", "time": "morning"}},
  "confidence": 0.95,
  "reasoning": "User wants to plan a workout for tomorrow morning",
  "clarificationNeeded": false
}

NOW ANALYZE THE USER'S MESSAGE AND RESPOND WITH ONLY JSON:`;

      const response = await anthropic.messages.create({
        model: DEFAULT_CLAUDE_MODEL,
        max_tokens: 500,
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

      const inference = JSON.parse(jsonStr);
      console.log('[CLAUDE INFERENCE]', inference);

      return {
        isPlanningRequest: inference.isPlanningRequest || false,
        isNoneResponse: inference.isNoneResponse || false,
        inferredDomain: inference.inferredDomain,
        extractedInfo: inference.extractedInfo || {},
        confidence: inference.confidence || 0.5,
        clarificationNeeded: inference.clarificationNeeded,
        suggestedClarification: inference.suggestedClarification
      };

    } catch (error) {
      console.error('[INTENT INFERENCE] Error:', error);
      // Fallback to basic detection
      return {
        isPlanningRequest: true,
        isNoneResponse: this.detectNoneResponse(userMessage),
        confidence: 0.5,
        extractedInfo: {}
      };
    }
  }

  /**
   * Detect contextual planning intent (e.g., "dinner by 5", "workout tomorrow") - LEGACY FALLBACK
   */
  private detectPlanningIntent(message: string): { detected: boolean; type?: string; details?: any } {
    const lower = message.toLowerCase().trim();

    // Meal/food planning patterns
    const mealPatterns = [
      /(?:plan|get|make|order|cook|prepare)?\s*(?:a\s+)?(breakfast|lunch|dinner|brunch|meal)\s+(?:by|at|for|around)\s+(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)/i,
      /(breakfast|lunch|dinner|brunch|meal)\s+(?:by|at|for|around)\s+(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)/i,
      /(?:eat|have)\s+(?:a\s+)?(breakfast|lunch|dinner|brunch)\s+(?:by|at|for|around)\s+(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)/i
    ];

    // Exercise/workout patterns
    const workoutPatterns = [
      /(?:do|go|have|plan)\s+(?:a\s+)?(workout|exercise|gym|run|jog)\s+(?:by|at|for|around|tomorrow|today)/i,
      /(workout|exercise|gym|run|jog)\s+(?:session\s+)?(?:by|at|for|around|tomorrow|today)/i
    ];

    // Date/event patterns
    const datePatterns = [
      /(?:plan|organize|set up|arrange)\s+(?:a\s+)?(date|romantic.*?|evening)\s+(?:by|at|for|around|tonight|today)/i,
      /(date|romantic.*?)\s+(?:night|evening)\s+(?:by|at|for|tonight)/i
    ];

    // Travel patterns
    const travelPatterns = [
      /(?:plan|book|organize)\s+(?:a\s+)?(trip|vacation|travel|getaway)\s+(?:to|for)\s+([a-z\s]+)/i,
      /(?:going|traveling|heading)\s+to\s+([a-z\s]+)\s+(?:on|by|next|this)/i
    ];

    for (const pattern of mealPatterns) {
      const match = message.match(pattern);
      if (match) {
        return {
          detected: true,
          type: 'date_night',
          details: {
            mealType: match[1],
            time: match[2],
            extracted: `Planning ${match[1]} by ${match[2]}`
          }
        };
      }
    }

    for (const pattern of workoutPatterns) {
      const match = message.match(pattern);
      if (match) {
        return {
          detected: true,
          type: 'fitness',
          details: {
            activityType: match[1],
            extracted: `Planning ${match[1]}`
          }
        };
      }
    }

    for (const pattern of datePatterns) {
      const match = message.match(pattern);
      if (match) {
        return {
          detected: true,
          type: 'date_night',
          details: {
            eventType: match[1],
            extracted: `Planning ${match[1]}`
          }
        };
      }
    }

    for (const pattern of travelPatterns) {
      const match = message.match(pattern);
      if (match) {
        return {
          detected: true,
          type: 'travel',
          details: {
            destination: match[1],
            extracted: `Planning travel to ${match[1]}`
          }
        };
      }
    }

    return { detected: false };
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
