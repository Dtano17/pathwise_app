# Complete Planning Modes Workflow Documentation

## Overview

JournalMate has **three planning modes**, each powered by Claude AI:

1. **Quick Plan** - Fast planning with 5 questions
2. **Smart Plan** - Detailed planning with 7 questions + profile personalization
3. **Create Action Plan** - Direct plan generation from any input (NEW)

---

## Mode 1: Quick Plan

### **Purpose:**
Fast, efficient planning with minimal questions.

### **Workflow:**

```
User clicks "Quick Plan"
  ↓
Universal Planning Agent starts
  ↓
Phase 1: Context Recognition
  - Detects domain (travel, fitness, work, etc.)
  ↓
Phase 2: Question Generation (Claude-powered)
  - Claude generates top 5 most important questions
  - Questions ordered by priority
  - Uses Claude Haiku (~$0.0008)
  ↓
Phase 3: Gap Analysis (Claude-powered)
  - User answers questions one-by-one
  - Claude analyzes what's answered vs needed
  - Understands implicit information
  - Uses Claude Haiku (~$0.0008 per message)
  ↓
Phase 4: Enrichment (Optional)
  - Fetches real-time data via Claude Web Search
  - Weather, events, flights, hotels, etc.
  - Only if conditions met
  - Uses Claude Sonnet-4 (~$0.01)
  ↓
Phase 5: Plan Synthesis
  - Claude generates complete plan
  - Activity + tasks with priorities
  - Includes enrichment data
  - Uses Claude Sonnet-4 (~$0.01)
  ↓
User confirms plan
  ↓
Saved to Activities + Tasks panes
```

### **Example:**

**User:** "Plan a weekend trip to NYC"

**Claude generates 5 questions:**
1. When are you planning to travel? (Priority 10)
2. What's your budget for the trip? (Priority 9)
3. Are you traveling alone or with others? (Priority 8)
4. What are your main interests? (Priority 7)
5. Do you need hotel recommendations? (Priority 6)

**User answers progressively** → Gap analysis updates → Plan generated

### **Cost:**
- Question generation: $0.0008
- Gap analysis (5 turns): $0.004
- Enrichment: $0.01
- Synthesis: $0.01
- **Total: ~$0.025 per plan**

---

## Mode 2: Smart Plan

### **Purpose:**
Detailed, personalized planning with profile awareness.

### **Workflow:**

Same as Quick Plan, but:
- **7 questions** instead of 5
- **User profile integration** (location, timezone, preferences)
- **More detailed enrichment** (more web searches)
- **Richer synthesis** (motivational notes, detailed timeframes)

### **Example:**

**User:** "I want to get fit for summer"

**Claude generates 7 questions** (based on user profile):
1. What's your current fitness level? (Priority 10)
2. When do you want to achieve this by? (Priority 10)
3. What's your preferred workout style? (Priority 9)
4. Do you have gym access or home workout? (Priority 8)
5. Any dietary restrictions or preferences? (Priority 7)
6. How many days per week can you commit? (Priority 6)
7. Any health conditions to consider? (Priority 5)

**User answers** → Personalized plan with workout schedule, meal prep, progress tracking

### **Cost:**
- Question generation: $0.0008
- Gap analysis (7 turns): $0.0056
- Enrichment: $0.015 (more data)
- Synthesis: $0.015
- **Total: ~$0.037 per plan**

---

## Mode 3: Create Action Plan (NEW)

### **Purpose:**
Instant plan generation from ANY input - no questions asked!

### **Workflow:**

```
User types/pastes/uploads content
  ↓
Guardrail Check (Claude Haiku)
  - Is this plan-related?
  - YES → Continue
  - NO → Reject with helpful message
  - Cost: $0.0008
  ↓
Direct Plan Generation (Claude Sonnet-4)
  - Analyzes full input (text or image)
  - Extracts structure, title, tasks
  - Generates clear activity title
  - Creates actionable tasks with priorities
  - Cost: $0.003-0.01
  ↓
Plan Preview Shown
  ↓
User can:
  - Edit/modify (sends new request to same session)
  - Create Activity (saves to database)
  - Back (starts fresh)
  ↓
Saved to Activities + Tasks panes
```

### **Examples:**

#### Example 1: Simple Text
**Input:** "plan my weekend"

**Guardrail:** ✅ PLAN-RELATED

**Generated:**
```
Activity: Weekend Planning
Tasks:
1. Review upcoming week's schedule
2. Plan weekend meals and grocery shopping
3. Schedule relaxation and leisure time
4. Handle pending errands or chores
5. Plan social activities or family time
```

#### Example 2: Detailed Pasted Content
**Input:** "help plan my weekend with these activities: 🔐 Step-by-Step: Securing IP..."

**Guardrail:** ✅ PLAN-RELATED

**Generated:**
```
Activity: Weekend: IP Protection for Agentic Framework
Tasks:
1. 📝 Document Agentic Workflow and IP Foundation (2-3h, HIGH)
2. 🔍 Search Trademark Availability (1h, HIGH)
3. ™️ File Trademark Application (2-3h, HIGH)
4. ©️ Register Copyright for Source Code (1-2h, HIGH)
5. ©️ Register Copyright for Brand Assets (1h, MEDIUM)
6. 📐 Create Technical Abstract for Patent (3-4h, HIGH)
7. 📊 Prepare Patent Diagrams and Flowcharts (2-3h, HIGH)
8. 🧪 File Provisional Patent Application (2-3h, HIGH)
```

#### Example 3: Screenshot/Image
**Input:** Screenshot of "Tactical Next Steps" list

**Guardrail:** ✅ SKIPPED (images bypass)

**Generated:**
```
Activity: Tactical IP Protection Steps
Tasks:
1. 🏢 File Trademark for JournalMate Brand
2. 📝 Draft and File Provisional Patent
3. ©️ Copyright Codebase and Brand Assets
4. 📄 Prepare NDAs for Collaborators
5. 📊 Document Workflows and Agent Logic
```

#### Example 4: Irrelevant Input (Guardrail Rejection)
**Input:** "fall on ice"

**Guardrail:** ❌ NOT PLAN-RELATED

**Response:**
```json
{
  "error": "Not Plan-Related",
  "message": "Your input doesn't appear to be requesting a plan. Please describe what you want to plan or accomplish.",
  "suggestion": "Try describing what you want to plan, organize, or accomplish. For example: 'plan my weekend', 'organize home office', or paste a list of tasks."
}
```

### **Cost:**
- Guardrail check: $0.0008
- Plan generation: $0.003-0.01
- **Total: ~$0.004-0.011 per plan**
- **Rejected inputs:** Only $0.0008 (saves Sonnet-4 call)

---

## Technical Architecture

### **Claude Models Used:**

| Task | Model | Cost (Input/Output) | Why? |
|------|-------|---------------------|------|
| Question Generation | Haiku | $0.80/$4 per MTok | Fast, structured, cheap |
| Gap Analysis | Haiku | $0.80/$4 per MTok | NLU, context understanding |
| Guardrail Check | Haiku | $0.80/$4 per MTok | Fast binary decision |
| Web Enrichment | Sonnet-4 | $3/$15 per MTok | Web search capability |
| Plan Synthesis | Sonnet-4 | $3/$15 per MTok | Creative, detailed output |
| Direct Plan Gen | Sonnet-4 | $3/$15 per MTok | High quality, title extraction |

### **Prompt Caching:**

All system prompts use `cache_control: { type: "ephemeral" }` for 59% savings on repeated calls within 5-minute window.

### **Cost Optimization:**

- **Use Haiku for routine tasks** → 73% cheaper than Sonnet-4
- **Cache enrichment data** → Reuse during refinements
- **Guardrail filters bad inputs** → Saves expensive Sonnet-4 calls
- **Prompt caching** → 59% savings on system prompts

---

## Database Integration

### **All three modes save to the same database schema:**

```sql
-- Activities table
CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  userId TEXT,
  title TEXT,
  description TEXT,
  category TEXT,
  status TEXT,
  tags TEXT[],
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);

-- Tasks table
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  userId TEXT,
  title TEXT,
  description TEXT,
  category TEXT,
  priority TEXT, -- 'high', 'medium', 'low'
  completed BOOLEAN,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);

-- ActivityTasks junction table
CREATE TABLE activityTasks (
  activityId TEXT,
  taskId TEXT,
  order INTEGER -- Preserves task ordering
);
```

### **API Endpoints:**

- `POST /api/activities` - Create activity
- `POST /api/tasks` - Create task
- `POST /api/activities/:id/tasks` - Link task to activity
- `POST /api/tasks/:id/complete` - Mark task complete
- `POST /api/tasks/:id/skip` - Skip task

---

## UI Integration & Cross-Pane Sync

### **Generated plans appear in:**

1. **Activities Tab**
   - Shows activity card with title, description, category
   - Progress tracker (e.g., "3/5 tasks complete")
   - Click to view all linked tasks

2. **Tasks Tab**
   - Shows all tasks with proper formatting
   - Dark cards, priority badges, category tags
   - Numbered ordering preserved
   - Complete button works

3. **Main Dashboard**
   - Today's tasks from all activities
   - Swipe to complete
   - Progress stats update

### **Cross-Pane Sync:**

When user completes a task:

```
User clicks "Complete" on Task #1
  ↓
POST /api/tasks/:id/complete
  ↓
Database: task.completed = true
  ↓
React Query invalidation:
  - /api/tasks ✅
  - /api/activities ✅
  - /api/progress ✅
  ↓
All UI panes re-render with fresh data:
  - Main page: Strikethrough ✅
  - Tasks tab: Marked complete ✅
  - Activities tab: Progress "1/5" → "2/5" ✅
  - Stats: Percentage increases ✅
  ↓
Achievement toast: "Task Master! +10 points"
```

**Result:** Single source of truth (database) + React Query = Perfect sync across all panes.

---

## Refinement/Modification Flow

### **Quick Plan & Smart Plan:**

```
Plan generated → User says "no"
  ↓
Enters refinement mode
  ↓
User: "make it shorter"
  ↓
Agent re-synthesizes with cached enrichment data
  ↓
Updated plan shown
  ↓
User can make unlimited changes
  ↓
Final plan saved
```

**Key:** Enrichment data cached, so refinements don't re-fetch (saves API calls).

### **Create Action Plan:**

```
Plan generated → User wants changes
  ↓
Session-based editing
  ↓
User types: "add meal prep task"
  ↓
Same session ID sent with modification flag
  ↓
Claude modifies existing plan
  ↓
Updated plan shown
  ↓
User clicks "Create Activity" or continues editing
```

**Key:** All edits in same session until "Back" clicked.

---

## Conversation History

All interactions saved to database:

```typescript
conversationHistory: [
  {
    role: 'user',
    content: 'plan my weekend',
    timestamp: '2025-10-04T10:00:00Z'
  },
  {
    role: 'assistant',
    content: 'Generated plan: Weekend Planning',
    timestamp: '2025-10-04T10:00:05Z'
  },
  {
    role: 'user',
    content: 'add gym workout',
    timestamp: '2025-10-04T10:01:00Z'
  },
  {
    role: 'assistant',
    content: 'Updated plan: Weekend Planning with workout',
    timestamp: '2025-10-04T10:01:03Z'
  }
]
```

**Visible in:**
- Chat History page (all sessions)
- Session detail view
- Refinement history

---

## Summary

| Mode | Questions | Time | Cost | Best For |
|------|-----------|------|------|----------|
| **Quick Plan** | 5 | 2-3 min | ~$0.025 | Fast decisions |
| **Smart Plan** | 7 | 3-5 min | ~$0.037 | Detailed planning |
| **Create Action Plan** | 0 | 10-30 sec | ~$0.004-0.011 | Instant plans from any input |

**All modes:**
- ✅ Save to Activities + Tasks panes
- ✅ Use app formatting
- ✅ Cross-pane sync works
- ✅ Progress tracking automatic
- ✅ Achievement system integrated
