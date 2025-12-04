# JournalMate - AI-Powered Journaling Application

## Overview
JournalMate (journalmate.ai) is an AI-powered journaling application that transforms user intentions into actionable plans. It offers a mobile-first experience with features like swipeable task management, celebratory feedback, and comprehensive authentication. The application uses advanced AI for intelligent planning and personalized journaling, guiding users through goal setting, execution, and celebration, aiming to be a production-ready solution for personal development with a freemium revenue model.

## User Preferences
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

## System Architecture
The application features a mobile-first responsive design, utilizing a clean, card-based UI with a purple and emerald color scheme and the Inter font family, designed for immediate, celebration-focused feedback.

**Technical Stack:**
- **Frontend**: React, TypeScript, Tailwind CSS, Framer Motion, Wouter
- **Backend**: Express.js with Passport.js
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **AI Integration**: OpenAI and Claude API with automatic provider switching and cost optimization.
- **Authentication**: Dual system with Replit Auth (Google, X/Twitter, Apple, Email) and Supabase (Facebook OAuth), unified via Passport.js.
- **Mobile Application**: Capacitor-based native app for iOS and Android, with PWA support.

**Key Features:**
- **AI-Powered Planning**: Offers "Quick Plan" and "Smart Plan" modes with dynamic validation, zero hallucination enforcement, and context-aware completion. Includes URL content analysis and document parsing (PDF, DOCX, images, text files) for plan generation. AI generates 6-9 specific, actionable tasks with real details and prices.
- **Freemium Revenue Model**: Stripe-powered subscription system (Free, Pro, Family tiers).
- **Task Management**: Swipeable task cards, real-time progress dashboard, and automatic activity/task creation.
- **Personal Journal**: Interface with 9 categories, auto-save, and AI-driven categorization.
- **Social Sharing & Activity Management**: Customizable share previews, server-side OG meta tags, and an AI-powered "Privacy Shield". Includes content orchestration from various sources (URLs, documents, media) with transcription.
- **Community Plans Discovery**: Browse and copy plans from others with trending algorithms and category filters.
- **Groups & Collaborative Planning**: Group creation, member management, progress tracking, and activity feeds. New users signing up via a shared group link are guided through a fixed group join flow.
- **Authentication & User Management**: Unified authentication and functional profile management, including a user preference system for personalized plan generation based on saved content and location.
- **UI/UX**: Mobile-first, responsive, dark/light theme, adaptive layouts, and accessibility, with animations via React Confetti, React Spring, and Framer Motion.
- **PWA Features**: Service worker for offline functionality and install prompts.
- **Native Mobile Features**: Home screen widgets, calendar sync, biometric authentication, voice-to-text, Android inbound share, push notifications, haptic feedback, and iOS share extension support.
- **Content Extraction & Caching**: Utilizes Apify for reliable Instagram and TikTok content extraction, self-hosted direct extraction methods, and dynamic video frame extraction. Implements database caching for URL content to optimize costs and performance. Strict grounding rules are applied during plan generation to prevent AI hallucinations.

## External Dependencies
- **Replit Auth**: Google, X/Twitter, Apple, and Email authentication.
- **Supabase**: Facebook OAuth.
- **Stripe**: Payment processing and subscription management.
- **OpenAI API**: AI model integration (GPT-4o-mini, Whisper).
- **Tavily API**: Real-time web search and data enrichment, including advanced content extraction for various URLs.
- **Anthropic API**: Optional AI model integration (Claude, Claude Haiku).
- **DeepSeek**: Optional additional AI model support.
- **PostgreSQL (Neon)**: Cloud-hosted relational database.
- **Passport.js**: Authentication middleware.
- **Resend**: Email delivery service.
- **Apify**: Social media content scraping (Instagram, TikTok).
- **yt-dlp**: Video content extraction fallback.
- **capacitor-share-extension**: iOS share sheet integration.