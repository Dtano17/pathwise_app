import 'dotenv/config';
import { universalPlanningAgent } from './server/services/universalPlanningAgent.js';

// Mock user for testing
const mockUser = {
  id: 1,
  email: 'test@example.com',
  displayName: 'Test User',
  timezone: 'America/Chicago',
  location: { city: 'Dallas', state: 'TX' }
};

// Test conversation flow for both Quick and Smart plans
async function testPlanningFlow(mode) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${mode.toUpperCase()} Plan Mode`);
  console.log('='.repeat(60));

  let conversationHistory = [];
  let currentSlots = {};
  let currentDomain = undefined;

  // Message 1: Initial request
  console.log('\n📥 User: "Help me plan for my disney interview coming up"\n');
  let response1 = await universalPlanningAgent.processUserRequest(
    "Help me plan for my disney interview coming up",
    conversationHistory,
    currentSlots,
    mockUser,
    mode,
    currentDomain
  );

  console.log('🤖 Agent:');
  console.log(response1.message);
  console.log(`\n📊 Slots: ${JSON.stringify(response1.updatedSlots)}`);
  console.log(`✅ Progress: ${response1.progress?.answered}/${response1.progress?.total} (${response1.progress?.percentage}%)`);
  console.log(`🔘 Show Generate Button: ${response1.showGenerateButton ? 'YES' : 'NO'}`);

  // Update state
  conversationHistory.push(
    { role: 'user', content: "Help me plan for my disney interview coming up" },
    { role: 'assistant', content: response1.message }
  );
  currentSlots = response1.updatedSlots;
  currentDomain = response1.domain;

  // Message 2: Answer role and type
  console.log('\n' + '-'.repeat(60));
  console.log('\n📥 User: "This is a technical interview for a streaming data engineering position using scala"\n');
  let response2 = await universalPlanningAgent.processUserRequest(
    "This is a technical interview for a streaming data engineering position using scala",
    conversationHistory,
    currentSlots,
    mockUser,
    mode,
    currentDomain
  );

  console.log('🤖 Agent:');
  console.log(response2.message);
  console.log(`\n📊 Slots: ${JSON.stringify(response2.updatedSlots)}`);
  console.log(`✅ Progress: ${response2.progress?.answered}/${response2.progress?.total} (${response2.progress?.percentage}%)`);
  console.log(`🔘 Show Generate Button: ${response2.showGenerateButton ? 'YES' : 'NO'}`);

  // Check for loop
  if (response2.message === response1.message) {
    console.log('\n❌ ERROR: LOOP DETECTED - Agent repeating same questions!');
    return false;
  }

  // Update state
  conversationHistory.push(
    { role: 'user', content: "This is a technical interview for a streaming data engineering position using scala" },
    { role: 'assistant', content: response2.message }
  );
  currentSlots = response2.updatedSlots;

  // Message 3: Answer date
  console.log('\n' + '-'.repeat(60));
  console.log('\n📥 User: "The interview is scheduled on Friday 5pm pst and i am central"\n');
  let response3 = await universalPlanningAgent.processUserRequest(
    "The interview is scheduled on Friday 5pm pst and i am central",
    conversationHistory,
    currentSlots,
    mockUser,
    mode,
    currentDomain
  );

  console.log('🤖 Agent:');
  console.log(response3.message);
  console.log(`\n📊 Slots: ${JSON.stringify(response3.updatedSlots)}`);
  console.log(`✅ Progress: ${response3.progress?.answered}/${response3.progress?.total} (${response3.progress?.percentage}%)`);
  console.log(`🔘 Show Generate Button: ${response3.showGenerateButton ? 'YES' : 'NO'}`);

  // Check for loop
  if (response3.message === response2.message || response3.message === response1.message) {
    console.log('\n❌ ERROR: LOOP DETECTED - Agent repeating same questions!');
    return false;
  }

  // Check if plan is ready
  if (response3.showGenerateButton || response3.planReady) {
    console.log('\n✅ SUCCESS: Plan ready to generate!');
    console.log('\n📋 Final Plan Output:');
    console.log('-'.repeat(60));
    console.log(response3.message || response3.enrichedPlan?.richContent || 'Plan content here');
    console.log('-'.repeat(60));
    return true;
  } else {
    console.log('\nℹ️ More questions needed (expected for Smart Plan with 7 questions)');
    return mode === 'smart'; // Smart plan may need more questions
  }
}

// Run tests
async function main() {
  console.log('\n🧪 TESTING UNIVERSAL PLANNING AGENT');
  console.log('Testing Interview Prep Domain\n');

  try {
    // Test Quick Plan
    const quickSuccess = await testPlanningFlow('quick');

    // Test Smart Plan
    const smartSuccess = await testPlanningFlow('smart');

    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Quick Plan: ${quickSuccess ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Smart Plan: ${smartSuccess ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('='.repeat(60) + '\n');

    if (quickSuccess && smartSuccess) {
      console.log('🎉 ALL TESTS PASSED! Ready to deploy.');
      process.exit(0);
    } else {
      console.log('⚠️  SOME TESTS FAILED. Review output above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
