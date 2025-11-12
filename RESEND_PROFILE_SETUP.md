# Resend Email Sender Profile Setup

Complete guide for configuring the JournalMate email sender profile image in Resend.

## Overview

The email sender profile image appears in email clients (like Gmail) when recipients receive emails from `noreply@journalmate.ai`. This image must be uploaded directly to the Resend Dashboard—it cannot be configured via code.

---

## Profile Image Location

**Generated Icon:**
```
client/public/icons/email/email-profile-100.png
```

**Specifications:**
- Size: 100x100 pixels
- Format: PNG-24 with alpha channel (transparent background)
- Quality: Optimized for email clients
- Brand: Purple sparkle icon centered on transparent background

---

## Setup Instructions

### Step 1: Access Resend Dashboard

1. Navigate to [Resend Dashboard](https://resend.com/dashboard)
2. Log in with your Resend account credentials
3. Ensure you're in the correct workspace/project

### Step 2: Navigate to Email Settings

1. From the main dashboard, click on **"Settings"** or **"Domains"** in the left sidebar
2. Select your verified domain: `journalmate.ai`
3. Look for **"Sender Configuration"** or **"Email Sender Settings"**

### Step 3: Upload Profile Image

1. Find the **"Sender Profile Image"** or **"Avatar"** upload section
2. Click **"Upload Image"** or drag-and-drop
3. Select the file: `client/public/icons/email/email-profile-100.png`
4. Crop/adjust if needed (should be centered already)
5. Click **"Save"** or **"Upload"**

### Step 4: Configure Sender Details

Make sure the following sender details are configured:

| Field | Value |
|-------|-------|
| **From Name** | `JournalMate` |
| **From Email** | `noreply@journalmate.ai` |
| **Reply-To** | `support@journalmate.ai` (if different) |
| **Profile Image** | `email-profile-100.png` (uploaded) |

### Step 5: Verify Configuration

1. Send a test email using the Resend API:
   ```bash
   curl -X POST https://api.resend.com/emails \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "from": "noreply@journalmate.ai",
       "to": "your-email@example.com",
       "subject": "Test Email - Profile Image",
       "html": "<p>This is a test email to verify the sender profile image.</p>"
     }'
   ```

2. Check your inbox (Gmail recommended for testing)
3. Verify the profile image appears next to the sender name

---

## Email Template Integration

The JournalMate logo is already integrated into email templates via `server/emailService.ts`:

### Current Logo Usage

**File:** `server/emailService.ts` (Line 55)
```typescript
const logoURL = baseURL ? `${baseURL}/journalmate-logo-email.png` : '';
```

**Email Template:** (Line 123)
```typescript
<img src="${logoURL}" alt="JournalMate" style="width: 150px; height: auto; margin-bottom: 20px;">
```

**Location:** `client/public/journalmate-logo-email.png` (47KB, optimized)

### Available Logo Assets

If you want to update the email template logo, you can use:

| Asset | Size | Purpose | Transparent |
|-------|------|---------|-------------|
| `journalmate-logo-email.png` | 301x78 | Current (horizontal logo) | No |
| `icons/email/email-signature-150x40.png` | 150x40 | Email signature | No (gradient) |
| `icons/email/email-signature-200x53.png` | 200x53 | Email signature @2x | No (gradient) |
| `journalmate-logo-transparent.png` | 1024x1024 | High-res square | Yes |

**Note:** The current `journalmate-logo-email.png` is already optimized and looks good in emails. Only change if you want a different logo style.

---

## Troubleshooting

### Profile Image Not Appearing

**Issue:** Profile image doesn't show in Gmail after upload

**Solutions:**
1. **Wait for propagation:** Email profile images can take 15-30 minutes to propagate across email clients
2. **Clear cache:** Clear Gmail cache or test with an incognito window
3. **Check file format:** Ensure the image is PNG format (not JPG or WebP)
4. **Size limits:** Verify image is under 5MB (ours is ~5KB, well within limits)
5. **Try different email clients:** Test with Outlook, Apple Mail, etc.

### Wrong Image Displaying

**Issue:** Old logo or generic avatar appears

**Solutions:**
1. **Refresh Resend dashboard:** Hard refresh the page (Ctrl+F5)
2. **Re-upload:** Delete existing profile image and upload again
3. **Check domain verification:** Ensure `journalmate.ai` is verified in Resend
4. **Contact Resend support:** If issue persists after 24 hours

### Image Appears Blurry

**Issue:** Profile image looks pixelated in email clients

**Solutions:**
1. **Use higher resolution:** Upload `journalmate-logo-transparent.png` (1024x1024) instead
2. **Resend will auto-resize:** Most email clients display at 40-80px, but uploading higher resolution ensures crisp rendering
3. **Verify export quality:** Ensure PNG is exported at 100% quality

---

## Email Client Support

Profile images display differently across email clients:

| Email Client | Profile Image Support | Notes |
|--------------|----------------------|-------|
| **Gmail** | ✅ Full support | Displays 40x40px next to sender name |
| **Outlook** | ✅ Full support | Displays in reading pane and inbox |
| **Apple Mail** | ✅ Full support | Shows in message list and detail view |
| **Yahoo Mail** | ✅ Full support | Displays with sender info |
| **Proton Mail** | ⚠️ Limited | May not display custom sender images |
| **Thunderbird** | ⚠️ Limited | Requires manual configuration |
| **Mobile Clients** | ✅ Full support | iOS Mail, Gmail app, Outlook app |

---

## Best Practices

### Profile Image Guidelines

- ✅ **Size:** 100x100px to 200x200px (we use 100x100)
- ✅ **Format:** PNG with transparent background
- ✅ **Content:** Simple, recognizable logo (no text)
- ✅ **Color:** High contrast for visibility
- ✅ **File size:** Under 100KB (ours is ~5KB)
- ❌ **Avoid:** Complex designs that don't scale well
- ❌ **Avoid:** Text-heavy logos (unreadable at small sizes)

### Brand Consistency

Ensure all email assets match the brand:

- **Profile image:** Purple sparkle icon (transparent)
- **Email template logo:** Horizontal logo with text
- **Brand colors:** Purple (#7C3AED) to Teal (#14B8A6) gradient
- **Tagline:** "Transform Goals Into Reality"

---

## API Configuration

**Important:** The sender profile image is managed in the Resend Dashboard, **not** via API.

### Current Email Service Configuration

**File:** `server/emailService.ts`

The email service already correctly references the sender:
```typescript
from: `JournalMate <${fromEmail}>` // Line 346
```

Where `fromEmail` is configured via environment variables:
```typescript
const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@journalmate.ai';
```

**No code changes needed** for profile image—it's purely dashboard configuration.

---

## Verification Checklist

After completing setup, verify:

- [ ] Profile image uploaded to Resend Dashboard
- [ ] Domain `journalmate.ai` verified in Resend
- [ ] Sender name set to `JournalMate`
- [ ] Sender email set to `noreply@journalmate.ai`
- [ ] Test email sent and received
- [ ] Profile image appears in Gmail
- [ ] Profile image appears in Outlook
- [ ] Profile image visible on mobile clients
- [ ] Logo in email template renders correctly
- [ ] All email links work (unsubscribe, etc.)

---

## Additional Resources

### Resend Documentation
- [Resend API Docs](https://resend.com/docs)
- [Domain Verification](https://resend.com/docs/dashboard/domains/introduction)
- [Email Best Practices](https://resend.com/docs/knowledge-base/email-best-practices)

### Icon Generation
- Run: `npm run generate:icons` to regenerate all icons
- See: [BRANDING_README.md](./BRANDING_README.md) for complete branding guide
- See: [ICON_QUICK_REFERENCE.md](./ICON_QUICK_REFERENCE.md) for size specifications

### Support
- **Resend Support:** support@resend.com
- **Resend Discord:** [Join community](https://resend.com/discord)
- **Dashboard:** https://resend.com/dashboard

---

## Summary

1. **Profile Image:** Upload `client/public/icons/email/email-profile-100.png` to Resend Dashboard
2. **Location:** Settings → Domains → journalmate.ai → Sender Profile Image
3. **Verification:** Send test email and check Gmail inbox
4. **No code changes needed:** Profile image is dashboard-only configuration

**File to upload:**
```
client/public/icons/email/email-profile-100.png
```

**Expected result:** Professional purple sparkle icon appears next to "JournalMate" sender name in all email clients.

---

**Last Updated:** November 2025
**Version:** 1.0
**Related Docs:** BRANDING_README.md, ICON_SPECIFICATIONS.md, ICON_QUICK_REFERENCE.md
