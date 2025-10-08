import Anthropic from "@anthropic-ai/sdk";
import type { GeneratedQuestion } from './claudeQuestionGenerator';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Use Haiku for gap analysis (pattern matching, JSON extraction - routine task)
const CLAUDE_HAIKU = "claude-3-5-haiku-20241022";
const DEFAULT_CLAUDE_MODEL = CLAUDE_HAIKU;

export interface AnsweredQuestion {
  id: string;
  question: string;
  answer: string;
  extractedValue: any;
  confidence: number; // 0-1
  slot_path: string;
  source: 'initial' | 'conversation'; // Where answer came from
}

export interface UnansweredQuestion {
  id: string;
  question: string;
  priority: number;
  why_needs_asking: string;
  slot_path: string;
  required: boolean;
}

export interface GapAnalysisResult {
  answeredQuestions: AnsweredQuestion[];
  unansweredQuestions: UnansweredQuestion[];
  nextQuestionToAsk: UnansweredQuestion | null;
  completionPercentage: number;
  readyToGenerate: boolean;
  extractedSlots: Record<string, any>; // Merged slots ready to use
}

/**
 * Claude Gap Analyzer - Intelligently determines what questions have been answered
 * and what information is still needed
 */
export class ClaudeGapAnalyzer {

  /**
   * Analyze conversation to determine answered vs unanswered questions
   */
  async analyzeGaps(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }>,
    questions: GeneratedQuestion[],
    currentSlots: Record<string, any>
  ): Promise<GapAnalysisResult> {

    console.log('[GAP ANALYZER] Analyzing gaps for', questions.length, 'questions');

    // Format questions for prompt
    const questionsList = questions
      .map(q => `[Priority ${q.priority}] ${q.id}: "${q.question}" (slot: ${q.slot_path}, required: ${q.required})`)
      .join('\n');

    // Format conversation history
    const conversationText = conversationHistory
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const prompt = `You are analyzing a planning conversation to determine what questions have been answered.

QUESTIONS TO ANSWER:
${questionsList}

CONVERSATION HISTORY:
${conversationText}

CURRENT USER MESSAGE:
"${userMessage}"

CURRENTLY EXTRACTED INFORMATION (from previous analysis):
${JSON.stringify(currentSlots, null, 2)}

TASK:
1. Read the FULL conversation history to understand what has been discussed
2. For EACH question in the list, check if the user answered it ANYWHERE in the conversation (including the current message)
3. Extract specific values from the conversation (look for implicit AND explicit info)
4. Use CONTEXTUAL AWARENESS: Look at what question was most recently asked and how the user responded
5. Identify which questions are COMPLETELY unanswered (never addressed in any way)
6. Determine the NEXT most important question to ask (highest priority unanswered required question)
7. Calculate completion percentage based on ALL messages, not just the latest one

IMPORTANT - IMPLICIT INFORMATION:
- "weekend trip" → 2-3 days duration
- "family vacation" → likely 3+ people, kid-friendly activities
- "business trip" → work-related, efficiency matters
- "around $1000" or "$500-1000" → budget range
- "next month" → extract approximate date
- "somewhere warm" → climate preference

CRITICAL - CONTEXTUAL ANSWER RECOGNITION:
When analyzing the conversation, pay special attention to question-answer pairs:

1. Look at each assistant message to see what question was asked
2. Look at the following user message to see how they responded
3. Use CONTEXT to determine if they answered it, even with uncertainty/negation

Examples of VALID ANSWERS that should be marked as ANSWERED:
- Assistant: "What is your budget?"
  User: "no" / "none" / "no budget" / "none for now" / "flexible" / "not sure" / "I don't know" / "none for now, no budget" / "no budget for now"
  → That IS an answer! Extract as: {budget: "flexible", confidence: 0.7}

- Assistant: "What dates are you planning?"
  User: "not sure" / "flexible" / "whenever" / "open" / "haven't decided" / "not yet"
  → That IS an answer! Extract as: {dates: "flexible", confidence: 0.7}

- Assistant: "What's the purpose?"
  User: "no" / "just because" / "nothing specific" / "none really"
  → That IS an answer! Extract as: {purpose: "flexible", confidence: 0.7}

- Assistant: "How many people are traveling?"
  User: "2" / "me and my girlfriend" / "two of us" / "just us two"
  → That IS an answer! Extract the number and any relationship info

ABSOLUTE RULE: If a question was asked in ANY previous assistant message and the VERY NEXT user message contains ANY response (even "no", "none", "not sure", "flexible", negation, or uncertainty), mark it as ANSWERED with confidence >= 0.6. The user should NEVER be asked the same question twice.

NEVER put a question in the "unanswered" list if:
1. It appears in the conversation history followed by a user response, OR
2. The user explicitly said "no", "none", "not sure", "flexible" or similar when that question was asked

CONFIDENCE SCORING:
- 1.0 = Explicitly stated with clear details
- 0.8 = Clearly implied or stated with minor ambiguity
- 0.6 = Reasonable inference from context
- 0.4 = Weak inference, needs confirmation
- Below 0.4 = Don't count as answered

RESPOND WITH JSON (no markdown, just raw JSON):
{
  "answeredQuestions": [
    {
      "id": "destination",
      "question": "Where are you planning to travel?",
      "answer": "Paris, France",
      "extractedValue": "Paris",
      "confidence": 0.95,
      "slot_path": "location.destination",
      "source": "initial"
    }
  ],
  "unansweredQuestions": [
    {
      "id": "budget",
      "question": "What's your total budget for the trip?",
      "priority": 9,
      "why_needs_asking": "No budget mentioned in any message - critical for determining accommodation and activity options",
      "slot_path": "budget.range",
      "required": true
    }
  ],
  "nextQuestionToAsk": {
    "id": "budget",
    "question": "What's your total budget for the trip?",
    "priority": 9,
    "why_needs_asking": "No budget mentioned in any message",
    "slot_path": "budget.range",
    "required": true
  },
  "completionPercentage": 40,
  "readyToGenerate": false,
  "extractedSlots": {
    "location": {
      "destination": "Paris"
    }
  }
}

RULES:
- Only mark question as answered if confidence >= 0.6
- nextQuestionToAsk should be the highest priority REQUIRED unanswered question (or highest priority optional if all required are answered)
- readyToGenerate = true only if ALL required questions are answered with confidence >= 0.6
- completionPercentage = (answeredQuestions.length / totalQuestions) * 100
- extractedSlots should be nested objects matching slot_path structure (e.g., "location.destination" → {"location": {"destination": "value"}})
- CRITICAL: Use slot_path (not question ID) to determine if a question is answered. For example, question ID "budget" with slot_path "budget.range" should check if slots.budget.range exists.

Return ONLY valid JSON, no markdown code blocks.`;

    try {
      const response = await anthropic.messages.create({
        model: DEFAULT_CLAUDE_MODEL,
        max_tokens: 3072,
        temperature: 0.3, // Lower temp for more consistent analysis
        system: [
          {
            type: "text",
            text: `You are an expert at analyzing conversations to determine what information has been provided and what is still needed. You understand implicit information and can extract values from natural language.`,
            cache_control: { type: "ephemeral" as any } // Cache system prompt
          }
        ],
        messages: conversationHistory.length > 0 ? [
          // Include conversation history for context
          ...conversationHistory.map(msg => ({
            role: msg.role as "user" | "assistant",
            content: msg.content
          })),
          {
            role: "user" as const,
            content: prompt
          }
        ] : [{
          role: "user" as const,
          content: prompt
        }]
      });

      const responseText = (response.content[0] as any).text;

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
      }

      const result: GapAnalysisResult = JSON.parse(jsonMatch[0]);

      console.log(`[GAP ANALYZER] Answered: ${result.answeredQuestions.length}/${questions.length}`);
      console.log(`[GAP ANALYZER] Completion: ${result.completionPercentage}%`);
      console.log(`[GAP ANALYZER] Ready to generate: ${result.readyToGenerate}`);

      if (result.nextQuestionToAsk) {
        console.log(`[GAP ANALYZER] Next question [P${result.nextQuestionToAsk.priority}]: ${result.nextQuestionToAsk.question}`);
      }

      // Log answered questions with confidence
      result.answeredQuestions.forEach(aq => {
        console.log(`  ✓ ${aq.id}: "${aq.answer}" (confidence: ${aq.confidence})`);
      });

      return result;

    } catch (error) {
      console.error('[GAP ANALYZER] Error:', error);

      // Fallback: Basic analysis
      return this.getFallbackAnalysis(questions, currentSlots);
    }
  }

  /**
   * Fallback analysis if Claude API fails
   */
  private getFallbackAnalysis(
    questions: GeneratedQuestion[],
    currentSlots: Record<string, any>
  ): GapAnalysisResult {
    console.warn('[GAP ANALYZER] Using fallback analysis');

    const answeredQuestions: AnsweredQuestion[] = [];
    const unansweredQuestions: UnansweredQuestion[] = [];

    // Simple check: is slot filled?
    for (const question of questions) {
      const value = this.getNestedValue(currentSlots, question.slot_path);

      if (value !== null && value !== undefined && value !== '') {
        answeredQuestions.push({
          id: question.id,
          question: question.question,
          answer: String(value),
          extractedValue: value,
          confidence: 0.8,
          slot_path: question.slot_path,
          source: 'initial'
        });
      } else {
        unansweredQuestions.push({
          id: question.id,
          question: question.question,
          priority: question.priority,
          why_needs_asking: 'Information not yet provided',
          slot_path: question.slot_path,
          required: question.required
        });
      }
    }

    // Sort unanswered by priority
    unansweredQuestions.sort((a, b) => b.priority - a.priority);

    const nextQuestion = unansweredQuestions.find(q => q.required) || unansweredQuestions[0] || null;
    const allRequiredAnswered = questions.filter(q => q.required).every(q =>
      answeredQuestions.some(aq => aq.id === q.id)
    );

    return {
      answeredQuestions,
      unansweredQuestions,
      nextQuestionToAsk: nextQuestion,
      completionPercentage: Math.round((answeredQuestions.length / questions.length) * 100),
      readyToGenerate: allRequiredAnswered,
      extractedSlots: currentSlots
    };
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

// Export singleton instance
export const claudeGapAnalyzer = new ClaudeGapAnalyzer();
