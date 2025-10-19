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
- **AI-Powered Planning**: Features "Smart Plan" (comprehensive information gathering) and "Quick Plan" (rapid task generation) modes, utilizing LangGraph for conversation state and multi-LLM support. Includes conversation-aware classification, confidence decay for domain switching, conversation-wide slot extraction (prevents redundant questions), and automatic fallback between AI providers.
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