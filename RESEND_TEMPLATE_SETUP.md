# Resend Email Template Setup Guide

Complete guide for uploading and configuring the professional JournalMate welcome email template in Resend.

---

## Prerequisites

Before you begin, ensure you have:
- ✅ Resend account with verified `journalmate.ai` domain
- ✅ Generated email template: `RESEND_WELCOME_EMAIL_TEMPLATE.html`
- ✅ Uploaded profile image: `client/public/icons/email/email-profile-100.png`
- ✅ Google Workspace configured with `support@journalmate.ai` mailbox

---

## Option 1: Use Template in Code (Recommended)

### Step 1: Update emailService.ts

Replace the existing `getWelcomeEmailHTML()` function with the new template.

**File:** `server/emailService.ts`

```typescript
function getWelcomeEmailHTML(firstName: string = 'there'): string {
  // Read the template file content (copy from RESEND_WELCOME_EMAIL_TEMPLATE.html)
  const templateHTML = `...` // Paste full HTML template here

  // Replace dynamic variables
  const baseURL = getBaseURL();
  const appURL = baseURL || 'https://journalmate.ai';

  return templateHTML
    .replace(/{{firstName}}/g, firstName)
    .replace(/{{baseURL}}/g, baseURL)
    .replace(/{{appURL}}/g, appURL)
    .replace(/{{unsubscribeURL}}/g, `${appURL}/unsubscribe`);
}
```

### Step 2: Test the Email

```bash
# Send test email via your API
curl -X POST http://localhost:5000/api/test-welcome-email \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com", "firstName": "Test"}'
```

---

## Option 2: Upload to Resend Dashboard

### Step 1: Access Resend Templates

1. Log in to [Resend Dashboard](https://resend.com/dashboard)
2. Navigate to **Templates** in the left sidebar
3. Click **Create Template**

### Step 2: Create Welcome Email Template

**Template Details:**
- **Name:** `JournalMate Welcome Email`
- **Subject:** `Welcome to JournalMate, {{firstName}}! 🎯 Transform Goals Into Reality`
- **From:** `JournalMate <noreply@journalmate.ai>`
- **Reply-To:** `support@journalmate.ai`

### Step 3: Upload HTML Content

1. Click **HTML Editor**
2. Copy the entire contents of `RESEND_WELCOME_EMAIL_TEMPLATE.html`
3. Paste into the editor
4. Click **Save Template**

### Step 4: Configure Dynamic Variables

Resend supports Handlebars syntax for variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{firstName}}` | User's first name | "John" |
| `{{baseURL}}` | Application base URL | "https://journalmate.ai" |
| `{{appURL}}` | App URL for CTAs | "https://journalmate.ai" |
| `{{unsubscribeURL}}` | Unsubscribe link | "https://journalmate.ai/unsubscribe" |

### Step 5: Test Template

1. Click **Send Test Email** in Resend dashboard
2. Enter your email address
3. Fill in sample variable values:
   ```json
   {
     "firstName": "Test",
     "baseURL": "https://journalmate.ai",
     "appURL": "https://journalmate.ai",
     "unsubscribeURL": "https://journalmate.ai/unsubscribe"
   }
   ```
4. Click **Send Test**
5. Check your inbox (Gmail, Outlook, etc.)

### Step 6: Use Template in API Calls

**Node.js Example:**
```javascript
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'JournalMate <noreply@journalmate.ai>',
  to: 'user@example.com',
  subject: 'Welcome to JournalMate, John! 🎯 Transform Goals Into Reality',
  html: getWelcomeEmailHTML('John'), // Your template function
  replyTo: 'support@journalmate.ai'
});
```

**Or use template ID:**
```javascript
await resend.emails.send({
  from: 'JournalMate <noreply@journalmate.ai>',
  to: 'user@example.com',
  template: 'journalmate-welcome', // Template slug from Resend
  variables: {
    firstName: 'John',
    baseURL: 'https://journalmate.ai',
    appURL: 'https://journalmate.ai',
    unsubscribeURL: 'https://journalmate.ai/unsubscribe'
  },
  replyTo: 'support@journalmate.ai'
});
```

---

## Dynamic Variable Configuration

### Environment Variables (Replit Secrets)

Ensure these are set:

| Variable | Value | Purpose |
|----------|-------|---------|
| `RESEND_API_KEY` | `re_...` | Resend authentication |
| `RESEND_FROM_EMAIL` | `noreply@journalmate.ai` | FROM address |
| `SENDGRID_FROM_EMAIL` | `support@journalmate.ai` | SendGrid FROM address |
| `PUBLIC_BASE_URL` | `https://journalmate.ai` | Base URL for images |

### Resend Dashboard Configuration

**Domain Settings:**
- Domain: `journalmate.ai`
- Status: ✅ Verified
- FROM Email: `noreply@journalmate.ai`
- Reply-To: `support@journalmate.ai`
- Sender Name: `JournalMate`

**Profile Image:**
- Upload: `client/public/icons/email/email-profile-100.png`
- Location: Settings → Sender Identity → Profile Picture

---

## Email Client Testing

### Required Testing Checklist

Test the email template in these clients:

- [ ] **Gmail** (Desktop & Mobile)
- [ ] **Outlook** (Desktop & Web)
- [ ] **Apple Mail** (macOS & iOS)
- [ ] **Yahoo Mail**
- [ ] **Thunderbird**
- [ ] **Mobile Gmail App** (Android & iOS)
- [ ] **Mobile Outlook App**

### Testing Tools

**Online Validators:**
- [Litmus](https://www.litmus.com/) - Email testing platform
- [Email on Acid](https://www.emailonacid.com/) - Preview across clients
- [Mail Tester](https://www.mail-tester.com/) - Spam score check

**Browser-Based Testing:**
- Open HTML file in browser
- Use browser dev tools for mobile simulation
- Check responsive breakpoints (600px)

---

## Troubleshooting

### Images Not Loading

**Issue:** Logo or icons don't appear in email

**Solutions:**
1. **Check image URLs:**
   - Ensure `{{baseURL}}` is set correctly
   - Use absolute URLs: `https://journalmate.ai/journalmate-logo-transparent.png`
   - Verify images are accessible publicly

2. **Update baseURL in code:**
   ```typescript
   const baseURL = process.env.PUBLIC_BASE_URL || 'https://journalmate.ai';
   ```

3. **Test image access:**
   ```bash
   curl -I https://journalmate.ai/journalmate-logo-transparent.png
   # Should return 200 OK
   ```

### Formatting Issues in Outlook

**Issue:** Layout broken in Outlook

**Solutions:**
- Template uses table-based layout (Outlook-compatible)
- Inline CSS already applied
- MSO conditional comments included
- If issues persist, test with [PutsMail](https://putsmail.com/)

### Variables Not Replacing

**Issue:** `{{firstName}}` appears literally in email

**Solutions:**
1. **Check variable syntax:**
   - Resend: Use `{{firstName}}`
   - Custom function: Use `.replace(/{{firstName}}/g, firstName)`

2. **Verify API call:**
   ```javascript
   // Ensure variables are passed
   variables: {
     firstName: 'John' // NOT firstName: '{{firstName}}'
   }
   ```

### Gmail Clipping Message

**Issue:** Gmail shows "[Message clipped]" warning

**Solutions:**
- Current template is ~18KB (Gmail clips at 102KB)
- No action needed - template is well under limit
- If needed: Remove whitespace, minify HTML

---

## Best Practices

### Email Deliverability

✅ **Do:**
- Use verified domain (`journalmate.ai`)
- Include unsubscribe link
- Set proper FROM and Reply-To addresses
- Test spam score before sending
- Include plain text version (optional)

❌ **Don't:**
- Use all caps in subject lines
- Overuse exclamation marks!!!
- Include suspicious links
- Send without unsubscribe option

### Content Guidelines

✅ **Do:**
- Keep subject line under 50 characters
- Front-load important information
- Use clear, actionable CTAs
- Include alt text for images
- Test on mobile devices

❌ **Don't:**
- Use excessive emojis (current template is balanced)
- Make text too small (<14px)
- Rely solely on images for content
- Use complex CSS (stick to inline styles)

---

## Integration Examples

### Send Welcome Email on User Registration

**File:** `server/routes.ts` or `server/emailService.ts`

```typescript
app.post("/api/auth/register", async (req, res) => {
  try {
    // Create user account
    const user = await storage.createUser({
      email: req.body.email,
      firstName: req.body.firstName,
      // ...
    });

    // Send welcome email
    await sendWelcomeEmail(user.email, user.firstName);

    res.json({ success: true, userId: user.id });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});
```

### Batch Send for Testing

```typescript
const testEmails = [
  { email: 'test1@example.com', firstName: 'Alice' },
  { email: 'test2@example.com', firstName: 'Bob' },
  { email: 'test3@example.com', firstName: 'Charlie' }
];

for (const recipient of testEmails) {
  await sendWelcomeEmail(recipient.email, recipient.firstName);
  console.log(`Sent to ${recipient.email}`);
}
```

---

## Performance Optimization

### Image Optimization

Current logo files are already optimized:
- `journalmate-logo-transparent.png`: 1024x1024 (source)
- `journalmate-logo-email.png`: 301x78 (47KB, optimized)
- Used in email at 80x80 (desktop) / 60x60 (mobile)

### HTML Minification (Optional)

To reduce email size:

```bash
# Install html-minifier
npm install -g html-minifier

# Minify template
html-minifier --collapse-whitespace --remove-comments \
  RESEND_WELCOME_EMAIL_TEMPLATE.html > template.min.html
```

---

## Monitoring & Analytics

### Track Email Performance

**Metrics to monitor:**
- Open rate (industry average: 20-25%)
- Click-through rate (CTAs)
- Bounce rate (keep under 2%)
- Spam complaints (keep under 0.1%)

**Resend Analytics:**
- Dashboard → Analytics → Email Stats
- View opens, clicks, bounces per email
- Filter by date range

### A/B Testing Ideas

Test variations:
1. **Subject lines:** With/without emoji
2. **CTA placement:** Top vs. bottom
3. **Content length:** Short vs. comprehensive
4. **Personalization:** Generic vs. personalized

---

## Support & Resources

**Resend Documentation:**
- [Sending Emails](https://resend.com/docs/send-email)
- [Email Templates](https://resend.com/docs/templates)
- [Dynamic Variables](https://resend.com/docs/templates/variables)
- [Domain Verification](https://resend.com/docs/dashboard/domains/introduction)

**JournalMate Email Docs:**
- [Email Configuration](./EMAIL_CONFIGURATION.md) - Coming soon
- [Google Workspace Setup](./GOOGLE_WORKSPACE_EMAIL_SETUP.md) - See next file
- [Branding Guide](./BRANDING_README.md) - Complete branding assets

**Need Help?**
- Resend Support: support@resend.com
- Resend Discord: [Join community](https://resend.com/discord)
- JournalMate Team: support@journalmate.ai

---

**Last Updated:** November 2025
**Version:** 1.0
**Template File:** `RESEND_WELCOME_EMAIL_TEMPLATE.html`
