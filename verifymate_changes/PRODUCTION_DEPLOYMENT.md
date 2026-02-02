# JournalMate - Production Deployment Guide

## Overview
This guide covers how to deploy the JournalMate web application to production using Replit's deployment system. The app requires several API keys and environment variables to be configured for production use.

## Prerequisites

### Required API Keys
1. **OpenAI API Key** - For AI-powered planning and conversational features
   - Get your key at: https://platform.openai.com/api-keys
   - Used for GPT-4o and GPT-4o-mini models
   
2. **Tavily API Key** - For real-time web search and data enrichment
   - Get your key at: https://tavily.com
   - Used for real-time travel data, weather, and safety information

3. **Anthropic API Key** (Optional) - For Claude models
   - Get your key at: https://console.anthropic.com
   - Used for Claude Sonnet and Claude Haiku models

4. **DeepSeek API Key** (Optional) - For additional AI model support
   - Get your key at: https://platform.deepseek.com

## Step 1: Configure Production Secrets

### Using Replit Deployment Settings

Your API keys are already configured in **development** (via the Secrets tab) but need to be set up for **production deployment** separately.

**Important**: Development secrets and production deployment secrets are separate in Replit. You must configure them in the deployment settings.

#### Configure Production Environment Variables

1. **Click the "Deploy" button** in the top-right corner of your Replit workspace

2. **Navigate to deployment settings**:
   - If this is your first deployment, you'll see the deployment configuration screen
   - If you've deployed before, click "Settings" or "Configure" on your deployment

3. **Find the "Environment Variables" or "Secrets" section**

4. **Add the following required secrets**:
   ```
   OPENAI_API_KEY=sk-...your-key-here...
   TAVILY_API_KEY=tvly-...your-key-here...
   ```

5. **Add optional secrets** (if you want to use these providers):
   ```
   ANTHROPIC_API_KEY=sk-ant-...your-key-here...
   DEEPSEEK_API_KEY=...your-key-here...
   ```

6. **Save changes** and proceed with deployment

**Note**: Database configuration (DATABASE_URL, PGHOST, PGPORT, etc.) is automatically handled by Replit for production deployments. You don't need to configure these manually.

### Verifying Secrets Configuration

After deploying with your secrets configured, check the deployment logs:

1. **Successful Configuration** - You should see messages like:
   ```
   [OPENAI PROVIDER] Initialized: gpt-4o-mini
     - Input cost: $0.15/1M tokens
     - Output cost: $0.6/1M tokens
   [LLM PROVIDER] Registered: openai (gpt-4o-mini)
   ```

2. **Missing Keys** - You'll see warning messages for any missing API keys:
   ```
   ⚠️  TAVILY_API_KEY not configured - real-time data enrichment unavailable
   ⚠️  DEEPSEEK_API_KEY not configured - DeepSeek provider unavailable
   ```

3. **How to check logs**:
   - Go to your deployment page in Replit
   - Click on "Logs" or "Console" tab
   - Look for the initialization messages when the app starts up

**Note**: If OPENAI_API_KEY or TAVILY_API_KEY are missing, core planning features won't work. Optional keys (ANTHROPIC_API_KEY, DEEPSEEK_API_KEY) will only show warnings.

## Step 2: Configure Authentication Providers

### Replit Auth (Google, X/Twitter, Apple, Email)
- Automatically configured through Replit
- No additional setup needed for production

### Facebook OAuth (Supabase)
If using Facebook authentication:

1. **Supabase Configuration**:
   - Ensure your Supabase project is configured with the correct redirect URLs
   - Production URL format: `https://your-repl-name.replit.app/auth/facebook/callback`
   
2. **Facebook App Settings**:
   - Add production domain to Facebook App's "Valid OAuth Redirect URIs"
   - Update "App Domains" with your Replit deployment URL

## Step 3: Database Migrations

The app uses Drizzle ORM with automatic schema sync. On first deployment:

1. **Push schema to production database**:
   ```bash
   npm run db:push
   ```

2. **Verify tables were created**:
   - Check Replit's database console
   - Should see tables: users, activities, tasks, journal_entries, etc.

## Step 4: Configure Admin Secret for Community Plans

To seed community plans in production, you need to set an ADMIN_SECRET:

1. **Generate a secure secret**:
   ```bash
   # Use a strong random value (32+ characters recommended)
   openssl rand -hex 32
   ```

2. **Add to production environment variables**:
   ```
   ADMIN_SECRET=your-generated-secret-here
   ```

**Note**: This secret is used exclusively for the one-time community plans seeding endpoint. Keep it secure and never share it publicly.

## Step 5: Deploy to Production

### Using Replit's Deploy Button

1. **Click "Deploy"** in the top-right corner of your Replit workspace

2. **Configure deployment settings**:
   - **Auto-scale**: Enable if expecting high traffic
   - **Reserved VM**: Enable for guaranteed uptime
   - **Custom domain**: Optional, configure your own domain

3. **Click "Deploy"** to start the deployment

4. **Monitor deployment**:
   - Check build logs for errors
   - Verify all environment variables are loaded
   - Confirm database connection

### Deployment Verification Checklist

After deployment, verify the following:

- [ ] Application loads at your deployment URL
- [ ] User authentication works (try each provider)
- [ ] AI planning features work (Quick Plan and Smart Plan)
- [ ] Real-time data enrichment works (check for weather, travel alerts)
- [ ] Tasks can be created, completed, and liked
- [ ] Activities can be created, shared, and liked
- [ ] Journal entries can be created and saved
- [ ] Database persistence works across sessions

## Step 6: Seed Community Plans (One-Time Setup)

After successful deployment, populate the Discover Plans section with 44 curated community plans:

### Seed Community Plans

**Important**: This is a **one-time setup** step after your first deployment. The community plans include:
- 40+ curated plans with emoji-enhanced titles (⚽ FIFA World Cup 2026, 🌅 Santorini Sunset Romance, etc.)
- HD stock images automatically deployed with the code (from `client/public/community-backdrops/`)
- 7-10 detailed tasks per plan with realistic budget breakdowns
- Categories: Travel, Fitness, Career, Personal

### How to Seed:

1. **Use the admin endpoint** to populate the database:
   ```bash
   curl -X POST https://your-app.replit.app/api/admin/seed-community-plans \
     -H "Content-Type: application/json" \
     -d '{"adminSecret": "YOUR_ADMIN_SECRET_VALUE"}'
   ```

2. **Replace placeholders**:
   - `your-app.replit.app` → Your actual deployment URL
   - `YOUR_ADMIN_SECRET_VALUE` → The ADMIN_SECRET you configured in Step 4

3. **Wait for completion** (takes 30-60 seconds):
   - The endpoint seeds all 44 plans with activities, tasks, and budgets
   - Check the deployment logs for confirmation: `[SEED] Seeding community plans...`

### Force Re-seed (Optional):

If you need to update plans with new data (e.g., after modifying seed data):
```bash
curl -X POST https://your-app.replit.app/api/admin/seed-community-plans \
  -H "Content-Type: application/json" \
  -d '{"adminSecret": "YOUR_ADMIN_SECRET_VALUE", "force": true}'
```

**Note**: `force: true` deletes and recreates all community plans. Use with caution in production.

### Verify Seeding Success:

1. **Navigate to Discover Plans**:
   - Go to `https://your-app.replit.app/discover`
   - You should see 40+ plans with emoji titles

2. **Check categories**:
   - Filter by: All, Travel, Fitness, Career, Personal
   - Each category should show relevant plans

3. **Test plan adoption**:
   - Click "Preview" on any plan to see details
   - Click "Use This Plan" to copy to your account
   - Verify tasks and budget breakdown appear correctly

## Step 7: Monitor Production

### Key Metrics to Watch

1. **API Usage**:
   - OpenAI API usage and costs
   - Tavily API request limits
   - Monitor via respective provider dashboards

2. **Database Performance**:
   - Query performance
   - Connection pool status
   - Storage usage

3. **Application Health**:
   - Response times
   - Error rates
   - User sessions

### Cost Management

**Estimated Monthly Costs** (varies by usage):

| Service | Tier | Estimated Cost |
|---------|------|----------------|
| Replit Deployment | Reserved VM | $20-50/month |
| OpenAI API | Pay-as-you-go | $10-100/month |
| Tavily API | Free/Paid | $0-30/month |
| Neon Database | Free/Paid | $0-25/month |

**Tips to Reduce Costs**:
- Use GPT-4o-mini instead of GPT-4o for most queries (configured by default)
- Implement rate limiting for AI features
- Cache frequent search results
- Monitor and set spending limits on API providers

## Troubleshooting

### Common Issues

#### Issue: "OPENAI_API_KEY not configured"
**Solution**: Add OPENAI_API_KEY to production secrets (see Step 1)

#### Issue: "Database connection failed"
**Solution**: 
- Verify DATABASE_URL is set in production
- Run `npm run db:push` to initialize schema
- Check Replit database console for connection status

#### Issue: "Real-time data enrichment not working"
**Solution**: 
- Add TAVILY_API_KEY to production secrets
- Verify API key is valid at tavily.com dashboard
- Check production logs for Tavily initialization messages

#### Issue: "Authentication callback failing"
**Solution**:
- Update OAuth provider redirect URLs to production domain
- Verify Supabase configuration for Facebook OAuth
- Check that REPLIT_DOMAINS environment variable is set correctly

## Security Best Practices

1. **Never commit API keys to repository**
   - All keys should be in Replit Secrets only
   - Check `.gitignore` includes `.env` files

2. **Rotate keys periodically**
   - Rotate API keys every 90 days
   - Update production secrets after rotation

3. **Monitor for suspicious activity**
   - Check API usage dashboards regularly
   - Set up alerts for unusual spikes

4. **Use environment-specific keys**
   - Separate development and production API keys when possible
   - Helps track usage and limit exposure

## Support Resources

- **Replit Deployments**: https://docs.replit.com/hosting/deployments
- **OpenAI API**: https://platform.openai.com/docs
- **Tavily API**: https://docs.tavily.com
- **Drizzle ORM**: https://orm.drizzle.team/docs
- **Supabase**: https://supabase.com/docs

## Next Steps

After successful deployment:

1. **Set up monitoring**: Configure uptime monitoring (e.g., UptimeRobot)
2. **Configure backups**: Set up automated database backups
3. **Add custom domain**: Configure your own domain name
4. **SSL certificate**: Replit handles this automatically
5. **Analytics**: Add analytics tracking (Google Analytics, Plausible, etc.)
