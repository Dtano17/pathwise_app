# VerifyMate Changes

This folder contains all the VerifyMate-specific code changes that can be easily moved to a new project.

## Folder Structure

```
verifymate_changes/
├── schema/
│   └── schema.ts           # Complete database schema for VerifyMate
├── services/
│   └── geminiVerificationService.ts  # Core AI verification service
├── components/
│   └── VerdictCard.tsx     # Verification result display component
├── pages/
│   ├── VerifyPage.tsx      # Main verification interface
│   ├── VerifyLogin.tsx     # Branded login page
│   └── VerifyLandingPage.tsx  # Marketing landing page
├── config/
│   ├── capacitor.config.ts # Mobile app configuration
│   ├── manifest.json       # PWA manifest
│   └── index.html          # HTML template with VerifyMate branding
└── README.md               # This file
```

## File Descriptions

### Schema (`schema/schema.ts`)
Complete database schema with:
- **users** - User accounts with subscription management
- **sessions** - Session storage for auth
- **verifications** - Core verification records with:
  - Claims analysis
  - AI content detection
  - Account/bot analysis
  - Business verification
  - Bias analysis
  - **Source Tracing** - Find original source of content
  - **Event Correlation** - Match posts to real-world events
  - **Timeline Analysis** - Detect recycled/old content
- **authIdentities** - OAuth provider links
- **externalOAuthTokens** - OAuth token storage

### Services (`services/geminiVerificationService.ts`)
Core Gemini AI verification service with:
- Web grounding for real-time fact-checking
- Source tracing to find original content
- Event correlation to match posts to news/incidents
- Timeline analysis to detect recycled content
- AI content detection
- Business verification
- Bias analysis

### Components (`components/VerdictCard.tsx`)
Full verification result display component with:
- Trust score visualization
- Verdict badge (verified/false/mixed/etc.)
- Claims breakdown with sources
- AI detection results
- Account/bot analysis
- Business verification details
- **Source Tracing section** - Shows original source if reshared
- **Event Correlation section** - Shows matched real-world events
- **Timeline Analysis section** - Shows content age and recycling warnings
- Share and copy link functionality

### Pages

#### `pages/VerifyPage.tsx`
Main verification interface with:
- URL input for social media posts
- Text input for direct content
- Verification history
- Share sheet integration (native mobile)
- Result display using VerdictCard

#### `pages/VerifyLogin.tsx`
Branded login page with:
- VerifyMate logo and branding
- Google OAuth integration
- Features preview
- Redirect handling for pending verifications

#### `pages/VerifyLandingPage.tsx`
Marketing landing page with:
- Hero section with quick verify input
- Features showcase
- Pricing plans (Free/Pro)
- How it works section
- Mobile app download section
- SEO optimization

### Config Files

#### `config/capacitor.config.ts`
Mobile app configuration:
- App ID: `ai.verifymate.app`
- App Name: `VerifyMate - AI Fact Checker`
- Production URL: `https://verifymate.ai`
- Theme colors: Sky blue (#0EA5E9) + Dark slate (#0F172A)

#### `config/manifest.json`
PWA manifest with:
- Share target for web share API
- App icons
- Theme colors
- Categories: news, utilities, reference

#### `config/index.html`
HTML template with:
- VerifyMate meta tags
- Open Graph / Twitter cards
- Mobile web app configuration
- Font loading (Inter, Plus Jakarta Sans)

## How to Use These Files

1. **Copy to new project structure:**
   - `schema/schema.ts` → `shared/schema.ts`
   - `services/geminiVerificationService.ts` → `server/services/`
   - `components/VerdictCard.tsx` → `client/src/components/`
   - `pages/*.tsx` → `client/src/pages/`
   - `config/capacitor.config.ts` → project root
   - `config/manifest.json` → project root
   - `config/index.html` → `client/index.html`

2. **Install dependencies:**
   ```bash
   npm install @google/generative-ai drizzle-orm drizzle-zod zod
   npm install @tanstack/react-query wouter framer-motion
   npm install lucide-react react-icons
   ```

3. **Configure environment:**
   ```bash
   GEMINI_API_KEY=your-api-key
   DATABASE_URL=postgresql://...
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

4. **Update routes in App.tsx:**
   ```tsx
   <Route path="/" component={VerifyLandingPage} />
   <Route path="/verify" component={VerifyPage} />
   <Route path="/verify/login" component={VerifyLogin} />
   <Route path="/verify/result/:shareToken" component={VerifyPage} />
   ```

## Key Features

### Source Tracing
Finds the original source of content by:
- Searching for earliest appearance online
- Tracking how content spread across platforms
- Identifying if the poster is the original author
- Calculating virality score

### Event Correlation
Matches posts to real-world events by:
- Searching news sources for related incidents
- Verifying event dates and locations
- Identifying discrepancies between post and actual events
- Flagging manipulation indicators (wrong date, location, fabricated)

### Timeline Analysis
Analyzes temporal aspects by:
- Detecting if content is recycled/old
- Comparing event date vs posting date
- Flagging significant timeline mismatches
- Providing content age and relevance assessment

## Brand Colors

- **Trust Blue**: `#0EA5E9` - Primary brand color
- **Verify Green**: `#10B981` - Success/verified states
- **Caution Amber**: `#F59E0B` - Warning states
- **Danger Red**: `#EF4444` - False/scam states
- **Background**: `#0F172A` - Dark slate
