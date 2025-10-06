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
import { executeLLMCall } from './llmProvider';
import { OpenAIProvider } from './openAIProvider';
import type { User } from '@shared/schema';
import type { DomainConfig, Question } from './domainRegistry';
import { domainRegistry } from './domainRegistry';
import type { IStorage } from '../storage';

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

  // If domain already detected with high confidence, skip
  if (state.domain !== 'general' && state.domainConfidence > 0.8) {
    console.log(`[LANGGRAPH] Domain already detected: ${state.domain} (confidence: ${state.domainConfidence})`);
    return {};
  }

  const result = await executeLLMCall(
    'domain_detection',
    async (provider) => {
      return await provider.generateStructured(
        [
          {
            role: 'system',
            content: `You are a domain classification expert. Classify user requests into one of these domains:
- travel: Trip planning, vacations, destinations
- interview_prep: Job interviews, career preparation
- event_planning: Parties, weddings, conferences
- fitness: Workout plans, training, health goals
- learning: Educational goals, skill development
- general: Everything else

Return high confidence (0.8-1.0) only if clearly matches domain.`
          },
          {
            role: 'user',
            content: `Classify this request:\n\n${state.userMessage}`
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
                  enum: ['travel', 'interview_prep', 'event_planning', 'fitness', 'learning', 'general']
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

  const classified = OpenAIProvider.parseFunctionCall<{
    domain: string;
    confidence: number;
    reasoning?: string;
  }>(result);

  console.log(`[LANGGRAPH] Domain: ${classified.domain} (confidence: ${classified.confidence})`);
  if (classified.reasoning) {
    console.log(`[LANGGRAPH] Reasoning: ${classified.reasoning}`);
  }

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

  // Build schema from domain config
  const slotProperties: Record<string, any> = {};
  const requiredSlots: string[] = [];

  for (const question of state.domainConfig.questions) {
    const slotName = question.slot_path.split('.').pop() || question.id;
    slotProperties[slotName] = {
      type: 'string',
      description: question.question
    };
    if (question.required) {
      requiredSlots.push(slotName);
    }
  }

  const result = await executeLLMCall(
    'slot_extraction',
    async (provider) => {
      return await provider.generateStructured(
        [
          {
            role: 'system',
            content: `Extract information from user message into structured slots. Only extract information explicitly mentioned. Leave slots empty if not mentioned.`
          },
          {
            role: 'user',
            content: state.userMessage
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

  const extractedSlots = OpenAIProvider.parseFunctionCall<Record<string, any>>(result);

  // Filter out empty/null values
  const validSlots: Record<string, any> = {};
  for (const [key, value] of Object.entries(extractedSlots)) {
    if (value && value !== '' && value !== 'null' && value !== 'undefined') {
      validSlots[key] = value;
    }
  }

  console.log(`[LANGGRAPH] Extracted ${Object.keys(validSlots).length} slots:`, validSlots);

  return {
    slots: validSlots
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

  // Use domain config questions (default to quick_plan for now)
  // TODO: Add planMode to state to choose between quick_plan and smart_plan
  const questions = state.domainConfig.questions.quick_plan || state.domainConfig.questions.smart_plan || [];

  console.log(`[LANGGRAPH] Generated ${questions.length} questions for domain: ${state.domain}`);

  return {
    allQuestions: questions,
    progress: {
      answered: 0,
      total: questions.length,
      percentage: 0
    }
  };
}

/**
 * Node: Analyze Gaps
 * Determines which questions are answered and what to ask next
 */
async function analyzeGaps(state: PlanningStateType): Promise<Partial<PlanningStateType>> {
  console.log('[LANGGRAPH] Node: analyze_gaps');

  const result = await executeLLMCall(
    'gap_analysis',
    async (provider) => {
      return await provider.generateStructured(
        [
          {
            role: 'system',
            content: `You are analyzing which planning questions have been answered.

Questions to analyze:
${JSON.stringify(state.allQuestions, null, 2)}

User's current slots/information:
${JSON.stringify(state.slots, null, 2)}

Already asked question IDs (don't ask again):
${JSON.stringify([...state.askedQuestionIds], null, 2)}

Determine:
1. Which questions are fully answered (have slot values)
2. Which questions still need answers
3. What's the most important unanswered question to ask next`
          },
          {
            role: 'user',
            content: state.userMessage
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

  const analysis = OpenAIProvider.parseFunctionCall<{
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
      responseMessage: "I have all the information I need. Ready to generate your plan!",
      readyToGenerate: true
    };
  }

  // Prevent duplicate questions at graph level
  if (state.askedQuestionIds.has(state.nextQuestion.id)) {
    console.error(`[LANGGRAPH] DUPLICATE PREVENTION: Question ${state.nextQuestion.id} already asked!`);
    return {
      responseMessage: "Let me think of another question...",
      nextQuestion: null
    };
  }

  const questionText = state.nextQuestion.question;

  console.log(`[LANGGRAPH] Asking question: ${questionText}`);

  return {
    responseMessage: questionText,
    askedQuestionIds: new Set([state.nextQuestion.id]),
    nextQuestion: null
  };
}

/**
 * Node: Enrich Data
 * Performs web research and data enrichment
 */
async function enrichData(state: PlanningStateType): Promise<Partial<PlanningStateType>> {
  console.log('[LANGGRAPH] Node: enrich_data');

  // Use DeepSeek for cost-effective enrichment
  const result = await executeLLMCall(
    'enrichment',
    async (provider) => {
      return await provider.generateCompletion(
        [
          {
            role: 'system',
            content: `You are a research assistant. Given user's planning information, provide helpful context and suggestions.

Domain: ${state.domain}
User Information: ${JSON.stringify(state.slots, null, 2)}`
          },
          {
            role: 'user',
            content: 'Provide 3-5 helpful suggestions or tips based on the information provided.'
          }
        ],
        {
          temperature: 0.7,
          maxTokens: 500
        }
      );
    }
  );

  console.log(`[LANGGRAPH] Enrichment complete (cost: $${result.usage?.totalCost.toFixed(4)})`);

  return {
    enrichedData: {
      suggestions: result.content,
      timestamp: new Date().toISOString()
    },
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
            content: `You are an expert plan creator. Create a beautiful, actionable plan with structured output.

Domain: ${state.domain}
User Information: ${JSON.stringify(state.slots, null, 2)}
Enrichment: ${JSON.stringify(state.enrichedData, null, 2)}`
          },
          {
            role: 'user',
            content: `Create a comprehensive plan with a title, description, and 3-7 actionable tasks.`
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
                      title: { type: 'string', description: 'Task title' },
                      description: { type: 'string', description: 'Task description' },
                      priority: { type: 'string', enum: ['high', 'medium', 'low'] }
                    },
                    required: ['title', 'description', 'priority']
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

  const planData = OpenAIProvider.parseFunctionCall<{
    title: string;
    description: string;
    tasks: Array<{ title: string; description: string; priority: string }>;
  }>(result);

  console.log(`[LANGGRAPH] Plan synthesis complete: "${planData.title}" with ${planData.tasks.length} tasks (cost: $${result.usage?.totalCost.toFixed(4)})`);

  return {
    finalPlan: {
      ...planData,
      generatedAt: new Date().toISOString(),
      domain: state.domain,
      slots: state.slots
    },
    responseMessage: `# ${planData.title}\n\n${planData.description}\n\n## Tasks\n\n${planData.tasks.map((t, i) => `${i + 1}. **${t.title}** (${t.priority})\n   ${t.description}`).join('\n\n')}`,
    phase: 'completed'
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
 * Routing Functions
 */
function routeAfterDomainDetection(state: PlanningStateType): string {
  // Always extract slots after domain detection
  return 'extract_slots';
}

function routeAfterSlotExtraction(state: PlanningStateType): string {
  // Generate questions if we don't have them yet
  if (state.allQuestions.length === 0) {
    return 'generate_questions';
  }
  // Otherwise analyze gaps
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
  // Create activity if storage is available
  if (state.storage) {
    return 'create_activity';
  }
  // Otherwise end
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
    .addNode('detect_domain', detectDomain)
    .addNode('extract_slots', extractSlots)
    .addNode('generate_questions', generateQuestions)
    .addNode('analyze_gaps', analyzeGaps)
    .addNode('ask_question', askQuestion)
    .addNode('enrich_data', enrichData)
    .addNode('synthesize_plan', synthesizePlan)
    .addNode('create_activity', createActivity)

    // Entry point
    .addEdge('__start__', 'detect_domain')

    // Conditional edges
    .addConditionalEdges('detect_domain', routeAfterDomainDetection)
    .addConditionalEdges('extract_slots', routeAfterSlotExtraction)
    .addConditionalEdges('generate_questions', () => 'analyze_gaps')
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
   */
  async processMessage(
    userId: number,
    userMessage: string,
    userProfile: User,
    conversationHistory: Array<{ role: string; content: string }> = [],
    storage?: IStorage,
    planMode: 'quick' | 'smart' = 'quick'
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

    // Compile workflow with checkpointer
    const app = this.workflow.compile({ checkpointer: this.checkpointer });

    // Run the graph
    const config = {
      configurable: {
        thread_id: `user_${userId}`
      }
    };

    const result = await app.invoke(
      {
        userId,
        userMessage,
        userProfile,
        conversationHistory: [{ role: 'user', content: userMessage }]
      },
      config
    );

    console.log(`[LANGGRAPH] Phase: ${result.phase}`);
    console.log(`[LANGGRAPH] Progress: ${result.progress.percentage}%`);

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
