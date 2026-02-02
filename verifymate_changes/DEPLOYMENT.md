# PathWise AI - GCP Deployment Guide

This guide walks you through deploying PathWise AI to Google Cloud Platform with Supabase authentication.

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **Supabase Account** (free tier available)
3. **Google Cloud CLI** installed and configured
4. **Node.js 22+** for local development
5. **Git** for version control

## 1. Supabase Setup

### Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization and fill in:
   - **Project Name**: `pathwise-ai`
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Start with Free tier

### Configure Authentication Providers

#### Google OAuth
1. In Supabase Dashboard → Authentication → Providers
2. Enable "Google"
3. Add your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
   - **Redirect URL**: Copy the provided URL

#### Facebook OAuth
1. Enable "Facebook" in providers
2. Add Facebook App credentials:
   - **App ID**: From Facebook Developers
   - **App Secret**: From Facebook Developers

#### Email/Password
1. Enable "Email" provider (enabled by default)
2. Configure email templates if needed

#### Phone/SMS
1. Enable "Phone" provider
2. Configure SMS provider (Twilio recommended)

### Get API Keys

1. Go to Settings → API
2. Copy these values:
   - **Project URL**: `VITE_SUPABASE_URL`
   - **Anon Public Key**: `VITE_SUPABASE_ANON_KEY`
   - **Service Role Key**: `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

## 2. Google Cloud Setup

### Create GCP Project

```bash
# Create new project
gcloud projects create pathwise-ai --name="PathWise AI"

# Set as active project
gcloud config set project pathwise-ai

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### Set Environment Variables

```bash
# Set up Cloud Build substitutions
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_SUPABASE_URL="your-supabase-url",_SUPABASE_ANON_KEY="your-anon-key"
```

## 3. Environment Configuration

### Create Production Environment File

Create `.env.production` (for local testing):

```env
NODE_ENV=production

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# AI Configuration
OPENAI_API_KEY=sk-your-openai-api-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:password@db.your-project-id.supabase.co:5432/postgres

# Session Secret
SESSION_SECRET=your-super-secret-session-key

# GCP Configuration
GOOGLE_CLOUD_PROJECT_ID=pathwise-ai
```

### Set GCP Environment Variables

```bash
# Set environment variables in Cloud Run
gcloud run services update pathwise-ai \
  --region=us-central1 \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="VITE_SUPABASE_URL=your-supabase-url" \
  --set-env-vars="VITE_SUPABASE_ANON_KEY=your-anon-key" \
  --set-env-vars="SUPABASE_SERVICE_ROLE_KEY=your-service-key" \
  --set-env-vars="OPENAI_API_KEY=your-openai-key" \
  --set-env-vars="ANTHROPIC_API_KEY=your-anthropic-key"
```

## 4. Database Setup

### Supabase Database Schema

Run these SQL commands in Supabase SQL Editor:

```sql
-- Create users table (if not exists from auth)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text UNIQUE,
  first_name text,
  last_name text,
  profile_image_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see their own data
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Create goals table
CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  priority text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals" ON public.goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own goals" ON public.goals
  FOR ALL USING (auth.uid() = user_id);

-- Create tasks table
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  goal_id uuid REFERENCES public.goals(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  priority text NOT NULL,
  completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  due_date timestamp with time zone,
  time_estimate text,
  context text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks" ON public.tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own tasks" ON public.tasks
  FOR ALL USING (auth.uid() = user_id);
```

## 5. Deployment Options

### Option A: Cloud Run (Recommended)

```bash
# Build and deploy with Cloud Build
gcloud builds submit --config=cloudbuild.yaml

# Or manual deployment
docker build -t gcr.io/pathwise-ai/pathwise-ai .
docker push gcr.io/pathwise-ai/pathwise-ai

gcloud run deploy pathwise-ai \
  --image gcr.io/pathwise-ai/pathwise-ai \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1
```

### Option B: App Engine

```bash
# Deploy to App Engine
gcloud app deploy app.yaml
```

## 6. Domain & SSL Setup

### Custom Domain (Optional)

```bash
# Map custom domain
gcloud run domain-mappings create \
  --service pathwise-ai \
  --domain your-domain.com \
  --region us-central1
```

### Update Supabase Redirect URLs

In Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `https://your-domain.com`
- **Redirect URLs**: Add `https://your-domain.com/auth/callback`

## 7. Monitoring & Logging

### Enable Cloud Logging

```bash
# View logs
gcloud logs tail "projects/pathwise-ai/logs/run.googleapis.com%2Fstdout"
```

### Set up Monitoring

1. Go to Cloud Monitoring in GCP Console
2. Create alerting policies for:
   - High error rates
   - High response times
   - Resource utilization

## 8. Security Considerations

### Environment Variables
- Never commit API keys to version control
- Use Google Secret Manager for sensitive data
- Rotate keys regularly

### Authentication
- Configure Supabase RLS policies properly
- Use HTTPS only in production
- Set secure cookie policies

### Database
- Enable Supabase database backups
- Monitor for suspicious activity
- Use connection pooling

## 9. Testing Deployment

### Health Checks

```bash
# Test health endpoint
curl https://your-app-url.run.app/health

# Test API endpoints
curl https://your-app-url.run.app/api/tasks \
  -H "Authorization: Bearer your-supabase-token"
```

### Load Testing

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Basic load test
ab -n 1000 -c 10 https://your-app-url.run.app/
```

## 10. Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version in Dockerfile
   - Verify all dependencies are in package.json
   - Check environment variable names

2. **Authentication Issues**
   - Verify Supabase URL and keys
   - Check redirect URLs match exactly
   - Ensure RLS policies allow access

3. **Database Connection**
   - Check DATABASE_URL format
   - Verify Supabase project settings
   - Test connection locally first

### Useful Commands

```bash
# View Cloud Run service details
gcloud run services describe pathwise-ai --region=us-central1

# Update service without rebuilding
gcloud run services update pathwise-ai \
  --region=us-central1 \
  --set-env-vars="NEW_VAR=value"

# Roll back deployment
gcloud run services replace service.yaml --region=us-central1
```

## 11. Cost Optimization

### Cloud Run
- Use minimum instances: 0
- Set appropriate memory/CPU limits
- Enable CPU allocation only during requests

### Supabase
- Monitor database usage
- Optimize queries for performance
- Use appropriate pricing tier

## 12. Backup & Recovery

### Database Backups
- Supabase handles automatic backups
- Set up additional backup strategies for critical data

### Code Repository
- Use Git with proper branching strategy
- Tag releases for easy rollback
- Maintain staging environment

This deployment setup provides a production-ready PathWise AI application with modern authentication, scalable infrastructure, and proper security practices.