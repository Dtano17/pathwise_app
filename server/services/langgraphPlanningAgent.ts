/**
 * LangGraph-based Planning Agent (Phase 2)
 *
 * Replaces the imperative universalPlanningAgent with a declarative state machine:
 * - Persistent state across conversation turns
 * - Enforced duplicate prevention
 * - Clear workflow visualization
 * - Type-safe state management
 * - Multi-LLM provider support with automatic fallback
 */

import { StateGraph, Annotation, END } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { executeLLMCall, type LLMCompletionResult } from './llmProvider';
import { OpenAIProvider } from './openAIProvider';
import { ClaudeProvider } from './claudeProvider';
import type { User } from '@shared/schema';
import type { DomainConfig, Question } from './domainRegistry';
import { domainRegistry } from './domainRegistry';
import type { IStorage } from '../storage';

// Simple in-memory cache for enrichment data (6 hour TTL)
const enrichmentCache = new Map<string, { data: any; expiresAt: number }>();

/**
 * Provider-aware function call parser
 * Automatically detects which provider was used and calls the appropriate parser
 */
function parseFunctionCall<T>(result: LLMCompletionResult & { __providerName?: string }): T {
  const providerName = result.__providerName || 'openai';
  
  // Use provider-specific parser
  if (providerName.includes('claude')) {
    return ClaudeProvider.parseFunctionCall<T>(result);
  } else {
    return OpenAIProvider.parseFunctionCall<T>(result);
  }
}

/**
 * State schema for the planning conversation
 *
 * LangGraph enforces that state only moves forward (no regressions)
 */
const PlanningState = Annotation.Root({
  // Input
  userId: Annotation<number>(),
  userMessage: Annotation<string>(),
  userProfile: Annotation<User>(),
  planMode: Annotation<'quick' | 'smart'>({ default: () => 'quick' }),
  conversationHistory: Annotation<Array<{ role: string; content: string }>>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => []
  }),

  // Domain Detection
  domain: Annotation<string>({ default: () => 'general' }),
  domainConfidence: Annotation<number>({ default: () => 0 }),
  domainConfig: Annotation<DomainConfig | null>({ default: () => null }),

  // Question Management
  allQuestions: Annotation<Question[]>({ default: () => [] }),
  askedQuestionIds: Annotation<Set<string>>({
    reducer: (prev, next) => new Set([...prev, ...next]),
    default: () => new Set()
  }),
  answeredQuestions: Annotation<Array<{ questionId: string; answer: string; extractedValue: any }>>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => []
  }),

  // Slot Management
  slots: Annotation<Record<string, any>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({})
  }),

  // Progress Tracking (monotonically increasing)
  progress: Annotation<{
    answered: number;
    total: number;
    percentage: number;
  }>({
    reducer: (prev, next) => {
      // Enforce: Progress can only increase
      if (next.percentage < prev.percentage) {
        console.warn(`[LANGGRAPH] Progress regression prevented: ${prev.percentage}% -> ${next.percentage}%`);
        return prev;
      }
      return next;
    },
    default: () => ({ answered: 0, total: 0, percentage: 0 })
  }),

  // Current Phase
  phase: Annotation<'context_recognition' | 'gathering' | 'enrichment' | 'synthesis' | 'completed'>({
    default: () => 'context_recognition'
  }),

  // Enrichment
  enrichedData: Annotation<any>({ default: () => null }),

  // Final Plan
  finalPlan: Annotation<any>({ default: () => null }),

  // Created Activity (with tasks)
  createdActivity: Annotation<any>({ default: () => null }),

  // Next Action
  nextQuestion: Annotation<Question | null>({ default: () => null }),
  responseMessage: Annotation<string>({ default: () => '' }),
  readyToGenerate: Annotation<boolean>({ default: () => false }),

  // Storage (for activity/task creation)
  storage: Annotation<IStorage | null>({ default: () => null }),

  // Plan mode
  planMode: Annotation<'quick' | 'smart'>({ default: () => 'quick' }),
});

type PlanningStateType = typeof PlanningState.State;

/**
 * Node: Detect Domain
 * Uses OpenAI function calling for reliable domain classification
 */
async function detectDomain(state: PlanningStateType): Promise<Partial<PlanningStateType>> {
  console.log('[LANGGRAPH] Node: detect_domain');

  // Re-detect domain with full conversation context to handle:
  // 1. Topic switches (e.g., "plan my day" -> "plan my trip to dallas")
  // 2. Short follow-up answers (e.g., "Friday" after "Which day?" should stay in travel domain)

  // Build conversation context for classification
  const conversationContext = state.conversationHistory
    ?.map(msg => `${msg.role}: ${msg.content}`)
    .join('\n') || '';
  
  const fullContext = conversationContext 
    ? `Previous conversation:\n${conversationContext}\n\nCurrent message: ${state.userMessage}`
    : state.userMessage;

  const result = await executeLLMCall(
    'domain_detection',
    async (provider) => {
      return await provider.generateStructured(
        [
          {
            role: 'system',
            content: `You are a domain classification expert. Classify user requests into one of these domains:
- daily_planning: Planning daily schedule, organizing the day, time management
- travel: Trip planning, vacations, destinations
- interview_prep: Job interviews, career preparation
- event_planning: Parties, weddings, conferences
- fitness: Workout plans, training, health goals
- learning: Educational goals, skill development
- general: Everything else

When the user sends short follow-up responses (like "Friday" or "yes"), use the conversation context to understand which domain they're still discussing.
Only switch domains if the user clearly starts a new topic.
Return high confidence (0.8-1.0) only if clearly matches domain.`
          },
          {
            role: 'user',
            content: `Classify this conversation:\n\n${fullContext}`
          }
        ],
        [
          {
            name: 'classify_domain',
            description: 'Classify the user request domain',
            parameters: {
              type: 'object',
              properties: {
                domain: {
                  type: 'string',
                  enum: ['daily_planning', 'travel', 'interview_prep', 'event_planning', 'fitness', 'learning', 'general']
                },
                confidence: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1,
                  description: 'Confidence score 0-1'
                },
                reasoning: { type: 'string' }
              },
              required: ['domain', 'confidence']
            }
          }
        ]
      );
    }
  );

  const classified = parseFunctionCall<{
    domain: string;
    confidence: number;
    reasoning?: string;
  }>(result);

  console.log(`[LANGGRAPH] New classification: ${classified.domain} (confidence: ${classified.confidence})`);
  if (classified.reasoning) {
    console.log(`[LANGGRAPH] Reasoning: ${classified.reasoning}`);
  }

  // Hysteresis-based domain switching to prevent weak reclassifications while allowing topic changes
  // Strategy: Decay incumbent confidence each turn, then require new domain to exceed decayed confidence + margin
  // This allows legitimate topic switches while blocking weak misclassifications
  
  // If same domain detected, accept immediately (no switching needed)
  if (state.domain && classified.domain === state.domain) {
    console.log(`[LANGGRAPH] Same domain confirmed: ${classified.domain} (${classified.confidence.toFixed(2)})`);
    return {
      domainConfidence: classified.confidence // Update confidence
    };
  }
  
  // Apply confidence decay to incumbent domain (allows topic changes over time)
  const decayFactor = 0.85;
  const existingConfidence = state.domainConfidence || 0;
  const decayedConfidence = existingConfidence * decayFactor;
  const requiredMargin = 0.06; // Require 6% margin over decayed confidence (allows topic switch at 0.90, blocks misclass at 0.86)
  const requiredConfidence = decayedConfidence + requiredMargin;
  
  console.log(`[LANGGRAPH] Decay: ${existingConfidence.toFixed(2)} → ${decayedConfidence.toFixed(2)}, required: ${requiredConfidence.toFixed(2)}, new: ${classified.confidence.toFixed(2)}`);
  
  // For different domains, require strong evidence to switch:
  // Must meet BOTH criteria: exceed decayed confidence by margin AND meet absolute floor
  const shouldSwitchDomain = 
    !state.domain || // No existing domain
    state.domain === 'general' || // Currently in generic domain
    (classified.confidence >= requiredConfidence && classified.confidence >= 0.85); // Beat decayed confidence AND high absolute confidence
  
  if (!shouldSwitchDomain) {
    console.log(`[LANGGRAPH] Keeping existing domain: ${state.domain} - persisting decayed confidence: ${decayedConfidence.toFixed(2)}`);
    return {
      domainConfidence: decayedConfidence // Persist decayed confidence for future comparisons
    };
  }

  console.log(`[LANGGRAPH] Switching to domain: ${classified.domain}`);

  // Load domain config
  const domainConfig = domainRegistry.getDomain(classified.domain);

  return {
    domain: classified.domain,
    domainConfidence: classified.confidence,
    domainConfig: domainConfig || null,
    phase: 'gathering'
  };
}

/**
 * Node: Extract Slots
 * Uses OpenAI function calling to extract structured information from user message
 */
async function extractSlots(state: PlanningStateType): Promise<Partial<PlanningStateType>> {
  console.log('[LANGGRAPH] Node: extract_slots');

  if (!state.domainConfig) {
    console.warn('[LANGGRAPH] No domain config, skipping slot extraction');
    return {};
  }

  // Get the right question set based on plan mode (quick_plan or smart_plan)
  const planMode = state.planMode || 'quick';
  const questionKey = planMode === 'quick' ? 'quick_plan' : 'smart_plan';
  const questions = state.domainConfig.questions[questionKey] || state.domainConfig.questions.quick_plan || [];

  if (!Array.isArray(questions) || questions.length === 0) {
    console.warn('[LANGGRAPH] No questions found for domain config');
    return {};
  }

  // Build schema from domain config
  // Use question ID as slot name for consistent mapping
  const slotProperties: Record<string, any> = {};
  const requiredSlots: string[] = [];

  for (const question of questions) {
    // Use question ID directly as slot name (not last part of slot_path)
    const slotName = question.id;
    slotProperties[slotName] = {
      type: 'string',
      description: question.question
    };
    if (question.required) {
      requiredSlots.push(slotName);
    }
  }

  // Build full conversation context for extraction
  // This allows extracting information from ANY previous message, not just the current one
  const conversationContext = state.conversationHistory
    ?.map(msg => `${msg.role}: ${msg.content}`)
    .join('\n') || '';
  
  const fullContext = conversationContext 
    ? `Conversation history:\n${conversationContext}\n\nCurrent message: ${state.userMessage}`
    : state.userMessage;

  const result = await executeLLMCall(
    'slot_extraction',
    async (provider) => {
      return await provider.generateStructured(
        [
          {
            role: 'system',
            content: `Extract information from the conversation into structured slots. 
Search through ALL messages (not just the current one) to find information that answers each slot.
Only extract information explicitly mentioned. Use <UNKNOWN> for slots not mentioned anywhere in the conversation.

IMPORTANT: When the user provides multiple pieces of information in a single comprehensive answer, extract ALL of them.
For example: "I'm planning today, I have a medication appointment, my priorities are meditation and naps"
Should extract: date="today", fixedCommitments="medication appointment", priorities="meditation and naps"`
          },
          {
            role: 'user',
            content: fullContext
          }
        ],
        [
          {
            name: 'extract_slots',
            description: 'Extract structured information',
            parameters: {
              type: 'object',
              properties: slotProperties
            }
          }
        ]
      );
    }
  );

  const extractedSlots = parseFunctionCall<Record<string, any>>(result);

  // Filter out empty/null values but KEEP <UNKNOWN> markers for gap analysis
  const validSlots: Record<string, any> = {};
  for (const [key, value] of Object.entries(extractedSlots)) {
    if (value && value !== '' && value !== 'null' && value !== 'undefined') {
      validSlots[key] = value;
    }
  }

  console.log(`[LANGGRAPH] Extracted ${Object.keys(validSlots).length} slots:`, JSON.stringify(validSlots));

  // Merge with existing slots to preserve previously extracted information
  const mergedSlots = { ...state.slots, ...validSlots };

  return {
    slots: mergedSlots
  };
}

/**
 * Node: Generate Questions
 * Creates domain-specific questions based on plan mode
 */
async function generateQuestions(state: PlanningStateType): Promise<Partial<PlanningStateType>> {
  console.log('[LANGGRAPH] Node: generate_questions');

  if (!state.domainConfig) {
    console.warn('[LANGGRAPH] No domain config for question generation');
    return {
      allQuestions: []
    };
  }

  // Get the right question set based on plan mode
  const planMode = state.planMode || 'quick';
  const questionKey = planMode === 'quick' ? 'quick_plan' : 'smart_plan';
  const questions = state.domainConfig.questions[questionKey] || state.domainConfig.questions.quick_plan || [];

  console.log(`[LANGGRAPH] Generated ${questions.length} questions for domain: ${state.domain}`);

  // Create initial greeting message with all questions listed
  const domainName = state.domain?.replace('_', ' ') || 'activity';
  let initialMessage = `Great! Let's plan your ${domainName}. I have ${questions.length} quick questions:\n\n`;
  
  // Show first 3 questions
  const questionsToShow = questions.slice(0, 3);
  questionsToShow.forEach((q, i) => {
    initialMessage += `${i + 1}. ${q.question}\n`;
  });
  
  // Add "...and X more" if there are more questions
  if (questions.length > 3) {
    initialMessage += `\n...and ${questions.length - 3} more.\n`;
  }
  
  // Add progress indicator
  initialMessage += `\n📊 Progress: 0/${questions.length} (0%)`;

  return {
    allQuestions: questions,
    progress: {
      answered: 0,
      total: questions.length,
      percentage: 0
    },
    responseMessage: initialMessage,
    showInitialQuestions: true
  };
}

/**
 * Node: Analyze Gaps
 * Determines which questions are answered and what to ask next
 */
async function analyzeGaps(state: PlanningStateType): Promise<Partial<PlanningStateType>> {
  console.log('[LANGGRAPH] Node: analyze_gaps');

  // Build full conversation context
  const conversationContext = state.conversationHistory
    ?.map(msg => `${msg.role}: ${msg.content}`)
    .join('\n') || '';
  
  const fullContext = conversationContext 
    ? `Conversation:\n${conversationContext}\n\nCurrent: ${state.userMessage}`
    : state.userMessage;

  const result = await executeLLMCall(
    'gap_analysis',
    async (provider) => {
      return await provider.generateStructured(
        [
          {
            role: 'system',
            content: `You are analyzing which planning questions have been answered based on the ENTIRE conversation.

Questions to analyze:
${JSON.stringify(state.allQuestions, null, 2)}

User's extracted information (from ALL messages):
${JSON.stringify(state.slots, null, 2)}

Already asked question IDs (NEVER ask these again):
${JSON.stringify([...state.askedQuestionIds], null, 2)}

Determine:
1. Which questions are fully answered - Check if slots[question.id] exists with a real value
2. Which questions still need answers - NOT in slots object OR value is <UNKNOWN>
3. What's the most important unanswered question to ask next (must NOT be in askedQuestionIds)

CRITICAL MAPPING RULES:
- Each question has an ID (e.g., "destination", "dates_duration", "budget")
- A question with ID "X" is ANSWERED if: slots["X"] exists AND has a meaningful value
- Example: If slots = {"destination": "Bronx New York", "dates_duration": "November 10-17"}
  Then "destination" and "dates_duration" are ANSWERED
- Example: If slots = {"destination": "Dallas"} then "budget" is UNANSWERED (not in slots)

DUPLICATE PREVENTION:
- NEVER select a questionId that appears in "Already asked question IDs"
- If a question was asked before but user said "indefinite" or "not sure", DO NOT ask again
- Accept partial/vague answers like "indefinite budget" as answered

Do NOT ask questions that were already answered OR already asked!`
          },
          {
            role: 'user',
            content: fullContext
          }
        ],
        [
          {
            name: 'analyze_gaps',
            description: 'Analyze which questions are answered',
            parameters: {
              type: 'object',
              properties: {
                answeredQuestionIds: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'IDs of questions that are fully answered'
                },
                unansweredQuestionIds: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'IDs of questions still needing answers'
                },
                nextQuestionId: {
                  type: 'string',
                  description: 'ID of the most important question to ask next (must not be in askedQuestionIds)'
                },
                readyToGenerate: {
                  type: 'boolean',
                  description: 'True if enough information to generate a plan'
                }
              },
              required: ['answeredQuestionIds', 'unansweredQuestionIds', 'readyToGenerate']
            }
          }
        ]
      );
    }
  );

  const analysis = parseFunctionCall<{
    answeredQuestionIds: string[];
    unansweredQuestionIds: string[];
    nextQuestionId?: string;
    readyToGenerate: boolean;
  }>(result);

  // Calculate progress
  const answered = analysis.answeredQuestionIds.length;
  const total = state.allQuestions.length;
  const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;

  console.log(`[LANGGRAPH] Gap analysis: ${answered}/${total} answered (${percentage}%)`);
  console.log(`[LANGGRAPH] Ready to generate: ${analysis.readyToGenerate}`);

  // Find next question object
  let nextQuestion: Question | null = null;
  if (analysis.nextQuestionId && !state.askedQuestionIds.has(analysis.nextQuestionId)) {
    nextQuestion = state.allQuestions.find(q => q.id === analysis.nextQuestionId) || null;
  }

  // If no valid next question but we have unanswered questions, pick first unanswered that hasn't been asked
  if (!nextQuestion && analysis.unansweredQuestionIds.length > 0) {
    for (const qId of analysis.unansweredQuestionIds) {
      if (!state.askedQuestionIds.has(qId)) {
        nextQuestion = state.allQuestions.find(q => q.id === qId) || null;
        if (nextQuestion) break;
      }
    }
  }

  return {
    progress: {
      answered,
      total,
      percentage
    },
    nextQuestion,
    readyToGenerate: analysis.readyToGenerate,
    phase: analysis.readyToGenerate ? 'enrichment' : 'gathering'
  };
}

/**
 * Node: Ask Question
 * Asks the next unanswered question
 */
async function askQuestion(state: PlanningStateType): Promise<Partial<PlanningStateType>> {
  console.log('[LANGGRAPH] Node: ask_question');

  if (!state.nextQuestion) {
    console.warn('[LANGGRAPH] No next question to ask');
    return {
      responseMessage: "Perfect! I've got everything I need. Let's create your plan! 🎯",
      readyToGenerate: true
    };
  }

  // Prevent duplicate questions at graph level
  if (state.askedQuestionIds.has(state.nextQuestion.id)) {
    console.error(`[LANGGRAPH] DUPLICATE PREVENTION: Question ${state.nextQuestion.id} already asked!`);
    return {
      responseMessage: "Hmm, let me think of something else...",
      nextQuestion: null
    };
  }

  const questionText = state.nextQuestion.question;

  console.log(`[LANGGRAPH] Asking question: ${questionText}`);

  // Make questions sound more casual and friendly
  const friendlyIntros = [
    "",  // Sometimes no intro
    "Quick question – ",
    "Just curious – ",
    "One more thing – ",
    "Oh, also – "
  ];
  
  // Pick a random intro
  const randomIntro = friendlyIntros[Math.floor(Math.random() * friendlyIntros.length)];
  let friendlyQuestion = randomIntro + questionText;
  
  // Add progress indicator
  const answered = state.progress?.answered || 0;
  const total = state.progress?.total || 0;
  const percentage = state.progress?.percentage || 0;
  
  if (total > 0) {
    friendlyQuestion += `\n\n📊 Progress: ${answered}/${total} (${Math.round(percentage)}%)`;
  }

  return {
    responseMessage: friendlyQuestion,
    askedQuestionIds: new Set([state.nextQuestion.id]),
    nextQuestion: null
  };
}

/**
 * Node: Enrich Data
 * Performs contextual research and planning enrichment
 * OPTIMIZATION: Skip for quick plans or use cached data
 */
async function enrichData(state: PlanningStateType): Promise<Partial<PlanningStateType>> {
  console.log('[LANGGRAPH] Node: enrich_data');

  // OPTIMIZATION: Skip enrichment for quick plans to improve speed
  if (state.planMode === 'quick') {
    console.log('[LANGGRAPH] Skipping enrichment for quick plan mode');
    return {
      enrichedData: {
        contextualAdvice: 'Quick plan - using streamlined approach without detailed enrichment',
        domain: state.domain,
        timestamp: new Date().toISOString()
      },
      phase: 'synthesis'
    };
  }

  // Extract key information from slots for context-aware enrichment
  const location = state.slots?.destination || state.slots?.location || null;
  const dates = state.slots?.dates_duration || state.slots?.date || state.slots?.when || null;
  const budget = state.slots?.budget || state.slots?.range || null;
  const duration = state.slots?.duration || null;

  // OPTIMIZATION: Check cache for existing enrichment
  const cacheKey = `${state.domain}:${location}:${dates}:${budget}`;
  const cached = enrichmentCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    console.log('[LANGGRAPH] Using cached enrichment data');
    return {
      enrichedData: cached.data,
      phase: 'synthesis'
    };
  }

  // Build enrichment request based on domain and extracted data
  let enrichmentPrompt = `Based on the planning information provided, give comprehensive contextual advice including:

1. **Timing & Seasonal Considerations**: ${location && dates ? `Weather patterns for ${location} during ${dates}, best timing advice` : 'Typical weather patterns, best times, seasonal factors'}
2. **Practical Logistics**: ${location ? `Specific logistics for ${location}, common challenges, what to expect` : 'Common challenges, what to expect, preparation tips'}
3. **Smart Recommendations**: ${budget ? `Budget-conscious tips for ${budget} budget` : 'Insider tips, things people often overlook, pro advice'}
4. **Current Trends**: Popular approaches, what's working well in 2025

Be specific and practical${location ? ` for ${location}` : ''}${dates ? ` during ${dates}` : ''}${budget ? ` with a ${budget} budget` : ''}.`;

  // Add domain-specific enrichment requests with budget sensitivity
  if (state.domain === 'travel') {
    const budgetValue = budget ? budget.toLowerCase() : '';
    const isLowBudget = budgetValue.includes('500') || budgetValue.includes('low') || budgetValue.includes('budget') || budgetValue.includes('cheap');

    enrichmentPrompt += `\n\n**Travel-Specific (MANDATORY):**
- **Weather Forecast** (REQUIRED): ${location && dates ? `Provide specific weather forecast for ${location} during ${dates}. Include temperature ranges (high/low), precipitation chances, and seasonal conditions. If exact forecast unavailable, provide historical averages and typical patterns for this time of year.` : 'Provide typical weather patterns and seasonal considerations'}
- **Budget Breakdown** (REQUIRED): ${budget ? `Create detailed budget estimate for ${location} trip:
  * Transportation: flights/gas, local transit
  * Accommodation: per night costs × duration
  * Food: breakfast, lunch, dinner daily estimates
  * Activities: entrance fees, tours, experiences
  * Miscellaneous: tips, souvenirs, emergencies
  Total should align with ${budget} budget. Be SPECIFIC with dollar amounts.` : 'Provide typical cost breakdown for this destination'}
- **Traffic & Transportation**: ${location ? `Getting around ${location}, peak traffic times, parking costs, public transit options` : 'Transportation options and traffic patterns'}
- **Accommodation**: ${isLowBudget ? 'Budget-friendly options like Airbnb, hostels, colivingspaces.com for coliving, budget hotels ($50-100/night)' : 'Recommended areas to stay, hotel vs Airbnb considerations'}
- **Activities**: ${budget ? `Must-see spots that fit ${budget} budget, free experiences` : 'Popular attractions and hidden gems'}
- **Local Tips**: Best times to visit attractions, food scene, safety considerations`;
  } else if (state.domain === 'daily_planning') {
    enrichmentPrompt += `\n\n**Daily Planning:**
- Time management best practices
- Energy optimization throughout the day
- Common pitfalls and how to avoid them`;
  } else if (state.domain === 'event_planning') {
    enrichmentPrompt += `\n\n**Event Planning:**
- Timeline considerations and milestones
- Vendor/resource recommendations
- Weather backup plans if outdoor event`;
  }

  const result = await executeLLMCall(
    'enrichment',
    async (provider) => {
      return await provider.generateCompletion(
        [
          {
            role: 'system',
            content: `You are an expert planning advisor with deep knowledge across domains. Provide rich, contextual advice to enhance planning.

**Domain:** ${state.domain}
**Planning Information:** ${JSON.stringify(state.slots, null, 2)}

Your advice should be:
- Specific and actionable (not generic)
- Based on typical patterns and best practices
- Practical and immediately useful
- Consider logistics, timing, weather patterns, and common challenges`
          },
          {
            role: 'user',
            content: enrichmentPrompt
          }
        ],
        {
          temperature: 0.7,
          maxTokens: 800
        }
      );
    }
  );

  console.log(`[LANGGRAPH] Enrichment complete (cost: $${result.usage?.totalCost.toFixed(4)})`);

  const enrichedData = {
    contextualAdvice: result.content,
    domain: state.domain,
    timestamp: new Date().toISOString()
  };

  // OPTIMIZATION: Cache enrichment data for 6 hours
  enrichmentCache.set(cacheKey, {
    data: enrichedData,
    expiresAt: Date.now() + 6 * 60 * 60 * 1000 // 6 hours
  });
  console.log('[LANGGRAPH] Cached enrichment data');

  return {
    enrichedData,
    phase: 'synthesis'
  };
}

/**
 * Node: Synthesize Plan
 * Creates final beautiful plan using Claude Sonnet for quality
 */
async function synthesizePlan(state: PlanningStateType): Promise<Partial<PlanningStateType>> {
  console.log('[LANGGRAPH] Node: synthesize_plan');

  const result = await executeLLMCall(
    'plan_synthesis',
    async (provider) => {
      return await provider.generateStructured(
        [
          {
            role: 'system',
            content: `You are a warm, thoughtful lifestyle planning assistant. Create beautiful, inspiring, and actionable plans.

**Your Style:**
- Be conversational and encouraging
- Add personality and warmth to your language
- Use vivid, specific language (not generic)
- Show you understand the user's goals
- Make tasks feel achievable and exciting

**Domain:** ${state.domain}
**User Information:** ${JSON.stringify(state.slots, null, 2)}
**Additional Context:** ${JSON.stringify(state.enrichedData, null, 2)}

Create a plan that feels personal, thoughtful, and motivating - like advice from a knowledgeable friend.`
          },
          {
            role: 'user',
            content: `Create a comprehensive plan with:
- A catchy, inspiring title (max 60 chars)
- A motivating description that shows you understand my goals (max 150 chars)
- 3-7 specific, actionable tasks with clear next steps
- Each task should feel achievable and include realistic time estimates

${state.domain === 'travel' ? `
**MANDATORY FOR TRAVEL PLANS:**
You MUST include these as dedicated tasks in your plan:
1. **Weather Forecast Task** - Include specific weather predictions for ${state.slots?.destination || 'the destination'} during ${state.slots?.dates_duration || state.slots?.date || 'the travel dates'}. Provide approximate temperatures, conditions, and what to pack accordingly.
2. **Budget Breakdown Task** - Create a detailed budget estimate breaking down costs for transportation, accommodation, food, activities, and miscellaneous expenses based on the ${state.slots?.budget || 'specified budget'}. Be specific with amounts.

These must be included as separate tasks in addition to other planning tasks.` : ''}`
          }
        ],
        [
          {
            name: 'create_plan',
            description: 'Create structured action plan',
            parameters: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Plan title (max 60 chars)' },
                description: { type: 'string', description: 'Brief summary (max 150 chars)' },
                tasks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string', description: 'Specific, actionable task title' },
                      description: { type: 'string', description: 'Detailed task description with clear next steps' },
                      priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                      estimatedTime: { type: 'string', description: 'Realistic time estimate (e.g., "30 min", "2 hours", "3 days")' },
                      category: { type: 'string', description: 'Task category matching domain type' }
                    },
                    required: ['title', 'description', 'priority', 'estimatedTime', 'category']
                  }
                }
              },
              required: ['title', 'description', 'tasks']
            }
          }
        ],
        {
          temperature: 0.8,
          maxTokens: 2000
        }
      );
    }
  );

  const planData = parseFunctionCall<{
    title: string;
    description: string;
    tasks: Array<{ title: string; description: string; priority: string; estimatedTime: string; category?: string }>;
  }>(result);

  // Ensure all tasks have a category (use domain as fallback)
  const categoryFromDomain = state.domain || 'personal';
  planData.tasks = planData.tasks.map(task => ({
    ...task,
    category: task.category || categoryFromDomain
  }));

  console.log(`[LANGGRAPH] Plan synthesis complete: "${planData.title}" with ${planData.tasks.length} tasks (cost: $${result.usage?.totalCost.toFixed(4)})`);

  // Format response message beautifully like Claude
  const formattedTasks = planData.tasks.map((t, i) => {
    const priorityEmoji = t.priority === 'high' ? '🔴' : t.priority === 'medium' ? '🟡' : '🟢';
    return `**${i + 1}. ${t.title}** ${priorityEmoji}\n   ${t.description}\n   ⏱️ *${t.estimatedTime}*`;
  }).join('\n\n');

  return {
    finalPlan: {
      ...planData,
      generatedAt: new Date().toISOString(),
      domain: state.domain,
      slots: state.slots
    },
    responseMessage: `# ✨ ${planData.title}\n\n${planData.description}\n\n## 🎯 Your Action Plan\n\n${formattedTasks}`,
    phase: 'completed',
    readyToGenerate: true
  };
}

/**
 * Node: Create Activity
 * Creates activity and tasks in database
 */
async function createActivity(state: PlanningStateType): Promise<Partial<PlanningStateType>> {
  console.log('[LANGGRAPH] Node: create_activity');

  if (!state.storage || !state.finalPlan) {
    console.warn('[LANGGRAPH] No storage or final plan - skipping activity creation');
    return {};
  }

  try {
    const planData = state.finalPlan;

    // Create the activity
    const activity = await state.storage.createActivity({
      title: planData.title,
      description: planData.description,
      category: state.domain || 'general',
      status: 'planning',
      userId: state.userProfile.id
    });

    console.log('[LANGGRAPH] Created activity:', activity.id);

    // Create tasks and link them to the activity
    const createdTasks = [];
    for (let i = 0; i < planData.tasks.length; i++) {
      const taskData = planData.tasks[i];
      const task = await state.storage.createTask({
        ...taskData,
        userId: state.userProfile.id,
        category: state.domain || 'general'
      });
      await state.storage.addTaskToActivity(activity.id, task.id, i);
      createdTasks.push(task);
      console.log('[LANGGRAPH] Created and linked task:', task.id);
    }

    // Get the complete activity with tasks
    const activityTasks = await state.storage.getActivityTasks(activity.id, state.userProfile.id);
    const createdActivity = { ...activity, tasks: activityTasks };

    console.log('[LANGGRAPH] Activity created with', activityTasks.length, 'tasks');

    return {
      createdActivity,
      responseMessage: `✨ **Activity Created!**\n\nYour "${planData.title}" plan is ready! I've created ${activityTasks.length} actionable ${activityTasks.length === 1 ? 'task' : 'tasks'} for you. Check the "Your Activity" section to start making progress!`
    };
  } catch (error) {
    console.error('[LANGGRAPH] Error creating activity:', error);
    return {
      responseMessage: "I encountered an error creating your activity. Please try again or contact support if the issue persists."
    };
  }
}

/**
 * Node: Parallel Domain and Slot Detection
 * OPTIMIZATION: Run domain detection and slot extraction in parallel
 */
async function detectDomainAndSlots(state: PlanningStateType): Promise<Partial<PlanningStateType>> {
  console.log('[LANGGRAPH] Node: detect_domain_and_slots (parallel execution)');

  // Run domain detection and slot extraction in parallel for speed
  const [domainResult, slotsResult] = await Promise.all([
    detectDomain(state),
    extractSlots(state)
  ]);

  // Merge results
  return {
    ...domainResult,
    ...slotsResult
  };
}

/**
 * Routing Functions
 */
function routeAfterDomainDetection(state: PlanningStateType): string {
  // Skip - now using parallel node
  return 'extract_slots';
}

function routeAfterSlotExtraction(state: PlanningStateType): string {
  // If no domain config (general domain), skip questions and go straight to enrichment
  if (!state.domainConfig) {
    console.log('[LANGGRAPH] No domain config - skipping questions, going to enrichment');
    return 'enrich_data';
  }
  
  // Generate questions if we don't have them yet (first interaction)
  if (!state.allQuestions || state.allQuestions.length === 0) {
    return 'generate_questions';
  }
  
  // Otherwise analyze gaps (subsequent interactions)
  return 'analyze_gaps';
}

function routeAfterGapAnalysis(state: PlanningStateType): string {
  // If ready to generate, move to enrichment
  if (state.readyToGenerate) {
    return 'enrich_data';
  }
  // If we have a next question, ask it
  if (state.nextQuestion) {
    return 'ask_question';
  }
  // Otherwise we're done asking questions
  return END;
}

function routeAfterAskQuestion(state: PlanningStateType): string {
  // Always end after asking a question (wait for user response)
  return END;
}

function routeAfterEnrichment(state: PlanningStateType): string {
  // Move to synthesis after enrichment
  return 'synthesize_plan';
}

function routeAfterSynthesis(state: PlanningStateType): string {
  // DON'T create activity automatically - wait for user confirmation first
  // The confirmation and activity creation happens in routes.ts when user says "yes"
  return END;
}

function routeAfterActivityCreation(state: PlanningStateType): string {
  // Always end after creating activity
  return END;
}

/**
 * Build the LangGraph workflow
 */
function buildWorkflow() {
  const workflow = new StateGraph(PlanningState)
    // Add nodes
    .addNode('detect_domain_and_slots', detectDomainAndSlots)  // PARALLEL OPTIMIZATION
    .addNode('generate_questions', generateQuestions)
    .addNode('analyze_gaps', analyzeGaps)
    .addNode('ask_question', askQuestion)
    .addNode('enrich_data', enrichData)
    .addNode('synthesize_plan', synthesizePlan)
    .addNode('create_activity', createActivity)

    // Entry point - now goes directly to parallel node
    .addEdge('__start__', 'detect_domain_and_slots')

    // Conditional edges
    .addConditionalEdges('detect_domain_and_slots', routeAfterSlotExtraction)
    .addConditionalEdges('generate_questions', (state: PlanningStateType) => {
      // After generating questions for the first time, show them to user (END)
      // On subsequent turns, the questions are already generated, so we skip this node
      return END;
    })
    .addConditionalEdges('analyze_gaps', routeAfterGapAnalysis)
    .addConditionalEdges('ask_question', routeAfterAskQuestion)
    .addConditionalEdges('enrich_data', routeAfterEnrichment)
    .addConditionalEdges('synthesize_plan', routeAfterSynthesis)
    .addConditionalEdges('create_activity', routeAfterActivityCreation);

  return workflow;
}

/**
 * LangGraph Planning Agent
 *
 * Replaces UniversalPlanningAgent with state machine approach
 */
export class LangGraphPlanningAgent {
  private workflow: StateGraph<typeof PlanningState>;
  private checkpointer: MemorySaver;

  constructor() {
    this.workflow = buildWorkflow();
    this.checkpointer = new MemorySaver();

    console.log('[LANGGRAPH] Planning agent initialized');
  }

  /**
   * Process a user message through the state machine
   * @param progressCallback - Optional callback for streaming progress updates
   */
  async processMessage(
    userId: number,
    userMessage: string,
    userProfile: User,
    conversationHistory: Array<{ role: string; content: string }> = [],
    storage?: IStorage,
    planMode: 'quick' | 'smart' = 'quick',
    progressCallback?: (phase: string, message: string) => void
  ): Promise<{
    message: string;
    phase: string;
    progress?: { answered: number; total: number; percentage: number };
    readyToGenerate?: boolean;
    finalPlan?: any;
    createdActivity?: any;
    domain?: string;
  }> {
    console.log(`\n[LANGGRAPH] Processing message for user ${userId}`);
    console.log(`[LANGGRAPH] Message: ${userMessage.substring(0, 100)}...`);

    // Emit progress if callback provided
    progressCallback?.('starting', 'Initializing planning workflow...');

    // Compile workflow with checkpointer
    const app = this.workflow.compile({ checkpointer: this.checkpointer });

    // Run the graph
    const config = {
      configurable: {
        thread_id: `user_${userId}`
      }
    };

    progressCallback?.('domain_detection', 'Analyzing your request and extracting details...');

    const result = await app.invoke(
      {
        userId,
        userMessage,
        userProfile,
        planMode,
        storage,
        conversationHistory: conversationHistory && conversationHistory.length > 0
          ? conversationHistory
          : [{ role: 'user', content: userMessage }]
      },
      config
    );

    console.log(`[LANGGRAPH] Phase: ${result.phase}`);
    console.log(`[LANGGRAPH] Progress: ${result.progress.percentage}%`);

    // Emit final progress
    progressCallback?.(result.phase, `Completed - ${result.progress.percentage}% done`);

    return {
      message: result.responseMessage || "I'm processing your request...",
      phase: result.phase,
      progress: result.progress,
      readyToGenerate: result.readyToGenerate,
      finalPlan: result.finalPlan,
      domain: result.domain
    };
  }

  /**
   * Get current state for a user
   */
  async getState(userId: number): Promise<PlanningStateType | null> {
    const app = this.workflow.compile({ checkpointer: this.checkpointer });

    const config = {
      configurable: {
        thread_id: `user_${userId}`
      }
    };

    try {
      const state = await app.getState(config);
      return state.values as PlanningStateType;
    } catch (e) {
      console.warn('[LANGGRAPH] No existing state for user', userId);
      return null;
    }
  }

  /**
   * Reset state for a user (start new conversation)
   */
  async resetState(userId: number): Promise<void> {
    // MemorySaver doesn't have a delete method, but new thread_id will start fresh
    console.log(`[LANGGRAPH] Reset state for user ${userId}`);
  }
}

// Singleton instance
export const langGraphPlanningAgent = new LangGraphPlanningAgent();
