import 'dotenv/config';
import { directPlanGenerator } from './server/services/directPlanGenerator';
import type { User } from '@shared/schema';

// Mock user profile
const mockUser: User = {
  id: 'test-user',
  name: 'Test User',
  email: 'test@example.com',
  location: 'New York',
  timezone: 'America/New_York',
  createdAt: new Date(),
  updatedAt: new Date()
};

async function testDirectPlan(userRequest: string) {
  console.log('\n=== TESTING DIRECT PLAN GENERATION ===\n');
  console.log('User Request:');
  console.log(userRequest);
  console.log('\n--- Sending to Claude ---\n');

  try {
    const result = await directPlanGenerator.generatePlan(
      userRequest,
      'text',
      mockUser
    );

    console.log('=== CLAUDE RESPONSE (JSON) ===\n');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n=== FORMATTED OUTPUT ===\n');
    console.log(`Activity: ${result.activity.title}`);
    console.log(`Category: ${result.activity.category}`);
    console.log(`Description: ${result.activity.description}`);
    console.log(`\nTasks (${result.tasks.length}):`);
    result.tasks.forEach((task, i) => {
      console.log(`  ${i + 1}. [${task.priority}] ${task.title}`);
      console.log(`     ${task.description}`);
    });

    return result;
  } catch (error) {
    console.error('ERROR:', error);
    throw error;
  }
}

// Get user request from command line
const userRequest = process.argv[2];

if (!userRequest) {
  console.log('Usage: npx tsx test-direct-plan.ts "your request here"');
  console.log('\nExample:');
  console.log('  npx tsx test-direct-plan.ts "plan my weekend: 1. Document workflow 2. File trademark 3. Register copyright"');
  process.exit(1);
}

testDirectPlan(userRequest);
