# Intent Parser & Planning Workflow Analysis

## Current Workflow Step-by-Step

### **Phase 0: Initial Message Reception**

```
User types: "plan dinner at 5 tonight"
  ↓
Server receives via /api/planner/message
  ↓
Routes to UniversalPlanningAgent.handleMessage()
```

---

### **Phase 1: Context Recognition & Domain Detection**

**Location:** `universalPlanningAgent.ts` lines 647-716

#### Step 1.1: Detect Domain
```typescript
const detection = await domainRegistry.detectDomain(userMessage);
// Uses Claude Sonnet-4 to classify message
```

**How it works:**
1. Loads all domain configs from `server/domains/*.json`
2. Sends to Claude: "Classify this message into one of these domains"
3. Available domains: travel, interview_prep, date_night, daily_planning, fitness, etc.
4. Claude returns: `{ domain: "date_night", confidence: 0.95, extractedSlots: {...} }`

**Example Flow:**
```
Input: "plan dinner at 5 tonight"
  ↓
Claude analyzes available domains:
  - travel: Planning trips and vacations
  - date_night: Planning dates and romantic evenings
  - daily_planning: Planning daily schedules
  - fitness: Workout and fitness planning
  ↓
Decision: "date_night" (confidence: 0.95)
Reasoning: "User wants to plan a dinner, which is date/social activity"
Extracted: { timing: { time: "5pm", date: "tonight" }, mealType: "dinner" }
```

#### Step 1.2: Context Switch Detection
```typescript
const isContextSwitch = currentDomain && currentDomain !== detection.domain;
```

If user was planning "travel to Dallas" but now says "plan my interview prep":
- Detects context switch
- Asks: "Do you want to switch from travel to interview prep?"

---

### **Phase 2: Question Generation**

**Location:** `claudeQuestionGenerator.ts`

#### How it works NOW:
```typescript
const questionResult = await claudeQuestionGenerator.generateQuestions(
  domain,          // e.g., "date_night"
  planMode,        // "quick" (5 questions) or "smart" (7 questions)
  userProfile,     // User's location, timezone, preferences
  userMessage      // Original message
);
```

**Claude Haiku generates questions dynamically:**

For "plan dinner at 5 tonight" → date_night domain:

```json
{
  "questions": [
    {
      "id": "venue",
      "question": "Where would you like to have dinner?",
      "why_matters": "Restaurant choice determines ambiance, cuisine, and pricing",
      "priority": 10,
      "required": true,
      "slot_path": "location.venue"
    },
    {
      "id": "budget",
      "question": "What's your budget per person?",
      "priority": 9,
      "required": true,
      "slot_path": "budget.perPerson"
    },
    {
      "id": "cuisine",
      "question": "Any cuisine preferences?",
      "priority": 7,
      "slot_path": "preferences.cuisine"
    },
    {
      "id": "dietary",
      "question": "Any dietary restrictions?",
      "priority": 6,
      "slot_path": "preferences.dietary"
    },
    {
      "id": "atmosphere",
      "question": "Casual or formal atmosphere?",
      "priority": 5,
      "slot_path": "preferences.atmosphere"
    }
  ]
}
```

**Questions are ORDERED by priority** (highest first).

---

### **Phase 3: Gap Analysis**

**Location:** `claudeGapAnalyzer.ts`

#### How it works:
```typescript
const gapAnalysis = await claudeGapAnalyzer.analyzeGaps(
  userMessage,           // "plan dinner at 5 tonight"
  conversationHistory,   // Full chat history
  questions,             // Generated questions from Phase 2
  currentSlots           // Previously collected information
);
```

**Claude Haiku analyzes what's been answered:**

```
User said: "plan dinner at 5 tonight"

Already answered:
✅ Timing: "5pm tonight" (priority 10)

Still needed:
❌ Venue/location (priority 10)
❌ Budget (priority 9)
❌ Cuisine preferences (priority 7)
❌ Dietary restrictions (priority 6)
❌ Atmosphere (priority 5)

Completion: 20% (1/5 answered)
Next question to ask: "Where would you like to have dinner?"
```

**Response to user:**
```
"Great! Planning dinner for tonight at 5pm.

Where would you like to have dinner?"
```

---

### **Phase 4: Enrichment (When Ready)**

**Location:** `claudeWebEnrichment.ts`

#### When does enrichment happen?
**Current condition:** When user has answered enough questions (typically 60-80% complete)

```typescript
// Check if enrichment conditions are met
const enrichmentRules = domainRegistry.getEnrichmentRules(domain);

for (const rule of enrichmentRules) {
  if (evaluateCondition(rule.condition, collectedSlots)) {
    // Condition met! Run enrichment
    const enrichedData = await claudeWebEnrichment.enrichPlan(...);
  }
}
```

**Example enrichment rule** (from domain config):
```json
{
  "condition": "slots.location.venue && slots.timing.date",
  "web_searches": [
    "weather forecast for {location}",
    "top rated restaurants in {location}",
    "events happening in {location} on {date}"
  ]
}
```

#### What happens during enrichment:
```typescript
// Claude Sonnet-4 with Web Search tool
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  tools: [{
    type: "web_search_20241222",
    name: "web_search"
  }],
  messages: [{
    role: "user",
    content: "Search for restaurants in downtown Dallas, weather tonight, events happening"
  }]
});
```

**Claude fetches:**
- Weather forecast
- Restaurant recommendations with ratings
- Events happening nearby
- Traffic/parking info
- Price ranges

**Returns:**
```json
{
  "weather": "Clear, 68°F",
  "restaurants": [
    { "name": "The French Room", "rating": 4.8, "price": "$$$", "reservations": "Required" },
    { "name": "Uchi Dallas", "rating": 4.7, "price": "$$$", "reservations": "Recommended" }
  ],
  "events": ["Mavericks game at 7pm", "Concert at House of Blues"],
  "traffic": "Moderate traffic expected 5-6pm"
}
```

---

### **Phase 5: Plan Synthesis**

**Location:** `contextualEnrichmentAgent.ts` → `generateRichPlan()`

```typescript
const beautifulPlan = await contextualEnrichmentAgent.generateRichPlan(
  collectedSlots,    // All answered questions
  userProfile,       // User's profile
  domain,            // "date_night"
  enrichedData       // Real-time web data
);
```

**Claude Sonnet-4 creates formatted plan:**

```markdown
# 🍽️ Dinner Date Tonight - 5pm

## 📍 Your Plan

**Time:** Tonight at 5:00 PM
**Weather:** Perfect evening - 68°F and clear
**Location:** Downtown Dallas

## 🎯 Recommended Venues

### Option 1: The French Room ⭐️ 4.8
- **Cuisine:** Fine French
- **Price:** $$$ (~$80/person)
- **Atmosphere:** Upscale romantic
- **⚠️ Reservations:** REQUIRED - Call now!
- **Parking:** Valet available

### Option 2: Uchi Dallas ⭐️ 4.7
- **Cuisine:** Japanese/Sushi
- **Price:** $$$ (~$70/person)
- **Atmosphere:** Modern elegant
- **⚠️ Reservations:** Highly recommended
- **Parking:** Self-parking nearby

## ⏰ Timeline

- **4:30 PM:** Leave home (account for traffic)
- **5:00 PM:** Arrive at restaurant
- **5:00-7:00 PM:** Dinner
- **7:00 PM:** Optional - Catch Mavericks game or walk around

## 💡 Pro Tips

- Make reservation NOW - Friday night fills up fast
- Light traffic expected before 5pm, heavier after 6pm
- Both venues have dress code (smart casual minimum)
- The French Room has a sommelier if you're into wine

## ✅ Action Steps

1. **URGENT:** Call restaurant for 5pm reservation
2. Check dress code and plan outfit
3. Leave by 4:30pm to avoid traffic
4. Bring jacket (might be cool inside)
```

---

## 🔴 **GLARING HOLES & IMPROVEMENT AREAS**

### **HOLE #1: Reservations Not Checked Proactively**

**Current State:**
- ❌ System doesn't know which restaurants require reservations
- ❌ User finds out AFTER plan is created
- ❌ No real-time availability checking

**Your Example:** "I want to know if restaurants need reservations"

**How to Fix:**
1. Add reservation data to enrichment:
```typescript
web_searches: [
  "Does {restaurant_name} require reservations?",
  "Call ahead time for {restaurant_name}",
  "Walk-in policy for {restaurant_name}"
]
```

2. Add to plan synthesis prompt:
```typescript
"CRITICAL: For each restaurant suggested:
- Check if reservations are required/recommended
- Note average wait times for walk-ins
- Include phone number for reservations
- Flag as HIGH PRIORITY if reservations needed"
```

3. Proactive warning in plan:
```markdown
⚠️ URGENT ACTION REQUIRED
The French Room requires reservations. They book up 2-3 days in advance.
📞 Call now: (214) 555-1234
```

---

### **HOLE #2: Freshness of Information**

**Current State:**
- ❌ No timestamp on enriched data
- ❌ No cache expiry
- ❌ Doesn't know when to refresh

**Problem:**
- Weather from 2 hours ago might be outdated
- Restaurant hours might have changed
- Events might be sold out

**How to Fix:**
1. Add freshness metadata:
```typescript
interface EnrichedData {
  data: any;
  fetchedAt: Date;
  expiresAt: Date;
  source: string;
}
```

2. Implement smart refresh logic:
```typescript
function needsRefresh(enrichedData: EnrichedData, domain: string): boolean {
  const now = new Date();

  // Different refresh rates for different data types
  const freshnessRules = {
    weather: 30 * 60 * 1000,      // 30 minutes
    events: 24 * 60 * 60 * 1000,  // 24 hours
    restaurants: 7 * 24 * 60 * 60 * 1000, // 7 days
    traffic: 15 * 60 * 1000       // 15 minutes
  };

  return now > enrichedData.expiresAt;
}
```

3. Auto-refresh in background:
```typescript
// When user views plan again
if (needsRefresh(cachedData, 'weather')) {
  // Silently refresh in background
  await claudeWebEnrichment.refreshData('weather', slots);
}
```

---

### **HOLE #3: Intent Ambiguity Not Clarified**

**Current State:**
- ❌ Assumes single intent
- ❌ Doesn't ask clarifying questions for ambiguous input

**Problem:**
```
User: "plan my weekend"

Current: Assumes "daily_planning" or "general"
Better: Ask "What kind of weekend plans?"
  - Travel/trip
  - Local activities
  - Work/productivity
  - Relaxation/self-care
```

**How to Fix:**
1. Add ambiguity detection:
```typescript
interface IntentAnalysis {
  primary_intent: string;
  ambiguity_score: number; // 0-1
  possible_intents: string[];
  clarification_needed: boolean;
}
```

2. Clarify before proceeding:
```typescript
if (intentAnalysis.ambiguity_score > 0.6) {
  return {
    message: "I can help with weekend planning! Which type:\n" +
             "1. 🏖️ Trip/travel plans\n" +
             "2. 🎯 Productivity/work\n" +
             "3. 🎉 Social/fun activities\n" +
             "4. 🧘 Relaxation/self-care",
    phase: 'clarification'
  };
}
```

---

### **HOLE #4: No Contextual Memory Across Sessions**

**Current State:**
- ❌ Each planning session is isolated
- ❌ Doesn't remember user preferences from past plans

**Problem:**
```
Session 1: User likes Italian food, budget $50/person
Session 2: User planning dinner again
Current: Asks same questions again
Better: "Want Italian again? Same $50 budget?"
```

**How to Fix:**
1. Create user preference profile:
```typescript
interface UserPlanningProfile {
  preferences: {
    cuisine: string[];
    budget_ranges: { min: number, max: number }[];
    favorite_venues: string[];
    dietary_restrictions: string[];
  };
  patterns: {
    typical_dinner_time: string;
    typical_date_locations: string[];
    planning_lead_time: string;
  };
}
```

2. Use in question generation:
```typescript
const prompt = `Generate questions for ${domain}.

USER HISTORY:
- Past 3 date nights: Italian cuisine, $40-60 budget
- Preferred timing: 6-7pm
- Prefers reservations over walk-ins

TASK: Only ask questions for NEW information. Skip questions where we have strong patterns.`;
```

---

### **HOLE #5: No Real-Time Availability**

**Current State:**
- ❌ Suggests restaurants without knowing if they're open/available
- ❌ No table availability checking

**How to Fix:**
1. Integrate with OpenTable/Resy APIs:
```typescript
async function checkAvailability(restaurant: string, time: string, partySize: number) {
  // Use Claude Web Search to check OpenTable
  const search = await anthropic.messages.create({
    tools: [{ type: "web_search_20241222" }],
    messages: [{
      role: "user",
      content: `Check OpenTable for ${restaurant} availability at ${time} for ${partySize} people`
    }]
  });

  return {
    available: boolean,
    alternativeTimes: string[],
    waitlist: boolean
  };
}
```

2. Only suggest available options:
```markdown
### ✅ AVAILABLE NOW: Uchi Dallas
- 5:00 PM table for 2 available
- Click to reserve: [OpenTable Link]

### ❌ FULLY BOOKED: The French Room
- Next availability: Saturday 7pm
- Add to waitlist: [Link]
```

---

### **HOLE #6: No Proactive Warnings**

**Current State:**
- ❌ Doesn't warn about potential issues

**Examples of missing warnings:**
- "It's Friday night - this area gets crowded"
- "Restaurant is 30min away - you'll be late"
- "Dress code: No jeans or sneakers"
- "Popular spot - expect 30min wait without reservation"

**How to Fix:**
```typescript
async function generateWarnings(plan: any, enrichedData: any) {
  const warnings = [];

  // Check timing
  if (travelTime > availableTime) {
    warnings.push({
      severity: 'high',
      message: '⚠️ Traffic alert: 30min drive but you only have 15min. Leave NOW or reschedule!'
    });
  }

  // Check day/time patterns
  if (isFridayOrSaturday && isPeakDiningTime) {
    warnings.push({
      severity: 'medium',
      message: '⚠️ Peak time: Expect crowds and longer waits. Reservation strongly recommended.'
    });
  }

  // Check dress code
  if (venue.dresscode && venue.dresscode !== 'casual') {
    warnings.push({
      severity: 'low',
      message: 'ℹ️ Dress code: Smart casual required (no athletic wear)'
    });
  }

  return warnings;
}
```

---

## 📊 **When Fresh Information is Fetched**

### Current Trigger Points:

1. **Domain Detection** (Phase 1)
   - Frequency: Every message
   - Model: Claude Sonnet-4
   - Cost: ~$0.003 per message

2. **Question Generation** (Phase 2)
   - Frequency: Once per session (when new domain detected)
   - Model: Claude Haiku
   - Cost: ~$0.0008

3. **Gap Analysis** (Phase 3)
   - Frequency: Every user response
   - Model: Claude Haiku
   - Cost: ~$0.0008 per message

4. **Web Enrichment** (Phase 4)
   - Frequency: **ONCE** when user answers enough questions (60-80% complete)
   - Model: Claude Sonnet-4 with Web Search
   - Cost: ~$0.01-0.02
   - **CACHED** for refinements (not re-fetched)

5. **Plan Synthesis** (Phase 5)
   - Frequency: Once for initial plan + once per refinement
   - Model: Claude Sonnet-4
   - Cost: ~$0.01-0.015

### Problem: Enrichment is NOT refreshed proactively

**Current:** Fetch once, cache forever
**Better:** Time-based refresh

```typescript
// Pseudo-code for smart refresh
if (userViewingPlan && timeSinceEnrichment > freshnessThreshold) {
  if (domain === 'date_night') {
    // Refresh time-sensitive data
    await refreshWeather();
    await refreshAvailability();
    // Don't refresh static data like restaurant ratings
  }
}
```

---

## 🎯 **Priority Improvements**

### **P0 - Critical (Do First)**

1. **Reservation Detection**
   - Add "requires reservations?" to restaurant enrichment
   - Flag high-priority if reservation needed
   - Include reservation links/phone numbers

2. **Better Error Messages**
   - Current: "I encountered an error processing your request"
   - Better: "I encountered an error: [specific error]. Here's what you can try..."

### **P1 - High Priority**

3. **Freshness Timestamps**
   - Add `fetchedAt` and `expiresAt` to all enriched data
   - Show user when data was last refreshed
   - Auto-refresh stale data

4. **Availability Checking**
   - Integrate OpenTable/Resy via web search
   - Only suggest available options
   - Show alternative times

### **P2 - Medium Priority**

5. **User Preference Memory**
   - Store past plan preferences
   - Pre-fill likely answers
   - "Want Italian again like last time?"

6. **Proactive Warnings**
   - Traffic alerts
   - Timing conflicts
   - Dress codes
   - Peak time warnings

### **P3 - Nice to Have**

7. **Intent Clarification**
   - Detect ambiguous inputs
   - Ask clarifying questions
   - Multi-intent handling

---

## 💡 **Specific Enhancement: Restaurant Reservations**

### Implementation Plan:

**1. Update enrichment prompt:**
```typescript
const enrichmentPrompt = `
Search for and provide:

For each restaurant:
- ⚠️ RESERVATION POLICY: Required/Recommended/Walk-in OK
- 📞 Reservation phone number
- 🔗 Online booking link (OpenTable/Resy)
- ⏰ Average wait time without reservation
- 📅 How far ahead to book (same day/week/month)
- 💡 Peak times vs quiet times

CRITICAL: Flag restaurants that REQUIRE reservations as HIGH PRIORITY.
`;
```

**2. Add to plan output:**
```typescript
interface RestaurantRecommendation {
  name: string;
  rating: number;
  price: string;
  reservations: {
    required: boolean;
    recommended: boolean;
    phone: string;
    booking_url?: string;
    advance_booking: string; // "2-3 days", "same week"
    priority: 'urgent' | 'recommended' | 'optional';
  };
}
```

**3. Update plan template:**
```markdown
## 🍽️ Recommended Restaurants

### ⚠️ ACTION REQUIRED: The French Room
**Reservations:** REQUIRED (books 2-3 days in advance)
**Book Now:** 📞 (214) 555-1234 or [OpenTable](link)
**If Fully Booked:** See Option 2 below

---

### Option 2: Uchi Dallas
**Reservations:** Highly Recommended (often walk-in wait: 45min+)
**Book Now:** 📞 (214) 555-5678 or [OpenTable](link)
**Walk-in Backup:** Arrive by 4:45pm to get on waitlist
```

---

## Summary

**Current Strengths:**
✅ Claude-powered domain detection
✅ Dynamic question generation
✅ Intelligent gap analysis
✅ Real-time web enrichment
✅ Beautiful plan formatting

**Critical Gaps:**
❌ No reservation checking
❌ No freshness management
❌ No availability verification
❌ No proactive warnings
❌ No preference memory
❌ Enrichment happens only once (cached forever)

**Biggest Win:** Add reservation detection + availability checking
**Cost:** ~$0.002 extra per plan (worth it!)
