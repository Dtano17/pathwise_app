# Stripe Branding Setup Guide

## 🎨 Adding Your JournalMate Icon to Stripe Checkout

To display your JournalMate icon in Stripe checkout sessions, follow these steps:

### Step 1: Switch to Live Mode
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. In the top-right corner, toggle from **"Test mode"** to **"Live mode"**
   - The toggle should turn blue when in Live mode
   - Make sure it says "Live mode" (not "Test mode" or "Sandbox")

### Step 2: Upload Brand Icon
1. In Live mode, navigate to **Settings** → **Branding**
2. In the "Brand icon" section, click **"Upload"** or **"Change"**
3. Use one of these options:

   **Option A: Direct URL (Recommended)**
   - Use this URL: `https://journalmate.ai/icons/email/email-logo-512.png`
   - This is a 512x512px high-quality circular purple icon
   
   **Option B: Upload File**
   - Download the icon from the URL above
   - Upload it directly to Stripe
   
4. Click **"Save"** to apply changes

### Step 3: Configure Brand Colors (Optional)
While in **Settings** → **Branding**, you can also set:
- **Brand color**: `#7C3AED` (JournalMate purple)
- **Accent color**: `#14B8A6` (JournalMate emerald)

This ensures checkout pages match your brand identity.

### Step 4: Verify
1. Create a test checkout session in **Live mode**
2. Verify:
   - ✅ No "Sandbox" badge appears
   - ✅ Your JournalMate icon appears in the checkout header
   - ✅ Return URLs redirect to `journalmate.ai` (not `mind-bloom-dennistanaruno.replit.app`)

---

## 🔑 Live Mode API Keys

Make sure you've updated these Replit secrets with **Live** keys (not Test keys):

| Secret Name | Value Format | Where to Find |
|------------|--------------|---------------|
| `STRIPE_SECRET_KEY` | `sk_live_...` | Dashboard → Developers → API keys → Secret key |
| `VITE_STRIPE_PUBLIC_KEY` | `pk_live_...` | Dashboard → Developers → API keys → Publishable key |

**Important:** 
- Test keys start with `sk_test_` / `pk_test_` → Shows "Sandbox" badge ❌
- Live keys start with `sk_live_` / `pk_live_` → Production mode ✅

---

## 🐛 Troubleshooting

### Icon Not Showing?
1. **Clear cache**: Stripe caches branding for ~1 hour
2. **Verify Live mode**: Make sure you uploaded icon in Live mode (not Test mode)
3. **Check URL**: Ensure `https://journalmate.ai/icons/email/email-logo-512.png` is accessible
4. **File size**: Icon should be square (1:1 ratio) and at least 128x128px

### Still Seeing "Sandbox"?
1. Verify you're using **Live** API keys (`sk_live_...` and `pk_live_...`)
2. Restart your application after updating secrets
3. Create a new checkout session (old sessions use cached keys)

### Icon Appears Blurry?
- Use the 512x512px version for best quality
- Ensure the file is PNG (not JPG) for transparency
- Square aspect ratio (1:1) works best

---

## 📝 Production Checklist

Before going live with Stripe:
- [ ] Switched to Live mode in Stripe Dashboard
- [ ] Updated `STRIPE_SECRET_KEY` with live key (`sk_live_...`)
- [ ] Updated `VITE_STRIPE_PUBLIC_KEY` with live key (`pk_live_...`)
- [ ] Uploaded JournalMate icon in Live mode branding
- [ ] Tested checkout session (no "Sandbox" badge)
- [ ] Verified return URLs use `journalmate.ai`
- [ ] Configured webhook endpoints for production

---

## 🔗 Useful Links

- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe Branding Settings](https://dashboard.stripe.com/settings/branding)
- [JournalMate Icon (512x512)](https://journalmate.ai/icons/email/email-logo-512.png)
- [Stripe API Keys](https://dashboard.stripe.com/apikeys)
