# IntentAI - AI-Powered Journaling Application

## Project Overview
A mobile-first AI-powered journaling application that transforms user intentions into actionable plans with swipeable task management and celebratory feedback.

## Current Status
**Production Ready** - Full-featured AI lifestyle planner with comprehensive authentication:
- Dual authentication system (Replit Auth + Supabase for Facebook)
- AI-powered action plan generation with Claude/OpenAI
- Smart Plan and Quick Plan conversation modes
- Full-screen ChatGPT/Claude-style conversation interface
- Functional profile management with priorities and settings
- Swipeable task cards with celebration animations
- Progress dashboard with streaks and analytics
- Daily journal with mood tracking
- Task list management with search and filters

## Key Features Implemented
✅ Dual authentication (Replit Auth for Google/X/Apple/Email + Supabase for Facebook)
✅ Real user authentication with session management
✅ Functional profile management (Priorities & Settings tabs)
✅ AI-powered conversation planning (Claude/OpenAI)
✅ Smart Plan mode (comprehensive information gathering)
✅ Quick Plan mode (rapid task generation)
✅ Full-screen chat interface optimized for mobile
✅ Voice input with Web Speech API fallback
✅ Swipeable task cards (left to skip, right to complete)
✅ Celebration animations with confetti
✅ Progress tracking dashboard
✅ Task management with search/filter
✅ Dark/light theme toggle
✅ Mobile-first responsive design

## Technical Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Framer Motion, Wouter
- **Backend**: Express.js with Passport.js authentication
- **Authentication**: 
  - Replit Auth (Google, X/Twitter, Apple, Email)
  - Supabase (Facebook OAuth)
  - Unified session management
- **AI Integration**: OpenAI and Claude API support
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Animations**: React Confetti, React Spring, Framer Motion
- **Storage**: PostgreSQL with in-memory caching

## Design Implementation
- ✅ Design guidelines established and implemented
- ✅ Purple (#6C5CE7) and emerald (#00B894) color scheme
- ✅ Inter font family
- ✅ Card-based layout with 20px spacing
- ✅ Celebration-focused UX with immediate feedback
- ✅ Mobile-first responsive design

## Authentication Architecture
**Dual Authentication System** - Two separate auth providers working together:

### Replit Auth (Primary)
- Handles: Google, X/Twitter, Apple, Email authentication
- Endpoints: `/api/login`, `/api/callback`
- Session: Passport-based session management
- Visual: Standard Shadcn button styling

### Supabase Auth (Facebook Only)
- Handles: Facebook OAuth exclusively
- Endpoints: `/api/auth/supabase-sync` (backend sync)
- Session: Synced to Passport session via sync endpoint
- Visual: Blue background (`bg-[#1877F2]/10`) to indicate different provider
- Flow: `SocialLogin` → Supabase OAuth → `AuthCallback` → Backend sync → Session

### Integration Notes
- **Outlook Integration**: User dismissed the connector setup - will need manual calendar integration credentials if required in future
- **OpenAI Integration**: Active, using Claude as default for plan generation
- **Anthropic Integration**: Active, Claude API for conversational planning

## Recent Changes
- **October 5, 2025** (Latest):
  - ✅ **Fixed conversation confirmation bug**: "Yes" responses now properly trigger activity creation in Quick Plan and Smart Plan modes
  - ✅ Implemented early confirmation detection before context analysis to prevent "yes"/"no" from being flagged as low confidence
  - ✅ Confirmation, refinement, and "none" responses now handled immediately without going through ambiguous context analysis
  - ✅ **Fixed Progress Dashboard real-time updates**: Progress now updates instantly when tasks are completed, archived, skipped, or snoozed from ANY tab
  - ✅ Implemented staleTime: 0 with refetchOnMount: 'always' on progress query for immediate updates
  - ✅ All mutations (complete, skip, snooze, archive) now properly invalidate progress query
  - ✅ **Fixed task completion persistence across tabs**: Tasks now sync in real-time using React Query and useEffect
  - ✅ **Task progress persists everywhere**: Whether you complete tasks from the main page or activity/task tabs, progress is reflected everywhere
  - ✅ **Fixed activity tracker reset bug**: Plan output now persists when navigating between tabs
  - ✅ **Fixed icon duplication**: Integrations tab now uses Plug icon, About tab uses Info icon
  - ✅ Navigation preservation: Clicking "Your Activity" no longer clears the current plan
  - ✅ **Comprehensive mobile responsiveness overhaul**: All screens now work perfectly on iPhone and small devices
  - ✅ Fixed activity cards: Text wrapping, overflow prevention, responsive padding (p-4 sm:p-6)
  - ✅ Fixed TaskCard buttons: Now stack vertically on mobile (grid-cols-1 sm:grid-cols-2) preventing cramped buttons
  - ✅ Added responsive text sizes across all headings (text-base sm:text-lg, text-xl sm:text-2xl patterns)
  - ✅ Fixed filter controls: Stack properly on mobile with flex-wrap and responsive widths
  - ✅ Verified all task buttons work correctly: Complete, Skip, Snooze, Archive all functional
  - ✅ Mobile navigation: Already has responsive dropdown for small screens
  - ✅ **Fixed critical bug**: Task completion now works correctly - only completes individual tasks
  - ✅ **Time estimates added**: All activities and tasks now include prominent time estimates
  - ✅ Time estimates displayed near task headers (next to Complete button) with clock icon
  - ✅ AI now generates realistic time estimates (15 min - 4 hours) for every task
  - ✅ Overall activity timeframe shown in plan output
  - ✅ Fixed task ID synchronization when creating activities
- **October 4, 2025** (Evening):
  - ✅ Cleaned up VoiceInput placeholder text - simplified to "describe your goals"
  - ✅ Enhanced activity tracking on main page with prominent progress bar
  - ✅ Added visual activity progress card with emerald gradient when activity is created
  - ✅ Task completion with strikethrough and confetti celebration working on main page
  - ✅ Free-to-use features: All activity and task features work without sign-in on main page
- **October 4, 2025** (Evening):
  - ✅ Transformed "Lifestyle Planner" into responsive "Personal Journal" 
  - ✅ Created journal-style interface for capturing personal interests and preferences
  - ✅ Added 9 journal categories: Restaurants & Food, Movies & TV, Music, Books, Hobbies, Travel, Personal Style, Favorites, Personal Notes
  - ✅ Implemented auto-save functionality with backend persistence
  - ✅ Fully responsive design (mobile-first with sidebar navigation)
  - ✅ Journal data stored in user preferences JSONB field
  - ✅ Backend routes: PUT /api/user/journal for saving entries
  - ✅ Fixed "Your Activity" button persistence after refinements and session reloads
- **October 4, 2025** (Morning):
  - ✅ Implemented activity-first workflow - no automatic task creation
  - ✅ Plans now show preview-only data until "Create Activity" button clicked
  - ✅ All tasks created through activity creation (no orphan tasks)
  - ✅ Improved conversation refinement - context regenerates full plan
  - ✅ Create Activity button always visible (disabled after creation)
  - ✅ Single operation creates activity AND links all tasks
  - ✅ Refactored gap analyzer to use contextual intelligence instead of hardcoded patterns
  - ✅ Claude now understands flexible/uncertain responses through conversation context
  - ✅ Updated app icon and PWA manifest with proper dimensions (512x512, 180x180)
  - ✅ Added proper favicon, Apple touch icon, and theme color support
  - ✅ Integrated comprehensive lifestyle planning template across all domains
  - ✅ Added 6 new planning categories: Health & Fitness, Work Focus, Investment, Spiritual, Romance, Adventure
  - ✅ Enhanced plan output with timeframe-adaptive structure (day/week/month/year)
  - ✅ Improved plan formatting with Goals, Action Steps, Timing, Motivation, and Checkpoints sections
  - ✅ Fixed duplicate question bug - questions are tracked and never asked twice
  - ✅ Enhanced gap analyzer to recognize "no budget", "none", "flexible" as valid answers
  - ✅ Implemented intelligent inference - generates plan at 85%+ completion or when all required questions answered
  - ✅ Added fallback logic - if all questions asked, generates plan with available information
  - ✅ Updated app thumbnail/icon with new JournalMate logo (512x512 for web, 180x180 for iOS)
- **September 30, 2025**: 
  - ✅ Implemented dual authentication (Replit + Supabase for Facebook)
  - ✅ Fixed all API routes to use authenticated user IDs
  - ✅ Made Priorities tab fully functional with CRUD operations
  - ✅ Made Settings tab fully functional with preferences and notifications
  - ✅ Added `/api/auth/supabase-sync` endpoint for Facebook OAuth integration
  - ✅ Updated AuthCallback to sync Supabase users to backend
  - ✅ Visual distinction for Facebook button (blue background)
  - ✅ All features working with real user authentication

## User Preferences
- Wants fully functional authentication with Facebook support
- Requires separate Supabase-based Facebook OAuth (not Replit Auth)
- Needs Priorities and Settings tabs to be fully functional
- Values real user data persistence (no hardcoded demo users)
- Mobile-first design approach
- Clean, modern interface design
- Real AI integration (Claude/OpenAI)

## Future Enhancements
1. Add calendar integration for scheduling (Outlook integration available)
2. Implement push notifications for task reminders
3. Add chat history import/export features
4. Enhance AI context with user history and patterns
5. Add collaborative features for shared goals
6. Implement advanced analytics and insights