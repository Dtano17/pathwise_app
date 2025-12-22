# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- **AI**: OpenAI GPT + Anthropic Claude (multi-provider system)

### Key Architectural Patterns

**Storage Layer Pattern**: `server/storage.ts` - Centralized database access with type-safe CRUD operations (150KB file)

**Service-Oriented Architecture**: `server/services/` - 40+ specialized services:
- AI services (OpenAI, Claude, DeepSeek providers)
- Planning agents (conversational, direct, LangGraph)
- Enrichment services (web, context, journal)
- Media services (video download, image generation)

**Provider Pattern**: LLM abstraction layer with automatic fallback:
- `llmProvider.ts` - Main abstraction
- `openAIProvider.ts`, `claudeProvider.ts`, `deepSeekProvider.ts`

**Domain-Driven Planning**: `server/domains/*.json` - Configuration files for specialized planning domains (travel, fitness, date night, interview prep, etc.)

## Important File Paths

### Backend
- `server/routes.ts` - All API endpoints (15,000+ lines, 600+ routes)
- `server/storage.ts` - Database interface layer (all CRUD operations)
- `server/index.ts` - Server entry point
- `server/services/` - AI services, planning agents, enrichment
- `server/multiProviderAuth.ts` - OAuth (Google, Facebook, Apple, Instagram)

### Frontend
- `client/src/App.tsx` - Main routing configuration
- `client/src/pages/MainApp.tsx` - Primary application container
- `client/src/components/` - 70+ React components
- `client/src/pages/` - Feature pages (Activities, Groups, Journal, Community)

### Shared
- `shared/schema.ts` - Database schema (single source of truth for types)

## Database Schema Key Tables

Core tables from `shared/schema.ts`:
- `users` - User accounts with enhanced profile data
- `sessions` - Express session storage (required for auth)
- `activities`, `activityTasks` - AI-generated activity plans
- `goals`, `tasks` - Personal planning system
- `groups`, `groupMemberships`, `sharedGoals` - Collaborative features
- `shareLinks`, `groupActivities` - Sharing and activity feed
- `journalEntries`, `progressStats` - Journaling and analytics
- `authIdentities`, `externalOAuthTokens` - Multi-provider OAuth
- `chatImports` - AI conversation imports (ChatGPT, Gemini, Claude)

## AI Planning System

Multiple planning modes in `server/services/`:

1. **Quick Plan** (`simpleConversationalPlanner.ts`)
   - 5 AI questions, Claude Haiku for cost optimization
   - Real-time web enrichment

2. **Smart Plan** (`universalPlanningAgent.ts`, `lifestylePlannerAgent.ts`)
   - 7 personalized questions, profile-aware
   - Enhanced enrichment

3. **Direct Plan** (`directPlanGenerator.ts`)
   - Zero questions, instant generation from any input
   - Accepts text/screenshots/AI content

4. **LangGraph Agent** (`langgraphPlanningAgent.ts`)
   - State machine-based conversational planning
   - Multi-turn conversations

## Development Conventions

### TypeScript
- Strict mode enabled, ES Modules throughout
- Path aliases: `@/` for client, `@shared/` for shared
- Type inference from Drizzle schema

### API Structure
- All routes in single `server/routes.ts` file
- RESTful endpoints under `/api`
- Auth middleware: `isAuthenticatedGeneric`
- Validation with Zod schemas

### Component Organization
- Feature-based organization in `client/src/pages/`
- Reusable components in `client/src/components/`
- Shadcn/ui component library pattern
- Mobile-first responsive design

### State Management
- Server state: TanStack Query
- No Redux or Zustand - React hooks only
- Global UI: React Context (ThemeProvider, SidebarProvider)

## Mobile Development

### Capacitor Integration
- App ID: `ai.journalmate.app`
- Native builds in `android/` and `ios/` directories
- Plugins: Contacts, Calendar, Geolocation, Camera, Haptics, Local Notifications

### PWA Support
- Service Worker registration
- Offline-first architecture considerations
