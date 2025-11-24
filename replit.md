# JournalMate - AI-Powered Journaling Application

## Overview
JournalMate (journalmate.ai) is an AI-powered journaling application that transforms user intentions into actionable plans. It offers a mobile-first experience with features like swipeable task management, celebratory feedback, and comprehensive authentication. The application leverages advanced AI for intelligent planning and personalized journaling, guiding users through setting, executing, and celebrating their goals.

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
The application employs a mobile-first responsive design featuring a clean, card-based UI with a purple and emerald color scheme and the Inter font family, providing immediate, celebration-focused feedback.

**Technical Stack:**
- **Frontend**: React, TypeScript, Tailwind CSS, Framer Motion, Wouter
- **Backend**: Express.js with Passport.js
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **AI Integration**: OpenAI and Claude API with automatic provider switching and cost optimization.
- **Authentication**: Dual system with Replit Auth (Google, X/Twitter, Apple, Email) and Supabase (Facebook OAuth), unified via Passport.js.
- **Animations**: React Confetti, React Spring, Framer Motion.
- **Mobile Application**: Capacitor-based native app for iOS and Android, with PWA support.

**Key Features:**
- **AI-Powered Planning**: Offers "Quick Plan" (5 questions) and "Smart Plan" (10 questions) modes with dynamic validation, zero hallucination enforcement, and context-aware completion.
- **Freemium Revenue Model**: Stripe-powered subscription system with Free, Pro, and Family tiers.
- **Task Management**: Swipeable task cards, real-time progress dashboard, and automatic activity/task creation.
- **Personal Journal**: Interface with 9 categories, auto-save, and AI-driven categorization.
- **Social Sharing & Activity Management**: Customizable share previews, server-side OG meta tags, and an AI-powered "Privacy Shield".
- **Community Plans Discovery**: Browse and copy plans from others with trending algorithms and category filters.
- **Groups & Collaborative Planning**: Group creation, member management, progress tracking, and activity feeds.
- **Authentication & User Management**: Unified authentication and functional profile management.
- **UI/UX**: Mobile-first, responsive, dark/light theme, adaptive layouts, and accessibility.
- **PWA Features**: Service worker for offline functionality and install prompts.
- **Native Mobile Features**: Home screen widgets, calendar sync, biometric authentication, voice-to-text, Android inbound share, push notifications, and haptic feedback.

## External Dependencies
- **Replit Auth**: Google, X/Twitter, Apple, and Email authentication.
- **Supabase**: Facebook OAuth.
- **Stripe**: Payment processing and subscription management.
- **OpenAI API**: AI model integration for planning features.
- **Tavily API**: Real-time web search and data enrichment.
- **Anthropic API**: Optional AI model integration (Claude).
- **DeepSeek**: Optional additional AI model support.
- **PostgreSQL (Neon)**: Cloud-hosted relational database.
- **Passport.js**: Authentication middleware.
- **Resend**: Email delivery service.
## Latest Updates (November 24, 2025)
- ✅ **CRITICAL Stripe webhook signature verification fix**:
  - Problem: Webhooks failing with HTTP 400 "Webhook payload must be provided as a string or a Buffer"
  - Solution: Moved webhook route BEFORE express.json() in server/index.ts, using express.raw() middleware
  - Files changed: Created server/stripeWebhook.ts, updated server/index.ts middleware order
  - Impact: All future subscription events now automatically update user database correctly
- ✅ Fixed group invite code generation - all groups now have proper invite codes (ABC-123-XYZ format)

## Troubleshooting Guide

### Stripe Webhook Configuration (CRITICAL)

**Problem**: Users subscribe to Pro/Family but still show as "Free" tier in app

**Root Cause**: Stripe webhook not configured → app never receives subscription updates

**Solution - Configure Webhook in Stripe Dashboard:**

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Enter endpoint URL: `https://journalmate.ai/api/webhook/stripe`
4. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **"Add endpoint"**
6. Copy the **Webhook signing secret** (starts with `whsec_...`)
7. Add secret to production environment: `STRIPE_WEBHOOK_SECRET=whsec_...`

**Test Webhook:**
1. In Stripe Dashboard → Webhooks → Your endpoint
2. Click **"Send test webhook"**
3. Select `customer.subscription.created` event
4. Check response: Should return **HTTP 200** (not 400)
5. Check production logs for: `[WEBHOOK] Subscription updated`

**Verify Webhook Is Working:**
- After configuration, new subscriptions should automatically update user tier
- Check user record in database: `subscription_tier` should be 'pro' or 'family'
- User should see Pro badge and unlimited plan creation immediately

###Backfill Stripe IDs (Fix Existing Broken Subscriptions)

**Problem**: User subscribed BEFORE webhooks were configured → database never got Stripe IDs

**Solution**: Run the backfill endpoint to match Stripe subscriptions to users by email

**Run Backfill (requires ADMIN_SECRET):**
```bash
curl -X POST https://journalmate.ai/api/admin/backfill-stripe-ids \
  -H "Content-Type: application/json" \
  -d '{"adminSecret": "YOUR_ADMIN_SECRET_VALUE"}'
```

**What It Does:**
1. Queries ALL subscriptions from Stripe API
2. Matches subscriptions to users by email address
3. Updates database with:
   - `stripeSubscriptionId` (required for billing portal)
   - `stripeCustomerId` (required for webhook lookups)
   - `subscriptionTier` (pro or family, derived from price ID)
   - `subscriptionStatus` (active, trialing, etc.)

**Response Format:**
```json
{
  "success": true,
  "message": "Stripe ID backfill complete",
  "stats": {
    "totalUsers": 150,
    "proFamilyUsers": 5,
    "totalStripeSubscriptions": 3,
    "backfilled": 2,
    "errors": 0,
    "warnings": 1
  },
  "results": [
    {
      "email": "user@example.com",
      "userId": "123",
      "matchedBy": "newMatch",
      "updates": {
        "stripeSubscriptionId": "sub_xxx",
        "stripeCustomerId": "cus_xxx",
        "subscriptionTier": "pro",
        "subscriptionStatus": "active"
      }
    }
  ]
}
```

**Safety Features:**
- Only processes users already marked as Pro/Family (won't accidentally upgrade Free users)
- Skips users who already have complete Stripe IDs
- Requires exactly 1 active subscription per email (flags ambiguous cases for manual review)
- Atomic database updates (all fields updated together)

**When to Run:**
- After configuring webhooks for the first time
- When users report "still showing as Free after subscribing"
- After migrating from another billing system
- Periodically to catch edge cases

### Browser Caching Issues (White Screen / Freezing)

**Problem**: After deployment, browser shows white screen, freezes, or displays stale content

**Root Cause**: Browsers aggressively cache static assets (JavaScript, CSS files) from previous deployments

**Quick Fixes:**

1. **Hard Refresh** (works 90% of the time):
   - **Windows/Linux**: Press `Ctrl + Shift + R`
   - **Mac**: Press `Cmd + Shift + R`
   - This forces browser to fetch latest files, bypassing cache

2. **Clear Browser Cache**:
   - Chrome: Settings → Privacy → Clear browsing data → Cached images and files
   - Safari: Preferences → Privacy → Manage Website Data → Remove All
   - Firefox: Preferences → Privacy → Cookies and Site Data → Clear Data

3. **Test in Incognito/Private Mode**:
   - Open private window (no cache)
   - If app works there, it's definitely a caching issue
   - Use hard refresh in normal window

4. **For Mobile Users**:
   - Tell users to uninstall and reinstall PWA
   - Or: Settings → Apps → JournalMate → Storage → Clear Cache

**Why This Happens:**
- Vite builds include content hashes in filenames (e.g., `main.abc123.js`)
- Old deployments had different hashes
- Browser cached `index.html` pointing to old hashed files
- Old files no longer exist on server → white screen

**Prevention (Already Implemented):**
- ✅ Content hashing enabled in `vite.config.ts` (lines 39-41)
- ✅ ETags disabled globally in `server/index.ts` (line 60)
- ✅ Users just need to hard refresh after deployments

**Note**: This is a known limitation of static deployments on Replit. No perfect server-side solution exists - users must refresh after updates.

### Common Production Issues

**Issue**: "API key not configured" errors in production logs
**Solution**: Set all required secrets in production environment (different from development)

**Issue**: Facebook OAuth not working in production  
**Solution**: Update Facebook App settings with production domain (journalmate.ai)

**Issue**: Pro users can't access Stripe billing portal
**Solution**: Run backfill endpoint to add missing stripeCustomerId

**Issue**: Community plans not showing
**Solution**: Run `/api/admin/seed-community-plans` endpoint (see Production Deployment above)

**Issue**: Welcome emails not sending
**Solution**: Verify Resend API key configured in production secrets
