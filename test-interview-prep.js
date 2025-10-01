import { universalPlanningAgent } from './server/services/universalPlanningAgent.js';

// Mock user for testing
const mockUser = {
  id: 1,
  email: 'test@example.com',
  displayName: 'Test User',
  timezone: 'America/Chicago'
};

// Test conversation flow
async function testInterviewPrep() {
  console.log('=== Testing Interview Prep Domain ===\n');

  let conversationHistory = [];
  let currentSlots = {};
  let currentDomain = undefined;

  // Message 1: Initial request
  console.log('User: "Help me plan for my disney interview coming up"\n');
  let response1 = await universalPlanningAgent.processUserRequest(
    "Help me plan for my disney interview coming up",
    conversationHistory,
    currentSlots,
    mockUser,
    'quick',
    currentDomain
  );

  console.log('Agent Response:');
  console.log(response1.message);
  console.log('\nSlots after message 1:', JSON.stringify(response1.updatedSlots, null, 2));
  console.log('\n---\n');

  // Update state
  conversationHistory.push(
    { role: 'user', content: "Help me plan for my disney interview coming up" },
    { role: 'assistant', content: response1.message }
  );
  currentSlots = response1.updatedSlots;
  currentDomain = response1.domain;

  // Message 2: Answer role and type
  console.log('User: "This is a technical interview for a streaming data engineering position using scala"\n');
  let response2 = await universalPlanningAgent.processUserRequest(
    "This is a technical interview for a streaming data engineering position using scala",
    conversationHistory,
    currentSlots,
    mockUser,
    'quick',
    currentDomain
  );

  console.log('Agent Response:');
  console.log(response2.message);
  console.log('\nSlots after message 2:', JSON.stringify(response2.updatedSlots, null, 2));
  console.log('\n---\n');

  // Update state
  conversationHistory.push(
    { role: 'user', content: "This is a technical interview for a streaming data engineering position using scala" },
    { role: 'assistant', content: response2.message }
  );
  currentSlots = response2.updatedSlots;

  // Message 3: Answer date
  console.log('User: "The interview is scheduled on Friday 5pm pst and i am central"\n');
  let response3 = await universalPlanningAgent.processUserRequest(
    "The interview is scheduled on Friday 5pm pst and i am central",
    conversationHistory,
    currentSlots,
    mockUser,
    'quick',
    currentDomain
  );

  console.log('Agent Response:');
  console.log(response3.message);
  console.log('\nSlots after message 3:', JSON.stringify(response3.updatedSlots, null, 2));
  console.log('\n---\n');

  // Check if we're stuck in loop
  if (response3.message === response2.message) {
    console.error('❌ LOOP DETECTED: Agent asking same questions!');
  } else if (response3.planReady) {
    console.log('✅ SUCCESS: Plan is ready!');
  } else {
    console.log('ℹ️ Still gathering information (expected)');
  }
}

testInterviewPrep().catch(console.error);
