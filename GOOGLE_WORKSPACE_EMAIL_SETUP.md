# Google Workspace Email Setup for JournalMate

Complete guide for setting up `support@journalmate.ai` and email aliases in Google Workspace.

---

## Overview

This guide will help you configure a professional email setup for JournalMate using Google Workspace with the following structure:

**Primary Mailbox:**
- `support@journalmate.ai` - Main support inbox (actual mailbox)

**Email Aliases** (all route to support@journalmate.ai):
- `noreply@journalmate.ai` - Transactional emails FROM address
- `privacy@journalmate.ai` - Privacy inquiries
- `dpo@journalmate.ai` - Data Protection Officer
- `delete@journalmate.ai` - Account deletion requests
- `demo@journalmate.ai` - Demo account email

**Benefits:**
✅ Single inbox to monitor
✅ Professional appearance with specialized addresses
✅ Easy to manage without multiple inboxes
✅ GDPR-compliant contact structure

---

## Prerequisites

Before you begin, ensure you have:
- ✅ Google Workspace account with admin access
- ✅ Domain `journalmate.ai` verified in Google Workspace
- ✅ Billing set up (Google Workspace subscription active)

---

## Step 1: Create Primary Support Mailbox

### 1.1 Access Google Admin Console

1. Go to [Google Admin Console](https://admin.google.com/)
2. Sign in with your admin account
3. Navigate to **Users** in the left sidebar

### 1.2 Add New User

1. Click **Add new user** button
2. Fill in user details:

| Field | Value |
|-------|-------|
| **First name** | Support |
| **Last name** | JournalMate |
| **Primary email** | `support@journalmate.ai` |
| **Password** | Generate secure password (save it!) |

3. Click **Add new user**
4. Note the password provided

### 1.3 Configure User Settings

1. Click on the newly created `support@journalmate.ai` user
2. Navigate to **Account** tab
3. Configure:
   - **Status:** Active
   - **2-Step Verification:** Enabled (recommended)
   - **Recovery email:** Your personal email
   - **Recovery phone:** Your phone number

---

## Step 2: Add Email Aliases

### 2.1 Access User Aliases

1. In Google Admin Console, click on `support@journalmate.ai` user
2. Scroll down to **User information** section
3. Click on **Email aliases**

### 2.2 Add Each Alias

Click **Add alias** for each of these:

| Alias Email | Purpose |
|-------------|---------|
| `noreply@journalmate.ai` | Transactional email sender (Resend FROM address) |
| `privacy@journalmate.ai` | Privacy policy inquiries |
| `dpo@journalmate.ai` | Data Protection Officer (GDPR compliance) |
| `delete@journalmate.ai` | Account deletion requests |
| `demo@journalmate.ai` | Demo account email |

**Steps for each alias:**
1. Click **Add alias**
2. Enter alias (e.g., `noreply`)
3. Select domain: `@journalmate.ai`
4. Click **Save**

### 2.3 Verify Aliases

After adding all aliases, verify they appear in the list:
- support@journalmate.ai (primary)
- noreply@journalmate.ai (alias)
- privacy@journalmate.ai (alias)
- dpo@journalmate.ai (alias)
- delete@journalmate.ai (alias)
- demo@journalmate.ai (alias)

---

## Step 3: Configure Gmail Inbox

### 3.1 Access Support Mailbox

1. Go to [Gmail](https://mail.google.com/)
2. Sign in as `support@journalmate.ai`
3. Use the password from Step 1.2

### 3.2 Enable IMAP/POP (Optional)

For email client access (Outlook, Thunderbird):

1. Click **Settings** (gear icon) → **See all settings**
2. Navigate to **Forwarding and POP/IMAP** tab
3. **IMAP Access:** Enable IMAP
4. **POP Download:** Enable POP (if needed)
5. Click **Save Changes**

### 3.3 Create Filters (Recommended)

Organize emails from different aliases:

**Filter for Transactional Emails (from noreply@):**
1. Click **Settings** → **See all settings** → **Filters and Blocked Addresses**
2. Click **Create a new filter**
3. **To:** `noreply@journalmate.ai`
4. Click **Create filter**
5. **Apply label:** `Transactional`
6. **Skip Inbox (Archive it):** Optional
7. Click **Create filter**

**Filter for Privacy Requests:**
1. **To:** `privacy@journalmate.ai` OR `dpo@journalmate.ai` OR `delete@journalmate.ai`
2. **Apply label:** `Privacy & Legal`
3. **Star it:** Yes
4. Click **Create filter**

### 3.4 Set Up Signature

Create a professional email signature:

1. **Settings** → **See all settings** → **General** → **Signature**
2. Click **Create new** → Name it "Support"
3. Add signature:

```
Best regards,
JournalMate Support Team

support@journalmate.ai
https://journalmate.ai

Transform Goals Into Reality
```

4. Click **Save Changes**

---

## Step 4: Configure Sending Options

### 4.1 "Send mail as" Configuration

To send emails FROM aliases:

1. **Settings** → **See all settings** → **Accounts and Import**
2. **Send mail as** section
3. Click **Add another email address**
4. For each alias:
   - **Name:** JournalMate (or specific: "JournalMate Privacy Team")
   - **Email address:** `noreply@journalmate.ai` (or other alias)
   - **Treat as an alias:** ✅ Checked
   - Click **Next Step** → **Send Verification**
5. Verify each alias (check support inbox for verification email)

### 4.2 Set Default "From" Address

1. In **Send mail as** section
2. Select default: `support@journalmate.ai`
3. This will be the default sender for manual emails

---

## Step 5: Domain Verification for Resend

### 5.1 Add DNS Records

To use your domain with Resend, add these DNS records:

**Access your domain registrar** (Google Domains, GoDaddy, etc.):

1. Log in to your domain provider
2. Navigate to DNS settings for `journalmate.ai`

**Add TXT Record for Domain Verification:**

| Type | Name | Value |
|------|------|-------|
| TXT | `@` | `resend-verification=XXXXX` (provided by Resend) |

**Add CNAME Records for Email Sending:**

| Type | Name | Value |
|------|------|-------|
| CNAME | `resend` | `send.resend.com` |
| CNAME | `resend._domainkey` | `resend._domainkey.resend.com` |

**Add MX Records (If using Resend for receiving):**
- Not needed if using Google Workspace for receiving emails
- Keep existing Google Workspace MX records

### 5.2 Verify Domain in Resend

1. Go to [Resend Dashboard](https://resend.com/dashboard)
2. Navigate to **Domains** → **Add Domain**
3. Enter: `journalmate.ai`
4. Follow verification steps (DNS records above)
5. Wait 5-30 minutes for propagation
6. Click **Verify Domain**
7. Status should show: ✅ **Verified**

---

## Step 6: Configure SendGrid (Optional)

If using SendGrid for group invites:

### 6.1 Verify Domain in SendGrid

1. Log in to [SendGrid Dashboard](https://app.sendgrid.com/)
2. Navigate to **Settings** → **Sender Authentication**
3. Click **Verify a Single Sender** or **Domain Authentication**
4. Follow steps to add DNS records (similar to Resend)

### 6.2 Set FROM Email

In Replit Secrets:
```
SENDGRID_FROM_EMAIL=support@journalmate.ai
```

---

## Step 7: Test Email Configuration

### 7.1 Test Sending from Aliases

**Test noreply@ (Transactional):**
```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer YOUR_RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "JournalMate <noreply@journalmate.ai>",
    "to": "your-email@example.com",
    "subject": "Test Email from noreply",
    "html": "<p>This is a test from noreply@journalmate.ai</p>"
  }'
```

**Test support@ (Direct):**
Send email manually from Gmail inbox

**Test privacy@ (Alias):**
Send email to `privacy@journalmate.ai` → should arrive in support inbox

### 7.2 Verify Reply-To Works

1. Send test email from `noreply@journalmate.ai` with `Reply-To: support@journalmate.ai`
2. Reply to the email
3. Verify reply arrives in `support@journalmate.ai` inbox

### 7.3 Check Spam Score

Use [Mail Tester](https://www.mail-tester.com/):
1. Send test email to the address provided
2. Check spam score (should be 8/10 or higher)
3. Fix any issues identified

---

## Step 8: Team Access Configuration

### 8.1 Grant Access to Team Members

**Option A: Delegate Access** (Recommended)
1. In Gmail as `support@journalmate.ai`
2. **Settings** → **Accounts** → **Grant access to your account**
3. Add team member emails:
   - `your-email@gmail.com`
   - `team-member@company.com`
4. Team members can access via Gmail's account switcher

**Option B: Shared Mailbox**
1. Create Google Group: `support-team@journalmate.ai`
2. Add team members to group
3. Configure group to receive emails sent to `support@journalmate.ai`

### 8.2 Set Up 2-Factor Authentication

For security:
1. **Admin Console** → **Security** → **2-Step Verification**
2. **Enforcement:** On (for all users)
3. Configure backup options (SMS, backup codes)

---

## Email Alias Routing Summary

Here's how emails will flow:

### Incoming Emails

| Sent To | Routes To | Purpose |
|---------|-----------|---------|
| `support@journalmate.ai` | support inbox | Direct support requests |
| `noreply@journalmate.ai` | support inbox | Delivery failures, bounces |
| `privacy@journalmate.ai` | support inbox | Privacy inquiries |
| `dpo@journalmate.ai` | support inbox | Data protection requests |
| `delete@journalmate.ai` | support inbox | Account deletion requests |
| `demo@journalmate.ai` | support inbox | Demo account emails |

### Outgoing Emails

| FROM Address | Used For | Reply-To |
|--------------|----------|----------|
| `noreply@journalmate.ai` | Transactional (Resend) | `support@journalmate.ai` |
| `support@journalmate.ai` | Direct support replies | `support@journalmate.ai` |
| `support@journalmate.ai` | SendGrid invites | `support@journalmate.ai` |

---

## Troubleshooting

### Issue: Emails Not Arriving

**Problem:** Emails sent to aliases don't appear in support inbox

**Solutions:**
1. **Verify alias configuration:**
   - Admin Console → Users → support@journalmate.ai → Email aliases
   - Confirm all aliases are listed

2. **Check Gmail filters:**
   - Settings → Filters → Check if emails are being filtered incorrectly

3. **Test with direct send:**
   ```bash
   echo "Test" | mail -s "Test Alias" privacy@journalmate.ai
   ```

### Issue: Can't Send FROM Alias

**Problem:** Gmail won't let you send from `noreply@journalmate.ai`

**Solutions:**
1. **Complete "Send mail as" setup** (Step 4.1)
2. **Verify the alias email** (check support inbox for verification link)
3. **Wait 5-10 minutes** for Google to process

### Issue: Emails Going to Spam

**Problem:** Sent emails land in recipient spam folders

**Solutions:**
1. **Verify SPF record:**
   ```bash
   dig TXT journalmate.ai | grep spf
   ```
   Should include: `v=spf1 include:_spf.google.com include:resend.com ~all`

2. **Verify DKIM:**
   - Check Resend Dashboard → Domains → DKIM Status: ✅

3. **Check DMARC:**
   Add DMARC record:
   ```
   Type: TXT
   Name: _dmarc
   Value: v=DMARC1; p=none; rua=mailto:support@journalmate.ai
   ```

4. **Warm up sending domain:**
   - Start with low volume (10-20 emails/day)
   - Gradually increase over 2-3 weeks

### Issue: Domain Not Verifying in Resend

**Problem:** DNS records added but domain won't verify

**Solutions:**
1. **Wait for propagation:** Can take up to 48 hours (usually 5-30 minutes)
2. **Check DNS propagation:**
   ```bash
   dig TXT journalmate.ai
   dig CNAME resend.journalmate.ai
   ```
3. **Clear DNS cache:**
   ```bash
   # macOS/Linux
   sudo dscacheutil -flushcache

   # Windows
   ipconfig /flushdns
   ```

---

## Security Best Practices

### Email Security Checklist

- [ ] **2-Factor Authentication** enabled for support account
- [ ] **Recovery email** and phone configured
- [ ] **Admin Console audit** log enabled
- [ ] **Strong password** (16+ characters, mixed case, symbols)
- [ ] **Session management** reviewed (sign out unused sessions)
- [ ] **Less secure app access** disabled
- [ ] **DKIM signing** enabled (Resend/SendGrid)
- [ ] **SPF record** configured correctly

### Compliance Requirements

**GDPR Compliance:**
- ✅ Privacy email configured (`privacy@` and `dpo@`)
- ✅ Data deletion process documented
- ✅ Support contact publicly listed
- ✅ Unsubscribe links in all emails

**CAN-SPAM Compliance:**
- ✅ Physical address in emails (optional but recommended)
- ✅ Unsubscribe mechanism functional
- ✅ Sender identification clear

---

## Monitoring & Maintenance

### Weekly Tasks

- [ ] Check support inbox daily
- [ ] Review filtered emails (Privacy & Legal label)
- [ ] Monitor bounce rates (Resend dashboard)
- [ ] Check spam complaints (keep under 0.1%)

### Monthly Tasks

- [ ] Review email analytics (open rates, CTR)
- [ ] Update email templates if needed
- [ ] Audit user access permissions
- [ ] Check DNS records still valid

### Quarterly Tasks

- [ ] Review email security settings
- [ ] Update passwords
- [ ] Audit email aliases (add/remove as needed)
- [ ] Test disaster recovery (account recovery process)

---

## Cost Breakdown

### Google Workspace Pricing

**Business Starter:**
- $6/user/month
- 30GB storage per user
- Custom email (`@journalmate.ai`)
- ✅ Recommended for small teams

**Business Standard:**
- $12/user/month
- 2TB storage per user
- Enhanced admin controls
- ⚠️ Optional for growth

**Free Trial:**
- 14 days free
- No credit card required

### Resend Pricing

**Free Tier:**
- 3,000 emails/month
- 100 emails/day
- ✅ Good for starting out

**Pro Plan:**
- $20/month
- 50,000 emails/month
- Dedicated IP optional
- ⚠️ Upgrade when needed

**Total Estimated Monthly Cost:**
- Google Workspace: $6/month
- Resend (free tier): $0/month
- **Total: $6/month** to start

---

## Next Steps

After completing this setup:

1. ✅ **Test all email flows** (send, receive, reply)
2. ✅ **Update environment variables** in Replit Secrets
3. ✅ **Configure Resend profile image** ([See guide](./RESEND_PROFILE_SETUP.md))
4. ✅ **Upload welcome email template** ([See guide](./RESEND_TEMPLATE_SETUP.md))
5. ✅ **Train team members** on using support inbox
6. ✅ **Document response templates** for common inquiries
7. ✅ **Set up email auto-responders** (optional)

---

## Support Resources

**Google Workspace Help:**
- [Admin Console Help](https://support.google.com/a)
- [Email Alias Documentation](https://support.google.com/a/answer/33327)
- [Domain Verification](https://support.google.com/a/answer/60216)

**Resend Documentation:**
- [Domain Setup](https://resend.com/docs/dashboard/domains/introduction)
- [Sending Emails](https://resend.com/docs/send-email)
- [Email Best Practices](https://resend.com/docs/knowledge-base/email-best-practices)

**JournalMate Guides:**
- [Resend Template Setup](./RESEND_TEMPLATE_SETUP.md)
- [Resend Profile Setup](./RESEND_PROFILE_SETUP.md)
- [Branding Guide](./BRANDING_README.md)

**Need Help?**
- Google Workspace Support: [Contact support](https://support.google.com/a/contact)
- Resend Support: support@resend.com
- JournalMate Setup Questions: Open a GitHub issue

---

**Last Updated:** November 2025
**Version:** 1.0
**Requires:** Google Workspace account + journalmate.ai domain
