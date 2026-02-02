import Anthropic from "@anthropic-ai/sdk";
import type { User } from '@shared/schema';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Model selection: Use Haiku for routine tasks (cheaper, faster)
const CLAUDE_HAIKU = "claude-3-5-haiku-20241022"; // $0.80/MTok input, $4/MTok output
const CLAUDE_SONNET = "claude-sonnet-4-20250514"; // $3/MTok input, $15/MTok output

// Use Haiku for question generation (routine, structured task)
const DEFAULT_CLAUDE_MODEL = CLAUDE_HAIKU;

export interface GeneratedQuestion {
  id: string;
  question: string;
  why_matters: string;
  priority: number; // 1-10, 10 = most critical
  required: boolean;
  slot_path: string;
  type: 'text' | 'choice' | 'date_range' | 'number';
  options?: string[];
}

export interface QuestionGenerationResult {
  questions: GeneratedQuestion[];
  reasoning: string;
  totalQuestions: number;
}

/**
 * Claude Question Generator - Dynamically generates planning questions
 * ordered by importance for any domain
 */
export class ClaudeQuestionGenerator {

  /**
   * Generate top questions for a domain, ordered by critical importance
   */
  async generateQuestions(
    domain: string,
    planMode: 'quick' | 'smart',
    userProfile: User | undefined,
    userMessage: string
  ): Promise<QuestionGenerationResult> {

    const questionCount = planMode === 'quick' ? 5 : 7;

    console.log(`[QUESTION GENERATOR] Generating ${questionCount} questions for ${domain} (${planMode} mode)`);

    const prompt = `You are a world-class planning expert specializing in ${domain}.

TASK: Generate the top ${questionCount} MOST IMPORTANT questions to ask when planning a ${domain} activity.

USER PROFILE:
- Name: ${userProfile?.name || 'User'}
- Location: ${userProfile?.location || 'Not specified'}
- Timezone: ${userProfile?.timezone || 'Not specified'}

USER'S INITIAL REQUEST:
"${userMessage}"

REQUIREMENTS:
1. Order questions by CRITICAL IMPORTANCE (most critical first - priority 10 being highest)
2. Consider what the user already mentioned in their initial request
3. Focus on decision-making questions that directly impact the plan quality
4. For QUICK mode: Only essential "can't create a good plan without this" questions
5. For SMART mode: Add optional questions that significantly improve personalization

PRIORITIZATION CRITERIA:
- Priority 10: Absolutely required - can't plan at all without this (e.g., destination, dates)
- Priority 8-9: Critical for quality planning - significantly impacts options (e.g., budget, purpose)
- Priority 6-7: Important for personalization - improves experience (e.g., preferences, constraints)
- Priority 4-5: Nice to have for better experience - adds polish (e.g., dietary restrictions, activity level)
- Priority 1-3: Optional details - marginally helpful (e.g., favorite colors, specific brands)

SLOT PATH NAMING:
- Use dot notation for nested data: "location.destination", "timing.date", "budget.range"
- Be consistent: destination → "location.destination", not "dest" or "where"
- Common patterns:
  * Location: "location.{destination|origin|address}"
  * Timing: "timing.{date|time|duration}"
  * Budget: "budget.{range|max|preferred}"
  * People: "participants.{count|names|ages}"
  * Preferences: "preferences.{type|style|level}"

QUESTION TYPES:
- "text": Open-ended text input
- "choice": Multiple choice from options array
- "date_range": Date or date range picker
- "number": Numeric input

RESPOND WITH JSON (no markdown, just raw JSON):
{
  "questions": [
    {
      "id": "destination",
      "question": "Where are you planning to travel?",
      "why_matters": "Can't plan routes, accommodation, or activities without knowing the destination",
      "priority": 10,
      "required": true,
      "slot_path": "location.destination",
      "type": "text"
    },
    {
      "id": "dates",
      "question": "When are you traveling and for how long?",
      "why_matters": "Affects pricing (seasonal rates), weather conditions, and event availability",
      "priority": 9,
      "required": true,
      "slot_path": "timing.date",
      "type": "date_range"
    },
    {
      "id": "budget",
      "question": "What's your total budget for this trip?",
      "why_matters": "Determines accommodation tier, dining options, and which activities are feasible",
      "priority": 8,
      "required": true,
      "slot_path": "budget.range",
      "type": "text"
    }
  ],
  "reasoning": "Brief explanation of why these questions matter most for ${domain} planning",
  "totalQuestions": ${questionCount}
}

IMPORTANT:
- Questions MUST be ordered by priority (highest first)!
- All questions must have unique IDs
- Required questions should have priority >= 7
- For ${planMode} mode, ${questionCount} questions total
- Return ONLY valid JSON, no markdown code blocks`;

    try {
      const response = await anthropic.messages.create({
        model: DEFAULT_CLAUDE_MODEL,
        max_tokens: 2048,
        temperature: 0.7,
        system: [
          {
            type: "text",
            text: `You are a world-class planning expert. Your task is to generate prioritized questions for planning activities.`,
            cache_control: { type: "ephemeral" as any } // Cache system prompt
          }
        ],
        messages: [{
          role: "user",
          content: prompt
        }]
      });

      const responseText = (response.content[0] as any).text;

      // Extract JSON from response (handle if wrapped in markdown)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
      }

      const result: QuestionGenerationResult = JSON.parse(jsonMatch[0]);

      // Validate and sort by priority
      result.questions.sort((a, b) => b.priority - a.priority);

      console.log(`[QUESTION GENERATOR] Generated ${result.questions.length} questions`);
      result.questions.forEach(q => {
        console.log(`  [P${q.priority}] ${q.question} → ${q.slot_path}`);
      });

      return result;

    } catch (error) {
      console.error('[QUESTION GENERATOR] Error:', error);

      // Fallback: Return basic questions if Claude fails
      return this.getFallbackQuestions(domain, planMode);
    }
  }

  /**
   * Fallback questions if Claude API fails
   */
  private getFallbackQuestions(domain: string, planMode: 'quick' | 'smart'): QuestionGenerationResult {
    console.warn('[QUESTION GENERATOR] Using fallback questions');

    const baseQuestions: GeneratedQuestion[] = [
      {
        id: 'goal',
        question: `What's the main goal of this ${domain} activity?`,
        why_matters: 'Helps focus the plan on what matters most to you',
        priority: 10,
        required: true,
        slot_path: 'goal',
        type: 'text'
      },
      {
        id: 'timing',
        question: 'When do you want to do this?',
        why_matters: 'Affects scheduling and availability',
        priority: 9,
        required: true,
        slot_path: 'timing.date',
        type: 'date_range'
      },
      {
        id: 'constraints',
        question: 'Are there any important constraints or preferences?',
        why_matters: 'Ensures the plan fits your needs and limitations',
        priority: 7,
        required: false,
        slot_path: 'constraints',
        type: 'text'
      }
    ];

    return {
      questions: baseQuestions.slice(0, planMode === 'quick' ? 3 : 5),
      reasoning: 'Fallback questions for general planning',
      totalQuestions: planMode === 'quick' ? 3 : 5
    };
  }
}

// Export singleton instance
export const claudeQuestionGenerator = new ClaudeQuestionGenerator();
