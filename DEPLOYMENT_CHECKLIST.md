# JournalMate - Production Deployment Checklist

## ✅ Pre-Deployment Verification (Completed)

### ✅ Code Features
- [x] Timeline button visible on mobile (icon-only on mobile, text+icon on desktop)
- [x] Stripe webhook signature validation implemented (uses STRIPE_WEBHOOK_SECRET)
- [x] Plan count reset logic implemented (lazy check on subscription status requests)
- [x] Journal Timeline fully mobile-responsive
- [x] All core features functional in development

### ✅ API Keys Configured (Development)
- [x] OPENAI_API_KEY - AI planning features
- [x] TAVILY_API_KEY - Real-time data enrichment
- [x] STRIPE_SECRET_KEY - Payment processing
- [x] VITE_STRIPE_PUBLIC_KEY - Stripe checkout
- [x] ANTHROPIC_API_KEY - Claude models (optional)

## 🚀 Production Deployment Steps

### Step 1: Configure Production Secrets

**CRITICAL**: Development secrets are separate from production deployment secrets in Replit.

1. **Click "Deploy" button** in top-right corner of Replit workspace

2. **Add REQUIRED secrets** in deployment settings:
   ```
   OPENAI_API_KEY=sk-...your-production-key...
   TAVILY_API_KEY=tvly-...your-production-key...
   STRIPE_SECRET_KEY=sk_live_...your-production-key...
   VITE_STRIPE_PUBLIC_KEY=pk_live_...your-production-key...
   STRIPE_WEBHOOK_SECRET=whsec_...your-webhook-secret...
   ```

3. **Add OPTIONAL secrets** (for additional AI providers):
   ```
   ANTHROPIC_API_KEY=sk-ant-...your-key...
   DEEPSEEK_API_KEY=...your-key...
   ```

4. **Database secrets** (automatically configured by Replit):
   - DATABASE_URL
   - PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE

### Step 2: Configure Stripe Products

1. **Go to Stripe Dashboard** (https://dashboard.stripe.com)

2. **Switch to Live mode** (toggle in top-right)

3. **Create Products**:
   - **Pro Monthly**: $6.99/month
   - **Pro Annual**: $59.99/year (save 30%)
   - **Family Monthly**: $14.99/month
   - **Family Annual**: $125.99/year (save 30%)

4. **Configure 7-day free trials** for all subscription products

5. **Copy Price IDs** and update in code if needed (currently using generic IDs)

6. **Set up Webhook**:
   - URL: `https://your-repl-name.replit.app/api/webhook/stripe`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Copy webhook signing secret → Add to production secrets as `STRIPE_WEBHOOK_SECRET`

### Step 3: Configure OAuth Providers

1. **Facebook OAuth** (if using):
   - Update Supabase redirect URLs: `https://your-repl-name.replit.app/auth/facebook/callback`
   - Update Facebook App "Valid OAuth Redirect URIs"
   - Update Facebook App "App Domains"

2. **Replit Auth** (Google, X/Twitter, Apple, Email):
   - Automatically configured, no changes needed

### Step 4: Database Setup

1. **Push schema to production**:
   ```bash
   npm run db:push
   ```

2. **Verify tables created** in Replit database console:
   - users
   - activities
   - tasks
   - journal_entries
   - groups
   - group_members
   - notifications
   - favorites
   - likes

### Step 5: Deploy

1. **Click "Deploy"** in Replit workspace

2. **Configure deployment**:
   - Enable auto-scale if expecting high traffic
   - Enable reserved VM for guaranteed uptime
   - (Optional) Configure custom domain

3. **Monitor deployment logs** for:
   - ✅ All environment variables loaded
   - ✅ Database connection successful
   - ✅ API providers initialized (OpenAI, Tavily, Stripe)
   - ✅ Server started on port 5000

### Step 6: Post-Deployment Verification

Test the following features on production:

#### Authentication
- [ ] Google login works
- [ ] X/Twitter login works
- [ ] Apple login works
- [ ] Email login works
- [ ] Facebook login works (if configured)

#### AI Planning
- [ ] Quick Plan (5-question flow) works
- [ ] Smart Plan (10-question flow) works
- [ ] Real-time data enrichment displays (weather, safety, events)
- [ ] Activity creation from plan confirmation works

#### Subscription System
- [ ] Free tier allows 5 plans per month
- [ ] 6th plan attempt shows upgrade modal
- [ ] Stripe checkout redirects correctly
- [ ] Webhook updates subscription status
- [ ] Pro/Family features unlock immediately after payment
- [ ] Billing portal accessible from settings

#### Core Features
- [ ] Journal entries save and persist
- [ ] Tasks can be created, completed, liked
- [ ] Activities can be shared, liked, copied
- [ ] Groups can be created and joined
- [ ] Timeline view displays correctly on mobile
- [ ] Mobile responsiveness works on all screens

## ⚠️ Known Issues (Non-Critical)

### TypeScript Type Errors
- 131 LSP diagnostics in server/routes.ts
- These are type mismatches and don't prevent runtime execution
- Should be addressed in future refactoring for code quality
- Not blocking for initial production deployment

### Console Logging
- 72+ files contain console.log statements
- Should be replaced with proper logging service in future
- Consider using Winston, Pino, or similar for production logging

## 📊 Cost Estimates (Monthly)

| Service | Usage | Estimated Cost |
|---------|-------|---------------|
| Replit Reserved VM | Always-on | $20-50 |
| OpenAI API | ~1000 plans | $10-100 |
| Tavily API | Unlimited enrichment | $0-30 |
| Neon PostgreSQL | Standard usage | $0-25 |
| Stripe Processing | 2.9% + $0.30/transaction | Variable |
| **Total** | | **$30-205/month** |

## 🔒 Security Reminders

1. **Never commit API keys** to repository
2. **Rotate keys every 90 days**
3. **Monitor API usage** for suspicious activity
4. **Set spending limits** on API providers
5. **Use separate dev/prod keys** when possible

## 📈 Post-Launch Monitoring

### Key Metrics to Track
- User signups and authentication method distribution
- Free-to-paid conversion rate
- Plan creation frequency (free vs paid users)
- API costs (OpenAI, Tavily)
- Error rates and response times
- Database query performance

### Recommended Tools
- **Uptime monitoring**: UptimeRobot, Pingdom
- **Error tracking**: Sentry, Rollbar
- **Analytics**: Google Analytics, Plausible
- **API monitoring**: OpenAI dashboard, Tavily dashboard

## 🎯 Next Steps After Deployment

1. **Set up monitoring** (uptime, errors, performance)
2. **Configure automated backups** for database
3. **Add custom domain** (optional)
4. **Implement usage analytics** tracking
5. **Set up customer support** system
6. **Create user documentation** and help center
7. **Plan marketing launch** strategy

## 📚 Resources

- **Replit Deployments**: https://docs.replit.com/hosting/deployments
- **OpenAI API Docs**: https://platform.openai.com/docs
- **Tavily API Docs**: https://docs.tavily.com
- **Stripe Docs**: https://stripe.com/docs
- **Drizzle ORM**: https://orm.drizzle.team/docs

---

**Ready to deploy?** Make sure all items in Steps 1-5 are completed, then click the Deploy button! 🚀
