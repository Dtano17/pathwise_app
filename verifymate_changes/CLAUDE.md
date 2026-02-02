# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**VerifyMate** - "Verify before you trust"

An AI-powered fact-checking and verification app that helps users:
- Verify claims in social media posts
- Check if businesses are legitimate
- Detect AI-generated content
- Analyze account authenticity

**Website**: https://verifymate.ai
**App ID**: ai.verifymate.app

## Project Commands

```bash
npm run dev          # Development server (tsx + Vite HMR)
npm run build        # Production build (Vite + esbuild)
npm run start        # Production server
npm run check        # TypeScript type checking
npm run db:push      # Push schema changes to database (Drizzle Kit)
```

## Architecture Overview

### Monorepo Structure
- `client/` - React 18 + TypeScript frontend (Vite)
- `server/` - Express.js backend (Node.js + TypeScript)
- `shared/` - Shared types and database schema (Drizzle ORM)

### Technology Stack
- **Database**: PostgreSQL with Drizzle ORM (schema: `shared/schema.ts`)
- **State**: TanStack Query for server state, React hooks for local state
- **Routing**: Wouter (client-side), Express routes (`server/routes.ts`)
- **UI**: Radix UI + Shadcn/ui + Tailwind CSS
- **Mobile**: Capacitor 7 for iOS/Android native features
- **AI**: Google Gemini (primary) with web grounding for real-time verification

### Key Services

**Verification Services** (`server/services/`):
- `geminiVerificationService.ts` - Core fact-checking with Gemini + web grounding
- `businessVerificationService.ts` - BBB, WHOIS, review aggregation
- `aiDetectionService.ts` - Detect AI-generated content (SynthID, Hive)
- `accountAnalysisService.ts` - Analyze social media account authenticity

**Content Extraction** (Reused from shared codebase):
- `socialMediaVideoService.ts` - Instagram, TikTok, YouTube, X extraction
- `apifyService.ts` - Social media scraping via Apify
- `contentOrchestrator.ts` - URL processing pipeline
- `documentParser.ts` - OCR, transcription, document parsing

## Important File Paths

### Backend
- `server/routes.ts` - All API endpoints
- `server/storage.ts` - Database interface layer
- `server/index.ts` - Server entry point
- `server/services/` - Verification and extraction services
- `server/multiProviderAuth.ts` - OAuth (Google Sign-In)

### Frontend
- `client/src/App.tsx` - Main routing configuration
- `client/src/pages/VerifyPage.tsx` - Main verification screen
- `client/src/pages/HistoryPage.tsx` - Verification history
- `client/src/components/VerdictCard.tsx` - Verdict display component

### Shared
- `shared/schema.ts` - Database schema (single source of truth for types)

## Database Schema Key Tables

Core tables from `shared/schema.ts`:
- `users` - User accounts with verification count tracking
- `verifications` - History of all verification analyses
- `sessions` - Express session storage (required for auth)
- `authIdentities`, `externalOAuthTokens` - Multi-provider OAuth

## API Endpoints

### Main Verification Endpoint
```
POST /api/verify
{
  url?: string,        // URL to verify (Instagram, TikTok, YouTube, articles, etc.)
  text?: string,       // Text content to verify
  screenshot?: string  // Base64 image to OCR and verify
}

Response:
{
  trustScore: number,           // 0-100
  verdict: string,              // 'verified' | 'caution' | 'misleading' | 'false'
  confidence: number,           // 0-100%
  claims: ClaimAnalysis[],
  businessAnalysis?: BusinessVerification,
  aiDetection?: AIDetectionResult,
  accountAnalysis?: AccountAnalysis,
  sources: string[]
}
```

### Other Endpoints
- `GET /api/user` - Get current user (with verification count)
- `GET /api/verifications` - Get user's verification history
- `GET /api/verification/:id` - Get specific verification details

## Branding

### Colors
- **Trust Blue**: #0EA5E9 (Primary)
- **Verify Green**: #10B981 (Success/Verified)
- **Caution Amber**: #F59E0B (Warning)
- **Danger Red**: #EF4444 (False/Scam)
- **Background**: #0F172A (Dark slate)

### Logo
Magnifying glass with checkmark inside

### Tagline
"Verify before you trust"

## Free Tier Limits

- **5 verifications per month** for free users
- Tracked via `users.monthlyVerificationCount`
- Resets monthly via `users.verificationCountResetAt`
- Upgrade to Pro for unlimited verifications

## Supported Platforms

- Instagram (posts, reels, stories, ads)
- TikTok (videos, slides)
- YouTube (videos, shorts)
- X/Twitter (tweets, threads)
- Facebook (posts, reels, marketplace)
- Threads
- LinkedIn
- News articles (any URL)
- Screenshots (via OCR)

## Development Conventions

### TypeScript
- Strict mode enabled, ES Modules throughout
- Path aliases: `@/` for client, `@shared/` for shared
- Type inference from Drizzle schema

### API Structure
- RESTful endpoints under `/api`
- Auth middleware: `isAuthenticatedGeneric`
- Validation with Zod schemas

### Mobile Development
- App ID: `ai.verifymate.app`
- Native builds in `android/` and `ios/` directories
- Share sheet integration for URL intake
