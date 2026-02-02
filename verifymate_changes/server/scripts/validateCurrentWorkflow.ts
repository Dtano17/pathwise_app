/**
 * Current Workflow Validation Script
 *
 * This script validates the CURRENT workflow before Phase 2 migration.
 * It will show exactly what bugs exist and how they manifest.
 *
 * Run this with: tsx server/scripts/validateCurrentWorkflow.ts
 */

import 'dotenv/config';
import { universalPlanningAgent } from '../services/universalPlanningAgent';
import type { User } from '@shared/schema';

// Mock user
const mockUser: User = {
  id: 'test-user',
  email: 'test@example.com',
  name: 'Test User',
  location: 'Austin, Texas',
  createdAt: new Date(),
  preferences: {}
};

// Mock storage
const mockStorage = {
  createActivity: async (data: any) => ({ id: 'activity-123', ...data }),
  createTask: async (data: any) => ({ id: `task-${Date.now()}`, ...data }),
  addTaskToActivity: async () => true,
  getActivityTasks: async () => []
};

/**
 * Simulate the exact conversation from the user's screenshot
 */
async function simulateConversation() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  CURRENT WORKFLOW VALIDATION - Dallas Trip Scenario      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  let conversationHistory: any[] = [];
  let currentSlots: any = {};
  let domain: string | undefined = undefined;
  let turn = 0;

  const bugTracker = {
    duplicateQuestions: [] as string[],
    progressRegression: false,
    unrecognizedResponses: [] as string[],
    askedQuestionsNotTracked: false
  };

  try {
    // TURN 1: Initial comprehensive message
    console.log('═'.repeat(60));
    console.log(`TURN ${++turn}: User provides comprehensive initial info`);
    console.log('═'.repeat(60));

    const message1 = "Help plan my trip to dallas next weekend from the 10th to the 12th. I will be flying my girlfriend in from LAX and I will be driving from Austin Texas";
    console.log(`\n📤 USER: ${message1}\n`);

    const response1 = await universalPlanningAgent.processUserRequest(
      message1,
      conversationHistory,
      currentSlots,
      mockUser,
      'quick',
      domain,
      mockStorage as any
    );

    console.log(`📥 AGENT: ${response1.message}\n`);
    console.log(`📊 Progress: ${response1.progress?.answered}/${response1.progress?.total} (${response1.progress?.percentage}%)`);
    console.log(`🏷️  Domain: ${response1.domain}`);
    console.log(`🔄 Phase: ${response1.phase}`);
    console.log(`\n📝 Extracted Slots:`, JSON.stringify(response1.updatedSlots, null, 2));

    // Check for bugs
    if (response1.message.toLowerCase().includes('when') ||
        response1.message.toLowerCase().includes('date')) {
      bugTracker.duplicateQuestions.push('Asked about dates despite being provided');
      console.log('\n❌ BUG DETECTED: Asked about dates even though user provided "next weekend from 10th to 12th"');
    }

    if (response1.message.toLowerCase().includes('where') ||
        response1.message.toLowerCase().includes('destination')) {
      bugTracker.duplicateQuestions.push('Asked about destination despite being provided');
      console.log('\n❌ BUG DETECTED: Asked about destination even though user said "Dallas"');
    }

    conversationHistory.push(
      { role: 'user', content: message1 },
      { role: 'assistant', content: response1.message }
    );
    currentSlots = response1.updatedSlots;
    domain = response1.domain;
    const progress1 = response1.progress?.percentage || 0;

    // TURN 2: Provide purpose and budget
    console.log('\n' + '═'.repeat(60));
    console.log(`TURN ${++turn}: User provides purpose and flexible budget`);
    console.log('═'.repeat(60));

    const message2 = "This is for business for my girlfriend, and leisure for me, I have a flexible budget";
    console.log(`\n📤 USER: ${message2}\n`);

    const response2 = await universalPlanningAgent.processUserRequest(
      message2,
      conversationHistory,
      currentSlots,
      mockUser,
      'quick',
      domain,
      mockStorage as any
    );

    console.log(`📥 AGENT: ${response2.message}\n`);
    console.log(`📊 Progress: ${response2.progress?.answered}/${response2.progress?.total} (${response2.progress?.percentage}%)`);
    console.log(`\n📝 Updated Slots:`, JSON.stringify(response2.updatedSlots, null, 2));

    conversationHistory.push(
      { role: 'user', content: message2 },
      { role: 'assistant', content: response2.message }
    );
    currentSlots = response2.updatedSlots;
    const progress2 = response2.progress?.percentage || 0;

    // Check for bugs
    if (!currentSlots.budget || !currentSlots.budget.range) {
      console.log('\n❌ BUG DETECTED: Did not extract "flexible budget" from user message');
    }

    if (response2.message.toLowerCase().includes('budget')) {
      bugTracker.duplicateQuestions.push('Asked about budget after user said "flexible budget"');
      console.log('\n❌ BUG DETECTED: Asked about budget even after user said "flexible budget"');
    }

    if (progress2 < progress1) {
      bugTracker.progressRegression = true;
      console.log(`\n❌ BUG DETECTED: Progress went BACKWARDS! ${progress1}% → ${progress2}%`);
    }

    // TURN 3: "none for now, I am flexible"
    console.log('\n' + '═'.repeat(60));
    console.log(`TURN ${++turn}: User says "none for now, I am flexible"`);
    console.log('═'.repeat(60));

    const message3 = "none for now, I am flexible";
    console.log(`\n📤 USER: ${message3}\n`);

    const response3 = await universalPlanningAgent.processUserRequest(
      message3,
      conversationHistory,
      currentSlots,
      mockUser,
      'quick',
      domain,
      mockStorage as any
    );

    console.log(`📥 AGENT: ${response3.message}\n`);
    console.log(`📊 Progress: ${response3.progress?.answered}/${response3.progress?.total} (${response3.progress?.percentage}%)`);

    conversationHistory.push(
      { role: 'user', content: message3 },
      { role: 'assistant', content: response3.message }
    );
    currentSlots = response3.updatedSlots;
    const progress3 = response3.progress?.percentage || 0;

    // Check for bugs
    if (response3.message.toLowerCase().includes("didn't catch") ||
        response3.message.toLowerCase().includes("rephrase")) {
      bugTracker.unrecognizedResponses.push(message3);
      console.log('\n❌ BUG DETECTED: System said "didn\'t catch that" when user gave valid answer');
    }

    if (progress3 < progress2) {
      bugTracker.progressRegression = true;
      console.log(`\n❌ BUG DETECTED: Progress went BACKWARDS! ${progress2}% → ${progress3}%`);
    }

    // TURN 4: Continue with another response
    console.log('\n' + '═'.repeat(60));
    console.log(`TURN ${++turn}: User provides activities preference`);
    console.log('═'.repeat(60));

    const message4 = "dining and nightlife";
    console.log(`\n📤 USER: ${message4}\n`);

    const response4 = await universalPlanningAgent.processUserRequest(
      message4,
      conversationHistory,
      currentSlots,
      mockUser,
      'quick',
      domain,
      mockStorage as any
    );

    console.log(`📥 AGENT: ${response4.message}\n`);
    console.log(`📊 Progress: ${response4.progress?.answered}/${response4.progress?.total} (${response4.progress?.percentage}%)`);
    console.log(`🔄 Phase: ${response4.phase}`);

    const progress4 = response4.progress?.percentage || 0;

    // Check if same question asked twice
    const askedQuestions = currentSlots._askedQuestions || [];
    const uniqueQuestions = new Set(askedQuestions);
    if (askedQuestions.length !== uniqueQuestions.size) {
      bugTracker.askedQuestionsNotTracked = true;
      console.log('\n❌ BUG DETECTED: Duplicate questions in _askedQuestions array');
      console.log(`   Asked: ${askedQuestions}`);
    }

    // Final Summary
    console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                    BUG REPORT                             ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    if (bugTracker.duplicateQuestions.length > 0) {
      console.log('❌ DUPLICATE QUESTIONS DETECTED:');
      bugTracker.duplicateQuestions.forEach(bug => console.log(`   - ${bug}`));
      console.log('');
    }

    if (bugTracker.progressRegression) {
      console.log('❌ PROGRESS REGRESSION DETECTED:');
      console.log(`   - Progress went backwards during conversation`);
      console.log('');
    }

    if (bugTracker.unrecognizedResponses.length > 0) {
      console.log('❌ UNRECOGNIZED VALID RESPONSES:');
      bugTracker.unrecognizedResponses.forEach(msg => console.log(`   - "${msg}"`));
      console.log('');
    }

    if (bugTracker.askedQuestionsNotTracked) {
      console.log('❌ STATE TRACKING ISSUES:');
      console.log(`   - Asked questions not properly tracked`);
      console.log('');
    }

    if (bugTracker.duplicateQuestions.length === 0 &&
        !bugTracker.progressRegression &&
        bugTracker.unrecognizedResponses.length === 0 &&
        !bugTracker.askedQuestionsNotTracked) {
      console.log('✅ NO BUGS DETECTED!');
      console.log('   Current system is working as expected.');
    }

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                 WORKFLOW ANALYSIS                         ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log(`📊 Total Turns: ${turn}`);
    console.log(`📈 Progress: ${progress1}% → ${progress2}% → ${progress3}% → ${progress4}%`);
    console.log(`🎯 Final Phase: ${response4.phase}`);
    console.log(`🏷️  Domain: ${domain}`);
    console.log(`❓ Questions Asked: ${askedQuestions.length}`);
    console.log(`✅ Questions Answered: ${response4.progress?.answered || 0}`);
    console.log(`⏳ Questions Remaining: ${response4.progress?.total - (response4.progress?.answered || 0)}`);

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║              INITIAL DESIGN VALIDATION                    ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log('Expected Workflow:');
    console.log('1. ✅ Detect domain from initial message');
    console.log('2. ✅ Extract slots from initial message');
    console.log('3. ✅ Generate questions dynamically');
    console.log('4. ✅ Analyze gaps to determine what\'s answered');
    console.log('5. ❓ Ask next question (check for duplicates)');
    console.log('6. ❓ Recognize "flexible"/"none" as valid answers');
    console.log('7. ✅ Track asked questions to prevent duplicates');
    console.log('8. ✅ Generate plan when sufficient info gathered');
    console.log('');

    console.log('Current Implementation Status:');
    if (domain === 'travel') {
      console.log('✅ Domain detection: WORKING');
    } else {
      console.log('❌ Domain detection: FAILED');
    }

    if (currentSlots.location?.destination) {
      console.log('✅ Slot extraction: WORKING');
    } else {
      console.log('❌ Slot extraction: FAILED');
    }

    if (bugTracker.duplicateQuestions.length === 0) {
      console.log('✅ Duplicate prevention: WORKING');
    } else {
      console.log('❌ Duplicate prevention: NEEDS FIX');
    }

    if (bugTracker.unrecognizedResponses.length === 0) {
      console.log('✅ Answer recognition: WORKING');
    } else {
      console.log('❌ Answer recognition: NEEDS FIX');
    }

    if (!bugTracker.progressRegression) {
      console.log('✅ State persistence: WORKING');
    } else {
      console.log('❌ State persistence: NEEDS FIX');
    }

    console.log('\n' + '═'.repeat(60));

  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error);
    console.error('\nStack trace:', error instanceof Error ? error.stack : 'No stack trace');
  }
}

// Run the validation
console.log('\n🚀 Starting workflow validation...\n');
simulateConversation()
  .then(() => {
    console.log('\n✅ Validation complete\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Validation failed:', error);
    process.exit(1);
  });
