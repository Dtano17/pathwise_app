/**
 * Quick Integration Test for Universal Planning Agent
 * Run with: node test-universal-agent.js
 */

console.log('🧪 Testing Universal Planning System...\n');

const tests = [
  {
    name: 'Domain Registry - Load Domains',
    test: async () => {
      const { domainRegistry } = await import('./dist/index.js');
      await domainRegistry.loadDomains();
      const domains = domainRegistry.getAvailableDomains();
      console.log('   ✓ Loaded domains:', domains.join(', '));
      if (domains.length !== 5) throw new Error('Expected 5 domains');
    }
  },
  {
    name: 'Domain Registry - Detect Travel Domain',
    test: async () => {
      const { domainRegistry } = await import('./dist/index.js');
      const result = await domainRegistry.detectDomain('Plan my trip to Dallas');
      console.log('   ✓ Detected domain:', result.domain, '(confidence:', result.confidence + ')');
      if (result.domain !== 'travel') throw new Error('Expected travel domain');
    }
  },
  {
    name: 'Domain Registry - Get Quick Plan Questions',
    test: async () => {
      const { domainRegistry } = await import('./dist/index.js');
      const questions = domainRegistry.getQuestions('travel', 'quick');
      console.log('   ✓ Quick Plan questions:', questions.length);
      if (questions.length !== 5) throw new Error('Expected 5 questions for quick plan');
    }
  },
  {
    name: 'Domain Registry - Get Smart Plan Questions',
    test: async () => {
      const { domainRegistry } = await import('./dist/index.js');
      const questions = domainRegistry.getQuestions('travel', 'smart');
      console.log('   ✓ Smart Plan questions:', questions.length);
      if (questions.length !== 7) throw new Error('Expected 7 questions for smart plan');
    }
  },
  {
    name: 'Build Output - Check dist files exist',
    test: async () => {
      const fs = await import('fs');
      const exists = fs.existsSync('./dist/index.js');
      console.log('   ✓ dist/index.js exists:', exists);
      if (!exists) throw new Error('Build output not found');
    }
  }
];

async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const { name, test } of tests) {
    try {
      console.log(`\n📝 ${name}`);
      await test();
      passed++;
      console.log('   ✅ PASSED');
    } catch (error) {
      failed++;
      console.log('   ❌ FAILED:', error.message);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    console.log('❌ Some tests failed. Please review errors above.');
    process.exit(1);
  } else {
    console.log('✅ All tests passed! Safe to commit.');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('\n💥 Test suite error:', err);
  process.exit(1);
});
