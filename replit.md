# JournalMate - AI-Powered Journaling Application

## Overview
JournalMate (journalmate.ai) is an AI-powered journaling application designed to transform user intentions into actionable plans. It provides a mobile-first experience with features such as swipeable task management, celebratory feedback, and comprehensive authentication. The application leverages advanced AI for intelligent planning and personalized journaling, guiding users through goal setting, execution, and celebration, aiming to be a production-ready solution for personal development.

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
- **Animations**: React Confetti, React Spring, Framer Motion.
- **Mobile Application**: Capacitor-based native app for iOS and Android, with PWA support.

**Key Features:**
- **AI-Powered Planning**: Offers "Quick Plan" and "Smart Plan" modes with dynamic validation, zero hallucination enforcement, and context-aware completion. Includes URL content analysis and document parsing (PDF, DOCX, images, text files) for plan generation.
- **Freemium Revenue Model**: Stripe-powered subscription system (Free, Pro, Family tiers).
- **Task Management**: Swipeable task cards, real-time progress dashboard, and automatic activity/task creation, with AI generating concrete, actionable tasks.
- **Personal Journal**: Interface with 9 categories, auto-save, and AI-driven categorization.
- **Social Sharing & Activity Management**: Customizable share previews, server-side OG meta tags, and an AI-powered "Privacy Shield".
- **Community Plans Discovery**: Browse and copy plans from others with trending algorithms and category filters.
- **Groups & Collaborative Planning**: Group creation, member management, progress tracking, and activity feeds, including a fixed group join flow for new users.
- **Authentication & User Management**: Unified authentication and functional profile management.
- **UI/UX**: Mobile-first, responsive, dark/light theme, adaptive layouts, and accessibility.
- **PWA Features**: Service worker for offline functionality and install prompts.
- **Native Mobile Features**: Home screen widgets, calendar sync, biometric authentication, voice-to-text, Android inbound share, push notifications, and haptic feedback.

## External Dependencies
- **Replit Auth**: Google, X/Twitter, Apple, and Email authentication.
- **Supabase**: Facebook OAuth.
- **Stripe**: Payment processing and subscription management.
- **OpenAI API**: AI model integration.
- **Tavily API**: Real-time web search and data enrichment.
- **Anthropic API**: Optional AI model integration (Claude).
- **DeepSeek**: Optional additional AI model support.
- **PostgreSQL (Neon)**: Cloud-hosted relational database.
- **Passport.js**: Authentication middleware.
- **Resend**: Email delivery service.

## Latest Updates (December 3, 2025)

### Apify Integration for Social Media Content Extraction
- **Apify API Service**: Created `server/services/apifyService.ts` for reliable Instagram and TikTok extraction
- **Extraction Chain**: Apify → Direct extraction → yt-dlp → Tavily (with automatic failover)
- **Instagram Support**: Uses `instagram-scraper` and `instagram-reel-scraper` actors
- **TikTok Support**: Uses `clockworks~tiktok-scraper` with `novi~fast-tiktok-api` fallback
- **Integration Status Endpoint**: `/api/integrations/status` shows configuration of Apify, Tavily, OpenAI

### Improved Video Frame Extraction (Anti-Hallucination Fix)
- **Problem Identified**: Only first 5 frames captured (0-10s), missing content from rest of slideshow videos
- **Solution**: Dynamic frame distribution across entire video duration
  - Uses ffprobe to get video duration
  - Calculates 1 frame per 3 seconds (min 10, max 20 frames)
  - Extracts frames at evenly distributed timestamps throughout video
- **Music vs Narration Detection**: 
  - Analyzes transcription for music patterns (lyrics, repetition, rhyme)
  - Marks background music with `[Background Music - Not Narration]` prefix
  - 93% confidence detection for music-only audio
- **Smart OCR Deduplication**: 
  - Similarity-based comparison to remove near-duplicate frames
  - Keeps longer/more complete text when duplicates found
- **Results**: Lagos reel test - 16 frames, 12 unique OCR results, all 10 activities captured with locations and prices
- **Files Updated**: `socialMediaVideoService.ts`

## Previous Updates (December 2, 2025)

### Self-Hosted Direct Extraction (Cobalt-Style)
- **Instagram Direct Extraction**: No authentication required for public content
  - **Embed Page Extraction**: Parses `instagram.com/p/{id}/embed/captioned/` for video/image URLs
  - **GraphQL API Fallback**: Uses Instagram's internal GraphQL endpoint with proper headers
  - **Carousel Support**: Detects and processes multi-item posts (up to 10 items)
  - **Complete Content Layers**: Caption + Audio Transcript (Whisper) + OCR (GPT-4o-mini vision)
  - **Successfully Tested**: Extracted 301 words from Instagram reel including venues, locations, pricing
- **TikTok Direct Extraction**: Parses `__UNIVERSAL_DATA_FOR_REHYDRATION__` script tag
  - URL resolution to capture proper creator username
  - Photo slideshow support for image posts
  - Falls back to yt-dlp for unavailable/region-locked content
- **Fallback Chain**: Direct extraction → yt-dlp → Tavily text extraction
- **Technical Implementation**:
  - Custom headers mimicking real browser sessions
  - Instagram App ID: 936619743392459
  - Automatic cleanup of audio files in finally blocks
  - OCR with 'detail: high' for better text extraction from frames

### Supported Platforms
- **Instagram**: Reels, posts, carousels (embed page + GraphQL direct extraction)
- **TikTok**: Videos, photo slideshows (universal data parsing)
- **YouTube**: Full support via yt-dlp with audio transcription
- **Twitter/X, Facebook, Reddit**: Text extraction via Tavily fallback

### Previous Updates (December 1, 2025)

### Bug Fixes
- Fixed YouTube URL detection regex (`watch\?` instead of `watch/`)
- Fixed ES module compatibility in documentParser.ts (createRequire for pdf-parse)

## Updates (November 30, 2025)

### Multi-Source Content Orchestration with Video/Audio Transcription
- **OpenAI Whisper Integration**: Video and audio files (MP4, MOV, WebM, M4A, WAV, MP3) now transcribed via OpenAI Whisper API
- **Technical Implementation**: 
  - Uses `OpenAI.toFile(fs.createReadStream(filePath), fileName, { contentType: mimeType })` for proper MIME handling
  - 25MB file size limit (Whisper requirement)
  - Automatic file cleanup in try/finally blocks
- **Content Orchestrator Service**: New service combining URLs, documents, and media into unified planning context
- **API Endpoint**: `/api/planner/orchestrate-sources` accepts multiple source types in single request
- **Frontend Support**: ConversationalPlanner now accepts video/audio uploads with visual feedback
- **Use Case**: Combine PDF itinerary + social media posts + voice memos into coherent action plans

### Enhanced Creative Planning with Destination Anchoring
- **Changed Approach**: Use post as baseline, be creative with similar recommendations
- **Key Features**:
  - AI keeps destination/location from content (Marrakech stays Marrakech)
  - Uses mentioned venues as anchors (Comptoir Darna, Royal Mansour, Nommos)
  - Recommends SIMILAR venues in same location with researched prices
  - Skips people references (not useful for actionable tasks)
  - Includes budget breakdowns and tiered pricing options
  - Generates clarifying questions about budget/preferences
- **Result**: Plans are creative yet grounded in the correct destination with specific, researched pricing for both mentioned and similar alternatives

### Conversational Flow for URL Curated Questions
- Replaced popup dialog with conversational chat format for URL/document analysis questions
- Questions now appear as chat messages with proper markdown formatting
- Users answer questions in the natural chat flow, not in modal dialogs
- Applies to Quick Plan and Smart Plan modes when URLs or documents are detected
- Improved user experience with seamless conversational interactions

### Enhanced AI Task Generation (6-9 Tasks with Specific Details)
- Updated all AI prompts to generate 6-9 actionable tasks (occasionally 5 for simple goals)
- Tasks now include SPECIFIC details: real prices, named recommendations, concrete quantities
- Forbidden vague patterns: "Research prices", "Look into options", "Set a budget"
- Required specific patterns: "$300/person for flights", "Hotel du Petit Moulin ($150/night)"
- Updated prompts in: aiService.ts, directPlanGenerator.ts, simpleConversationalPlanner.ts

### View Activity Button After Plan Creation
- ConversationalPlanner shows "View Activity" button linking directly to created activity
- Navigation pattern: setLocation('/?tab=activities&activity=${activityId}')

## Previous Updates (November 29, 2025)
- ✅ **Group Join Flow for New Users Fixed**:
  - New users now see "Join Group?" dialog immediately after signing up from shared group plan link
  - Fixed handleSignIn() to save group join intent to localStorage before redirecting to login
  - Auto-copy effect now properly handles undecided state and shows dialog
  - Complete flow tested and verified: share link → sign up → return → see dialog → join group

- ✅ **URL Detection in Create Action Plan Enhanced**:
  - Now detects URLs within text (e.g., "create plan for https://example.com")
  - Fetches content from URLs and uses it for plan generation
  - Strong prompt guidance to generate actionable tasks FROM content, not meta-tasks
  - Forbidden patterns: "Access the URL", "Navigate to link", "Read content"
  - Correct patterns: "Implement X", "Create Y", "Set up Z" (based on actual content)

- ✅ **Tavily Extract Integration for All Planning Modes**:
  - Quick Plan, Smart Plan, and Create Action Plan now all use Tavily Extract API
  - Uses `extractDepth: "advanced"` to handle JavaScript-rendered pages (Copilot shares, SPAs, Google Docs)
  - Fallback chain: Tavily Extract → basic fetch → error handling
  - Content limit increased to 15,000 characters for richer context
  - Endpoint: `/api/parse-url` now uses Tavily with fallback