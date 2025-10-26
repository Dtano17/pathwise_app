# IntentAI - AI-Powered Journaling Application

## Overview
IntentAI is a mobile-first AI-powered journaling application designed to transform user intentions into actionable plans. It features swipeable task management, celebratory feedback, and comprehensive authentication. The application aims to provide a lifestyle planner that guides users through planning, execution, and celebration of their goals.

## User Preferences
- Wants fully functional authentication with Facebook support
- Requires separate Supabase-based Facebook OAuth (not Replit Auth)
- Needs Priorities and Settings tabs to be fully functional
- Values real user data persistence (no hardcoded demo users)
- Mobile-first design approach
- Clean, modern interface design
- Real AI integration (Claude/OpenAI)

## System Architecture
The application employs a mobile-first responsive design with a clean, card-based UI featuring a purple and emerald color scheme and the Inter font family. It provides immediate, celebration-focused feedback.

**Technical Stack:**
- **Frontend**: React, TypeScript, Tailwind CSS, Framer Motion, Wouter
- **Backend**: Express.js with Passport.js
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **AI Integration**: Supports OpenAI and Claude API, with automatic provider switching and cost optimization (cheaper models for classification, premium for synthesis). LangGraph is used for state management in conversation flows.
- **Authentication**: A dual system integrates Replit Auth (Google, X/Twitter, Apple, Email) and Supabase (Facebook OAuth). User sessions are unified and managed via Passport.js.
- **Animations**: React Confetti, React Spring, Framer Motion for celebratory effects.

**Core Features & Implementations:**
- **AI-Powered Planning**: Features "Smart Plan" (comprehensive with web search) and "Quick Plan" (streamlined) modes with intelligent conversational planning. **Recent Improvements (Oct 2025):**
  - ✅ **LangGraph-free architecture**: Quick/Smart modes now use lightweight conversational planner (simpleConversationalPlanner.ts) for better performance and maintainability
  - ✅ **Dynamic essential-field validation**: Backend validates 5 required fields per domain (travel, events, wellness, learning, social, entertainment, work, shopping, dining) before allowing plan generation
  - ✅ **Real-time progress tracking**: UI displays "Progress: 3/5 (60%)" showing exactly how many essentials gathered, calculated dynamically per domain
  - ✅ **Zero hallucination enforcement**: Strict prompt rules + backend validation prevent AI from inventing dates, budgets, or other data not explicitly stated by user
  - ✅ **Smart context-aware completion**: AI intelligently determines when it has enough info (no rigid question minimums), asking follow-ups only for missing essentials
  - ✅ **Friendly, emoji-rich tone**: Warm conversational style with natural emoji usage (🌍, ✨, 🎯, 💰) - more enthusiastic in Smart mode, concise in Quick mode
  - ✅ **Web search in Smart mode**: Anthropic provider with web_search tool for real-time weather forecasts, prices, availability, and current events
  - ✅ **Session management fixes (Oct 26, 2025)**: Fresh sessions always created for new conversations, completed sessions cannot be continued, validation prevents edge cases where frontend has history but backend session was completed
  - ✅ **Premature plan generation prevention (Oct 26, 2025)**: Backend strips plan content when AI generates before minimum question count reached (5 for Quick, 10 for Smart), ensuring proper batched question flow
  - Multi-LLM support with automatic fallback between OpenAI/Claude providers
- **Task Management**: Swipeable task cards with completion/skip actions, YouTube-style task feedback (thumbs up/down with filled icons and counters), real-time progress dashboard with streaks and analytics, task lists with search/filter, and automatic activity/task creation upon plan confirmation.
- **Personal Journal**: A dedicated journal interface with 9 categories for capturing personal interests, featuring auto-save and backend persistence. **NEW: Journal Mode** - Smart journal capture system that allows users to type minimal text with keywords (like @restaurants, @travel, @music) and upload photos/videos. AI automatically detects category from keywords and natural language, stores media in organized galleries, and enriches entries with structured data.
- **Journal Mode Architecture**:
  - Media upload system with multer (supports images: JPG/PNG/GIF, videos: MP4/MOV/AVI, max 10MB)
  - Keyword-to-category mapping (@restaurants → Restaurants & Food, @travel → Travel & Places, etc.)
  - AI confidence scoring for automatic categorization
  - JSONB-based storage with media URLs, timestamps, keywords, and AI metadata
  - File storage in `attached_assets/journal_media/`
  - API endpoints: POST `/api/journal/upload` (media), POST `/api/journal/smart-entry` (AI entry creation)
- **Social Sharing & Activity Management**: Activities can be shared with customizable preview dialog. Users can edit share title, choose from NYC-themed backdrop presets, upload custom images (max 5MB), or enter custom image URLs. **Privacy Shield** provides customizable AI-powered PII/PHI redaction with three presets: Public Creator (minimal redaction for influencers), Privacy-First (maximum protection), and Custom (granular control). Side-by-side preview shows original vs. protected content. AI automatically redacts names, locations, contact info, dates, and personal context as selected. Live preview shows exactly how shared activities will appear before sharing. 
  - **Automatic Activity Copy Workflow**: When visitors view a shared activity, they see "Sign in to edit this activity and make it yours" with JournalMate branding. Upon login, the OAuth callback redirects back to the share page with `auth=success` parameter, triggering automatic activity copy. The activity is instantly copied to their account with all tasks (using `originalTaskId` for reliable task matching), and they're redirected to `/?activity={id}&tab=tasks` - no manual copy button needed.
  - **Duplicate Detection & Update System**: When copying a shared activity that the user already has, they're prompted with an "Update Plan" dialog. If they choose to update, the old version is automatically archived to History, completed task progress is preserved (matched by title), and a success message confirms the update with preserved completion count.
  - **Activity History/Archive**: Previous versions of updated activities are moved to History (API endpoint: GET `/api/activities/history`). Database tracking includes `copiedFromShareToken` field to identify duplicates and `isArchived` flag for history management.
  - **Task Progress Preservation**: When updating an existing activity, tasks are matched by title and their completion status is preserved, so users don't lose their progress. The system displays how many completed tasks were preserved.
  - **Privacy Shield Architecture**:
    - Frontend UI in SharePreviewDialog with preset selector (Off, Public Creator, Privacy-First, Custom)
    - Custom mode provides granular checkboxes for redacting names, locations, contact info, dates, and personal context
    - Side-by-side preview showing original vs. AI-redacted content
    - Loading spinner during AI privacy scan
    - Backend endpoint: POST `/api/activities/:activityId/privacy-scan` with JSON validation and error handling
    - AI-powered redaction using configurable LLM provider (OpenAI/Claude)
    - Security: 502 error on malformed AI responses, validated JSON structure
  - API endpoints: POST `/api/activities/copy/:shareToken` (with `forceUpdate` parameter for updates), GET `/api/activities/history` (archived activities), POST `/api/activities/:activityId/privacy-scan` (AI privacy scanner)
- **Community Plans Discovery**: Users can browse and instantly copy plans created by others. Features trending algorithm based on views + likes, category filters (Travel, Fitness, Events, Career, Home), and one-click "Use This Plan" copying. Community metrics tracked include viewCount, likeCount, trendingScore, featuredInCommunity status, and creator attribution. Demo plans automatically seed on first visit with high-quality stock images. Accessible at `/discover` route.
  - API endpoints: GET `/api/community-plans?category=&search=&limit=` (filtered discovery), POST `/api/admin/seed-community-plans` (demo data), POST `/api/activities/:activityId/increment-views` (view tracking)
- **Groups & Collaborative Planning**:
  - **Phase 1 (Current)**: Basic group creation and viewing with "Preview Mode" badge. Users can create groups when sharing activities, view their groups (admin/member badges), and see group activity cards. Groups tab includes placeholder messaging about Phase 2 features.
  - **Phase 2 (Future - Documented for Development)**:
    - **Contributor Change Proposals**: Group members can propose changes to group activities without directly editing the canonical version. Proposals are submitted as diffs/change requests with descriptions.
    - **Admin Approval Queue**: Group admins see a queue of pending change proposals with approve/reject actions. Admins can review proposed changes side-by-side with current version before approving.
    - **Real-Time Change Log**: Activity feed shows "Sarah updated the hiking time" or "Mike added new restaurant task" with timestamps. WebSocket-based notifications ensure all members see changes instantly.
    - **Personal vs. Canonical Versions**: Each member maintains a personal copy of the group activity that can be customized independently. The canonical version (controlled by admin) serves as the source of truth and reference point. Members can sync their personal version with latest canonical updates.
    - **WebSocket Notifications**: Real-time push notifications when changes are proposed, approved, or rejected. Notifications include change summaries and links to affected activities.
    - **Conflict Resolution**: When personal and canonical versions diverge, system provides merge/override options with visual diff comparisons.
  - Database schema: `groups` (name, description, createdBy, isPrivate, inviteCode), `groupMemberships` (groupId, userId, role), `groupActivities` (groupId, activityId, canonicalVersion, shareToken)
  - API endpoints: POST `/api/groups` (create group), POST `/api/groups/:groupId/members` (add member), GET `/api/groups/:groupId/activities` (group activities)
- **Authentication & User Management**: Dual authentication system (Replit Auth + Supabase for Facebook) with unified session management, functional profile management (Priorities & Settings), and access control for premium features.
- **UI/UX**: Mobile-first responsive design across all screens, dark/light theme toggle, adaptive layouts, and comprehensive accessibility features.
- **SEO**: About tab is public and optimized with keywords like "AI planner," "smart goal tracker," and "task manager."

## External Dependencies
- **Replit Auth**: For Google, X/Twitter, Apple, and Email authentication.
- **Supabase**: Specifically for Facebook OAuth.
- **OpenAI API**: For AI model integration (GPT-4o-mini).
- **Anthropic API**: For AI model integration (Claude Sonnet-4).
- **DeepSeek**: For additional AI model support.
- **PostgreSQL (Neon)**: Cloud-hosted relational database.
- **Passport.js**: Authentication middleware for Node.js.