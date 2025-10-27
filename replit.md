# IntentAI - AI-Powered Journaling Application

### Overview
IntentAI is an AI-powered journaling application designed to transform user intentions into actionable plans. It provides a mobile-first experience with features like swipeable task management, celebratory feedback, and comprehensive authentication. The application aims to be a lifestyle planner that guides users through setting, executing, and celebrating their goals, integrating advanced AI for intelligent planning and personalized journaling.

### User Preferences
- Wants fully functional authentication with Facebook support
- Requires separate Supabase-based Facebook OAuth (not Replit Auth)
- Needs Priorities and Settings tabs to be fully functional
- Values real user data persistence (no hardcoded demo users)
- Mobile-first design approach
- Clean, modern interface design
- Real AI integration (Claude/OpenAI)

### System Architecture
The application employs a mobile-first responsive design featuring a clean, card-based UI with a purple and emerald color scheme and the Inter font family, providing immediate, celebration-focused feedback.

**Technical Stack:**
- **Frontend**: React, TypeScript, Tailwind CSS, Framer Motion, Wouter
- **Backend**: Express.js with Passport.js
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **AI Integration**: OpenAI and Claude API with automatic provider switching and cost optimization.
- **Authentication**: Dual system with Replit Auth (Google, X/Twitter, Apple, Email) and Supabase (Facebook OAuth), unified via Passport.js.
- **Animations**: React Confetti, React Spring, Framer Motion.
- **Mobile Application**: React Native/Expo app for iOS and Android, located in the `mobile/` folder.

**Core Features:**
- **AI-Powered Planning**: 
  - **Quick Plan (5-question flow)**: Streamlined planning in 3 turns - Batch 1 asks 3 questions (origin, destination, duration), Batch 2 asks 2 more (budget, occasion), then shows preview with real-time data. Features automatic safety checks for travel (hurricanes, advisories), strict override detection to prevent accidental skips, and user can override at any point by saying "create plan".
  - **Smart Plan (10-question flow)**: Comprehensive planning with detailed research, real-time data enrichment, and 3-batch question flow.
  - Both modes feature dynamic validation, progress tracking, zero hallucination enforcement, context-aware completion, enhanced task generation, and domain-agnostic question prioritization (not hardcoded).
- **Task Management**: Swipeable task cards, YouTube-style feedback, real-time progress dashboard with streaks and analytics, search/filter, and automatic activity/task creation upon plan confirmation.
- **Personal Journal**: Interface with 9 categories, auto-save, and backend persistence. Includes a "Journal Mode" for smart capture of text and media (photos/videos), with AI-driven categorization and enrichment.
- **Social Sharing & Activity Management**: Customizable share previews, NYC-themed backdrops, custom images, and an AI-powered "Privacy Shield" for PII/PHI redaction. Includes automatic activity copying for visitors, duplicate detection with an update system, and activity history/archiving.
- **Community Plans Discovery**: Users can browse and copy plans from others, featuring trending algorithms, category filters, and one-click "Use This Plan" functionality.
- **Groups & Collaborative Planning**: Basic group creation and viewing. Future features include contributor change proposals, admin approval queues, real-time change logs, and personal vs. canonical versions with conflict resolution.
- **Authentication & User Management**: Unified authentication, functional profile management (Priorities & Settings), and access control.
- **UI/UX**: Mobile-first, responsive, dark/light theme toggle, adaptive layouts, and accessibility.
- **SEO**: About tab optimized with relevant keywords.

### External Dependencies
- **Replit Auth**: For Google, X/Twitter, Apple, and Email authentication.
- **Supabase**: Specifically for Facebook OAuth.
- **OpenAI API**: For AI model integration (e.g., GPT-4o-mini).
- **Anthropic API**: For AI model integration (e.g., Claude Sonnet-4).
- **DeepSeek**: For additional AI model support.
- **PostgreSQL (Neon)**: Cloud-hosted relational database.
- **Passport.js**: Authentication middleware.
- **Resend**: Email delivery service for transactional emails.