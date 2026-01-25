/**
 * Local Test Script for Gemini-Powered Planning
 *
 * Test Quick Plan and Smart Plan flows without running the full app.
 * Uses Gemini with Google Search and Maps grounding.
 *
 * Usage:
 *   npx tsx server/test-gemini-planner.ts
 *
 * Or with specific test:
 *   npx tsx server/test-gemini-planner.ts quick
 *   npx tsx server/test-gemini-planner.ts smart
 *   npx tsx server/test-gemini-planner.ts grounding
 */

import 'dotenv/config';
import * as readline from 'readline';
import {
  generateWithGrounding,
  isGeminiConfigured,
  formatGroundingSources,
  type GeminiMessage,
  type GeminiGroundingConfig,
} from './services/geminiProvider';

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

// Mock user location (Los Angeles)
const MOCK_LOCATION = {
  latitude: 34.0522,
  longitude: -118.2437,
  city: 'Los Angeles, CA',
};

// System prompt for planning
function buildPlannerSystemPrompt(mode: 'quick' | 'smart', location?: { city?: string }): string {
  const minQuestions = mode === 'quick' ? 5 : 10;
  const modeDesc = mode === 'quick'
    ? 'Quick planning - ask 5 essential questions then generate plan'
    : 'Smart planning - ask 10 detailed questions for comprehensive plan';

  return `You are JournalMate Planning Agent - an expert lifestyle and activity planner.

## Mode: ${mode.toUpperCase()} PLAN
${modeDesc}

## User Location
${location?.city ? `Current location: ${location.city}` : 'Location not provided - ask if relevant'}

## Your Task
Help the user plan ANY activity (trips, dates, workouts, events, goals).
1. Ask ${minQuestions} targeted questions to understand their needs
2. Use Google Search grounding for real-time data (weather, prices, hours)
3. Use Google Maps grounding for venue recommendations near them
4. Generate a detailed, actionable plan with REAL data (no placeholders)

## Rules
- NEVER use placeholder text like "[Restaurant name]" or "[Choose a location]"
- ALWAYS use real venue names, prices, and details from grounding
- Include weather forecast when relevant to outdoor activities
- Show driving distances/times for location-based plans
- Format output with emojis and clear markdown sections

## Question Batching
${mode === 'quick' ? `
- Turn 1: Ask 3 essential questions
- Turn 2: Ask 2 more questions
- Turn 3+: Generate the full plan` : `
- Turn 1: Ask 3 questions
- Turn 2: Ask 3 more questions
- Turn 3: Ask 4 final questions
- Turn 4+: Generate the full plan`}

## Plan Output Format (when ready)
# 🎯 [Activity Title]

## 📍 Overview
- Date/Duration
- Budget
- Location

## 🗓️ Itinerary
[Day-by-day or step-by-step with real venue names, times, costs]

## 💰 Budget Breakdown
[Itemized with calculations]

## 💡 Tips
[Based on real-time data]

## 🔗 Activity Link
[Generate a Google Maps URL for the main destination]
`;
}

/**
 * Run an interactive planning conversation
 */
async function runInteractivePlanner(mode: 'quick' | 'smart') {
  console.log(`\n${colors.bright}${colors.cyan}=== JournalMate ${mode.toUpperCase()} PLAN Test ===${colors.reset}\n`);
  console.log(`${colors.yellow}Using Gemini with Google Search + Maps grounding${colors.reset}`);
  console.log(`${colors.blue}Location: ${MOCK_LOCATION.city}${colors.reset}\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const conversationHistory: GeminiMessage[] = [];
  const systemPrompt = buildPlannerSystemPrompt(mode, MOCK_LOCATION);

  const groundingConfig: GeminiGroundingConfig = {
    enableGoogleSearch: true,
    enableGoogleMaps: true,
    userLocation: MOCK_LOCATION,
  };

  console.log(`${colors.green}JournalMate:${colors.reset} Hi! I'm here to help you plan. What would you like to plan today?\n`);
  console.log(`${colors.magenta}(Type your message, or 'quit' to exit)${colors.reset}\n`);

  const askQuestion = (): void => {
    rl.question(`${colors.cyan}You:${colors.reset} `, async (input) => {
      const userInput = input.trim();

      if (userInput.toLowerCase() === 'quit' || userInput.toLowerCase() === 'exit') {
        console.log(`\n${colors.yellow}Goodbye!${colors.reset}\n`);
        rl.close();
        return;
      }

      if (!userInput) {
        askQuestion();
        return;
      }

      // Add user message to history
      conversationHistory.push({ role: 'user', content: userInput });

      try {
        console.log(`\n${colors.yellow}[Generating with Gemini...]${colors.reset}\n`);

        const response = await generateWithGrounding(
          conversationHistory,
          systemPrompt,
          groundingConfig
        );

        // Add assistant response to history
        conversationHistory.push({ role: 'model', content: response.content });

        // Display response
        console.log(`${colors.green}JournalMate:${colors.reset}`);
        console.log(response.content);

        // Show grounding sources if available
        if (response.groundingMetadata) {
          const sources = formatGroundingSources(response.groundingMetadata);
          if (sources) {
            console.log(`\n${colors.blue}--- Grounding Data ---${colors.reset}`);
            console.log(sources);
          }
        }

        console.log('');
      } catch (error: any) {
        console.error(`${colors.yellow}Error: ${error.message}${colors.reset}\n`);
      }

      askQuestion();
    });
  };

  askQuestion();
}

/**
 * Test grounding with a simple query
 */
async function testGrounding() {
  console.log(`\n${colors.bright}${colors.cyan}=== Gemini Grounding Test ===${colors.reset}\n`);

  const testQueries = [
    {
      name: 'Weather Query',
      query: 'What is the weather forecast for Los Angeles this weekend?',
      expectSearch: true,
    },
    {
      name: 'Restaurant Query',
      query: 'What are the best Italian restaurants near me in Los Angeles?',
      expectMaps: true,
    },
    {
      name: 'Activity Query',
      query: 'What outdoor activities can I do in LA this Saturday considering the weather?',
      expectBoth: true,
    },
  ];

  for (const test of testQueries) {
    console.log(`${colors.yellow}Testing: ${test.name}${colors.reset}`);
    console.log(`Query: "${test.query}"\n`);

    try {
      const response = await generateWithGrounding(
        [{ role: 'user', content: test.query }],
        'You are a helpful assistant. Provide accurate, real-time information based on grounding data.',
        {
          enableGoogleSearch: true,
          enableGoogleMaps: true,
          userLocation: MOCK_LOCATION,
        }
      );

      console.log(`${colors.green}Response:${colors.reset}`);
      console.log(response.content.substring(0, 500) + (response.content.length > 500 ? '...' : ''));
      console.log('');

      if (response.groundingMetadata) {
        console.log(`${colors.blue}Grounding:${colors.reset}`);
        if (response.groundingMetadata.searchQueries?.length) {
          console.log(`  ✓ Search queries: ${response.groundingMetadata.searchQueries.join(', ')}`);
        }
        if (response.groundingMetadata.sources?.length) {
          console.log(`  ✓ Web sources: ${response.groundingMetadata.sources.length} found`);
        }
        if (response.groundingMetadata.mapsResults?.length) {
          console.log(`  ✓ Maps results: ${response.groundingMetadata.mapsResults.length} found`);
          response.groundingMetadata.mapsResults.slice(0, 3).forEach(r => {
            console.log(`    - ${r.name}${r.rating ? ` (${r.rating}⭐)` : ''}`);
          });
        }
      } else {
        console.log(`${colors.yellow}  ⚠ No grounding metadata returned${colors.reset}`);
      }

      console.log('\n' + '─'.repeat(50) + '\n');
    } catch (error: any) {
      console.error(`${colors.yellow}Error: ${error.message}${colors.reset}\n`);
    }
  }
}

/**
 * Run a full planning scenario (non-interactive)
 */
async function runPlanningScenario(mode: 'quick' | 'smart') {
  console.log(`\n${colors.bright}${colors.cyan}=== ${mode.toUpperCase()} PLAN Scenario Test ===${colors.reset}\n`);

  const scenario = mode === 'quick'
    ? [
        'Help me plan a weekend trip to San Diego',
        'This Saturday and Sunday. Budget around $500 for two people.',
        "We love the beach, good food, and maybe some outdoor activities. We're driving from LA.",
      ]
    : [
        'Help me plan a romantic anniversary date night',
        "It's our 5th anniversary. Budget is flexible, maybe $300-400.",
        'We both love Italian food and live music. Somewhere in downtown LA.',
        'Saturday evening. We want it to feel special and memorable.',
      ];

  const conversationHistory: GeminiMessage[] = [];
  const systemPrompt = buildPlannerSystemPrompt(mode, MOCK_LOCATION);

  const groundingConfig: GeminiGroundingConfig = {
    enableGoogleSearch: true,
    enableGoogleMaps: true,
    userLocation: MOCK_LOCATION,
  };

  for (let i = 0; i < scenario.length; i++) {
    const userMessage = scenario[i];
    console.log(`${colors.cyan}Turn ${i + 1} - User:${colors.reset} ${userMessage}\n`);

    conversationHistory.push({ role: 'user', content: userMessage });

    try {
      const response = await generateWithGrounding(
        conversationHistory,
        systemPrompt,
        groundingConfig
      );

      conversationHistory.push({ role: 'model', content: response.content });

      console.log(`${colors.green}JournalMate:${colors.reset}`);
      console.log(response.content);

      if (response.groundingMetadata?.sources?.length) {
        console.log(`\n${colors.blue}[Used ${response.groundingMetadata.sources.length} web sources]${colors.reset}`);
      }
      if (response.groundingMetadata?.mapsResults?.length) {
        console.log(`${colors.blue}[Found ${response.groundingMetadata.mapsResults.length} venues from Maps]${colors.reset}`);
      }

      console.log('\n' + '─'.repeat(50) + '\n');
    } catch (error: any) {
      console.error(`${colors.yellow}Error: ${error.message}${colors.reset}\n`);
      break;
    }
  }

  // Final turn: ask to generate the plan
  console.log(`${colors.cyan}Final Turn - User:${colors.reset} Create the plan\n`);
  conversationHistory.push({ role: 'user', content: 'Create the plan' });

  try {
    const response = await generateWithGrounding(
      conversationHistory,
      systemPrompt,
      groundingConfig
    );

    console.log(`${colors.green}JournalMate (Final Plan):${colors.reset}`);
    console.log(response.content);

    const sources = formatGroundingSources(response.groundingMetadata);
    if (sources) {
      console.log(sources);
    }
  } catch (error: any) {
    console.error(`${colors.yellow}Error: ${error.message}${colors.reset}\n`);
  }
}

// Main execution
async function main() {
  // Check configuration
  if (!isGeminiConfigured()) {
    console.error(`${colors.yellow}Error: GOOGLE_API_KEY not set in environment${colors.reset}`);
    console.error('Please add GOOGLE_API_KEY to your .env file');
    process.exit(1);
  }

  console.log(`${colors.green}✓ Gemini API configured${colors.reset}`);

  // Parse command line args
  const arg = process.argv[2]?.toLowerCase();

  switch (arg) {
    case 'quick':
      await runInteractivePlanner('quick');
      break;
    case 'smart':
      await runInteractivePlanner('smart');
      break;
    case 'grounding':
      await testGrounding();
      break;
    case 'scenario-quick':
      await runPlanningScenario('quick');
      break;
    case 'scenario-smart':
      await runPlanningScenario('smart');
      break;
    default:
      console.log(`
${colors.bright}Gemini Planner Test Script${colors.reset}

Usage:
  npx tsx server/test-gemini-planner.ts <command>

Commands:
  ${colors.cyan}quick${colors.reset}           Interactive Quick Plan test (5 questions)
  ${colors.cyan}smart${colors.reset}           Interactive Smart Plan test (10 questions)
  ${colors.cyan}grounding${colors.reset}       Test grounding with sample queries
  ${colors.cyan}scenario-quick${colors.reset}  Run automated Quick Plan scenario
  ${colors.cyan}scenario-smart${colors.reset}  Run automated Smart Plan scenario

Examples:
  npx tsx server/test-gemini-planner.ts quick
  npx tsx server/test-gemini-planner.ts grounding
`);
  }
}

main().catch(console.error);
