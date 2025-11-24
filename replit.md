# JournalMate - AI-Powered Journaling Application

### Overview
JournalMate (journalmate.ai) is an AI-powered journaling application designed to transform user intentions into actionable plans. It provides a mobile-first experience with features like swipeable task management, celebratory feedback, and comprehensive authentication. The application aims to be a lifestyle planner that guides users through setting, executing, and celebrating their goals, integrating advanced AI for intelligent planning and personalized journaling.

### User Preferences
- Wants fully functional authentication with Facebook support
- Requires separate Supabase-based Facebook OAuth (not Replit Auth)
- Needs Priorities and Settings tabs to be fully functional
- Values real user data persistence (no hardcoded demo users)
- Mobile-first design approach
- Clean, modern interface design
- Real AI integration (Claude/OpenAI)
- Welcome emails working for OAuth users
- Group invite codes generating and displaying
- App production-ready for deployment

### Data Persistence & Demo User Behavior
**Demo User (Unauthenticated Users):**
- Demo user data is stored in the PostgreSQL database with a persistent `DEMO_USER_ID = "demo-user"`
- **Most features** (activities, tasks, journal entries, feedback) persist indefinitely across browser sessions and page refreshes
- **Planner sessions only** use session-scoped IDs (getDemoUserId) to prevent state collision between different browser tabs/windows
- **Expected Behavior**: Demo activity/task/journal data persists indefinitely until manually cleared via database cleanup
- **Production Note**: Demo user data can be periodically cleaned up via scheduled jobs if needed
- **Limitation**: All unauthenticated users share the same demo data, which may cause confusion in multi-user scenarios

**Authenticated Users:**
- All user data persists permanently in the PostgreSQL database
- Each user has a unique ID from their authentication provider (Google, Facebook, X/Twitter, Apple, Email)
- Data includes: journal entries, activities, tasks, custom categories, feedback, preferences, and planner sessions
- Data syncs across all devices when logged in
- Each user's data is completely isolated from other users

### System Architecture
The application employs a mobile-first responsive design featuring a clean, card-based UI with a purple and emerald color scheme and the Inter font family, providing immediate, celebration-focused feedback.

**Technical Stack:**
- **Frontend**: React, TypeScript, Tailwind CSS, Framer Motion, Wouter
- **Backend**: Express.js with Passport.js
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **AI Integration**: OpenAI and Claude API with automatic provider switching and cost optimization.
- **Authentication**: Dual system with Replit Auth (Google, X/Twitter, Apple, Email) and Supabase (Facebook OAuth), unified via Passport.js.
- **Animations**: React Confetti, React Spring, Framer Motion.
- **Mobile Application**: Capacitor-based native app wrapping the React web app for iOS and Android, with PWA support for Chrome install prompts.

**Native Mobile Features:**
- **Home Screen Widgets**: Display today's tasks and streak count directly on device home screen
  - Android: Kotlin widget provider with live task updates
  - iOS: SwiftUI widget extension with App Groups data sharing
  - Widget API endpoint: `GET /api/tasks/widget`
  - Auto-refresh every 15-30 minutes
  - Quick deep-links to journal creation
- **Calendar Sync & Reminders**: Add tasks/activities to device calendar with multiple reminders
- **Biometric Authentication**: Face ID, Touch ID, or fingerprint unlock
- **Voice-to-Text Input**: Speech recognition for quick journal entries
- **Android Inbound Share**: Receive shares from other apps (texts, images, URLs)
- **Push Notifications**: Backend infrastructure with device token management
- **Haptic Feedback**: Task-specific haptic patterns

**Core Features:**
- **AI-Powered Planning**: 
  - **Quick Plan (5-question flow)**: Streamlined planning in 3 turns - Batch 1 asks 3 questions (origin, destination, duration), Batch 2 asks 2 more (budget, occasion), then shows preview with real-time data. Features automatic safety checks for travel (hurricanes, advisories), strict override detection to prevent accidental skips, and user can override at any point by saying "create plan".
  - **Smart Plan (10-question flow)**: Comprehensive planning with detailed research, real-time data enrichment, and 3-batch question flow.
  - Both modes feature dynamic validation, progress tracking, zero hallucination enforcement, context-aware completion, enhanced task generation, and domain-agnostic question prioritization (not hardcoded).
- **Freemium Revenue Model**: Stripe-powered subscription system with three tiers:
  - **Free**: 5 AI plans/month + unlimited real-time data enrichment (weather, safety, events)
  - **Pro** ($6.99/mo): Unlimited AI plans, smart favorites, journal insights, export, 7-day trial
  - **Family** ($14.99/mo): Everything in Pro + up to 5 users, collaborative planning, 7-day trial
  - Annual plans available with 30% discount. Plan usage tracking with automatic monthly reset.
- **Task Management**: Swipeable task cards, YouTube-style feedback, real-time progress dashboard with streaks and analytics, search/filter, and automatic activity/task creation upon plan confirmation.
- **Personal Journal**: Interface with 9 categories, auto-save, and backend persistence. Includes a "Journal Mode" for smart capture of text and media (photos/videos), with AI-driven categorization and enrichment.
- **Social Sharing & Activity Management**: 
  - Customizable share previews with beautiful JPG images (1200x630px)
  - Server-side OG meta tag injection for social media crawlers (WhatsApp, Facebook, Twitter, LinkedIn) - ensures rich link previews without JavaScript
  - NYC-themed backdrops, custom images, and an AI-powered "Privacy Shield" for PII/PHI redaction
  - Automatic activity copying for visitors, duplicate detection with an update system, and activity history/archiving
  - When users share links on WhatsApp/social platforms, recipients see: activity image + title + description + task progress
- **Community Plans Discovery**: Users can browse and copy plans from others, featuring trending algorithms, category filters, and one-click "Use This Plan" functionality.
- **Groups & Collaborative Planning**: Comprehensive group features including:
  - Group creation, viewing, and member management
  - Progress tracking showing tasks completed/total across all group activities
  - Activity feed displaying member actions (task completions, additions, shares)
  - Ability to share both community plans and personal activities to groups
  - User-friendly error handling with confirmation dialogs
  - Future features: contributor change proposals, admin approval queues, real-time change logs, and personal vs. canonical versions with conflict resolution.
- **Authentication & User Management**: Unified authentication, functional profile management (Priorities & Settings), and access control.
- **UI/UX**: Mobile-first, responsive, dark/light theme toggle, adaptive layouts, and accessibility.
- **PWA Features**: Service worker for offline functionality, install prompts in Chrome, app-like experience on mobile browsers.
- **SEO**: About tab optimized with relevant keywords.

### External Dependencies
- **Replit Auth**: For Google, X/Twitter, Apple, and Email authentication.
- **Supabase**: Specifically for Facebook OAuth.
- **Stripe**: Payment processing and subscription management. **Required** for Pro/Family tiers.
- **OpenAI API**: For AI model integration (e.g., GPT-4o-mini, GPT-4o). **Required** for planning features.
- **Tavily API**: For real-time web search and data enrichment. **Required** for travel safety, weather, and real-time data.
- **Anthropic API**: For AI model integration (e.g., Claude Sonnet-4, Claude Haiku). Optional.
- **DeepSeek**: For additional AI model support. Optional.
- **PostgreSQL (Neon)**: Cloud-hosted relational database.
- **Passport.js**: Authentication middleware.
- **Resend**: Email delivery service for transactional emails.

### Latest Updates (November 24, 2025)
- ✅ Fixed invite code display issue - all groups now show proper invite codes (NYC-TGV-PLAN, etc.)
- ✅ Enhanced email system - modified admin endpoint to support excluding specific users
- ✅ Sent welcome emails to 2 OAuth users (excluded: tanarunodennis@gmail.com, dennistanaruno@gmail.com)
- ✅ **CRITICAL Stripe webhook & backfill fixes** for production-ready deployment:
  - Added `getUserByStripeSubscriptionId()` and `getUserByStripeCustomerId()` storage methods with indexed queries
  - Webhooks now work even when Stripe metadata is missing - fallback to subscription/customer ID lookups
  - All checkout/subscription events store BOTH stripeSubscriptionId AND stripeCustomerId atomically
  - Derives subscription tier from price IDs (VITE_STRIPE_PRICE_PRO_MONTHLY, etc.) when metadata is absent
  - Uses atomic database updates (`storage.updateUser()`) to prevent race conditions
  - Fixes critical bug where Pro users appeared as "Free" due to missing tier updates
  - **New:** `/api/admin/backfill-stripe-ids` endpoint repairs broken Pro users:
    - Queries ALL Stripe subscriptions and matches by email
    - Smart matching: existing subscription ID → customer ID → first active subscription (if exactly 1)
    - Updates stale/missing stripeCustomerId and stripeSubscriptionId
    - Fixes users showing as Pro but can't access Stripe portal
    - **Safety features**: Only processes Pro/Family users, skips accounts with complete IDs, requires 1-to-1 subscription match
    - **Known limitations**: 
      - Multiple subscriptions per email flagged for manual review (common in family plans or personal+family scenarios)
      - Email whitespace differences may prevent matches (store `trim()+toLowerCase()` for both sides)
      - Only matches `active` or `trialing` subscriptions (excludes `past_due`, `incomplete` which may need portal access)
      - Production usage: Run after deployment, review warnings in response, manually fix ambiguous cases
- ✅ **Profile image upload fix** for OAuth users:
  - Upload button now always shows (was hidden if image already existed)
  - Button text dynamically changes: "Upload" when empty, "Change" when image exists
  - OAuth users (Google, Facebook, X/Twitter, Apple) can now change their auto-populated profile images
- ✅ App verified production-ready: All 160+ API endpoints operational, authentication active, database connected

### Production Deployment
**Important**: API keys configured in development are **separate from production secrets**.

To deploy to production:
1. **Configure Production Secrets** (see `PRODUCTION_DEPLOYMENT.md` for detailed guide):
   - `OPENAI_API_KEY` - Required for AI planning
   - `TAVILY_API_KEY` - Required for real-time data enrichment
   - `STRIPE_SECRET_KEY` - Required for subscription billing
   - `VITE_STRIPE_PUBLIC_KEY` - Required for checkout flow
   - `ANTHROPIC_API_KEY` - Optional for Claude models
   - `DEEPSEEK_API_KEY` - Optional for DeepSeek models
   
2. **Configure Stripe Products** (see `REVENUE_SYSTEM.md`):
   - Create Pro and Family plans in Stripe Dashboard
   - Set up webhook endpoint for subscription events
   - Configure price IDs in production environment
   
3. **Database**: Automatically configured by Replit (Neon PostgreSQL)

4. **Deploy**: Click "Deploy" button in Replit workspace

5. **Seed Community Plans** (One-time setup after first deployment):
   - Set `ADMIN_SECRET` environment variable in production (use a strong random value)
   - Community plan backdrop images deploy automatically with code (located in `client/public/community-backdrops/`)
   - After deployment, call the admin endpoint to populate 25 curated community plans:
     ```bash
     curl -X POST https://your-app.replit.app/api/admin/seed-community-plans \
       -H "Content-Type: application/json" \
       -d '{"adminSecret": "YOUR_ADMIN_SECRET_VALUE"}'
     ```
   - To force re-seed (delete and recreate all plans):
     ```bash
     curl -X POST https://your-app.replit.app/api/admin/seed-community-plans \
       -H "Content-Type: application/json" \
       -d '{"adminSecret": "YOUR_ADMIN_SECRET_VALUE", "force": true}'
     ```
   - Verify in the Discover Plans section - you should see 25 community plans with backdrop images

6. **Send Retroactive Welcome Emails** (Optional - for existing OAuth users):
   - If you have existing OAuth users who signed up before welcome emails were implemented, send them retroactive welcome emails:
     ```bash
     curl -X POST https://your-app.replit.app/api/admin/send-oauth-welcome-emails \
       -H "Content-Type: application/json" \
       -d '{"adminSecret": "YOUR_ADMIN_SECRET_VALUE"}'
     ```
   - This will send welcome emails to all OAuth users (Google, Facebook, X/Twitter, Apple) who have email addresses
   - Note: New OAuth users automatically receive welcome emails upon signup

### Admin Endpoints
The following admin endpoints are available for testing and maintenance (require `ADMIN_SECRET` authentication):

- **Delete User Account** (for testing welcome emails):
  ```bash
  curl -X DELETE https://your-app.replit.app/api/admin/delete-user \
    -H "Content-Type: application/json" \
    -d '{"adminSecret": "YOUR_ADMIN_SECRET_VALUE", "email": "user@example.com"}'
  ```
  Completely removes a user and all associated data (auth identities, activities, tasks, journal entries, etc.). Useful for testing welcome email functionality.

See **PRODUCTION_DEPLOYMENT.md** for deployment instructions, **REVENUE_SYSTEM.md** for monetization setup, and **ANDROID_BUILD_GUIDE.md** for building the Android app.