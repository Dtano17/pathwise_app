import Anthropic from "@anthropic-ai/sdk";
import type { User } from '@shared/schema';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Use Sonnet-4 for direct plan generation (needs high quality output)
const CLAUDE_SONNET = "claude-sonnet-4-20250514";

export interface DirectPlanResult {
  activity: {
    title: string;
    description: string;
    category: string;
  };
  tasks: Array<{
    title: string;
    description: string;
    category: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

/**
 * Direct Plan Generator - No questions, no validation, just generate!
 *
 * User gives input (text or image) → Claude generates plan → Done!
 */
export class DirectPlanGenerator {

  /**
   * Generate a plan directly from user input
   * No questions, no back-and-forth, just create the plan!
   */
  async generatePlan(
    userInput: string,
    contentType: 'text' | 'image',
    userProfile: User,
    existingPlan?: DirectPlanResult // For modifications
  ): Promise<DirectPlanResult> {

    console.log(`[DIRECT PLAN] Generating plan from ${contentType} input`);
    console.log(`[DIRECT PLAN] User input: ${userInput.substring(0, 100)}...`);

    const isModification = !!existingPlan;

    if (isModification) {
      console.log(`[DIRECT PLAN] Modifying existing plan: "${existingPlan.activity.title}"`);
    }

    // Step 1: Validate if input is plan-related (guardrail check)
    if (!isModification && contentType === 'text') {
      const isPlanRelated = await this.validatePlanIntent(userInput);
      if (!isPlanRelated) {
        throw new Error('INPUT_NOT_PLAN_RELATED: Your input doesn\'t appear to be requesting a plan. Please describe what you want to plan or accomplish.');
      }
    }

    // Build prompt based on whether it's new or modification
    const prompt = isModification
      ? this.buildModificationPrompt(userInput, existingPlan, userProfile)
      : this.buildCreationPrompt(userInput, contentType, userProfile);

    try {
      const messageContent = contentType === 'image'
        ? this.buildImageMessage(userInput, prompt)
        : [{ type: "text" as const, text: prompt }];

      const response = await anthropic.messages.create({
        model: CLAUDE_SONNET,
        max_tokens: 4096,
        temperature: 0.7,
        system: [
          {
            type: "text",
            text: `You are a plan generation expert. Your job is to convert user requests into actionable activity plans with specific tasks. Be direct, clear, and actionable. Format everything as proper activities and tasks that can be tracked.`,
            cache_control: { type: "ephemeral" as any }
          }
        ],
        messages: [{
          role: "user",
          content: messageContent
        }]
      });

      const responseText = (response.content[0] as any).text;

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
      }

      const result: DirectPlanResult = JSON.parse(jsonMatch[0]);

      console.log(`[DIRECT PLAN] Generated: "${result.activity.title}" with ${result.tasks.length} tasks`);

      return result;

    } catch (error) {
      console.error('[DIRECT PLAN] Error:', error);
      throw error;
    }
  }

  /**
   * Validate if user input is actually requesting a plan (guardrail)
   */
  private async validatePlanIntent(userInput: string): Promise<boolean> {
    console.log('[GUARDRAIL] Checking if input is plan-related...');

    try {
      const response = await anthropic.messages.create({
        model: "claude-3-5-haiku-20241022", // Use Haiku for fast, cheap validation
        max_tokens: 50,
        temperature: 0,
        messages: [{
          role: "user",
          content: `Analyze this user input and determine if they are requesting help to CREATE, PLAN, or ORGANIZE something.

INPUT: "${userInput}"

PLAN-RELATED INDICATORS:
✅ "plan my..." / "help me plan..."
✅ "organize..." / "prepare for..."
✅ "I need to..." / "I want to..."
✅ Pasted steps/tasks/lists (numbered, bulleted)
✅ Goals, objectives, projects
✅ "create a..." / "build a..."

NOT PLAN-RELATED:
❌ Random statements ("fall on ice", "it's cold")
❌ Questions without action intent ("what is...?", "how does...?")
❌ Observations or facts
❌ Single-word inputs without context

Answer with ONLY "YES" or "NO".`
        }]
      });

      const answer = (response.content[0] as any).text.trim().toLowerCase();
      const isPlanRelated = answer.includes('yes');

      console.log(`[GUARDRAIL] Result: ${isPlanRelated ? 'PLAN-RELATED ✅' : 'NOT PLAN-RELATED ❌'}`);

      return isPlanRelated;
    } catch (error) {
      // If validation fails, assume it's plan-related (fail-open)
      console.warn('[GUARDRAIL] Validation error, assuming plan-related:', error);
      return true;
    }
  }

  /**
   * Build prompt for creating NEW plan
   */
  private buildCreationPrompt(
    userInput: string,
    contentType: 'text' | 'image',
    userProfile: User
  ): string {

    const userContext = `User: ${userProfile.name || 'User'}
Location: ${userProfile.location || 'Unknown'}
Timezone: ${userProfile.timezone || 'Unknown'}`;

    return `Generate an actionable plan based on the user's request.

USER CONTEXT:
${userContext}

USER REQUEST:
"${userInput}"

TASK:
1. Create an activity with a CLEAR, SPECIFIC, USER-FRIENDLY title
2. Break down into 3-10 actionable tasks
3. Each task should be specific and trackable
4. Use appropriate priorities (high/medium/low)

CRITICAL - ACTIVITY TITLE REQUIREMENTS:
- MUST be clear, concise, and immediately understandable
- MUST reflect the main goal/objective from the user's request
- MUST be natural language (like a human would say it)
- Extract and use ANY header/title from the pasted content
- Include timeframes if mentioned (weekend, today, next week, etc.)
- Preserve emojis if present in request
- BAD: "Clear intuitive title based on the user request with what was generated from claude"
- GOOD: "Weekend: IP Protection Tasks"
- GOOD: "Google Interview Prep - Next Week"
- GOOD: "🏋️ 30-Day Fitness Challenge"

OUTPUT FORMAT (JSON only, no markdown):
{
  "activity": {
    "title": "SPECIFIC, CLEAR TITLE HERE",
    "description": "Brief description of the overall plan",
    "category": "Work|Personal|Health|Learning|Finance|Social|Other"
  },
  "tasks": [
    {
      "title": "Specific, actionable task title",
      "description": "What needs to be done and why",
      "category": "Same as activity or more specific",
      "priority": "high|medium|low"
    }
  ]
}

RULES FOR TITLE EXTRACTION:
1. If user's request starts with a title/header → USE IT as activity title
2. If request says "plan my [X]" → Activity: "[X] Plan" or just "[X]"
3. If request mentions goal → USE THE GOAL as title
4. If pasted content has markdown headers (# Title) → USE THAT HEADER
5. If timeframe mentioned → INCLUDE IT in title
6. If request is a list without title → CREATE descriptive title from context
7. NEVER use generic titles like "Action Plan" or "Your Tasks"
8. NEVER use meta descriptions about generating or creating

EXAMPLES:

Request: "plan my weekend: 1. Document workflow 2. File trademark 3. Register copyright"
✅ Activity Title: "Weekend: IP Protection Tasks"

Request: "I need to prep for my interview at Google next week"
✅ Activity Title: "Google Interview Prep - Next Week"

Request: "🏋️ 30-day fitness challenge..."
✅ Activity Title: "🏋️ 30-Day Fitness Challenge"

Request: "# Weekend Shopping List\n1. Buy groceries\n2. Get new shoes"
✅ Activity Title: "Weekend Shopping List"

Request: "organize my home office this week"
✅ Activity Title: "Home Office Organization - This Week"

Request: "Learn React basics, build a todo app, deploy it"
✅ Activity Title: "React Learning Project"

Return ONLY valid JSON, no markdown blocks.`;
  }

  /**
   * Build prompt for MODIFYING existing plan
   */
  private buildModificationPrompt(
    userInput: string,
    existingPlan: DirectPlanResult,
    userProfile: User
  ): string {

    return `Modify the existing plan based on the user's request.

EXISTING PLAN:
${JSON.stringify(existingPlan, null, 2)}

USER'S MODIFICATION REQUEST:
"${userInput}"

TASK:
Update the plan based on the request. This could mean:
- Adding new tasks
- Removing tasks
- Changing task details (title, description, priority)
- Updating activity title or description
- Reordering tasks

Apply the requested changes and return the UPDATED plan.

OUTPUT FORMAT (JSON only):
{
  "activity": {
    "title": "Updated title (if changed)",
    "description": "Updated description (if changed)",
    "category": "Updated category (if changed)"
  },
  "tasks": [
    // All tasks (existing + new, minus removed)
    {
      "title": "Task title",
      "description": "Task description",
      "category": "Category",
      "priority": "high|medium|low"
    }
  ]
}

RULES:
- Keep existing tasks unless explicitly asked to remove them
- If adding, append new tasks to the list
- If removing, identify by title/description and exclude
- If modifying, update the matching task
- Preserve task order unless asked to reorder

Return ONLY valid JSON, no markdown blocks.`;
  }

  /**
   * Build image message content
   */
  private buildImageMessage(base64Image: string, textPrompt: string): any[] {
    // Extract media type from base64 string
    const mediaTypeMatch = base64Image.match(/data:image\/(.*?);/);
    const mediaType = mediaTypeMatch ? mediaTypeMatch[1] : 'jpeg';

    // Extract base64 data (remove data:image/...;base64, prefix)
    const base64Data = base64Image.includes('base64,')
      ? base64Image.split('base64,')[1]
      : base64Image;

    return [
      {
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: `image/${mediaType}` as any,
          data: base64Data
        }
      },
      {
        type: "text" as const,
        text: textPrompt
      }
    ];
  }
}

// Export singleton instance
export const directPlanGenerator = new DirectPlanGenerator();
