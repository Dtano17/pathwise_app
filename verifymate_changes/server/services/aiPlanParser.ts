import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export interface ParsedTask {
  title: string;
  description?: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  timeEstimate?: string;
  order: number;
}

export interface ParsedPlan {
  title: string;
  description?: string;
  tasks: ParsedTask[];
  source: 'chatgpt' | 'claude' | 'gemini' | 'perplexity' | 'other';
  rawText: string;
  confidence: number;
}

export interface ParseOptions {
  preferredCategories?: string[];
  defaultPriority?: 'low' | 'medium' | 'high';
  extractDates?: boolean;
}

const PARSE_SYSTEM_PROMPT = `You are an AI plan parser. Your job is to extract actionable tasks from AI-generated plans and conversations.

TASK EXTRACTION RULES:
1. Extract ONLY actionable items that a person can complete
2. Skip meta-commentary, explanations, or general advice
3. Convert vague items into specific, actionable tasks
4. Preserve the original sequence/order of tasks
5. Infer categories from context (health, work, personal, travel, adventure, learning, finance, relationships, creative, home)
6. Assign priority based on urgency indicators or logical sequence
7. Extract any mentioned dates, times, or durations

OUTPUT FORMAT (JSON):
{
  "title": "Brief title for the plan (2-6 words)",
  "description": "One sentence summary of what this plan accomplishes",
  "tasks": [
    {
      "title": "Clear, actionable task title",
      "description": "Additional context or details if available",
      "category": "one of: health|work|personal|travel|adventure|learning|finance|relationships|creative|home",
      "priority": "high|medium|low",
      "dueDate": "ISO date string if mentioned, otherwise null",
      "timeEstimate": "e.g., '15 min', '1 hour', '2 hours' if mentioned, otherwise null",
      "order": 1
    }
  ],
  "confidence": 0.85
}

PRIORITY ASSIGNMENT:
- HIGH: First steps, blocking tasks, urgent items, safety-related
- MEDIUM: Important but not urgent, middle steps
- LOW: Optional, nice-to-have, final polish tasks

CONFIDENCE SCORING:
- 0.9+: Clear numbered list with specific actions
- 0.7-0.9: Structured plan with some vague items
- 0.5-0.7: Conversational text with embedded actions
- <0.5: Mostly advice/explanation with few actionable items

If the text contains no actionable tasks, return:
{
  "title": "No actionable plan found",
  "description": "The text did not contain extractable tasks",
  "tasks": [],
  "confidence": 0
}`;

async function parseWithOpenAI(text: string, options: ParseOptions = {}): Promise<ParsedPlan | null> {
  const openai = new OpenAI();
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: PARSE_SYSTEM_PROMPT },
        { role: "user", content: `Parse the following AI-generated plan into actionable tasks:\n\n${text}` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 2000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    return {
      ...parsed,
      source: detectSource(text),
      rawText: text
    };
  } catch (error) {
    console.error('[AI_PLAN_PARSER] OpenAI parsing failed:', error);
    return null;
  }
}

async function parseWithClaude(text: string, options: ParseOptions = {}): Promise<ParsedPlan | null> {
  const anthropic = new Anthropic();
  
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: PARSE_SYSTEM_PROMPT,
      messages: [
        { role: "user", content: `Parse the following AI-generated plan into actionable tasks:\n\n${text}` }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') return null;

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      ...parsed,
      source: detectSource(text),
      rawText: text
    };
  } catch (error) {
    console.error('[AI_PLAN_PARSER] Claude parsing failed:', error);
    return null;
  }
}

function detectSource(text: string): ParsedPlan['source'] {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('chatgpt') || lowerText.includes('openai')) {
    return 'chatgpt';
  }
  if (lowerText.includes('claude') || lowerText.includes('anthropic')) {
    return 'claude';
  }
  if (lowerText.includes('gemini') || lowerText.includes('google ai')) {
    return 'gemini';
  }
  if (lowerText.includes('perplexity')) {
    return 'perplexity';
  }
  
  return 'other';
}

function fallbackParse(text: string): ParsedPlan {
  const lines = text.split('\n').filter(line => line.trim());
  const tasks: ParsedTask[] = [];
  let order = 0;

  const taskPatterns = [
    /^[\d]+[.)\-]\s*(.+)$/,
    /^[\-\*•]\s*(.+)$/,
    /^(?:step|task)\s*\d*[:\s]+(.+)/i,
    /^(?:first|next|then|finally)[,:\s]+(.+)/i,
  ];

  for (const line of lines) {
    for (const pattern of taskPatterns) {
      const match = line.match(pattern);
      if (match) {
        order++;
        tasks.push({
          title: match[1].trim().substring(0, 100),
          category: 'personal',
          priority: order <= 3 ? 'high' : order <= 6 ? 'medium' : 'low',
          order
        });
        break;
      }
    }
  }

  return {
    title: tasks.length > 0 ? 'Imported Plan' : 'No actionable plan found',
    description: tasks.length > 0 
      ? `${tasks.length} tasks extracted from pasted text`
      : 'The text did not contain extractable tasks',
    tasks,
    source: detectSource(text),
    rawText: text,
    confidence: tasks.length > 0 ? Math.min(0.6, tasks.length * 0.1) : 0
  };
}

export async function parseAIPlan(text: string, options: ParseOptions = {}): Promise<ParsedPlan> {
  if (!text || text.trim().length < 10) {
    return {
      title: 'No actionable plan found',
      description: 'The text was too short to extract tasks',
      tasks: [],
      source: 'other',
      rawText: text,
      confidence: 0
    };
  }

  let result = await parseWithOpenAI(text, options);
  
  if (!result || result.tasks.length === 0) {
    result = await parseWithClaude(text, options);
  }
  
  if (!result || result.tasks.length === 0) {
    result = fallbackParse(text);
  }

  if (options.preferredCategories && options.preferredCategories.length > 0) {
    result.tasks = result.tasks.map(task => ({
      ...task,
      category: options.preferredCategories!.includes(task.category) 
        ? task.category 
        : options.preferredCategories![0]
    }));
  }

  if (options.defaultPriority) {
    result.tasks = result.tasks.map(task => ({
      ...task,
      priority: task.priority || options.defaultPriority!
    }));
  }

  return result;
}

export function validateParsedPlan(plan: ParsedPlan): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!plan.title || plan.title.length < 2) {
    errors.push('Plan title is required');
  }

  if (!plan.tasks || !Array.isArray(plan.tasks)) {
    errors.push('Tasks must be an array');
  } else {
    plan.tasks.forEach((task, index) => {
      if (!task.title || task.title.length < 2) {
        errors.push(`Task ${index + 1}: Title is required`);
      }
      if (!['low', 'medium', 'high'].includes(task.priority)) {
        errors.push(`Task ${index + 1}: Invalid priority`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
