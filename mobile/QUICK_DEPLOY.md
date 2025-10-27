# 🚀 Quick Deploy - Get to App Stores in 3 Days

This guide gets JournalMate into the iOS App Store and Google Play Store as fast as possible.

## Timeline: 3-10 Days to Live Apps

- **Day 1:** Setup accounts & configure (2-3 hours)
- **Day 1-2:** Build apps & create store listings (4-6 hours)
- **Day 2:** Submit to stores
- **Day 3-5:** iOS review (24-48 hours)
- **Day 4-10:** Android review (2-7 days)

---

## Step 1: Create Developer Accounts (30 minutes)

### Apple Developer Account
1. Go to https://developer.apple.com
2. Click "Account" → "Enroll"
3. Pay $99/year
4. **Wait 1-2 days for approval** ⏰

### Google Play Developer Account  
1. Go to https://play.google.com/console
2. Click "Create Developer Account"
3. Pay $25 one-time fee
4. **Approval in 24-48 hours** ⏰

### Expo Account
1. Go to https://expo.dev
2. Sign up (free)
3. Verify email
4. **Ready immediately** ✅

---

## Step 2: Install Tools (5 minutes)

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo
eas login

# Navigate to mobile folder
cd mobile

# Configure project
eas build:configure
```

When prompted:
- "Would you like to create a new project?" → YES
- Project name: **journalmate**
- Organization: (your Expo account)

This generates your Expo project ID and updates `app.config.js`.

---

## Step 3: Build Apps (1 hour + 30-45 min build time)

### Option A: Use Quick Deploy Script (Easiest)
```bash
./deploy.sh
```

Select:
1. Configure EAS project (first time)
2. Build both iOS and Android

### Option B: Manual Commands
```bash
# Build both platforms
eas build --platform all --profile production

# Or build individually:
eas build --platform ios --profile production
eas build --platform android --profile production
```

**What happens:**
- EAS creates cloud builds (no Xcode/Android Studio needed!)
- iOS: Generates certificates automatically
- Android: Creates keystore automatically
- Builds take 30-45 minutes each
- You'll get email notifications when done

---

## Step 4: Create Store Listings (2-3 hours)

### iOS - App Store Connect

1. **Create App**
   - Go to https://appstoreconnect.apple.com
   - Click "My Apps" → "+" → "New App"
   - Platform: iOS
   - Name: JournalMate
   - Primary Language: English
   - Bundle ID: `com.journalmate.app`
   - SKU: `journalmate-ios`

2. **Upload Screenshots**
   Required sizes:
   - iPhone 6.7": 1290 x 2796px (3-10 images)
   - iPhone 6.5": 1284 x 2778px (3-10 images)
   
   Capture from app:
   - Home screen with tasks
   - Planning chat
   - Journal entry
   - Progress dashboard
   - Profile screen

3. **App Information**
   - Description: See `APP_STORE_CHECKLIST.md`
   - Keywords: `journal,planning,AI,tasks,goals,habits,productivity`
   - Category: Productivity
   - Privacy Policy: (create simple page or use generator)
   - Support URL: (your website or email)

4. **App Privacy**
   - Data collected: Email, journal entries, photos
   - Data linked to user: YES
   - Data used for tracking: NO
   - Complete questionnaire honestly

### Android - Google Play Console

1. **Create App**
   - Go to https://play.google.com/console
   - Click "Create app"
   - App name: JournalMate
   - Default language: English
   - Type: App
   - Free/Paid: Free

2. **Store Listing**
   - App icon: 512x512px
   - Feature graphic: 1024x500px
   - Screenshots: 1080 x 1920px (2-8 images)
   - Short description: (80 chars) See checklist
   - Full description: See `APP_STORE_CHECKLIST.md`

3. **Content Rating**
   - Complete questionnaire
   - Expected: Everyone or Teen
   - User-generated content: YES

4. **App Content**
   - Privacy policy: (URL)
   - Ads: NO
   - Target audience: 13+

---

## Step 5: Submit to Stores (30 minutes)

### Update Backend URL First!

Before submitting, update the API URL:

```bash
# Edit mobile/.env.production
EXPO_PUBLIC_API_URL=https://your-app-domain.replit.app
```

### Submit iOS

```bash
eas submit --platform ios
```

Provide when prompted:
- Apple ID: your-email@example.com
- App-specific password: (generate in appleid.apple.com)
- Apple Team ID: (from App Store Connect)

### Submit Android

```bash
eas submit --platform android
```

Upload:
- Build from EAS (downloads automatically)
- Or manually upload `.aab` file

---

## Step 6: Wait for Approval

### iOS Timeline
- **Submission → In Review:** 0-24 hours
- **In Review → Approved/Rejected:** 24-48 hours
- **Total:** 1-3 days typically

Check status: https://appstoreconnect.apple.com

### Android Timeline
- **Submission → Review:** 2-7 days
- **Review → Published:** Same day

Check status: https://play.google.com/console

---

## 🎯 Fast Track Tips

### Speed Up iOS Review
1. Submit Tuesday-Thursday (faster review)
2. Provide demo login if required
3. Add clear notes for reviewers
4. Respond to questions within 2 hours

### Speed Up Android Review
1. Complete ALL required sections
2. Upload high-quality screenshots
3. Use concise, clear descriptions
4. Target API 34+ (latest)

---

## 🐛 Common Issues & Fixes

### "Build failed - iOS signing"
**Fix:** Let EAS manage credentials automatically:
```bash
eas build --platform ios --clear-cache
# Select "Yes" when asked to generate new credentials
```

### "Android build missing keystore"
**Fix:** EAS generates automatically on first build. If issues:
```bash
eas credentials
# Select Android → Keystore → Generate new
```

### "App rejected - privacy policy missing"
**Fix:** Create simple privacy policy:
- Use https://www.freeprivacypolicy.com
- Or write 3 paragraphs about data collection
- Host on Google Docs (set to public)
- Add URL to both stores

### "Screenshots wrong size"
**Fix:** Use these exact dimensions:
- iOS 6.7": 1290 x 2796px
- iOS 6.5": 1284 x 2778px  
- Android: 1080 x 1920px

---

## ✅ Deployment Checklist

Use this to track progress:

**Day 1:**
- [ ] Create Apple Developer account
- [ ] Create Google Play Developer account
- [ ] Create Expo account
- [ ] Install EAS CLI
- [ ] Run `eas build:configure`
- [ ] Start builds: `eas build --platform all`

**Day 2:**
- [ ] Builds complete (check email)
- [ ] Create App Store Connect listing
- [ ] Create Google Play Console listing
- [ ] Upload screenshots (use Simulator/Emulator)
- [ ] Write descriptions
- [ ] Complete privacy questionnaires
- [ ] Update backend API URL in `.env.production`

**Day 2-3:**
- [ ] Submit iOS: `eas submit --platform ios`
- [ ] Submit Android: `eas submit --platform android`
- [ ] Monitor review status
- [ ] Respond to reviewer questions

**Day 3-10:**
- [ ] iOS approved → Click "Release"
- [ ] Android approved → Release to production
- [ ] Apps live in stores! 🎉

---

## 📞 Need Help?

- **EAS Build Issues:** https://docs.expo.dev/build/introduction/
- **Expo Discord:** https://chat.expo.dev
- **App Store Rejection:** Check Apple's guidelines: https://developer.apple.com/app-store/review/guidelines/
- **Google Play Rejection:** Check policy: https://play.google.com/console/about/guides/review/

---

## 🚀 Quick Commands

```bash
# Initial setup
eas login
eas build:configure

# Build & submit (full flow)
eas build --platform all --profile production
eas submit --platform ios
eas submit --platform android

# Check status
eas build:list

# Update app (after first release)
# 1. Bump version in app.config.js
# 2. Build again
# 3. Submit again
```

---

**Ready to start?** Run `./deploy.sh` and select option 1 to begin!

The entire process from zero to live apps takes **3-10 days** if you follow this guide.

Good luck! 🚀
