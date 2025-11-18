# 📧 Resend Profile & Email Branding Setup Guide

Complete guide to set up your Resend profile with JournalMate branding, including logo, profile image, and email assets.

---

## 🎯 Overview

This guide covers:
1. Setting up Resend profile with logo
2. Uploading email assets
3. Configuring sender profile
4. Testing the enhanced welcome email

---

## 1️⃣ Resend Profile Setup

### Step 1: Access Your Resend Account

1. Go to: https://resend.com/login
2. Log in with your credentials
3. Navigate to **Settings** → **Domains**

### Step 2: Set Up Sender Profile

1. Go to **Settings** → **Senders**
2. Click **Add Sender**
3. Fill in details:

```
Name: JournalMate
Email: noreply@journalmate.ai
Reply-To: support@journalmate.ai
```

### Step 3: Upload Profile Image/Logo

**Option A: Via Dashboard**
1. Go to **Settings** → **Branding**
2. Click **Upload Logo**
3. Upload: [`client/public/icons/email/email-profile-100.png`](client/public/icons/email/email-profile-100.png)
   - Size: 100x100px
   - Format: PNG with transparency
   - This appears in sender profile

**Option B: Host Images and Reference**
You'll need to host images publicly. Options:

1. **Use your domain** (Recommended)
   - Upload to: `https://journalmate.ai/email-assets/`
   - Images: All icons from `client/public/icons/`

2. **Use Resend CDN**
   - Upload via Resend dashboard
   - Get CDN URLs

3. **Use Cloudflare R2 / AWS S3**
   - Free hosting for email assets
   - Fast delivery

---

## 2️⃣ Email Assets Setup

### Images Needed for Emails

#### 1. Logo/Profile Image
**File:** [`client/public/icons/email/email-profile-100.png`](client/public/icons/email/email-profile-100.png)
- **Size:** 100x100px
- **Use:** Sender profile, email header
- **Upload to:** Your domain or Resend

#### 2. Email Banner
**File:** [`client/public/icons/banners/email-header-1200x400.png`](client/public/icons/banners/email-header-1200x400.png)
- **Size:** 1200x400px
- **Use:** Hero section in welcome email
- **Upload to:** Your domain

**Alternative smaller banner:**
**File:** [`client/public/icons/banners/email-header-600x200.png`](client/public/icons/banners/email-header-600x200.png)
- **Size:** 600x200px
- **Use:** Mobile-optimized banner

#### 3. Email Signature Logo
**Files:**
- [`client/public/icons/email/email-signature-150x40.png`](client/public/icons/email/email-signature-150x40.png) (150x40px)
- [`client/public/icons/email/email-signature-200x53.png`](client/public/icons/email/email-signature-200x53.png) (200x53px)
- **Use:** Email footers, signatures

---

## 3️⃣ Hosting Email Assets

### Option A: Host on Your Domain (Recommended)

#### Upload to Server

```bash
# Create email assets directory on your server
mkdir -p /var/www/journalmate.ai/email-assets

# Copy all email assets
cp -r client/public/icons/email/* /var/www/journalmate.ai/email-assets/
cp -r client/public/icons/banners/* /var/www/journalmate.ai/email-assets/banners/

# Set permissions
chmod 644 /var/www/journalmate.ai/email-assets/*
```

#### Update URLs in Template

Replace `{{baseURL}}` in template with:
```
https://journalmate.ai/email-assets
```

**Example:**
```html
<!-- Before -->
<img src="{{baseURL}}/icons/email/email-profile-100.png" alt="JournalMate">

<!-- After -->
<img src="https://journalmate.ai/email-assets/email-profile-100.png" alt="JournalMate">
```

### Option B: Use Cloudflare R2 (Free CDN)

#### Setup R2 Bucket

1. Go to Cloudflare Dashboard → R2
2. Create bucket: `journalmate-email-assets`
3. Upload all files from `client/public/icons/`
4. Make bucket public
5. Get public URL: `https://pub-xxxxx.r2.dev`

#### Upload Images

```bash
# Using Wrangler CLI
npx wrangler r2 object put journalmate-email-assets/email-profile-100.png --file=client/public/icons/email/email-profile-100.png
npx wrangler r2 object put journalmate-email-assets/email-header-1200x400.png --file=client/public/icons/banners/email-header-1200x400.png
```

### Option C: Use Resend's Image Hosting

If Resend supports image hosting:
1. Upload via dashboard
2. Get CDN URL
3. Use in templates

---

## 4️⃣ Email Template Configuration

### Template Variables

Your enhanced template uses these variables:

```javascript
{
  firstName: "John",              // User's first name
  baseURL: "https://journalmate.ai/email-assets",  // Image hosting URL
  appURL: "https://app.journalmate.ai",            // App URL
  unsubscribeURL: "https://app.journalmate.ai/unsubscribe?token=xxx",
  socialTwitter: "https://twitter.com/journalmate",
  socialInstagram: "https://instagram.com/journalmate",
  socialLinkedin: "https://linkedin.com/company/journalmate"
}
```

### Implementation in Code

Update your email service:

```typescript
// server/emailService.ts

import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

const resend = new Resend(process.env.RESEND_API_KEY);

// Load template
const welcomeTemplateHTML = fs.readFileSync(
  path.join(__dirname, '../RESEND_WELCOME_EMAIL_TEMPLATE_ENHANCED.html'),
  'utf-8'
);

export async function sendWelcomeEmail(user: {
  email: string;
  firstName: string;
  id: string;
}) {
  // Replace variables
  const html = welcomeTemplateHTML
    .replace(/\{\{firstName\}\}/g, user.firstName)
    .replace(/\{\{baseURL\}\}/g, 'https://journalmate.ai/email-assets')
    .replace(/\{\{appURL\}\}/g, 'https://app.journalmate.ai')
    .replace(/\{\{unsubscribeURL\}\}/g, `https://app.journalmate.ai/unsubscribe?token=${user.id}`)
    .replace(/\{\{socialTwitter\}\}/g, 'https://twitter.com/journalmate')
    .replace(/\{\{socialInstagram\}\}/g, 'https://instagram.com/journalmate')
    .replace(/\{\{socialLinkedin\}\}/g, 'https://linkedin.com/company/journalmate');

  await resend.emails.send({
    from: 'JournalMate <noreply@journalmate.ai>',
    to: user.email,
    subject: 'Welcome to JournalMate - Discover Plans Near You! 🔥',
    html: html,
    headers: {
      'X-Entity-Ref-ID': user.id,
    },
  });
}
```

---

## 5️⃣ Resend Dashboard Configuration

### Domain Setup

1. **Add Your Domain:**
   - Go to: **Domains** → **Add Domain**
   - Enter: `journalmate.ai`
   - Follow DNS setup instructions

2. **Add DNS Records:**
   ```
   Type: TXT
   Name: _resend
   Value: [provided by Resend]

   Type: MX
   Name: journalmate.ai
   Value: [provided by Resend]
   Priority: 10
   ```

3. **Verify Domain:**
   - Wait for DNS propagation (5-30 mins)
   - Click "Verify"

### Email From Address

Configure sender:
```
From Name: JournalMate
From Email: noreply@journalmate.ai
Reply-To: support@journalmate.ai
```

### Profile Image

1. Go to **Settings** → **Profile**
2. Upload logo: [`client/public/icons/email/email-profile-100.png`](client/public/icons/email/email-profile-100.png)
3. This appears in:
   - Resend dashboard
   - Some email clients (as sender logo)
   - Gmail sender profile

---

## 6️⃣ Testing Your Email

### Test Email Script

Create `scripts/test-welcome-email.ts`:

```typescript
import { sendWelcomeEmail } from '../server/emailService';

async function testEmail() {
  try {
    await sendWelcomeEmail({
      email: 'your-test-email@gmail.com',
      firstName: 'Test User',
      id: 'test-12345',
    });

    console.log('✅ Test email sent successfully!');
    console.log('Check your inbox at: your-test-email@gmail.com');
  } catch (error) {
    console.error('❌ Error sending test email:', error);
  }
}

testEmail();
```

### Run Test

```bash
# Set your Resend API key
export RESEND_API_KEY=re_xxxxxxxxxxxxx

# Run test
tsx scripts/test-welcome-email.ts
```

### Check Results

1. **Check inbox** (including spam folder)
2. **Verify:**
   - Logo displays correctly
   - Banner image loads
   - All links work
   - Trending plans section looks good
   - Responsive design works on mobile
   - Unsubscribe link is present

---

## 7️⃣ Image URL Reference

### All Email Images with URLs

Once hosted, your URLs will be:

```
Logo/Profile:
https://journalmate.ai/email-assets/email-profile-100.png

Banners:
https://journalmate.ai/email-assets/email-header-1200x400.png
https://journalmate.ai/email-assets/email-header-600x200.png

Email Signatures:
https://journalmate.ai/email-assets/email-signature-150x40.png
https://journalmate.ai/email-assets/email-signature-200x53.png

Social Media (for email footers):
https://journalmate.ai/email-assets/twitter-profile-400.png
https://journalmate.ai/email-assets/instagram-profile-320.png
https://journalmate.ai/email-assets/linkedin-profile-400.png
```

---

## 8️⃣ Template Features Summary

### ✅ What's Included in Enhanced Template

**Branding:**
- ✅ JournalMate logo in header
- ✅ Email banner (1200x400px hero image)
- ✅ Gradient brand colors (#7C3AED → #14B8A6)
- ✅ Professional footer with social links

**Hot Feature - Trending Plans:**
- 🔥 Highlighted with red "HOT FEATURE" badge
- 🌌 Aurora Borealis alerts
- ⚠️ Weather warnings (ice storms, etc.)
- 🎪 Local events
- 🏃 Popular community plans
- Call-to-action: "Explore Trending Plans"

**Community Features:**
- ❤️ Share favorite plans
- 🌍 Browse community plans
- 👫 Group planning
- 📍 Location-based discovery

**The Complete Cycle:**
- 🎯 PLAN - AI creates tasks
- ✅ EXECUTE - Complete with friends
- 📸 REFLECT - Share memories
- 📓 AUTO-JOURNAL - Writes itself

**Social Proof:**
- 10K+ Active Planners
- 50K+ Community Plans
- 98% Satisfaction Rate

**Professional Elements:**
- Responsive design (mobile-optimized)
- Proper email headers
- Unsubscribe link
- Privacy policy link
- Support contact
- Social media links

---

## 9️⃣ Quick Setup Checklist

- [ ] Create Resend account
- [ ] Verify domain (journalmate.ai)
- [ ] Configure sender (noreply@journalmate.ai)
- [ ] Upload logo to Resend profile
- [ ] Host email assets (domain/R2/CDN)
- [ ] Update template with actual URLs
- [ ] Implement in emailService.ts
- [ ] Set RESEND_API_KEY in .env
- [ ] Send test email
- [ ] Verify all images load
- [ ] Test on multiple devices/clients
- [ ] Check spam score
- [ ] Test unsubscribe link
- [ ] Deploy to production

---

## 🎨 Profile Image Best Practices

### For Resend Profile

**Recommended:**
- **File:** email-profile-100.png (100x100px)
- **Format:** PNG with transparency
- **Style:** Simple, recognizable logo
- **Colors:** Match brand (purple/teal)

### For Email Header

**Recommended:**
- **File:** email-header-1200x400.png
- **Format:** PNG or JPG
- **Content:** Hero image or abstract design
- **Text:** Minimal (most text should be HTML)
- **Size:** < 200KB for fast loading

### For Email Body

**Best practices:**
- Use HTML text instead of text in images
- Keep images < 1MB total per email
- Use alt text for all images
- Test with images disabled
- Provide fallback colors

---

## 📧 Email Clients to Test

**Must test in:**
- ✅ Gmail (web + mobile app)
- ✅ Outlook (web + desktop)
- ✅ Apple Mail (Mac + iPhone)
- ✅ Yahoo Mail
- ✅ Protonmail

**Tools for testing:**
- **Litmus** - Email previews
- **Email on Acid** - Cross-client testing
- **Mail Tester** - Spam score check

---

## 🚀 Next Steps

1. **Host your images:**
   ```bash
   # Upload to your server
   scp -r client/public/icons/email/* user@server:/var/www/journalmate.ai/email-assets/
   scp -r client/public/icons/banners/* user@server:/var/www/journalmate.ai/email-assets/banners/
   ```

2. **Update template URLs:**
   - Replace {{baseURL}} with your actual domain
   - Test all image links

3. **Configure Resend:**
   - Add domain
   - Verify DNS
   - Upload profile logo
   - Set sender details

4. **Test thoroughly:**
   - Send to multiple email addresses
   - Check on different devices
   - Verify all links work

5. **Deploy:**
   - Update emailService.ts
   - Set environment variables
   - Deploy to production

---

**Files to Use:**
- ✅ Enhanced Template: [RESEND_WELCOME_EMAIL_TEMPLATE_ENHANCED.html](RESEND_WELCOME_EMAIL_TEMPLATE_ENHANCED.html)
- ✅ Logo: [client/public/icons/email/email-profile-100.png](client/public/icons/email/email-profile-100.png)
- ✅ Banner: [client/public/icons/banners/email-header-1200x400.png](client/public/icons/banners/email-header-1200x400.png)
- ✅ Setup Guide: [RESEND_PROFILE_SETUP.md](RESEND_PROFILE_SETUP.md)
- ✅ Template Guide: [RESEND_TEMPLATE_SETUP.md](RESEND_TEMPLATE_SETUP.md)

---

*Created: 2025-11-12*
*JournalMate Email System - Professional Branding*
