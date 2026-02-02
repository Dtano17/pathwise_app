# 🎯 JournalMate with Gemini AI - Complete Implementation Guide

## 📊 Platform Decision: Firebase Studio + Google AI Studio

### **Quick Answer**
- **Firebase Studio** (Primary) - Build your complete app here
- **Google AI Studio** (Secondary) - Test and optimize AI prompts here

---

## 🚀 Getting Started

### **Step 1: Create Accounts**

#### Firebase Studio
1. Go to https://firebase.google.com/products/studio
2. Click "Start building"
3. Sign in with Google account
4. Create new project: "JournalMate-Gemini"

#### Google AI Studio (for testing)
1. Go to https://aistudio.google.com
2. Sign in with Google account
3. Create new prompt workspace

---

## 📋 Development Workflow

### **Phase 1: Prompt Optimization (Google AI Studio) - 1 Week**

**Go to**: https://aistudio.google.com

**Create and Test These 5 Prompts:**

#### 1. Morning Briefing Prompt
```
You are a proactive AI assistant generating a personalized daily briefing.

Context:
- User timezone: {timezone}
- Today's date: {date}
- Calendar events: {events}
- Incomplete tasks: {tasks}
- Weather: {weather}

Generate a brief, encouraging morning message including:
1. Weather overview
2. Top 3 priority tasks ranked by importance
3. Calendar events with meeting prep suggestions
4. One proactive suggestion based on user's patterns

Keep it concise (max 150 words), friendly, and motivating.
```

#### 2. Evening Journal Prompt
```
You are a journaling assistant creating an end-of-day summary.

Context:
- Completed tasks: {completedTasks}
- Meetings attended: {meetings}
- Activities: {activities}
- Photos taken: {photos}

Generate a personal daily journal entry including:
1. Summary of accomplishments (3-5 items)
2. Mood inference based on activity patterns
3. Day's highlight
4. Gratitude prompt question

Write in first person as if the user wrote it. Be warm and reflective.
```

#### 3. Planning Agent Prompt
```
You are an intelligent planning assistant.

User said: "{userInput}"

Tasks:
1. Extract: intent, dates, location, context
2. Convert relative dates to actual dates (e.g., "in 3 weeks" → specific date)
3. Search web for relevant information
4. Generate structured plan with:
   - Activity title
   - Description
   - Timeline/milestones
   - 8-12 actionable tasks with time estimates
   - Required resources

Create countdown reminders: 60d, 30d, 14d, 7d, 3d, day-of

Be proactive and suggest things the user might not have considered.
```

#### 4. Task Scheduling Prompt
```
You are a scheduling optimization agent.

Context:
- User's calendar: {calendar}
- User's energy patterns: {patterns}
- Tasks to schedule: {tasks}

Optimize the schedule considering:
1. Peak productivity hours
2. Meeting conflicts
3. Break frequency (15 min every 2 hours)
4. Travel time between locations
5. Buffer time before/after meetings

Output a time-blocked schedule with reasoning for each placement.
```

#### 5. Quick Reflection Prompt
```
User just completed: "{activityName}"

Generate a brief reflection prompt (max 20 words) that asks about:
- How it went
- How they feel
- What stood out

Make it conversational and specific to the activity type.

Examples:
- Workout: "Great job! How did your body feel during that workout?"
- Meeting: "How did the meeting go? Any key takeaways?"
- Meal: "How was the food? Worth recommending?"
```

**Test Each Prompt:**
- Try different input scenarios
- Compare Gemini Flash vs Gemini Pro
- Refine until responses are perfect
- Save final versions

---

### **Phase 2: App Development (Firebase Studio) - 2-3 Weeks**

**Go to**: https://firebase.google.com/products/studio

#### **Step 1: Create New Project**
1. Click "App Prototyping"
2. Select "React + Next.js + Firebase" template
3. Name: "JournalMate-Gemini"

#### **Step 2: Paste Complete Prompt**

Copy and paste this entire specification:

```markdown
# JOURNALMATE - AI-POWERED LIFESTYLE PLANNER WITH GEMINI

Build a full-stack web and mobile productivity application with automatic scheduling and proactive journaling using Firebase, Gemini 2.5 Pro, and React/Next.js.

## APP OVERVIEW

**Core Concept**: An autonomous AI productivity assistant that:
- Proactively plans your day every morning
- Automatically journals your activities throughout the day
- Adapts to your lifestyle patterns using machine learning
- Uses Gemini's Scheduled Actions for time-based automation

**Target Users**: Busy professionals, students, anyone wanting AI-powered productivity

**Key Differentiator**: Truly proactive - the AI works FOR you, not just when you ask

## CORE FEATURES

### 1. PROACTIVE PLANNING SYSTEM

**Morning Briefing Agent** (Scheduled: 7 AM daily)
```javascript
Implementation:
- Firebase Function scheduled via Cloud Scheduler
- Triggers at user's preferred wake time (default 7 AM)
- Gemini analyzes:
  * Google Calendar events (via Calendar API)
  * Incomplete tasks from Firestore
  * Weather forecast (via Weather API)
  * User's learned energy patterns
- Generates personalized daily plan
- Sends notification with briefing
- Displays on dashboard when user opens app

User Experience:
1. User wakes up
2. Notification: "Your day is ready! 🌤️"
3. Opens app to see AI-generated briefing:
   - Weather: 72°F, sunny
   - 3 meetings today (links ready)
   - 5 priority tasks (ranked by AI)
   - Suggestion: "Gym at 6 PM (schedule clear)"
4. User taps "Start My Day"
5. First task activates, focus mode enabled
```

**Conversational Planning Interface**
```javascript
User Input Methods:
- Text: "Plan my Dallas trip June 15-20"
- Voice: Gemini Live API for hands-free planning
- Image: Upload screenshot → AI extracts plan
- Paste: Copy from ChatGPT/Claude → AI structures it

AI Processing (Gemini Agent Mode):
1. Extract: dates, location, intent
2. Web search: hotels, restaurants, attractions
3. Calendar check: conflicts, travel time
4. Generate:
   - Structured itinerary (5 days)
   - Task list (booking, packing, etc.)
   - Countdown reminders (60d, 30d, 14d, 7d, 3d, day-of)
5. Save to Firestore
6. Create calendar blocks
7. Set up scheduled notifications

Multi-turn Conversation:
User: "Plan my Dallas trip"
AI: "Exciting! When are you going?"
User: "June 15-20"
AI: "Great! What's your main focus?"
User: "Food and culture"
AI: "Perfect! Here's your plan... [generates]"
```

**Intelligent Auto-Scheduling**
```javascript
Learning System (Firestore + Gemini):
- Track task completion times
- Identify peak productivity hours
- Detect energy dip patterns
- Learn preferred break times
- Analyze meeting patterns

Auto-Blocking Algorithm:
1. Deep work: 90-min uninterrupted blocks at peak hours
2. Meetings: Batch similar meetings together
3. Breaks: Auto-insert 15-min breaks every 2 hours
4. Buffer: 15-min before/after meetings
5. Travel: Calculate and add to calendar

Conflict Resolution:
- Detect: "Gym" overlaps "Team Meeting"
- AI suggests 3 alternatives with reasoning:
  A) Move gym to 6 AM (you're usually awake)
  B) Move gym to 7 PM (evening energy detected)
  C) Skip gym today (you've hit 4x this week)
- User selects → AI learns preference
```

### 2. AUTOMATIC JOURNALING SYSTEM

**Activity-Triggered Journaling**
```javascript
Trigger: Firebase Firestore onUpdate listener
Event: Task status changes to "completed"

Flow:
1. User swipes task card right (completes task)
2. Firestore triggers Cloud Function
3. Function calls Gemini with context:
   {
     task: "Morning workout",
     activity: "Fitness challenge",
     time: "7:00 AM",
     duration: "45 min"
   }
4. Gemini generates personalized prompt:
   "Great job on your workout! How did you feel?"
5. User gets in-app notification
6. User options:
   - Voice note (Gemini Live transcribes + analyzes sentiment)
   - Quick emoji (😄 Great, 😊 Good, 😐 Okay, 😔 Poor)
   - Photo upload (Gemini Vision describes)
   - Skip (still logs timestamp)
7. Entry auto-saved to Firestore with:
   - Activity link
   - Mood inference from voice/text sentiment
   - AI-generated summary
   - Timestamp
```

**End-of-Day Auto-Journal**
```javascript
Scheduled: 9 PM daily (Cloud Scheduler)

Process:
1. Firebase Function triggers at 9 PM
2. Query Firestore for today's data:
   - Completed tasks
   - Meeting attendance
   - Activities
   - Photos uploaded
   - Location history (if enabled)
3. Call Gemini with comprehensive context
4. Gemini generates detailed summary:
   "Today you accomplished:
   - ✅ Morning workout (felt great!)
   - ✅ Finished project proposal (focused work)
   - ✅ Team meeting (productive discussion)

   Your mood today: 😊 Good
   Highlight: Deep work session 9-11 AM

   What made today special?"
5. Save to Firestore as draft
6. Send notification: "Your daily journal is ready!"
7. User opens app to review/edit/approve
```

**Context-Aware Location Journaling** (Optional)
```javascript
Trigger: Geofence enter/exit (Firebase + Google Maps)
Requires: User permission for location

Example Flow (Restaurant):
1. User arrives at restaurant (geofence detected)
2. Firebase Function checks:
   - Calendar: "Dinner with Sarah" event
   - Location: "Uchi Restaurant"
   - Time: 7:30 PM
3. Don't interrupt - wait for appropriate time
4. User leaves restaurant (2 hours later)
5. Send notification: "How was Uchi?"
6. Pre-filled template opens:
   - Restaurant: Uchi (auto-filled)
   - With: Sarah (from calendar)
   - Dishes: [empty - user fills]
   - Rating: [stars]
   - Photos: [upload prompt]
7. Gemini analyzes photo → suggests dishes

Other Location Triggers:
- Gym: "How was your workout?"
- Office: End-of-workday summary
- Home: "How was your day?"
```

**Template-Based Journaling**
```javascript
8 Pre-built Templates in Firestore:

1. Trip Reflection
   Fields: destination, dates, highlights, challenges,
           photos, rating, would-return, next-time

2. Restaurant Review
   Fields: name, location, companions, dishes,
           atmosphere, rating, photos, recommend

3. Workout Log
   Fields: activity, duration, feeling, progress,
           calories, personal-record

4. Meeting Notes
   Fields: attendees, key-points, action-items,
           follow-ups, next-meeting

5. Daily Gratitude
   Fields: 3-things-grateful, why-matter, mood,
           highlight, lesson-learned

6. Book/Movie Review
   Fields: title, author/director, genre, rating,
           thoughts, favorite-moment, recommend

7. Purchase Log
   Fields: item, store, price, reason, photos,
           worth-it, category

8. Event Memory
   Fields: event-name, location, attendees, highlights,
           photos, feelings

UI: Swipeable template carousel → Select → Fill form → AI enhances
```

### 3. DATE & TIME AUTOMATION

**Smart Date Parsing**
```javascript
Natural Language Processing (Gemini):
- "in 3 weeks" → calculates actual date
- "next Tuesday" → finds next Tuesday
- "before my trip" → queries calendar, finds trip, suggests before date
- "after the meeting" → finds meeting end time + buffer

Recurring Patterns:
- "every Monday" → creates recurring calendar series
- "3x per week" → AI asks preferred days → schedules
- "monthly on the 15th" → creates monthly recurring event

Implementation:
- Use Gemini's function calling to query calendar
- Parse relative dates with timezone consideration
- Store in Firestore as cron patterns
- Generate via Cloud Scheduler
```

**Countdown System**
```javascript
For any event with a date, auto-generate milestones:

Example: "Dallas Trip on June 15"
Creates Firestore scheduled actions:
[
  { date: "April 15" (60d), action: "Start trip planning", notify: true },
  { date: "May 15" (30d), action: "Book flights/hotel", notify: true },
  { date: "June 1" (14d), action: "Detailed itinerary", notify: true },
  { date: "June 8" (7d), action: "Packing checklist", notify: true },
  { date: "June 12" (3d), action: "Weather check", notify: true },
  { date: "June 14" (1d), action: "Travel docs ready", notify: true },
  { date: "June 15" (0d), action: "Have a great trip!", notify: true }
]

Cloud Scheduler:
- Triggers Cloud Function at each milestone date
- Function checks if milestone completed
- If not → sends notification
- If completed early → skip
- After event → "Trip reflection" prompt
```

**Recurring Activity Management**
```javascript
Example: "Work out 3x per week"

AI Conversation:
AI: "Great goal! Which days work best?"
User: "Monday, Wednesday, Friday"
AI: "Perfect! What time?"
User: "7 AM"
AI: "How long?"
User: "45 minutes"

System Creates:
1. Firestore recurring pattern:
   {
     activity: "Morning Workout",
     days: ["mon", "wed", "fri"],
     time: "07:00",
     duration: 45,
     reminders: ["30min-before"]
   }

2. Google Calendar blocks (via Calendar API):
   - Monday 7-7:45 AM (recurring)
   - Wednesday 7-7:45 AM (recurring)
   - Friday 7-7:45 AM (recurring)

3. Cloud Scheduler reminders:
   - Monday 6:30 AM: "Workout in 30 min! 💪"
   - Monday 7:45 AM: "Done? How did it feel?" [auto-journal prompt]

4. Weekly summary (Cloud Function Sunday 6 PM):
   Query: workouts completed this week
   Result: 3/3 → "You hit your goal! 🎉"
   Result: 2/3 → "One more to hit your goal!"
   Result: 1/3 → "Let's get back on track next week"

Adaptive Rescheduling:
- Missed Monday 7 AM → Function detects at 8 AM
- AI suggests: "Reschedule to today 6 PM or tomorrow 7 AM?"
- User selects → Calendar updates → New reminder set
```

**Time-of-Day Automation Matrix**
```javascript
Cloud Scheduler Functions (all timezone-aware):

Morning (7-10 AM):
- 07:00: Morning briefing generation
- 09:00: "Focus mode available" (if no meetings)
- 10:00: Mid-morning energy check

Midday (12-2 PM):
- 12:30: Lunch reminder (if no calendar event)
- 13:00: Afternoon prep briefing
- 14:00: Hydration reminder

Afternoon (3-5 PM):
- 15:00: Energy dip detection (analyze completion rate)
- 15:00: Suggest break if no break in last 2 hours
- 16:00: End-of-workday prep (if work pattern detected)

Evening (6-9 PM):
- 18:00: Day summary generation (start)
- 21:00: Evening journal generation
- 21:30: Tomorrow's preview

Night (9-11 PM):
- 21:00: Wind-down routine suggestion
- 22:00: Sleep reminder (if user set bedtime)
- 22:30: Next-day final prep
```

### 4. DAY-TO-DAY ACTIVITY FEATURES

**Activity Dashboard**
```javascript
React Components:

<DashboardHero>
  - Large greeting: "Good morning, {name}!"
  - Date, time, weather widget
  - Motivational quote (daily rotating from Firestore collection)
  - "Start My Day" CTA button

<PriorityTasksCard>
  - Top 5 tasks (AI-ranked from Firestore)
  - Swipeable cards (react-swipeable library)
  - Color-coded priority (red: high, yellow: medium, gray: low)
  - Time estimates from Gemini
  - Swipe right → complete
  - Swipe left → skip
  - Swipe up → reschedule modal

<UpcomingEventsCard>
  - Next 3 calendar events (via Calendar API)
  - Countdown timer to each event
  - "Join" button for video calls
  - "Directions" button for in-person
  - Meeting prep checklist (AI-generated)

<GeminiSuggestionsCard>
  - AI-generated proactive suggestions
  - Examples:
    * "Schedule gym at 6 PM? (calendar clear)"
    * "Review tomorrow's tasks now?"
    * "Take a 10-min walk? (no break in 3 hours)"
  - Accept/Dismiss actions
  - Learns from user responses

<ProgressOverview>
  - Circular progress ring (react-circular-progressbar)
  - Daily: X/Y tasks completed
  - Weekly: Streak counter (🔥 5-day streak!)
  - Monthly: Completion percentage
  - Tap for detailed analytics

<QuickActions>
  - 🎤 Voice Planning (Gemini Live)
  - 📝 Quick Journal
  - ➕ Add Task
  - 📅 Schedule Event
```

**Task Management System**
```javascript
Firestore Schema:
{
  tasks: {
    [taskId]: {
      id: string,
      userId: string,
      activityId: string,
      title: string,
      description: string,
      priority: "high" | "medium" | "low",
      estimatedDuration: number (minutes),
      actualDuration: number (tracked),
      dueDate: timestamp,
      scheduledTime: timestamp,
      completed: boolean,
      completedAt: timestamp,
      skipped: boolean,
      rescheduledCount: number,
      subtasks: [
        { id, title, completed }
      ],
      tags: ["work", "urgent"],
      dependencies: [taskId1, taskId2], // complete these first
      createdBy: "user" | "ai"
    }
  }
}

Task Card Features:
- Swipe gestures (react-swipeable)
- Long press → detail modal
- Tap → expand/collapse subtasks
- Drag handle → reorder priority
- Time tracking → auto-starts on "Start" tap
- Smart notifications → 30min before scheduled time

Task Intelligence:
- Auto-estimate duration (Gemini analyzes similar tasks)
- Suggest optimal time slot based on:
  * Task type (deep work vs quick task)
  * User's energy patterns
  * Calendar availability
- Detect dependencies: "Do X before Y"
- Auto-reschedule missed tasks
```

**Goal Tracking System**
```javascript
Goal Types in Firestore:
1. Long-term Goals (months)
   - Track milestones
   - Weekly progress checks
   - AI generates sub-goals

2. Short-term Goals (weeks)
   - Daily task breakdown
   - Progress percentage
   - Completion estimates

3. Daily Habits
   - Streak tracking
   - Consistency scoring
   - Adaptive scheduling

Progress Visualization (recharts library):
- Line chart: completion trend
- Bar chart: category breakdown
- Streak calendar: GitHub-style heatmap
- Pie chart: time distribution

AI Insights (Gemini analyzes Firestore data):
- "You're 70% to your fitness goal!"
- "At this pace, goal completion in 12 days"
- "Your best days are Tuesdays (92% completion)"
- "Productivity drops after 3 PM (consider breaks)"
```

**Google Calendar Integration**
```javascript
Setup (Firebase Functions + Calendar API):
1. OAuth 2.0 flow for Calendar access
2. Store refresh token in Firestore (encrypted)
3. Cloud Functions CRUD operations

Read Operations:
- Fetch events for briefing generation
- Check conflicts before scheduling
- Analyze meeting patterns

Write Operations:
- Create calendar blocks for tasks
- Add buffer time automatically
- Set reminders (30min, 1day before)

Sync Strategy:
- Two-way sync via webhooks
- Firestore → Calendar: immediate push
- Calendar → Firestore: webhook + polling (5min)
- Conflict resolution: Calendar takes priority

Meeting Preparation:
- 30min before: Gemini generates meeting prep
  * Agenda review
  * Previous notes (if recurring)
  * Attendee context (if available)
- 10min before: Join link notification
- After meeting: Note-taking prompt
```

**Analytics & Insights Dashboard**
```javascript
Data Collection (Firestore):
- Task completions with timestamps
- Mood entries (from journals)
- Activity durations
- Calendar event attendance
- Focus time (calculated from task tracking)

Gemini Analysis (Cloud Function runs weekly):
Query Firestore for last 30 days
Analyze patterns:
1. Productivity by hour (heatmap)
2. Completion rate trends
3. Mood correlations
4. Energy level patterns
5. Category time distribution

Generate Insights:
- "Peak hours: 9-11 AM (87% completion rate)"
- "Schedule deep work mornings, meetings afternoons"
- "Your mood improves after workouts"
- "Tuesday is your most productive day"
- "You need breaks every 2.5 hours"

Visualization Components:
- Productivity heatmap (react-calendar-heatmap)
- Mood trend line chart (recharts)
- Completion rate progress bar
- Category pie chart
- Streak calendar (GitHub-style)

AI Recommendations:
- Auto-optimize schedule based on insights
- Suggest habit changes
- Predict goal completion dates
- Identify productivity blockers
```

## TECHNICAL IMPLEMENTATION

### Frontend Stack
```javascript
Framework: Next.js 14 (App Router)
Styling: Tailwind CSS + shadcn/ui components
State Management:
  - Server state: React Query (TanStack Query)
  - Client state: Zustand
Animations: Framer Motion
PWA: next-pwa plugin
Charts: recharts
Calendar: react-big-calendar
Swipe: react-swipeable
Voice: Web Speech API + Gemini Live API
Camera: Web MediaDevices API

Key Libraries:
- @tanstack/react-query: Server state
- zustand: Client state
- framer-motion: Animations
- recharts: Charts
- date-fns: Date manipulation
- react-hook-form: Forms
- zod: Validation
```

### Backend Stack
```javascript
Platform: Firebase
Services:
  - Firestore: NoSQL database
  - Authentication: Multi-provider auth
  - Storage: File uploads
  - Functions: Serverless backend
  - Hosting: Web hosting
  - Cloud Scheduler: Cron jobs
  - Cloud Messaging: Push notifications

API Integrations:
  - Gemini 2.5 Pro API (primary AI)
  - Google Calendar API
  - Weather API (OpenWeather)
  - Maps API (optional, for location)

Scheduled Functions (Cloud Scheduler):
- Morning briefing: 0 7 * * * (7 AM daily)
- Evening journal: 0 21 * * * (9 PM daily)
- Hourly checks: 0 * * * * (every hour)
- Weekly review: 0 18 * * 0 (6 PM Sundays)
```

### Database Schema (Firestore)
```javascript
Collections:

users: {
  [userId]: {
    email: string,
    name: string,
    timezone: string,
    preferences: {
      morningBriefingTime: "07:00",
      eveningJournalTime: "21:00",
      workoutDays: ["mon", "wed", "fri"],
      peakHours: ["09:00-11:00"],
      breakFrequency: 120 (minutes),
      enableLocationTriggers: false,
      theme: "light" | "dark" | "auto"
    },
    learnedPatterns: {
      productivityPeaks: ["09:00", "10:00", "11:00"],
      energyDips: ["14:00", "15:00"],
      taskCompletionAverages: {
        "high": 45 (minutes),
        "medium": 25,
        "low": 10
      }
    },
    stats: {
      totalTasks: 247,
      completionRate: 0.85,
      currentStreak: 12,
      longestStreak: 28
    }
  }
}

activities: {
  [activityId]: {
    id: string,
    userId: string,
    title: string,
    description: string,
    category: string,
    type: "one-time" | "recurring",
    status: "planning" | "active" | "completed",
    startDate: timestamp,
    endDate: timestamp,
    recurringPattern: {
      frequency: "daily" | "weekly" | "monthly",
      daysOfWeek: ["mon", "wed"],
      timeOfDay: "07:00"
    },
    tasks: [taskId1, taskId2],
    progressPercent: 65,
    milestones: [
      { date: timestamp, title: string, completed: boolean }
    ],
    createdBy: "user" | "ai",
    aiSuggestions: ["Add packing checklist", "Book rental car"],
    createdAt: timestamp,
    updatedAt: timestamp
  }
}

tasks: {
  [taskId]: {
    // schema from earlier
  }
}

journals: {
  [journalId]: {
    id: string,
    userId: string,
    date: timestamp,
    type: "auto" | "manual" | "triggered",
    trigger: {
      type: "activity" | "location" | "time" | "event",
      sourceId: string,
      sourceName: string
    },
    content: {
      aiSummary: string,
      userNotes: string,
      mood: "great" | "good" | "okay" | "poor",
      moodEmoji: "😄" | "😊" | "😐" | "😔",
      photos: [
        { url: string, description: string (from Gemini Vision) }
      ],
      activities: [
        { id: string, name: string, completed: boolean }
      ],
      highlights: ["Finished project", "Great workout"],
      gratitude: ["Health", "Friends", "Weather"]
    },
    metadata: {
      wordCount: 342,
      sentimentScore: 0.75 (0-1, from Gemini),
      keywords: ["productive", "focused", "exercise"],
      linkedActivities: [activityId1, activityId2],
      location: {
        lat: 32.7767,
        lng: -96.7970,
        name: "Dallas, TX"
      }
    },
    createdAt: timestamp,
    updatedAt: timestamp
  }
}

scheduledActions: {
  [actionId]: {
    id: string,
    userId: string,
    name: string,
    description: string,
    schedule: {
      type: "one-time" | "recurring",
      time: "07:00",
      days: ["mon", "tue", "wed", "thu", "fri"],
      timezone: "America/New_York"
    },
    action: {
      type: "briefing" | "journal" | "reminder" | "task",
      geminiPrompt: string,
      parameters: {}
    },
    active: boolean,
    lastRun: timestamp,
    nextRun: timestamp
  }
}
```

### Gemini Integration Details

**API Setup (Firebase Functions)**
```javascript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Morning Briefing
export const generateBriefing = async (userId: string) => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

  const userData = await getUserContext(userId);

  const prompt = `
    Generate morning briefing for:
    Date: ${new Date().toLocaleDateString()}
    Weather: ${userData.weather}
    Calendar: ${JSON.stringify(userData.events)}
    Tasks: ${JSON.stringify(userData.tasks)}

    [Use optimized prompt from Google AI Studio]
  `;

  const result = await model.generateContent(prompt);
  return result.response.text();
};

// Agent Mode for Planning
export const planWithAgent = async (userInput: string, userId: string) => {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-pro",
    tools: [
      { functionDeclarations: [
        {
          name: "searchWeb",
          description: "Search the web for information",
          parameters: { type: "object", properties: { query: { type: "string" } } }
        },
        {
          name: "checkCalendar",
          description: "Check user's Google Calendar",
          parameters: { type: "object", properties: { startDate: { type: "string" }, endDate: { type: "string" } } }
        },
        {
          name: "createActivity",
          description: "Create a new activity in Firestore",
          parameters: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, tasks: { type: "array" } } }
        }
      ]}
    ]
  });

  const chat = model.startChat();

  const result = await chat.sendMessage(userInput);

  // Handle function calls
  const functionCall = result.response.functionCalls()?.[0];
  if (functionCall) {
    const functionResponse = await executeFunctionCall(functionCall);
    const result2 = await chat.sendMessage([{ functionResponse }]);
    return result2.response.text();
  }

  return result.response.text();
};

// Gemini Live for Voice
export const startVoiceSession = async (userId: string) => {
  // Implement Gemini Live API
  // Returns WebSocket connection for real-time voice
};

// Gemini Vision for Image Analysis
export const analyzeImage = async (imageUrl: string) => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

  const imagePart = {
    inlineData: {
      data: await fetchImageAsBase64(imageUrl),
      mimeType: "image/jpeg"
    }
  };

  const prompt = "Describe this image for a journal entry. What activity is shown? What's the mood?";

  const result = await model.generateContent([prompt, imagePart]);
  return result.response.text();
};
```

**Cloud Scheduler Setup**
```bash
# Morning briefing
gcloud scheduler jobs create pubsub morning-briefing \
  --schedule="0 7 * * *" \
  --topic="morning-briefing" \
  --message-body='{"action":"generateBriefing"}' \
  --time-zone="America/New_York"

# Evening journal
gcloud scheduler jobs create pubsub evening-journal \
  --schedule="0 21 * * *" \
  --topic="evening-journal" \
  --message-body='{"action":"generateJournal"}' \
  --time-zone="America/New_York"
```

**Firebase Functions**
```javascript
// functions/src/index.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

// Morning Briefing
export const morningBriefing = functions.pubsub
  .schedule('0 7 * * *')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    const users = await getActiveUsers();

    for (const user of users) {
      const briefing = await generateBriefing(user.id);

      await admin.firestore()
        .collection('notifications')
        .add({
          userId: user.id,
          type: 'briefing',
          title: 'Your day is ready! 🌤️',
          body: briefing,
          priority: 'high',
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

      // Send push notification
      await admin.messaging().send({
        token: user.fcmToken,
        notification: {
          title: 'Your day is ready!',
          body: 'Tap to see your morning briefing'
        },
        data: { type: 'briefing' }
      });
    }

    return null;
  });

// Evening Journal
export const eveningJournal = functions.pubsub
  .schedule('0 21 * * *')
  .onRun(async (context) => {
    const users = await getActiveUsers();

    for (const user of users) {
      const dayData = await collectDayData(user.id);
      const journal = await generateJournal(dayData);

      await admin.firestore()
        .collection('journals')
        .add({
          userId: user.id,
          type: 'auto',
          date: admin.firestore.Timestamp.now(),
          content: { aiSummary: journal },
          isDraft: true
        });

      await admin.messaging().send({
        token: user.fcmToken,
        notification: {
          title: 'Your daily journal is ready!',
          body: 'Review and save your day'
        }
      });
    }

    return null;
  });

// Task Completion Trigger
export const onTaskComplete = functions.firestore
  .document('tasks/{taskId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (!before.completed && after.completed) {
      const activity = await getActivity(after.activityId);

      const prompt = await generateReflectionPrompt(activity.title, after.title);

      await admin.firestore()
        .collection('notifications')
        .add({
          userId: after.userId,
          type: 'journal-prompt',
          title: 'Great job! 🎉',
          body: prompt,
          metadata: {
            taskId: context.params.taskId,
            activityId: after.activityId
          }
        });
    }
  });
```

## UI/UX DESIGN SPECIFICATIONS

### Design System
```javascript
Colors (Tailwind config):
- Primary: Purple-500 to Emerald-500 gradient
- Secondary: Blue-500 to Cyan-500 gradient
- Success: Green-500
- Warning: Yellow-500
- Error: Red-500
- Neutral: Slate-50 to Slate-900

Typography:
- Headings: Inter font, bold
- Body: Inter font, regular
- Mono: JetBrains Mono

Spacing: 4px base (Tailwind default)
Border Radius: 8px default, 12px for cards
Shadows: Soft shadows, elevated on hover

Animations:
- Fade in: 300ms ease-in-out
- Slide up: 400ms ease-out
- Swipe: Follow gesture (react-swipeable)
- Confetti: On task completion (react-confetti)
```

### Page Layouts

**Dashboard** (`/app/page.tsx`)
```jsx
<div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-emerald-50">
  <Header />
  <main className="container mx-auto px-4 py-6">
    <DashboardHero />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
      <div className="lg:col-span-2">
        <PriorityTasksCard />
        <GeminiSuggestionsCard />
      </div>
      <div>
        <UpcomingEventsCard />
        <ProgressOverview />
      </div>
    </div>
    <QuickActions />
  </main>
</div>
```

**Planning** (`/app/plan/page.tsx`)
```jsx
<div className="h-screen flex flex-col">
  <Header />
  <div className="flex-1 flex">
    <aside className="w-64 border-r p-4">
      <h3>Recent Plans</h3>
      <PlansList />
    </aside>
    <main className="flex-1 flex flex-col">
      <ChatInterface />
      <InputBar
        onVoice={handleVoice}
        onImage={handleImage}
        onText={handleText}
      />
    </main>
  </div>
</div>
```

**Journal** (`/app/journal/page.tsx`)
```jsx
<div className="min-h-screen">
  <Header />
  <main className="container mx-auto px-4 py-6">
    <div className="flex gap-4 mb-6">
      <SearchBar />
      <FilterDropdown />
    </div>
    <JournalTimeline entries={filteredEntries} />
  </main>
  <FloatingActionButton onClick={openNewEntry} />
</div>
```

**Calendar** (`/app/calendar/page.tsx`)
```jsx
<div className="h-screen flex flex-col">
  <Header />
  <Toolbar>
    <ViewSwitcher /> {/* Day/Week/Month */}
    <DatePicker />
  </Toolbar>
  <main className="flex-1 overflow-auto">
    <BigCalendar
      events={calendarEvents}
      onSelectSlot={handleNewEvent}
      onSelectEvent={handleEditEvent}
    />
  </main>
</div>
```

**Analytics** (`/app/insights/page.tsx`)
```jsx
<div className="min-h-screen">
  <Header />
  <main className="container mx-auto px-4 py-6">
    <StatsOverview />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <ProductivityHeatmap />
      <MoodTrendChart />
      <CategoryPieChart />
      <StreakCalendar />
    </div>
    <AIInsightsPanel />
  </main>
</div>
```

### Mobile Responsiveness
```javascript
Breakpoints (Tailwind):
- sm: 640px (phone landscape, small tablet)
- md: 768px (tablet portrait)
- lg: 1024px (tablet landscape, small laptop)
- xl: 1280px (laptop)
- 2xl: 1536px (desktop)

Mobile-First Approach:
1. Stack vertically on mobile
2. Grid layout on tablet
3. Multi-column on desktop
4. Touch-friendly buttons (min 44px)
5. Swipe gestures on mobile
6. Keyboard shortcuts on desktop
```

## PWA Configuration
```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

module.exports = withPWA({
  reactStrictMode: true,
});

// public/manifest.json
{
  "name": "JournalMate",
  "short_name": "JournalMate",
  "description": "AI-powered productivity and journaling",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#a855f7",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## DEPLOYMENT

### Firebase Hosting
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize
firebase init hosting

# Build
npm run build

# Deploy
firebase deploy --only hosting

# URL: https://journalmate-gemini.web.app
```

### Cloud Functions
```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:morningBriefing
```

## TESTING STRATEGY

### Unit Tests (Jest + React Testing Library)
```javascript
// __tests__/components/TaskCard.test.tsx
test('swipe right completes task', async () => {
  const onComplete = jest.fn();
  render(<TaskCard task={mockTask} onComplete={onComplete} />);

  // Simulate swipe right
  fireEvent.touchStart(screen.getByTestId('task-card'));
  fireEvent.touchMove(screen.getByTestId('task-card'), { deltaX: 150 });
  fireEvent.touchEnd(screen.getByTestId('task-card'));

  expect(onComplete).toHaveBeenCalledWith(mockTask.id);
});
```

### Integration Tests (Playwright)
```javascript
// e2e/planning.spec.ts
test('create plan from voice input', async ({ page }) => {
  await page.goto('/plan');
  await page.click('[data-testid="voice-button"]');
  // Simulate voice input
  await page.waitForSelector('[data-testid="plan-output"]');
  expect(await page.textContent('[data-testid="plan-title"]')).toBe('Dallas Trip');
});
```

## PERFORMANCE TARGETS
- Initial load: < 2s
- Gemini response: < 3s (Flash) / < 5s (Pro)
- Task swipe latency: < 50ms
- Real-time sync: < 500ms
- PWA install size: < 5MB

## SECURITY & PRIVACY
- Firebase Auth (Google, Email, Phone)
- Firestore Security Rules (user isolation)
- Gemini API calls server-side only (Functions)
- Encrypted tokens (refresh tokens in Firestore)
- Location data: Opt-in only, never shared
- Data export: JSON download anytime
- Account deletion: Permanent wipe

## MONETIZATION
- Free: 50 Gemini calls/month, 5 scheduled actions
- Pro ($9.99/mo): Unlimited Gemini, 10 scheduled actions
- Team ($19.99/user/mo): Shared workspaces, admin dashboard

## NEXT STEPS
1. Use this prompt in Firebase Studio
2. Let Gemini App Prototyping agent generate structure
3. Refine UI/UX in Agent Mode
4. Import optimized prompts from Google AI Studio
5. Deploy to Firebase Hosting
6. Test scheduled functions
7. Launch!

Build this with mobile-first, AI-native approach. Prioritize user autonomy and delight.
```

Save this prompt and paste it into Firebase Studio when ready!

---

## 📊 RECOMMENDED WORKFLOW

### Week 1: Google AI Studio
1. Create 5 optimized prompts
2. Test with real scenarios
3. Refine responses
4. Export final versions

### Week 2-3: Firebase Studio
1. Create new project
2. Paste comprehensive prompt
3. Generate app structure
4. Import optimized prompts
5. Configure Cloud Scheduler
6. Test automation

### Week 4: Deploy & Test
1. Deploy to Firebase
2. Test scheduled functions
3. Validate workflows
4. User testing
5. Launch! 🚀
