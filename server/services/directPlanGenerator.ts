import Anthropic from "@anthropic-ai/sdk";
import type { User } from '@shared/schema';
import axios from 'axios';
import { tavily } from '@tavily/core';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Initialize Tavily client for advanced URL content extraction
const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

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
   * Detect if input is a URL (entire input is just a URL)
   */
  private isUrl(input: string): boolean {
    try {
      new URL(input.trim());
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract URLs from text input
   * Returns array of URLs found in the text
   */
  private extractUrls(input: string): string[] {
    // Match URLs starting with http:// or https://
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    const matches = input.match(urlRegex) || [];
    return matches.map(url => {
      // Clean up trailing punctuation that might have been captured
      return url.replace(/[.,;:!?)]+$/, '');
    });
  }

  /**
   * Extract content from URL using Tavily Extract API
   * Handles JavaScript-rendered pages, CAPTCHAs, and anti-bot measures
   */
  private async extractUrlContentWithTavily(url: string): Promise<string> {
    try {
      console.log(`[DIRECT PLAN] Extracting URL with Tavily (advanced mode): ${url}`);
      
      const response = await tavilyClient.extract([url], {
        extractDepth: 'advanced', // Handles JS rendering, CAPTCHAs, anti-bot
        format: 'markdown', // Get clean markdown format
        timeout: 30 // 30 second timeout for advanced extraction
      });

      if (response.results && response.results.length > 0) {
        const content = response.results[0].rawContent;
        if (content) {
          console.log(`[DIRECT PLAN] Successfully extracted ${content.length} chars from URL via Tavily`);
          return content.substring(0, 5000); // Limit to 5000 chars
        }
      }

      if (response.failedResults && response.failedResults.length > 0) {
        throw new Error(`Tavily extraction failed: ${response.failedResults[0]}`);
      }

      throw new Error('Tavily extraction returned no content');
    } catch (error) {
      console.error('[DIRECT PLAN] Tavily extraction failed:', error);
      throw error;
    }
  }

  /**
   * Fetch content from URL with fallback chain:
   * 1. Try Tavily Extract (handles JS-rendered pages)
   * 2. Fall back to basic axios
   * 3. Fail with user-friendly message
   */
  private async fetchUrlContent(url: string): Promise<string> {
    try {
      console.log(`[DIRECT PLAN] Fetching URL content: ${url}`);
      
      // Try Tavily Extract first (best for JS-rendered pages, Copilot shares, SPAs)
      try {
        return await this.extractUrlContentWithTavily(url);
      } catch (tavily_error) {
        console.warn('[DIRECT PLAN] Tavily extraction failed, falling back to axios:', tavily_error);
        // Fall through to axios fallback
      }

      // Fallback: Try basic axios fetch
      try {
        console.log(`[DIRECT PLAN] Falling back to basic axios fetch: ${url}`);
        const response = await axios.get(url, { timeout: 10000 });
        const content = response.data;
        
        // Extract text content from HTML if needed
        if (typeof content === 'string' && content.includes('<html')) {
          // Basic HTML text extraction
          const text = content
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          console.log(`[DIRECT PLAN] Extracted ${text.length} chars from URL via axios`);
          return text.substring(0, 5000); // Limit to 5000 chars
        }
        
        const result = content.toString().substring(0, 5000);
        console.log(`[DIRECT PLAN] Extracted ${result.length} chars from URL via axios`);
        return result;
      } catch (axios_error) {
        console.error('[DIRECT PLAN] Axios fetch also failed:', axios_error);
        throw axios_error;
      }
    } catch (error) {
      console.error('[DIRECT PLAN] All URL fetch methods failed:', error);
      throw new Error(`Failed to fetch URL content: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

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

    // Step 0: Check if input contains URLs and fetch content from them
    let processedInput = userInput;
    if (!isModification && contentType === 'text') {
      // First check if entire input is a URL
      if (this.isUrl(userInput.trim())) {
        console.log('[DIRECT PLAN] Single URL detected, fetching content...');
        try {
          const urlContent = await this.fetchUrlContent(userInput.trim());
          processedInput = `URL: ${userInput.trim()}\n\nContent from URL:\n${urlContent}`;
          console.log(`[DIRECT PLAN] Fetched ${urlContent.length} chars from URL`);
        } catch (error) {
          console.error('[DIRECT PLAN] URL fetch failed:', error);
          // Don't throw - continue with original input and let AI handle it
          processedInput = `User wants to create a plan from this URL (content could not be fetched): ${userInput}`;
        }
      } else {
        // Check if input contains URLs within text
        const urls = this.extractUrls(userInput);
        if (urls.length > 0) {
          console.log(`[DIRECT PLAN] Found ${urls.length} URL(s) in text:`, urls);
          
          // Fetch content from all URLs (limit to first 3)
          const urlContents: string[] = [];
          for (const url of urls.slice(0, 3)) {
            try {
              console.log(`[DIRECT PLAN] Fetching content from: ${url}`);
              const content = await this.fetchUrlContent(url);
              urlContents.push(`\n--- Content from ${url} ---\n${content}`);
              console.log(`[DIRECT PLAN] Fetched ${content.length} chars from ${url}`);
            } catch (error) {
              console.error(`[DIRECT PLAN] Failed to fetch ${url}:`, error);
              urlContents.push(`\n--- Could not fetch content from ${url} ---`);
            }
          }
          
          if (urlContents.length > 0) {
            // Combine user's text with fetched URL content
            processedInput = `${userInput}\n\n=== FETCHED URL CONTENT ===\n${urlContents.join('\n')}`;
          }
        }
      }
    }

    // Step 1: Validate if input is plan-related (guardrail check)
    if (!isModification && contentType === 'text') {
      const isPlanRelated = await this.validatePlanIntent(processedInput);
      if (!isPlanRelated) {
        throw new Error('INPUT_NOT_PLAN_RELATED: Your input doesn\'t appear to be requesting a plan. Please describe what you want to plan or accomplish.');
      }
    }

    // Build prompt based on whether it's new or modification
    const prompt = isModification
      ? this.buildModificationPrompt(processedInput, existingPlan, userProfile)
      : this.buildCreationPrompt(processedInput, contentType, userProfile);

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

    const userName = userProfile.firstName || userProfile.username || 'User';
    const userContext = `User: ${userName}
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

⚠️ CRITICAL: URL CONTENT HANDLING ⚠️
When the input contains "FETCHED URL CONTENT" or "Content from URL":
- You HAVE the actual content already - it's provided above!
- Generate actionable tasks DIRECTLY FROM the content
- DO NOT create tasks like "Access the URL", "Navigate to the link", "Read the content"
- DO NOT create tasks that tell the user to visit/review/access the URL
- The content HAS BEEN extracted for you - work with it directly!

FORBIDDEN TASK PATTERNS (never generate these):
❌ "Access the shared URL"
❌ "Navigate to [URL] and verify..."
❌ "Extract and document key information"
❌ "Review your notes to identify..."
❌ "Read through all content in the shared link"
❌ "Take note of any access requirements"

CORRECT TASK PATTERNS (generate these instead):
✅ "Implement [specific feature from content]"
✅ "Create [specific deliverable mentioned]"
✅ "Set up [specific component described]"
✅ "Configure [specific setting referenced]"
✅ "Write [specific document/code from requirements]"
✅ "Complete [specific action item from content]"

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
