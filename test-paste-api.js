// Test script for paste functionality API
import fetch from 'node-fetch';

const TEST_CONTENT = `🔐 Step-by-Step: Securing IP for Your Agentic Framework

1. **Document the Workflow & Core Innovation** 🧪
   - Detail how the voice-to-planning flow works, emphasizing its novelty
   - Highlight your proprietary multi-agent orchestration and adaptive UI

2. **File for Trademark Protection** ™️
   - Register "JournalMate" and any unique branding elements
   - Ensure protection for logos, taglines, and brand identity

3. **Register for Copyright** ©️
   - Protect the codebase, documentation, and UI designs
   - File with the U.S. Copyright Office or equivalent jurisdiction

4. **Explore Patent Filing for Process & System** 🧪
   - Consider provisional or full utility patent for the innovative workflow
   - Focus on claims around the agentic planning system and voice-driven interface

5. **Use NDAs & IP Clauses** 🧾
   - Protect during collaborations, demos, or investor pitches
   - Ensure all partners/contractors sign appropriate agreements`;

const API_URL = 'http://localhost:5000/api/planner/parse-llm-content';

async function testPasteAPI() {
  console.log('Testing paste API with IP protection plan...\n');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In production, you'd need actual auth cookie/token
      },
      body: JSON.stringify({
        pastedContent: TEST_CONTENT,
        precedingContext: 'User asked about protecting IP for JournalMate',
        contentType: 'text'
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✓ API Response successful!\n');
      console.log('Activity Title:', data.parsed?.activity?.title || 'N/A');
      console.log('Number of Tasks:', data.parsed?.tasks?.length || 0);
      console.log('\nTasks:');
      data.parsed?.tasks?.forEach((task, idx) => {
        console.log(`  ${idx + 1}. ${task.title}`);
      });
      console.log('\nFull Response:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.error('✗ API Error:', data.error);
      console.error('Status:', response.status);
    }
  } catch (error) {
    console.error('✗ Request failed:', error.message);
    console.log('\nNote: Make sure the server is running with `npm run dev`');
  }
}

testPasteAPI();
