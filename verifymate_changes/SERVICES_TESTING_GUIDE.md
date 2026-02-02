# Services & Import Testing Guide

## 📋 Overview

This guide covers testing all backend services and the AI plan import functionality that were recently verified/added.

**Status:** ✅ All 39 server services exist | ✅ useAIPlanImport hook added

---

## 🔧 Prerequisites

1. **Start the development server:**
```bash
npm run dev
```

2. **Ensure database is running:**
```bash
# Check PostgreSQL is active
pg_isready
```

3. **Verify environment variables:**
```bash
# Required API keys:
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
APIFY_API_KEY=...        # For social media scraping
UNSPLASH_ACCESS_KEY=...  # For image search
WEATHER_API_KEY=...      # For weather service
```

---

## 1️⃣ AI Plan Import Hook Testing

### Location: `/import-plan`

### Test 1: ChatGPT Plan Import
**Steps:**
1. Navigate to https://your-app.com/import-plan
2. Copy this sample ChatGPT conversation:
```
User: Help me plan a 3-day Paris trip

ChatGPT: Here's your 3-day Paris itinerary:

Day 1: Arrival & Eiffel Tower
- Morning: Check into hotel near Trocadéro
- Afternoon: Visit Eiffel Tower (book tickets in advance)
- Evening: Dinner cruise on Seine River

Day 2: Museums & Culture
- Morning: Louvre Museum (arrive early to beat crowds)
- Lunch: Café in Le Marais
- Afternoon: Notre-Dame Cathedral area
- Evening: Montmartre and Sacré-Cœur

Day 3: Versailles & Departure
- Morning: Palace of Versailles (full day trip)
- Afternoon: Gardens of Versailles
- Evening: Return to Paris, pack and depart
```
3. Paste into import field
4. Click "Import & Parse"

**Expected Results:**
- ✅ Plan is detected as ChatGPT source
- ✅ 3-day structure is recognized
- ✅ Tasks are extracted (9 activities)
- ✅ Categories auto-assigned (Travel)
- ✅ Time estimates added
- ✅ Save button appears

**Verify State:**
```javascript
// Open browser console
console.log('Import State:', importState);
// Should show: { status: 'parsed', source: 'chatgpt', confidence: 0.85+ }
```

### Test 2: Social Media URL Import
**Steps:**
1. Navigate to /import-plan
2. Paste Instagram/YouTube URL:
```
https://www.instagram.com/p/ABC123/
```
3. Choose "Extract Content" when prompted

**Expected Results:**
- ✅ Dialog appears: "Import link or extract content?"
- ✅ Clicking "Extract" calls apifyService
- ✅ Post caption is extracted
- ✅ Hashtags converted to categories
- ✅ Image URLs preserved

### Test 3: Import Limits (Free vs Pro)
**Steps:**
1. Create test Free user account
2. Import 3 plans successfully
3. Try 4th import

**Expected Results:**
- ✅ 1st-3rd imports succeed
- ✅ 4th import shows upgrade modal
- ✅ Modal displays: "You've reached your free import limit (3/3)"
- ✅ Pro badge shown with upgrade CTA

**Pro User Test:**
```javascript
// Verify Pro user has unlimited imports
console.log('Import Limits:', importLimits);
// Should show: { limit: null, used: X, remaining: null, tier: 'pro' }
```

### Test 4: Mobile Share Sheet
**Mobile Only:**
1. On iPhone/Android, open Instagram
2. Find post you want to save
3. Tap Share → Share to JournalMate
4. App opens with content pre-loaded

**Expected Results:**
- ✅ Deep link works: `journalmate://import?url=...`
- ✅ Content appears in import field
- ✅ Ready to parse immediately

---

## 2️⃣ Social Media Services Testing

### apifyService.ts - Instagram/TikTok Scraping

**Test via API:**
```bash
curl -X POST http://localhost:5000/api/scrape-social \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "url": "https://www.instagram.com/p/ABC123/",
    "platform": "instagram"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "caption": "Post caption here...",
    "author": "username",
    "likes": 1234,
    "timestamp": "2024-01-15T10:30:00Z",
    "mediaUrls": ["https://..."],
    "hashtags": ["travel", "paris"]
  }
}
```

**In-App Test:**
1. Go to /save-social-media
2. Paste Instagram URL
3. Click "Extract Content"
4. Verify caption appears

### socialMediaVideoService.ts - Video Extraction

**Test YouTube:**
```bash
curl -X POST http://localhost:5000/api/extract-video-content \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  }'
```

**Expected Response:**
```json
{
  "title": "Video Title",
  "description": "Video description...",
  "transcript": "Extracted transcript if available",
  "duration": "3:45",
  "tags": ["tag1", "tag2"]
}
```

**In-App Test:**
1. Paste YouTube URL in /import-plan
2. Service extracts video metadata
3. Transcript converted to tasks

---

## 3️⃣ Content Processing Services

### contentOrchestrator.ts - Central Orchestration

**Test Multi-Source Import:**
```javascript
// Paste different content types in sequence
const tests = [
  { type: 'text', content: 'ChatGPT plan...' },
  { type: 'url', content: 'https://instagram.com/...' },
  { type: 'file', content: File object }
];

// Orchestrator routes to correct service
// Verify each goes to right handler
```

### documentParser.ts - File Upload

**Test PDF Upload:**
1. Create sample PDF with todo list
2. Go to /import-plan
3. Click "Upload File"
4. Select PDF

**Expected:**
- ✅ PDF text extracted
- ✅ Lists detected and parsed
- ✅ Dates/deadlines extracted
- ✅ Converted to tasks

**Supported Formats:**
- PDF (.pdf)
- Word (.doc, .docx)
- Text (.txt)
- Markdown (.md)

### contentCategorizationService.ts - Auto-Categorization

**Test Category Detection:**
```javascript
// Sample plans that should auto-categorize
const testCases = [
  {
    text: "Go to gym, run 5k, meal prep",
    expectedCategory: "Health & Fitness"
  },
  {
    text: "Book flight to Paris, reserve hotel",
    expectedCategory: "Travel"
  },
  {
    text: "Finish quarterly report, team meeting",
    expectedCategory: "Work"
  }
];
```

**In-App Test:**
1. Import plan with mixed activities
2. Check auto-assigned categories
3. Verify 85%+ accuracy

### mediaInterpretationService.ts - Image Analysis

**Test Screenshot Upload:**
1. Take screenshot of todo list
2. Upload to /import-plan
3. Service uses OCR + AI

**Expected:**
- ✅ Text extracted from image
- ✅ Checkboxes detected as tasks
- ✅ Handwriting recognized (if clear)
- ✅ Structure preserved

---

## 4️⃣ AI Planning Services

### aiPlanParser.ts - Parse AI Plans

**Test ChatGPT Parsing:**
```bash
curl -X POST http://localhost:5000/api/parse-ai-plan \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Day 1: Morning - Visit museum\nDay 1: Afternoon - Lunch at café",
    "source": "chatgpt"
  }'
```

**Expected Structure:**
```json
{
  "title": "Extracted from conversation",
  "days": [
    {
      "dayNumber": 1,
      "activities": [
        {
          "time": "Morning",
          "title": "Visit museum",
          "category": "Entertainment"
        },
        {
          "time": "Afternoon",
          "title": "Lunch at café",
          "category": "Food"
        }
      ]
    }
  ],
  "confidence": 0.92
}
```

### planRemixService.ts - Combine Plans

**Test Plan Remix:**
1. Go to /discover
2. Select 2 travel plans (Paris + Rome)
3. Click "Remix Plans"
4. Set preferences: 7 days total

**Expected:**
- ✅ Tasks merged intelligently
- ✅ Duplicates removed
- ✅ Timeline adjusted to fit 7 days
- ✅ Budget combined
- ✅ New plan created

**API Test:**
```bash
curl -X POST http://localhost:5000/api/remix-plans \
  -H "Content-Type: application/json" \
  -d '{
    "planIds": ["plan-id-1", "plan-id-2"],
    "preferences": {
      "duration": 7,
      "budget": 2000,
      "pace": "relaxed"
    }
  }'
```

### simpleConversationalPlanner.ts - Multi-Turn Planning

**Test Conversation Flow:**
1. Go to /plan (conversational planner)
2. Start: "Plan a weekend trip"
3. Bot asks: "Where would you like to go?"
4. Reply: "Beach destination, budget-friendly"
5. Bot suggests: "Miami, Myrtle Beach, or Gulf Shores?"
6. Reply: "Miami"
7. Bot generates: Complete Miami weekend plan

**Verify:**
- ✅ Context maintained across turns
- ✅ Preferences remembered
- ✅ Follow-up questions relevant
- ✅ Final plan incorporates all inputs

### reminderProcessor.ts - Smart Reminders

**Test Context-Aware Reminders:**
```javascript
// Task with weather dependency
const task = {
  title: "Beach picnic",
  date: "2024-01-20",
  location: "Miami Beach"
};

// Service should create reminders:
// - 1 day before: "Check weather for beach picnic tomorrow"
// - 2 hours before: "Don't forget sunscreen!" (if sunny)
// - Cancel/postpone suggestions if rain predicted
```

**In-App Test:**
1. Create outdoor task with date
2. Check notifications 1 day before
3. Verify weather-aware suggestions

### weatherService.ts - Weather Integration

**Test Weather API:**
```bash
curl http://localhost:5000/api/weather?city=Paris&date=2024-01-20
```

**Expected Response:**
```json
{
  "city": "Paris",
  "date": "2024-01-20",
  "temperature": 15,
  "condition": "Partly Cloudy",
  "precipitation": 20,
  "suggestions": [
    "Pack light jacket",
    "Umbrella recommended"
  ]
}
```

**In-App Test:**
1. Enable location in profile
2. Create outdoor activity
3. See weather widget
4. Verify appropriate clothing suggestions

---

## 5️⃣ Integration Testing

### Full Import Flow (End-to-End)

**Test Complete Journey:**
```
1. User shares Instagram post to app (mobile)
   ↓
2. Deep link opens /import-plan with URL
   ↓
3. useAIPlanImport detects social media URL
   ↓
4. Dialog: "Import link or extract content?"
   ↓
5. User chooses "Extract Content"
   ↓
6. apifyService scrapes post
   ↓
7. mediaInterpretationService analyzes images
   ↓
8. contentOrchestrator combines data
   ↓
9. aiPlanParser converts to tasks
   ↓
10. contentCategorizationService assigns categories
    ↓
11. categoryMatcher validates categories
    ↓
12. User previews parsed plan
    ↓
13. User clicks "Save as Activity"
    ↓
14. createActivity() saves to database
    ↓
15. reminderProcessor creates reminders
    ↓
16. weatherService adds weather context (if location task)
    ↓
17. User sees new activity in /activities
    ↓
18. Success notification shown
```

**Verification Points:**
- ✅ Each step completes without errors
- ✅ Data flows correctly between services
- ✅ User sees loading states
- ✅ Final activity has all data
- ✅ Reminders are scheduled

---

## 6️⃣ Error Handling Tests

### Test Service Failures

**1. API Key Missing:**
```bash
# Unset API key temporarily
unset APIFY_API_KEY

# Try social media import
# Expected: Fallback to alternative scraper or error message
```

**2. Rate Limit Exceeded:**
```bash
# Make 10+ requests rapidly
for i in {1..15}; do
  curl http://localhost:5000/api/parse-ai-plan -d '{"text":"test"}'
done

# Expected: HTTP 429 Too Many Requests after threshold
```

**3. Invalid Input:**
```javascript
// Test with malformed data
const invalidTests = [
  { input: '', expected: 'Empty input error' },
  { input: 'random text without plan structure', expected: 'No plan detected' },
  { input: 'https://invalid-url', expected: 'Invalid URL error' }
];
```

---

## 7️⃣ Performance Testing

### Load Test Import Service

**Test Multiple Concurrent Imports:**
```bash
# Install load testing tool
npm install -g artillery

# Run load test
artillery quick --count 50 --num 10 http://localhost:5000/api/parse-ai-plan
```

**Targets:**
- ✅ <500ms response time (p95)
- ✅ <5% error rate
- ✅ Handles 50 concurrent users

### Monitor Service Performance

**Check Service Metrics:**
```bash
# If you have monitoring enabled
curl http://localhost:5000/metrics

# Look for:
# - parse_duration_seconds (should be <2s)
# - import_success_rate (should be >95%)
# - cache_hit_rate (should be >70%)
```

---

## 8️⃣ Testing Checklist

### Critical Tests (Must Pass)

#### Import Functionality
- [ ] ChatGPT plan imports successfully
- [ ] Claude plan imports successfully
- [ ] Gemini plan imports successfully
- [ ] Instagram URL extracts content
- [ ] YouTube URL extracts content
- [ ] PDF upload parses text
- [ ] Image upload extracts text (OCR)

#### Limits & Permissions
- [ ] Free user limited to 3 imports
- [ ] Pro user has unlimited imports
- [ ] Upgrade modal appears at limit
- [ ] Import count resets monthly

#### Mobile Features
- [ ] Share sheet works on iOS
- [ ] Share sheet works on Android
- [ ] Deep links open correctly
- [ ] Content pre-loads from share

#### Service Integration
- [ ] Category auto-assignment works
- [ ] Weather suggestions appear
- [ ] Reminders are created
- [ ] Plan remix combines correctly

#### Error Handling
- [ ] Invalid URL shows error
- [ ] Empty input shows error
- [ ] API failure shows fallback
- [ ] Rate limit enforced

---

## 9️⃣ Replit Testing

### Deploy and Test on Replit

**Steps:**
1. Push all changes to GitHub (already done ✅)
2. Replit auto-deploys from main branch
3. Wait for deployment (2-5 minutes)
4. Test critical flows:

```bash
# 1. Test import endpoint
curl https://your-replit-url.repl.co/api/parse-ai-plan \
  -H "Content-Type: application/json" \
  -d '{"text": "Day 1: Visit museum", "source": "chatgpt"}'

# 2. Test health check
curl https://your-replit-url.repl.co/api/health

# 3. Test authenticated endpoint
curl https://your-replit-url.repl.co/api/import-limits \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**In-App Tests:**
1. Visit https://your-app.repl.co/import-plan
2. Paste ChatGPT plan
3. Click "Import & Parse"
4. Verify plan created
5. Check reminders were scheduled
6. Test mobile share (if available)

---

## 🐛 Common Issues & Solutions

### Issue: "useAIPlanImport is not defined"
**Solution:** Clear browser cache, rebuild app
```bash
npm run build
```

### Issue: Social media scraping fails
**Solution:** Check APIFY_API_KEY is set
```bash
echo $APIFY_API_KEY
```

### Issue: Import shows "Upgrade Required" for Pro user
**Solution:** Check user tier in database
```sql
SELECT id, email, subscription_tier FROM users WHERE id = 'user-id';
```

### Issue: Categories not auto-assigning
**Solution:** Verify contentCategorizationService is running
```bash
# Check service logs
tail -f server/logs/categorization.log
```

---

## 📊 Success Metrics

**Import Service:**
- 95%+ parse success rate
- <2s average parse time
- 90%+ category accuracy

**User Experience:**
- 80%+ of imports require no edits
- <3 clicks to import and save
- <5s total time from paste to save

**Service Reliability:**
- 99.5%+ uptime
- <1% error rate
- <100ms cache hit response

---

## 📝 Next Steps

After testing services:
1. ✅ Commit and push useAIPlanImport hook (DONE)
2. ⏭️ Test on Replit production
3. ⏭️ Add Landing Page (final task)
4. ⏭️ Monitor error logs for 24 hours
5. ⏭️ Collect user feedback on import accuracy

---

**Last Updated:** December 18, 2025
**Status:** ✅ All services verified | ✅ Hook added | 📝 Ready for testing
