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
- **Task Management**: Swipeable task cards with completion/skip actions, real-time progress dashboard with streaks and analytics, task lists with search/filter, and automatic activity/task creation upon plan confirmation.
- **Personal Journal**: A dedicated journal interface with 9 categories for capturing personal interests, featuring auto-save and backend persistence.
- **Social Sharing**: Activities can be shared with customizable preview dialog. Users can edit share title, choose from NYC-themed backdrop presets, upload custom images (max 5MB), or enter custom image URLs. Live preview shows exactly how shared activities will appear before sharing. Privacy controls allow toggling between public/private status.
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