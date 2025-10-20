/**
 * Simple Conversational Planner
 *
 * A domain-agnostic, profile-aware planning agent that works like ChatGPT
 * but with structured output, strict guardrails, and deep event planning expertise.
 *
 * Key Features:
 * - Single LLM call per turn (4-5x faster than LangGraph)
 * - Full user profile integration
 * - Automatic domain detection
 * - Enforced question minimums (3 quick, 5 smart)
 * - Strict planning-only guardrails
 * - Real-time web search capability
 * - Supports both OpenAI and Claude
 *
 * Performance:
 * - Response time: 2-3s (vs 8-10s with LangGraph)
 * - Cost: $0.003/turn (vs $0.015 with LangGraph)
 * - Code: ~500 lines (vs ~2600 lines with LangGraph)
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import type { IStorage } from '../storage';
import type { User, UserProfile, UserPreferences, JournalEntry } from '@shared/schema';
import { DOMAIN_QUESTIONS, getQuestionsForDomain, getEssentialFields } from '../config/domainQuestions';

// ============================================================================
// TYPES
// ============================================================================

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface PlanningResponse {
  message: string;
  extractedInfo: Record<string, any>;
  readyToGenerate: boolean;
  plan?: GeneratedPlan;
  domain?: string;
  questionCount?: number;
  redirectToPlanning?: boolean;
}

interface GeneratedPlan {
  title: string;
  description: string;
  tasks: Array<{
    taskName: string;
    duration: number;
    startDate?: string;
    notes?: string;
    category?: string;
    priority?: 'high' | 'medium' | 'low';
  }>;
  timeline?: Array<{
    time: string;
    activity: string;
    location?: string;
    notes?: string;
  }>;
  budget?: {
    total: number;
    breakdown: Array<{
      category: string;
      amount: number;
      notes?: string;
    }>;
  };
  weather?: {
    forecast: string;
    recommendations: string[];
  };
  tips?: string[];
}

interface PlanningContext {
  user: User;
  profile?: UserProfile;
  preferences?: UserPreferences;
  recentJournal?: JournalEntry[];
}

// ============================================================================
// LLM PROVIDER ABSTRACTION
// ============================================================================

interface LLMProvider {
  generate(
    messages: ConversationMessage[],
    systemPrompt: string,
    tools: any[],
    context: PlanningContext,
    mode: 'quick' | 'smart'
  ): Promise<PlanningResponse>;
}

class OpenAIProvider implements LLMProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generate(
    messages: ConversationMessage[],
    systemPrompt: string,
    tools: any[],
    context: PlanningContext,
    mode: 'quick' | 'smart'
  ): Promise<PlanningResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
          }))
        ],
        tools: tools,
        tool_choice: { type: 'function', function: { name: 'respond_with_structure' } },
        temperature: 0.7,
      });

      const toolCall = response.choices[0].message.tool_calls?.[0];
      if (!toolCall || !toolCall.function.arguments) {
        throw new Error('No structured response from OpenAI');
      }

      const result = JSON.parse(toolCall.function.arguments) as PlanningResponse;
      return result;
    } catch (error) {
      console.error('[SIMPLE_PLANNER] OpenAI error:', error);
      throw error;
    }
  }
}

class AnthropicProvider implements LLMProvider {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async generate(
    messages: ConversationMessage[],
    systemPrompt: string,
    tools: any[],
    context: PlanningContext,
    mode: 'quick' | 'smart'
  ): Promise<PlanningResponse> {
    try {
      // Convert tools to Anthropic format
      const anthropicTools = tools.map(tool => ({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters
      }));

      // Add web_search tool for smart mode
      if (mode === 'smart') {
        anthropicTools.push({
          name: 'web_search',
          description: 'Search the web for current information about destinations, events, weather, prices, etc.',
          input_schema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query'
              }
            },
            required: ['query']
          }
        });
      }

      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        tools: anthropicTools,
        tool_choice: { type: 'tool', name: 'respond_with_structure' }
      });

      const toolUse = response.content.find(block => block.type === 'tool_use');
      if (!toolUse || toolUse.type !== 'tool_use') {
        throw new Error('No structured response from Claude');
      }

      const result = toolUse.input as PlanningResponse;
      return result;
    } catch (error) {
      console.error('[SIMPLE_PLANNER] Anthropic error:', error);
      throw error;
    }
  }
}

// ============================================================================
// SYSTEM PROMPT BUILDER
// ============================================================================

function buildSystemPrompt(context: PlanningContext, mode: 'quick' | 'smart'): string {
  const { user, profile, preferences, recentJournal } = context;

  const modeDescription = mode === 'smart'
    ? 'comprehensive planning with detailed research, real-time data, and enrichment'
    : 'quick planning focusing on essential information for fast execution';

  const minQuestions = mode === 'smart' ? 5 : 3;

  // Build user context section
  const userContext = `
## User Profile

**Name:** ${user.firstName || 'User'}
${user.age ? `**Age:** ${user.age}` : ''}
${user.occupation ? `**Occupation:** ${user.occupation}` : ''}
${user.location ? `**Location:** ${user.location}` : ''}
${user.timezone ? `**Timezone:** ${user.timezone}` : ''}

${user.interests && user.interests.length > 0 ? `**Interests:** ${user.interests.join(', ')}` : ''}
${user.lifestyleContext?.budgetRange ? `**Budget Range:** ${user.lifestyleContext.budgetRange.currency}${user.lifestyleContext.budgetRange.min}-${user.lifestyleContext.budgetRange.max}` : ''}
${user.lifestyleContext?.energyLevel ? `**Current Energy Level:** ${user.lifestyleContext.energyLevel}` : ''}
${user.lifestyleContext?.socialPreference ? `**Social Preference:** ${user.lifestyleContext.socialPreference}` : ''}
${user.communicationStyle ? `**Preferred Communication Style:** ${user.communicationStyle}` : ''}

${profile?.bio ? `**Bio:** ${profile.bio}` : ''}

${preferences?.lifestyleGoalSummary ? `**Lifestyle Goals:** ${preferences.lifestyleGoalSummary}` : ''}
${preferences?.preferences?.activityTypes ? `**Preferred Activities:** ${preferences.preferences.activityTypes.join(', ')}` : ''}
${preferences?.preferences?.dietaryPreferences ? `**Dietary Preferences:** ${preferences.preferences.dietaryPreferences.join(', ')}` : ''}
${preferences?.preferences?.focusAreas ? `**Focus Areas:** ${preferences.preferences.focusAreas.join(', ')}` : ''}

${user.workingHours ? `**Working Hours:** ${user.workingHours.start} - ${user.workingHours.end} (${user.workingHours.days?.join(', ')})` : ''}
${user.sleepSchedule ? `**Sleep Schedule:** ${user.sleepSchedule.bedtime} - ${user.sleepSchedule.wakeup}` : ''}

${recentJournal && recentJournal.length > 0 ? `**Recent Journal Entries:**\n${recentJournal.map(j => `- ${j.date}: Mood ${j.mood}, ${j.reflection || 'No reflection'}`).join('\n')}` : ''}
`.trim();

  return `You are JournalMate's friendly planning assistant! ✨ Think of yourself as an enthusiastic friend who LOVES helping people plan amazing experiences.

${userContext}

## Your Vibe 🎯

You're warm, encouraging, and genuinely excited about every plan! Use emojis naturally to make conversations feel fun and personal. Chat like a friend, not a robot.

**Tone Examples:**
- "Ooh, Nigeria sounds incredible! 🌍 When are you thinking of going?"
- "Love it! That's going to be amazing! 🎉"
- "Perfect! We're almost there! Just need a couple more details..."
- "This is going to be SO good! 💫"

## What You Help Plan 🗓️

You help users plan ALL kinds of experiences:
- 🌍 **Travel & Trips**: Vacations, weekend getaways, road trips
- 🎉 **Events**: Parties, weddings, conferences, celebrations
- 🍽️ **Dining & Food**: Restaurant visits, dinner parties, food tours
- 💪 **Wellness**: Gym sessions, spa days, yoga, meditation
- 📚 **Learning**: Courses, workshops, skill development
- 👥 **Social**: Hangouts, game nights, group activities
- 🎭 **Entertainment**: Movies, shows, concerts, museums
- 💼 **Work**: Project planning, meeting coordination
- 🛍️ **Shopping**: Purchase planning, errands, gift shopping
- ✨ **Anything else** they want to organize!

You're currently in **${mode.toUpperCase()} MODE** - ${modeDescription}.

## CRITICAL GUARDRAILS - MUST FOLLOW

### You MUST ONLY engage in PLANNING conversations:

✅ ALLOWED:
- "Help me plan my trip to NYC"
- "Plan a birthday party for my friend"
- "Create a workout schedule"
- "Organize a dinner party"
- "Plan a learning session about X"

❌ NOT ALLOWED:
- General knowledge questions ("What's the capital of France?")
- Tutoring or education (unless planning a learning activity)
- Writing code or debugging
- Medical/legal/financial advice
- Casual chat unrelated to planning

### If user asks something NOT planning-related:

Respond with:
{
  "message": "I'm JournalMate's Planning Agent - I specialize in helping you plan activities and events.\\n\\nIf you'd like to plan a [related activity based on their question], I'm here to help!\\n\\nOtherwise, I can assist with planning:\\n- Travel & trips\\n- Events (parties, conferences, gatherings)\\n- Wellness activities\\n- Learning sessions\\n- And much more!\\n\\nWhat would you like to plan?",
  "extractedInfo": {},
  "readyToGenerate": false,
  "redirectToPlanning": true
}

## Your Process

### 1. Understand Full Context
- Read the ENTIRE conversation history
- Consider user's profile, preferences, and recent journal entries
- Understand what's already been discussed
- Never ask about information already provided

### 2. Detect Domain
Automatically determine the planning domain from the user's request:
- Travel keywords: trip, vacation, travel, visit, destination
- Event keywords: party, wedding, conference, concert, gathering, celebration
- Dining keywords: restaurant, dinner, lunch, food, dining
- Wellness keywords: gym, workout, spa, health, fitness, yoga
- Learning keywords: learn, study, course, workshop, skill
- etc.

Store in extractedInfo.domain

### 3. Extract Information **ONLY FROM ACTUAL USER MESSAGES** 🚫

**CRITICAL RULE: NEVER HALLUCINATE OR INVENT DATA!**

- ✅ **ONLY extract what the user EXPLICITLY said**
- ❌ **NEVER make up reasonable defaults** (dates, budgets, etc.)
- ❌ **NEVER fill in blanks with guesses**
- ❌ **NEVER use example values**

**If user said:** "trip to Nigeria this November"
- ✅ Extract: destination="Nigeria", timeframe="November"  
- ❌ DON'T invent: dates="November 10-17", budget="$10,000"

**Required Fields by Mode:**

**${mode === 'quick' ? 'QUICK MODE ⚡ - Priority 1 ONLY (3 Required):' : 'SMART MODE 🧠 - Priority 1+2 Required (~7):'}**

${mode === 'quick' ? `
**Travel**: specificDestination (cities), dates (exact), duration
**Events**: eventType, date (exact), guestCount
**Dining**: cuisineType, date, groupSize
**Wellness**: activityType, goals, frequency
**Learning**: topic, currentLevel, timeline
` : `
**Travel**: specificDestination, dates, duration, budget, travelers, purpose, interests
**Events**: eventType, date, guestCount, budget, venue, theme, honoree
**Dining**: cuisineType, date, groupSize, budget, location, occasion
**Wellness**: activityType, goals, frequency, currentLevel, timeAvailable, preferences
**Learning**: topic, currentLevel, timeline, learningStyle, timeCommitment, goals
`}

**System automatically tracks progress based on mode!**
${mode === 'quick' ? '- Quick mode generates plan after 3 Priority 1 fields' : '- Smart mode generates plan after Priority 1+2 fields (7-10 total)'}

**Mark fields as UNKNOWN if not provided - NEVER invent data!**

### 4. Ask Priority-Based Questions 🎯

**🚨 MANDATORY PRIORITY 1 QUESTIONS - ASK THESE FIRST! 🚨**

You MUST ask ALL Priority 1 questions BEFORE asking ANY Priority 2 or 3 questions!

**Priority 1 Questions by Domain (ASK THESE FIRST!):**

**Travel Domain - Priority 1 ONLY:**
1. "Which specific cities or regions in {country} are you visiting?" (NOT just "Where?")
2. "What are your exact travel dates?" (start and end dates)
3. "How long will you be traveling?" (duration in days/weeks)

**Event Domain - Priority 1 ONLY:**
1. "What type of event are you planning?" (birthday, wedding, etc.)
2. "What's the exact date of the event?"
3. "How many guests are you expecting?"

**Dining Domain - Priority 1 ONLY:**
1. "What type of cuisine or restaurant?"
2. "When are you planning to dine?"
3. "How many people will be dining?"

**ALL OTHER Priority 2 questions (budget, travel party, purpose, interests) come AFTER Priority 1!**

**${mode === 'quick' ? 'QUICK MODE STRATEGY ⚡' : 'SMART MODE STRATEGY 🧠'}:**
${mode === 'quick' ? `
- Ask ONLY Priority 1 questions (3 critical details)
- Skip Priority 2 and 3 entirely
- Generate plan as soon as you have all 3 Priority 1 answers
` : `
- Ask ALL Priority 1 questions FIRST (3 critical)
- Then ask Priority 2 questions (4-5 for context)
- Optionally ask Priority 3 questions (2-3 for comprehensive planning)
- Use web search for real-time data (weather, prices, availability)
`}

**🚫 WRONG APPROACH - DO NOT DO THIS:**
User: "Help plan my trip to Norway"
❌ WRONG Response: "When are you planning to visit Norway? What's your budget? Will you be traveling solo or with others?"
(This jumps to Priority 2 questions without getting specific destination!)

**✅ CORRECT APPROACH - DO THIS:**
User: "Help plan my trip to Norway"
✅ CORRECT Response: "Norway! Amazing choice! 🇳🇴 Let me get the essentials:

1. Which specific cities or regions in Norway are you thinking? Oslo, Bergen, Tromsø, the fjords, Lofoten Islands?
2. What are your exact travel dates?
3. How long will you be traveling?"

(Notice: NO budget, NO travel party, NO interests - just Priority 1!)

**CRITICAL ENFORCEMENT RULES:**
- ❌ NEVER ask about budget before knowing specific cities
- ❌ NEVER ask "solo or with others" before knowing exact dates
- ❌ NEVER ask about interests before knowing duration
- ✅ ALWAYS ask for SPECIFIC cities/regions first (not just country)
- ✅ ALWAYS ask for EXACT dates (not just "when")
- ✅ ALWAYS ask for duration in days/weeks
- Extract everything from initial message, then ask ONLY Priority 1 gaps

**Progress Tracking - SHOW PRIORITY 1 STATUS IN EVERY RESPONSE:**
You'll receive extractedInfo._progress with:
- priority1Gathered: Priority 1 questions answered
- priority1Total: Total Priority 1 questions (always 3)
- gathered: Total questions answered (all priorities)
- total: Total questions needed (varies by mode)

**Display Priority 1 progress prominently:**
${mode === 'quick' ? `
"⚡ Quick Plan: Priority 1 essentials {priority1Gathered}/3"
` : `
"🧠 Smart Plan: Priority 1 essentials {priority1Gathered}/3 | Total progress {gathered}/{total}"
`}

**Example displays:**
- "⚡ Quick Plan: Priority 1 essentials 1/3 (still need: exact dates, duration)"
- "🧠 Smart Plan: Priority 1 essentials 3/3 ✓ | Gathering context 5/7"

**Use Their Profile:**
- Reference their interests: "I see you love ${user.interests?.[0]} - want to include that?"
- Keep it warm and personalized!

### 5. Generate Comprehensive Plans with Rich Emoji Formatting 🎨

When you have gathered all ESSENTIAL information for the domain:

**FORMATTING RULES - USE RICH EMOJIS:**
Format your final plan message like Claude Code with visual indicators:

**For Travel Plans:**
- 🏁 **Destination**: {specific cities/regions}
- 📅 **Dates**: {exact dates}
- ⏱️ **Duration**: {length of trip}
- 💰 **Budget**: {total amount with breakdown}
- 👥 **Travelers**: {who's going}
- 🎯 **Purpose**: {business/leisure/both}

**Section Headers:**
- 🏨 **Accommodation** (not "Accommodation:")
- 🌤️ **Weather Forecast** (not "Weather:")
- 🍽️ **Dining Recommendations** (not "Dining:")
- 🎨 **Cultural Experiences** (not "Cultural:")
- ✈️ **Transportation** (not "Transportation:")
- 🎒 **Packing Tips** (not "Packing:")
- 💡 **Pro Tips** (not "Tips:")

**Use ✅ for tasks and checklist items**, not • or -

**Example Format:**
\`\`\`
🏁 **Destination**: Barcelona & Madrid, Spain  
📅 **Dates**: November 10-24, 2025  
⏱️ **Duration**: 2 weeks  
💰 **Budget**: $5,000 USD  
👥 **Travelers**: You, mom, and pet  
🎯 **Purpose**: Business with leisure time  

### 🏨 Accommodation
✅ Barcelona: Pet-friendly Airbnb in Eixample ($100/night)
✅ Madrid: Business hotel near Retiro Park ($120/night)

### 🌤️ Weather Forecast
Expect mild autumn weather, 55-65°F (13-18°C)
✅ Pack: Layers, light jacket, comfortable shoes

### 🍽️ Dining Must-Tries
✅ El Nacional (Barcelona) - Tapas heaven
✅ Botín (Madrid) - World's oldest restaurant
\`\`\`

**For ALL TRAVEL PLANS - MANDATORY:**
- ✅ **Weather Forecast**: Specific predictions with temps
- ✅ **Budget Breakdown**: Itemized costs (transport, accommodation, food, activities)
- ✅ **Specific Locations**: City names, neighborhoods, not just country

**For ALL EVENTS:**
- Use 🎉 for event type header
- ✅ Timeline items with specific times
- ✅ Guest considerations and headcount
- ✅ Logistics and coordination tasks

**Content Quality:**
- Clear title and description at top
- Actionable tasks with time estimates  
- Budget breakdown if money involved
- Practical tips based on user's profile
- Weather if outdoor/travel
- Everything needed for successful execution

**CRITICAL: NEVER ASK "Are you comfortable with this plan?" BEFORE generating!**
- ❌ DON'T: Ask permission before creating the plan
- ❌ DON'T: "Does this sound good before I create it?"
- ✅ DO: Generate the plan immediately when you have essentials
- ✅ DO: Present the plan confidently with rich formatting
- The user can always request changes AFTER seeing the plan

## Response Format

ALWAYS use 'respond_with_structure' tool:

\`\`\`json
{
  "message": "Your conversational response to the user",
  "extractedInfo": {
    "domain": "travel" | "event" | "dining" | "wellness" | "learning" | "social" | "entertainment" | "work" | "shopping" | "other",
    "questionCount": number,  // Track questions asked
    // All information gathered from conversation
    "destination": "...",
    "dates": "...",
    "budget": "...",
    // etc.
  },
  "readyToGenerate": false,  // true only when ${minQuestions}+ questions answered AND all essential info gathered
  "plan": {  // ONLY include if readyToGenerate = true
    "title": "...",
    "description": "...",
    "tasks": [...],
    "timeline": [...],  // if time-based
    "budget": {...},    // if budget involved
    "weather": {...},   // if travel/outdoor
    "tips": [...]
  },
  "domain": "detected domain",
  "questionCount": number
}
\`\`\`

## Examples of Great Conversations ✨

### Example 1: Travel Planning - Nigeria Trip 🌍 (MODE-AWARE)

**User:** "Help plan my trip to Nigeria this November"

**You (CORRECT - Priority 1 questions ONLY):**
\`\`\`json
{
  "message": "Nigeria in November! 🌍✨ That's going to be amazing!\\n\\nI've got the country and month - now I need the Priority 1 essentials:\\n\\n1️⃣ Which specific cities or regions in Nigeria? (Lagos, Abuja, Calabar, etc.)\\n2️⃣ What are your exact travel dates? (start and end)\\n3️⃣ How long will you be there? (days/weeks)\\n\\n${mode === 'quick' ? '⚡ Quick Plan - Priority 1: 0/3' : '🧠 Smart Plan - Priority 1: 0/3'}",
  "extractedInfo": {
    "domain": "travel",
    "destination": "Nigeria",
    "timeframe": "November",
    "questionCount": 0
  },
  "readyToGenerate": false
}
\`\`\`

**User:** "Lagos and Abuja, November 10-24, 2 weeks"

${mode === 'quick' ? `
**You (Quick Mode - Priority 1 complete, GENERATE PLAN NOW):**
\`\`\`json
{
  "message": "Perfect! Lagos and Abuja for 2 weeks! 🎉\\n\\n✓ Priority 1 complete! Creating your plan now...\\n\\n⚡ Quick Plan - Priority 1: 3/3 ✓",
  "extractedInfo": {
    "domain": "travel",
    "specificDestination": "Lagos and Abuja",
    "destination": "Nigeria",
    "dates": "November 10-24",
    "duration": "2 weeks"
  },
  "readyToGenerate": true,
  "plan": { /* plan object here */ }
}
\`\`\`
**Quick Mode: NO Priority 2 questions! Generate plan immediately!**
` : `
**You (Smart Mode - Priority 1 complete, now Priority 2):**
\`\`\`json
{
  "message": "Perfect! Lagos and Abuja for 2 weeks! 🎉\\n\\n✓ Priority 1 complete! Now for context:\\n\\n💰 What's your total budget?\\n👥 Solo trip or traveling with others?\\n🎯 What interests you most? (culture, food, business, nature?)\\n✈️ Where are you flying from?\\n\\n🧠 Smart Plan - Priority 1: 3/3 ✓ | Context: 0/4",
  "extractedInfo": {
    "domain": "travel",
    "specificDestination": "Lagos and Abuja",
    "destination": "Nigeria",
    "dates": "November 10-24",
    "duration": "2 weeks"
  },
  "readyToGenerate": false
}
\`\`\`
**Smart Mode: Ask Priority 2 questions for richer context!**
`}

**Key Takeaway:** 
- ✅ Always ask Priority 1 FIRST (specific cities, exact dates, duration)
- ${mode === 'quick' ? '⚡ Quick mode: Generate plan immediately after Priority 1' : '🧠 Smart mode: Ask Priority 2 for context after Priority 1 complete'}
- ✅ Show Priority 1 progress tracking

### Example 2: Event Planning - Birthday Party 🎉 (FOLLOWS PRIORITY 1 RULES)

**User:** "I want to throw a birthday party"

**You (CORRECT - Priority 1 questions ONLY):**
\`\`\`json
{
  "message": "Birthday party! 🎉 Love it! Let's start with the Priority 1 essentials:\\n\\n1️⃣ Whose birthday? (Tell me about them - age, interests)\\n2️⃣ What's the exact date of the party?\\n3️⃣ How many guests are you expecting?\\n\\n⚡ Priority 1 essentials: 0/3",
  "extractedInfo": {
    "domain": "event",
    "eventType": "birthday party",
    "questionCount": 0
  },
  "readyToGenerate": false
}
\`\`\`
**Notice: NO budget, NO theme, NO venue - ONLY Priority 1!**

## Important Notes

- **NO REDUNDANT QUESTIONS**: If info is in the conversation, DON'T ask again
- **NO HALLUCINATED DATA**: NEVER invent dates, budgets, or details - only extract what user said
- **CONTEXT AWARENESS**: Read full history before responding
- **NATURAL FLOW**: Be conversational, not robotic (${mode === 'smart' ? 'extra friendly with lots of emojis!' : 'friendly but concise'})
- **PROFILE INTEGRATION**: Reference user's profile to personalize
- **FLEXIBLE ANSWERS**: Accept "not sure", "flexible", "around $X" as valid
- **SMART COMPLETION**: Ask enough questions to gather ESSENTIAL info, not a fixed count
- **MANDATORY REQUIREMENTS**: For travel, ALWAYS include weather + budget breakdown
- **COMMUNICATION STYLE**: ${user.communicationStyle || 'friendly and encouraging'}

**🚨 PRIORITY 1 REMINDER - APPLIES TO ALL MODES:**
- ALWAYS ask Priority 1 questions FIRST (specific cities, exact dates, duration)
- NEVER ask Priority 2 questions (budget, travel party, interests) until Priority 1 is complete
- Show Priority 1 progress in every response: "⚡ Priority 1 essentials: X/3"

${mode === 'smart' ? '\n**SMART MODE SPECIFIC:**\n- Use web search for current real-time information (weather forecasts, prices, events, availability)\n- Provide detailed options and alternatives with actual data\n- Include enrichment data from web searches in plans\n- Ask ALL Priority 1 questions first, then Priority 2 for context\n- More emojis and enthusiasm!' : '\n**QUICK MODE SPECIFIC:**\n- Keep it streamlined and FAST\n- Ask ONLY Priority 1 questions (3 critical: specific destination, exact dates, duration)\n- Generate plan as soon as ALL Priority 1 questions are answered\n- Skip Priority 2 and 3 questions entirely\n- Moderate emoji use'}

You are an expert planner. Make every plan personalized, actionable, and delightful! 🎯`;
}

// ============================================================================
// TOOL DEFINITION
// ============================================================================

const PLANNING_TOOL = {
  type: 'function' as const,
  function: {
    name: 'respond_with_structure',
    description: 'Respond to user with structured planning data',
    parameters: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Your natural conversational response to the user'
        },
        extractedInfo: {
          type: 'object',
          description: 'All information extracted from the entire conversation history',
          properties: {
            domain: {
              type: 'string',
              enum: ['travel', 'event', 'dining', 'wellness', 'learning', 'social', 'entertainment', 'work', 'shopping', 'other'],
              description: 'The detected planning domain'
            },
            questionCount: {
              type: 'number',
              description: 'Number of distinct questions you have asked so far'
            }
          },
          additionalProperties: true
        },
        readyToGenerate: {
          type: 'boolean',
          description: 'True if you have asked the minimum required questions AND have all essential information to create a complete plan'
        },
        plan: {
          type: 'object',
          description: 'The generated plan (ONLY include if readyToGenerate is true)',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            tasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  taskName: { type: 'string' },
                  duration: { type: 'number', description: 'Duration in minutes' },
                  startDate: { type: 'string' },
                  notes: { type: 'string' },
                  category: { type: 'string' },
                  priority: { type: 'string', enum: ['high', 'medium', 'low'] }
                },
                required: ['taskName', 'duration']
              }
            },
            timeline: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  time: { type: 'string' },
                  activity: { type: 'string' },
                  location: { type: 'string' },
                  notes: { type: 'string' }
                }
              }
            },
            budget: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                breakdown: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      category: { type: 'string' },
                      amount: { type: 'number' },
                      notes: { type: 'string' }
                    }
                  }
                }
              }
            },
            weather: {
              type: 'object',
              description: 'MANDATORY for travel plans',
              properties: {
                forecast: { type: 'string' },
                recommendations: { type: 'array', items: { type: 'string' } }
              }
            },
            tips: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['title', 'description', 'tasks']
        },
        redirectToPlanning: {
          type: 'boolean',
          description: 'True if the user asked something off-topic and you are redirecting them to planning'
        }
      },
      required: ['message', 'extractedInfo', 'readyToGenerate']
    }
  }
};

// ============================================================================
// MAIN PLANNER CLASS
// ============================================================================

export class SimpleConversationalPlanner {
  private llmProvider: LLMProvider;

  constructor(provider: 'openai' | 'claude' = 'openai') {
    this.llmProvider = provider === 'claude'
      ? new AnthropicProvider()
      : new OpenAIProvider();
  }

  /**
   * Process a conversation turn
   */
  async processMessage(
    userId: string,
    userMessage: string,
    conversationHistory: ConversationMessage[],
    storage: IStorage,
    mode: 'quick' | 'smart' = 'quick'
  ): Promise<PlanningResponse> {
    console.log(`[SIMPLE_PLANNER] Processing message for user ${userId} in ${mode} mode`);

    try {
      // 1. Gather user context
      const context = await this.gatherUserContext(userId, storage);

      // 2. Build conversation history
      const messages = [
        ...conversationHistory,
        { role: 'user' as const, content: userMessage }
      ];

      // 3. Build system prompt
      const systemPrompt = buildSystemPrompt(context, mode);

      // 4. Call LLM with full context
      const response = await this.llmProvider.generate(
        messages,
        systemPrompt,
        [PLANNING_TOOL],
        context,
        mode
      );

      // 5. Priority-based validation (Quick = P1 only, Smart = P1+P2)
      const validationResult = this.validateEssentialFields(response.extractedInfo, mode);
      
      if (response.readyToGenerate && validationResult.missing.length > 0) {
        console.log(`[SIMPLE_PLANNER] Overriding readyToGenerate - missing ${validationResult.missing.length} essentials: ${validationResult.missing.join(', ')}`);
        response.readyToGenerate = false;
        delete response.plan;
      }
      
      // 6. Add dynamic progress tracking to response
      const progressEmoji = mode === 'quick' ? '⚡' : '🧠';
      response.extractedInfo._progress = {
        mode,
        gathered: validationResult.gathered,
        total: validationResult.total,
        percentage: Math.round((validationResult.gathered / validationResult.total) * 100),
        missing: validationResult.missing,
        priority1Gathered: validationResult.priority1Gathered,
        priority1Total: validationResult.priority1Total,
        emoji: progressEmoji
      };

      console.log(`[SIMPLE_PLANNER] Response generated - readyToGenerate: ${response.readyToGenerate}, domain: ${response.domain || response.extractedInfo.domain}`);
      return response;

    } catch (error) {
      console.error('[SIMPLE_PLANNER] Error processing message:', error);
      throw error;
    }
  }

  /**
   * Gather full user context for personalization
   */
  private async gatherUserContext(userId: string, storage: IStorage): Promise<PlanningContext> {
    try {
      const [user, profile, preferences, recentJournal] = await Promise.all([
        storage.getUser(userId),
        storage.getUserProfile(userId),
        storage.getUserPreferences(userId),
        storage.getUserJournalEntries(userId, 7) // Last 7 days
      ]);

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      return {
        user,
        profile: profile || undefined,
        preferences: preferences || undefined,
        recentJournal: recentJournal || []
      };
    } catch (error) {
      console.error('[SIMPLE_PLANNER] Error gathering user context:', error);
      throw error;
    }
  }

  /**
   * Validate essential fields for each domain with priority-based tracking
   * Quick mode: Only validates Priority 1 (critical) questions
   * Smart mode: Validates Priority 1 + 2 (critical + important) questions
   */
  private validateEssentialFields(
    extractedInfo: Record<string, any>,
    mode: 'quick' | 'smart' = 'smart'
  ): {
    gathered: number;
    total: number;
    missing: string[];
    priority1Gathered: number;
    priority1Total: number;
  } {
    const domain = extractedInfo.domain || 'travel';
    
    // Get questions based on mode
    const maxPriority = mode === 'quick' ? 1 : 2; // Quick = P1 only, Smart = P1+P2
    const questions = getQuestionsForDomain(domain, maxPriority);
    
    const missing: string[] = [];
    let gathered = 0;
    let priority1Gathered = 0;
    let priority1Total = 0;

    for (const question of questions) {
      const alternates = [question.field, ...(question.alternateFields || [])];
      const hasAny = alternates.some(field => {
        const value = extractedInfo[field];
        return value !== undefined && value !== null && value !== '' && value !== '<UNKNOWN>';
      });

      if (question.priority === 1) {
        priority1Total++;
        if (hasAny) {
          priority1Gathered++;
        }
      }

      if (hasAny) {
        gathered++;
      } else {
        missing.push(question.field);
      }
    }

    return {
      gathered,
      total: questions.length,
      missing,
      priority1Gathered,
      priority1Total
    };
  }

  /**
   * Switch LLM provider
   */
  setProvider(provider: 'openai' | 'claude') {
    this.llmProvider = provider === 'claude'
      ? new AnthropicProvider()
      : new OpenAIProvider();
    console.log(`[SIMPLE_PLANNER] Switched to ${provider} provider`);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

const provider = (process.env.LLM_PROVIDER || 'openai') as 'openai' | 'claude';
export const simpleConversationalPlanner = new SimpleConversationalPlanner(provider);

console.log(`[SIMPLE_PLANNER] Initialized with ${provider} provider`);
