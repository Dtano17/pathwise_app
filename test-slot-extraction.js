// Test improved regex extraction without API calls
function extractSlotsWithRegex(message, domain) {
  const extracted = {};
  const lowerMessage = message.toLowerCase();

  // Interview prep specific
  if (domain === 'interview_prep') {
    // Company detection - improved to avoid false matches
    const companyPatterns = [
      /(?:at|with|for)\s+(disney|google|amazon|microsoft|apple|meta|netflix|uber|airbnb)/i,
      /\b(disney|google|amazon|microsoft|apple|meta|netflix|uber|airbnb)\s+interview/i,
      /my\s+(disney|google|amazon|microsoft|apple|meta|netflix|uber|airbnb)\s+interview/i
    ];
    for (const pattern of companyPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        extracted.company = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
        break;
      }
    }

    // Role detection - improved
    const rolePatterns = [
      /(?:for|as)\s+(?:a\s+)?([a-z\s]+(?:data\s+)?(?:streaming\s+)?(?:engineer|developer|analyst|manager|designer|scientist|architect)(?:ing)?(?:\s+position)?)/i,
      /\b(data engineer|software engineer|frontend developer|backend developer|full stack|devops|ml engineer|data scientist|streaming.*?engineer)/i
    ];
    for (const pattern of rolePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        extracted.role = match[1].trim();
        break;
      }
    }

    // Tech stack detection
    const techMatch = message.match(/\b(?:using\s+)?(python|java|scala|javascript|typescript|react|vue|angular|node|go|rust|aws|gcp|azure|kubernetes|docker|spark|kafka|flink|airflow|sql|nosql|mongodb|postgres)\b/i);
    if (techMatch) extracted.techStack = techMatch[1];

    // Interview type detection
    if (lowerMessage.includes('technical')) extracted.interviewType = 'technical';
    else if (lowerMessage.includes('behavioral')) extracted.interviewType = 'behavioral';
    else if (lowerMessage.includes('system design')) extracted.interviewType = 'system_design';
  }

  // Date/time patterns (common across domains)
  const datePatterns = [
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    /\b(today|tomorrow|next week|this week)\b/i,
    /\b(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/,
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i
  ];

  for (const pattern of datePatterns) {
    const match = message.match(pattern);
    if (match) {
      if (!extracted.timing) extracted.timing = {};
      extracted.timing.date = match[0];
      break;
    }
  }

  // Time patterns
  const timeMatch = message.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)(?:\s+[A-Z]{3})?)\b/);
  if (timeMatch) {
    if (!extracted.timing) extracted.timing = {};
    extracted.timing.time = timeMatch[0];
  }

  return extracted;
}

// Test messages from user
const messages = [
  "Help me plan for my disney interview coming up",
  "This is a technical interview for a streaming data engineering position using scala",
  "The interview is scheduled on Friday 5pm pst and i am central"
];

console.log('=== Testing Improved Slot Extraction ===\n');

let mergedSlots = {};

messages.forEach((msg, i) => {
  console.log(`Message ${i + 1}: "${msg}"`);
  const extracted = extractSlotsWithRegex(msg, 'interview_prep');

  // Merge slots (simplified version)
  mergedSlots = { ...mergedSlots, ...extracted };
  if (extracted.timing && mergedSlots.timing) {
    mergedSlots.timing = { ...mergedSlots.timing, ...extracted.timing };
  }

  console.log('Extracted:', JSON.stringify(extracted, null, 2));
  console.log('Merged Slots:', JSON.stringify(mergedSlots, null, 2));
  console.log('---\n');
});

// Check what questions would be answered
const questions = [
  { id: "company", slot_path: "company" },
  { id: "role", slot_path: "role" },
  { id: "interview_date", slot_path: "timing.date" },
  { id: "interview_type", slot_path: "interviewType" },
  { id: "tech_stack", slot_path: "techStack" }
];

console.log('=== Gap Analysis ===');
questions.forEach(q => {
  const parts = q.slot_path.split('.');
  let value = mergedSlots;
  for (const part of parts) {
    value = value?.[part];
  }
  console.log(`${q.id} (${q.slot_path}): ${value ? '✅ ' + value : '❌ missing'}`);
});
