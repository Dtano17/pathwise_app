# JournalMate - AI-Powered Journaling Application

## Overview
JournalMate (journalmate.ai) is an AI-powered journaling application that transforms user intentions into actionable plans. It offers a mobile-first experience with features like swipeable task management, celebratory feedback, and comprehensive authentication. The application uses advanced AI for intelligent planning and personalized journaling, guiding users through goal setting, execution, and celebration, aiming to be a production-ready solution for personal development with a freemium revenue model.

## User Preferences
- **Simplified authentication**: Email and Google sign-in only (removed Facebook/Twitter/Apple)
- Needs Priorities and Settings tabs to be fully functional
- Values real user data persistence (no hardcoded demo users)
- Mobile-first design approach
- **Liquid Glass UI**: Modern frosted glass aesthetic (iOS 26-style) on both iOS and Android
- Real AI integration (Claude/OpenAI)
- Welcome emails working for OAuth users
- Group invite codes generating and displaying
- **Journal-first workflow**: Share content → Auto-journal → Plan → Experience → Review → Repeat
- App production-ready for deployment

## System Architecture
The application features a mobile-first responsive design with **Liquid Glass UI** - a frosted glass aesthetic inspired by iOS 26. Uses backdrop-blur, translucent backgrounds, and subtle shadows for a modern, premium look on both iOS and Android.

**Design System:**
- **Liquid Glass**: CSS utilities in index.css (.glass, .glass-strong, .glass-subtle, .glass-card, .glass-nav, .glass-modal, .glass-button)
- **Color scheme**: Purple and emerald gradients with high-contrast text
- **Typography**: Inter font family
- **Effects**: backdrop-blur-xl, backdrop-saturate, subtle inner shadows for depth

**Technical Stack:**
- **Frontend**: React, TypeScript, Tailwind CSS, Framer Motion, Wouter
- **Backend**: Express.js with Passport.js
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **AI Integration**: OpenAI and Claude API with automatic provider switching and cost optimization.
- **Authentication**: Email + Google sign-in via Replit Auth/Passport.js (simplified from previous multi-provider setup)
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
- **Device Location Permission**: Cross-platform location tracking for personalized plan recommendations. Features:
  - Web Geolocation API and Capacitor Geolocation for mobile
  - Reverse geocoding via OpenStreetMap Nominatim (free, no API key required)
  - User profile integration with enable/disable controls
  - Robust error handling for denied permissions and insecure contexts
  - API endpoints: GET/PUT /api/user/location
- **Content Extraction & Caching**: Utilizes Apify for reliable Instagram and TikTok content extraction, self-hosted direct extraction methods, and dynamic video frame extraction. Implements database caching for URL content to optimize costs and performance. Strict grounding rules are applied during plan generation to prevent AI hallucinations.
- **Auto-Journaling from Social Media**: When content is shared from social media platforms (Instagram, TikTok, YouTube, Twitter/X, Facebook, Reddit), entries are automatically created in the Personal Journal with:
  - Smart category mapping (e.g., food_dining → restaurants, travel_adventure → travel, entertainment → movies)
  - Enriched content from url_content_cache (thumbnails, extracted descriptions)
  - Normalized URL duplicate prevention to avoid duplicate entries
  - Both normalized and original URLs stored for reliable matching
  - Slot reservation pattern: reserves journal slot before database write to minimize race conditions
  - Journal data stored in user preferences under `preferences.journalData`
- **Smart Reminder System**: Background processor running on 5-minute intervals that schedules and dispatches intelligent reminders for upcoming activities. Features:
  - Automatic scheduling at strategic times (1 week, 3 days, 1 day, morning-of)
  - Weather-enriched notifications using Open-Meteo API (free, no API key required)
  - Respects user quiet hours and notification preferences
  - Contextual enrichment with local tips via Tavily
  - Idempotent reminder scheduling (safe to reschedule when dates change)
  - API endpoints: GET/POST/DELETE /api/reminders/activities/:activityId

## External Dependencies
- **Replit Auth**: Email and Google authentication (simplified from multi-provider).
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
- **Open-Meteo**: Free weather API for forecast data (no API key required, 1M calls/month free).