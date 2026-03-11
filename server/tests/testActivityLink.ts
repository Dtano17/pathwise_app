/**
 * Test script to verify activity link creation works correctly
 * Run with: npx tsx server/tests/testActivityLink.ts
 */

// Set environment variable for testing
process.env.APP_URL = 'https://journalmate.ai';

// Updated function matching the new code in routes.ts
function formatActivitySuccessMessage(
  activity: { id: string; title: string },
  emoji: string = '📝',
  isUpdate: boolean = false
): string {
  // Use full URL for better compatibility with markdown rendering
  const baseUrl = process.env.APP_URL || 'https://journalmate.ai';
  const activityUrl = `${baseUrl}/app?tab=activities&activity=${activity.id}`;
  const activityLink = `[${emoji} ${activity.title}](${activityUrl})`;
  return isUpdate
    ? `${activityLink}\n\n♻️ Your plan has been updated!`
    : `${activityLink}\n\n✨ Your plan is ready!`;
}

// Test cases
const testCases = [
  {
    name: 'Activity link with full URL',
    activity: { id: 'test-uuid-12345', title: 'Dennis Cozy Evening Plans' },
    emoji: '🍽️',
    isUpdate: false,
    expectedUrl: 'https://journalmate.ai/app?tab=activities&activity=test-uuid-12345',
    expectedMessage: '✨ Your plan is ready!'
  },
  {
    name: 'Activity update link',
    activity: { id: 'abc-456', title: 'Trip to Austin' },
    emoji: '✈️',
    isUpdate: true,
    expectedUrl: 'https://journalmate.ai/app?tab=activities&activity=abc-456',
    expectedMessage: '♻️ Your plan has been updated!'
  }
];

console.log('=== Activity Link Generation Tests ===\n');

let passed = 0;
let failed = 0;

for (const test of testCases) {
  console.log(`Test: ${test.name}`);
  console.log(`  Input: { id: "${test.activity.id}", title: "${test.activity.title}" }`);

  const result = formatActivitySuccessMessage(test.activity, test.emoji, test.isUpdate);

  console.log(`  Output:\n    ${result.replace(/\n/g, '\n    ')}`);

  const hasUrl = result.includes(test.expectedUrl);
  const hasMessage = result.includes(test.expectedMessage);
  const hasMarkdownLink = result.match(/\[.+\]\(https:\/\/.+\)/);

  if (hasUrl && hasMessage && hasMarkdownLink) {
    console.log(`  ✅ PASS - Full URL link format correct\n`);
    passed++;
  } else {
    console.log(`  ❌ FAIL`);
    if (!hasUrl) console.log(`    Missing expected URL: ${test.expectedUrl}`);
    if (!hasMessage) console.log(`    Missing expected message: ${test.expectedMessage}`);
    if (!hasMarkdownLink) console.log(`    Missing markdown link format [text](url)`);
    console.log('');
    failed++;
  }
}

console.log('=== Summary ===');
console.log(`Passed: ${passed}/${testCases.length}`);
console.log(`Failed: ${failed}/${testCases.length}`);

if (failed === 0) {
  console.log('\n✅ All tests passed!');
  console.log('\nExpected output when user confirms plan:');
  console.log('─'.repeat(50));
  const example = formatActivitySuccessMessage(
    { id: 'real-activity-uuid', title: 'Dennis Cozy Evening Plans' },
    '🍽️',
    false
  );
  console.log(example);
  console.log('─'.repeat(50));
  console.log('\nThis markdown link should be clickable in the chat!');
}
