# Google AI Studio Prompt for PathWise (JournalMate) App

## Prompt for Testing/Recreating PathWise in Google AI Studio

Copy and paste this prompt into Google AI Studio to test how effectively Gemini can recreate the core components of the PathWise lifestyle planning application:

---

## **PathWise - AI Lifestyle Planner Test Prompt**

I want to test building a simplified version of **PathWise**, an AI-powered lifestyle planner that transforms user goals into actionable plans. Build an AI assistant with these core capabilities:

### **Core Feature 1: Direct Action Plan Generation**
The user can paste ANY format of input (text, numbered lists, AI chat exports, screenshots) and get an instant structured plan. 

**Test this scenario:**
```
User Input: "I need to prepare for my Google system design interview on Friday. I should review distributed systems, practice with friends, and study scalability patterns."

Expected Output (JSON format):
{
  "activity": {
    "title": "Google System Design Interview Preparation",
    "category": "interview_prep",
    "summary": "Comprehensive preparation plan for Google system design interview on Friday"
  },
  "tasks": [
    {
      "title": "Review distributed systems fundamentals",
      "description": "Study core concepts of distributed systems including CAP theorem, consistency models, and replication strategies",
      "category": "learning",
      "priority": "high",
      "timeEstimate": "2-3 hours",
      "order": 1
    },
    {
      "title": "Practice system design problems",
      "description": "Work through practice problems focusing on scalability, reliability, and trade-offs",
      "category": "practice",
      "priority": "high",
      "timeEstimate": "3-4 hours",
      "order": 2
    },
    {
      "title": "Conduct mock interviews with friends",
      "description": "Schedule practice sessions with friends to simulate interview conditions and get feedback",
      "category": "practice",
      "priority": "medium",
      "timeEstimate": "2-3 hours",
      "order": 3
    },
    {
      "title": "Study scalability patterns",
      "description": "Review common scalability patterns including load balancing, caching strategies, database sharding, and CDN usage",
      "category": "learning",
      "priority": "high",
      "timeEstimate": "2 hours",
      "order": 4
    }
  ]
}
```

### **Core Feature 2: Conversational Planning with Slot Filling**
The AI asks smart, contextual questions to gather necessary information before generating a plan.

**Test this scenario:**
```
Initial User Message: "I want to plan a date night tonight"

AI Response (should ask ONE question at a time):
"Great! Let's plan your date night. First, what time are you thinking for tonight?"

User: "around 7pm"

AI Response:
"Perfect! What type of vibe are you looking for? Casual dinner, something romantic, or more adventurous?"

User: "romantic dinner"

AI Response:
"Lovely! What's your budget for the evening? This helps me suggest the perfect spots."

[Continue until all necessary slots filled: time, vibe, budget, location preferences, transportation]
```

**Required Slots for Date Planning:**
- Time/duration
- Vibe/type (casual, romantic, adventurous)
- Budget range
- Location (where to go)
- Transportation method
- Any dietary preferences

After gathering all slots, the AI should:
1. Present a confirmation summary
2. Ask: "Would you like me to create this plan with actionable tasks?"
3. Only generate tasks after user confirms

### **Core Feature 3: Intelligent Intent Detection & Domain Recognition**
The AI should automatically detect what type of planning is needed from vague or conversational input.

**Test these scenarios:**

**Scenario A:**
```
User: "dinner by 5"
Expected: Recognize as "date_night" or "social_planning", extract time=5pm
```

**Scenario B:**
```
User: "I need to workout tomorrow morning"
Expected: Recognize as "fitness" domain, extract date=tomorrow, time=morning
```

**Scenario C:**
```
User: "prepare for my Disney data engineering interview using Scala on Friday"
Expected: Recognize as "interview_prep", extract company=Disney, techStack=Scala/data engineering, date=Friday
```

**Scenario D (Multiple activities - should detect primary):**
```
User: "I want to prepare for my day, start with meditation, and the goal is to pass the Disney data engineering interview using Scala on Friday"
Expected: Primary activity = "interview_prep" (because "the goal is to pass...interview"), extract all context
```

### **Core Feature 4: Content Extraction from Various Formats**
The AI should extract planning information from pasted conversations, numbered lists, or unstructured text.

**Test these formats:**

**Format 1 - Numbered List:**
```
User Input:
"1. Research flights to Paris
2. Book hotel for 3 nights
3. Create itinerary
4. Get travel insurance
5. Exchange currency"

Expected: Extract tasks with order preserved, infer it's a travel plan
```

**Format 2 - Chat Export (Simulated):**
```
User Input:
"User: I want to plan a trip to Dallas
AI: Great! When are you thinking?
User: Next week, maybe Thursday
AI: How long?
User: Just a weekend trip
AI: What's your budget?
User: Around $500"

Expected: Extract travel plan context (destination=Dallas, date=next Thursday, duration=weekend, budget=$500)
```

**Format 3 - Unstructured Text:**
```
User Input:
"gotta workout more, eat better, maybe join a gym, also want to learn Spanish for my Mexico trip in 6 months"

Expected: Recognize multiple goals, identify primary, extract context (trip to Mexico in 6 months, fitness goals)
```

### **Core Feature 5: Smart Task Generation**
Tasks should be specific, actionable, prioritized, and time-estimated.

**Quality Criteria:**
- ✅ Tasks are actionable (start with verbs: "Research", "Book", "Create", "Schedule")
- ✅ Each task has clear priority (high/medium/low) based on importance
- ✅ Time estimates are realistic ("15 min", "1 hour", "2-3 hours")
- ✅ Tasks are ordered logically (prerequisites first)
- ✅ Categories make sense (travel, learning, health, work, personal)

### **Core Feature 6: Guardrail Validation**
Before processing, validate if the input is actually a planning request.

**Test cases:**

**Should ACCEPT:**
- "I want to plan a trip"
- "help me prepare for an interview"
- "workout plan"
- "organize my week"

**Should REJECT/CLARIFY:**
- "what's the weather today?" → Respond: "I'm a planning assistant. I can help you plan trips, interviews, workouts, dates, etc."
- "tell me a joke" → Redirect to planning capabilities
- Random text with no planning intent → Ask clarifying question

### **Core Feature 7: Personalization Context**
When provided with user profile data, personalize the plan accordingly.

**Test with User Context:**
```
User Profile:
{
  "location": "San Francisco, CA",
  "timezone": "PST",
  "budget_preference": "moderate",
  "interests": ["technology", "travel", "fitness"],
  "work_schedule": "9am-5pm weekdays"
}

User Request: "plan a weekend trip"

Expected: 
- Suggest destinations appropriate for weekend from SF (within 3-4 hour travel)
- Consider weekend timing (Friday evening departure, Sunday return)
- Budget suggestions aligned with "moderate" preference
- Maybe suggest tech-related destinations if relevant
```

---

## **Implementation Instructions**

1. **Create a system prompt** that defines the AI as a lifestyle planning assistant
2. **Implement function calling** (if available) to structure JSON output for plans
3. **Use structured output** to ensure consistent task format
4. **Test conversational flow** by maintaining conversation history
5. **Test direct generation** by handling single-message input

## **Expected JSON Schema for Plan Output**

```json
{
  "activity": {
    "title": "string (clear, specific title)",
    "category": "travel | interview_prep | fitness | date_night | learning | work | personal",
    "summary": "string (brief description of the plan)"
  },
  "tasks": [
    {
      "title": "string (actionable task title, verb-based)",
      "description": "string (detailed description, why it matters)",
      "category": "string (sub-category)",
      "priority": "high | medium | low",
      "timeEstimate": "string (e.g., '15 min', '1 hour', '2-3 hours')",
      "order": "number (logical sequence, 1-based)",
      "context": "string (optional: why this task matters, tips)"
    }
  ]
}
```

## **Success Criteria**

✅ **Direct Plan Generation**: Can generate structured plan from ANY input format in 10-30 seconds  
✅ **Conversational Planning**: Asks ONE smart question at a time, extracts context progressively  
✅ **Intent Detection**: Accurately identifies planning domain from vague input 90%+ of the time  
✅ **Content Extraction**: Extracts planning context from lists, chat exports, unstructured text  
✅ **Task Quality**: Tasks are actionable, prioritized, time-estimated, well-ordered  
✅ **Guardrails**: Correctly identifies and handles non-planning requests  
✅ **Personalization**: Adapts suggestions based on user profile when provided  

---

## **Testing Checklist**

Test each feature individually, then test integrated flows:

1. [ ] Direct plan from simple text input
2. [ ] Direct plan from numbered list
3. [ ] Direct plan from pasted conversation
4. [ ] Conversational planning - date night scenario
5. [ ] Conversational planning - interview prep scenario
6. [ ] Intent detection - vague inputs ("dinner by 5", "workout tomorrow")
7. [ ] Intent detection - complex inputs with multiple activities
8. [ ] Guardrail - reject non-planning queries
9. [ ] Personalization - adapt suggestions based on user profile
10. [ ] Task quality - verify tasks are actionable, prioritized, time-estimated

---

## **Evaluation Questions**

After testing, answer these:

1. **How accurate is intent detection?** (percentage of correct domain identification)
2. **How natural is the conversational flow?** (1-10, how human-like are the questions?)
3. **How well does it extract context from various formats?** (lists, conversations, unstructured)
4. **How actionable are the generated tasks?** (can a user immediately execute them?)
5. **How effective is personalization?** (does it meaningfully adapt to user profile?)
6. **How fast is plan generation?** (direct mode should be 10-30 seconds)
7. **How consistent is the JSON output?** (does it always match the schema?)

---

## **Advanced Test: Stock Trading Strategy**

Test if the AI can handle specialized domains:

```
User Input:
"I want to create a stock trading strategy. I discussed with ChatGPT about swing trading tech stocks, risk management with 2% max per trade, and setting up alerts for entry/exit points."

Expected Output:
- Recognize as specialized planning domain
- Extract trading strategy context
- Generate actionable tasks:
  - Research swing trading strategies for tech stocks
  - Set up risk management rules (2% max per trade)
  - Configure entry/exit alerts
  - Create trading journal template
  - Backtest strategy with historical data
```

---

**Use this prompt to evaluate Google AI Studio's effectiveness for building PathWise-like functionality. Test each component systematically and document results.**





