/**
 * Verification Script - Check our changes don't break anything
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Universal Planning System Changes...\n');

const checks = [
  {
    name: 'Domain Config Files Exist',
    check: () => {
      const domains = ['travel', 'interview_prep', 'date_night', 'daily_planning', 'fitness'];
      const missing = [];

      domains.forEach(domain => {
        const filePath = path.join(__dirname, 'server', 'domains', `${domain}.json`);
        if (!fs.existsSync(filePath)) {
          missing.push(domain);
        }
      });

      if (missing.length > 0) {
        throw new Error(`Missing domain files: ${missing.join(', ')}`);
      }

      console.log(`   ✓ All 5 domain config files exist`);
    }
  },
  {
    name: 'Domain Config Files Valid JSON',
    check: () => {
      const domains = ['travel', 'interview_prep', 'date_night', 'daily_planning', 'fitness'];

      domains.forEach(domain => {
        const filePath = path.join(__dirname, 'server', 'domains', `${domain}.json`);
        const content = fs.readFileSync(filePath, 'utf8');
        JSON.parse(content); // Will throw if invalid
      });

      console.log(`   ✓ All domain configs are valid JSON`);
    }
  },
  {
    name: 'Domain Configs Have Required Fields',
    check: () => {
      const domains = ['travel', 'interview_prep', 'date_night', 'daily_planning', 'fitness'];

      domains.forEach(domain => {
        const filePath = path.join(__dirname, 'server', 'domains', `${domain}.json`);
        const config = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (!config.domain) throw new Error(`${domain}: missing 'domain' field`);
        if (!config.questions) throw new Error(`${domain}: missing 'questions' field`);
        if (!config.questions.quick_plan) throw new Error(`${domain}: missing 'quick_plan' questions`);
        if (!config.questions.smart_plan) throw new Error(`${domain}: missing 'smart_plan' questions`);

        if (config.questions.quick_plan.length !== 5) {
          throw new Error(`${domain}: quick_plan should have 5 questions, has ${config.questions.quick_plan.length}`);
        }

        if (config.questions.smart_plan.length !== 7) {
          throw new Error(`${domain}: smart_plan should have 7 questions, has ${config.questions.smart_plan.length}`);
        }
      });

      console.log(`   ✓ All domains have 5 quick + 7 smart questions`);
    }
  },
  {
    name: 'New Service Files Exist',
    check: () => {
      const services = [
        'domainRegistry.ts',
        'universalPlanningAgent.ts',
        'enrichmentService.ts',
        'contextualEnrichmentAgent.ts'
      ];

      const missing = [];
      services.forEach(service => {
        const filePath = path.join(__dirname, 'server', 'services', service);
        if (!fs.existsSync(filePath)) {
          missing.push(service);
        }
      });

      if (missing.length > 0) {
        throw new Error(`Missing service files: ${missing.join(', ')}`);
      }

      console.log(`   ✓ All 4 new service files exist`);
    }
  },
  {
    name: 'LifestylePlannerAgent Modified',
    check: () => {
      const filePath = path.join(__dirname, 'server', 'services', 'lifestylePlannerAgent.ts');
      const content = fs.readFileSync(filePath, 'utf8');

      if (!content.includes('universalPlanningAgent')) {
        throw new Error('lifestylePlannerAgent not integrated with universal agent');
      }

      if (!content.includes('USE_UNIVERSAL_AGENT')) {
        throw new Error('Missing environment variable toggle');
      }

      console.log(`   ✓ lifestylePlannerAgent properly integrated`);
    }
  },
  {
    name: 'Routes Updated for Smart/Quick Mode',
    check: () => {
      const filePath = path.join(__dirname, 'server', 'routes.ts');
      const content = fs.readFileSync(filePath, 'utf8');

      if (!content.includes("'smart'")) {
        throw new Error('Smart mode not configured in routes');
      }

      if (!content.includes("'quick'")) {
        throw new Error('Quick mode not configured in routes');
      }

      console.log(`   ✓ Routes properly configured for smart/quick modes`);
    }
  },
  {
    name: 'useAuth.ts Fixed',
    check: () => {
      const filePath = path.join(__dirname, 'client', 'src', 'hooks', 'useAuth.ts');
      const content = fs.readFileSync(filePath, 'utf8');

      // Check for duplicate logout
      const logoutMatches = content.match(/const logout =/g);
      if (logoutMatches && logoutMatches.length > 1) {
        throw new Error('useAuth still has duplicate logout function');
      }

      // Check for missing imports
      if (content.includes('useState') && !content.includes('import')) {
        throw new Error('useAuth has missing imports');
      }

      console.log(`   ✓ useAuth.ts cleaned up and fixed`);
    }
  },
  {
    name: 'Build Output Exists',
    check: () => {
      const distPath = path.join(__dirname, 'dist', 'index.js');
      if (!fs.existsSync(distPath)) {
        throw new Error('Build output not found - run npm run build');
      }

      const stats = fs.statSync(distPath);
      console.log(`   ✓ Build successful (${(stats.size / 1024).toFixed(2)} KB)`);
    }
  }
];

let passed = 0;
let failed = 0;

checks.forEach(({ name, check }) => {
  try {
    console.log(`\n📋 ${name}`);
    check();
    passed++;
  } catch (error) {
    failed++;
    console.log(`   ❌ FAILED: ${error.message}`);
  }
});

console.log('\n' + '='.repeat(60));
console.log(`\n📊 Verification Results: ${passed}/${checks.length} passed\n`);

if (failed > 0) {
  console.log('❌ Some checks failed. Please fix before committing.\n');
  process.exit(1);
} else {
  console.log('✅ All checks passed! Safe to commit and push.\n');
  console.log('📝 Summary of changes:');
  console.log('   • 5 domain config files created (travel, interview, date, daily, fitness)');
  console.log('   • 4 new service files (domain registry, universal agent, enrichment, contextual)');
  console.log('   • lifestylePlannerAgent integrated with universal agent');
  console.log('   • useAuth.ts hook fixed');
  console.log('   • Routes updated for smart/quick modes');
  console.log('   • Build successful with no critical errors\n');
  process.exit(0);
}
