# JournalMate Mobile App - Deployment Guide

## Prerequisites

### Required Accounts
1. **Apple Developer Account** ($99/year)
   - Sign up at https://developer.apple.com
   - Complete enrollment process (takes 1-2 days)
   
2. **Google Play Developer Account** ($25 one-time)
   - Sign up at https://play.google.com/console
   - Complete registration

3. **Expo Account** (Free)
   - Sign up at https://expo.dev
   - Install EAS CLI: `npm install -g eas-cli`

## Step 1: Initial Setup

### Install EAS CLI
```bash
npm install -g eas-cli
```

### Login to Expo
```bash
eas login
```

### Configure EAS Project
```bash
cd mobile
eas build:configure
```

This will:
- Create a new Expo project (or link to existing)
- Generate a project ID
- Update app.config.js automatically

## Step 2: Configure App Identifiers

### iOS Bundle Identifier
Already configured in `app.config.js`:
```
bundleIdentifier: "com.journalmate.app"
```

### Android Package Name
Already configured in `app.config.js`:
```
package: "com.journalmate.app"
```

## Step 3: Build for Production

### Build iOS App
```bash
eas build --platform ios --profile production
```

This creates an `.ipa` file for App Store submission.

**Note:** First build will prompt you for:
- Apple Developer Team ID
- Distribution certificate
- Provisioning profile

EAS will handle all of this automatically!

### Build Android App
```bash
eas build --platform android --profile production
```

This creates an `.aab` file for Google Play.

**Build time:** 15-45 minutes per platform

## Step 4: Test Builds

### iOS TestFlight
1. Build completes → EAS provides download link
2. Upload to App Store Connect automatically:
   ```bash
   eas submit --platform ios
   ```
3. TestFlight processes in ~10 minutes
4. Invite internal testers via App Store Connect

### Android Internal Testing
1. Build completes → download `.aab`
2. Upload to Google Play Console:
   ```bash
   eas submit --platform android
   ```
3. Create internal testing track
4. Share link with testers

## Step 5: App Store Submission

### iOS App Store

1. **Create App Store Connect Listing**
   - Go to https://appstoreconnect.apple.com
   - Click "My Apps" → "+" → "New App"
   - Fill in app information:
     - Name: JournalMate
     - Primary Language: English
     - Bundle ID: com.journalmate.app
     - SKU: journalmate-ios

2. **Prepare Metadata**
   - App icon (1024x1024px)
   - Screenshots (required sizes below)
   - Description, keywords
   - Privacy policy URL
   - Support URL

3. **Screenshots Required**
   - iPhone 6.7" (1290 x 2796px) - 3-10 images
   - iPhone 6.5" (1284 x 2778px) - 3-10 images
   - iPad Pro 12.9" (2048 x 2732px) - 3-10 images

4. **Submit for Review**
   - Upload build via EAS
   - Complete App Privacy questionnaire
   - Submit for review
   - **Review time:** 24-48 hours

### Android Google Play

1. **Create Google Play Listing**
   - Go to https://play.google.com/console
   - Create new app
   - Select "App" → set defaults

2. **Prepare Store Listing**
   - App icon (512x512px)
   - Feature graphic (1024x500px)
   - Screenshots (required sizes below)
   - Description
   - Privacy policy URL

3. **Screenshots Required**
   - Phone: 16:9 or 9:16 (1080 x 1920px) - 2-8 images
   - 7" Tablet: (optional)
   - 10" Tablet: (optional)

4. **Content Rating**
   - Complete questionnaire
   - Get rating (typically E for Everyone or T for Teen)

5. **Submit for Review**
   - Upload `.aab` via EAS
   - Complete all required sections
   - Submit for review
   - **Review time:** 2-7 days

## Step 6: Production Release

### iOS
Once approved:
1. App Store Connect → "Release this version"
2. App goes live within 24 hours
3. Available in all App Store regions

### Android
Once approved:
1. Google Play Console → "Release to Production"
2. Rollout: Start at 20%, monitor for crashes
3. Increase to 50%, then 100%
4. Full rollout takes 2-3 days

## Quick Commands Reference

```bash
# Login to Expo
eas login

# Configure project
eas build:configure

# Build iOS
eas build --platform ios --profile production

# Build Android
eas build --platform android --profile production

# Build both platforms
eas build --platform all --profile production

# Submit iOS to App Store
eas submit --platform ios

# Submit Android to Play Store
eas submit --platform android

# Check build status
eas build:list
```

## Timeline Estimate

| Task | Duration |
|------|----------|
| EAS setup & configuration | 1-2 hours |
| First iOS build | 30-45 min |
| First Android build | 30-45 min |
| App Store Connect setup | 2-3 hours |
| Google Play Console setup | 2-3 hours |
| iOS review | 24-48 hours |
| Android review | 2-7 days |
| **Total to Live Apps** | **3-10 days** |

## Troubleshooting

### Build Fails
```bash
# Check logs
eas build:list
eas build:view [BUILD_ID]

# Clear cache and rebuild
eas build --platform ios --profile production --clear-cache
```

### iOS Signing Issues
- EAS handles all certificates automatically
- If prompted, let EAS generate new credentials
- Don't mix manual and EAS-managed credentials

### Android Build Errors
- Ensure `eas.json` has correct `autoIncrement: true`
- Check package name matches exactly
- Verify permissions in `app.config.js`

## Support

- **EAS Build Docs:** https://docs.expo.dev/build/introduction/
- **Submit Docs:** https://docs.expo.dev/submit/introduction/
- **Expo Discord:** https://chat.expo.dev
- **App Store Guidelines:** https://developer.apple.com/app-store/review/guidelines/
- **Google Play Policy:** https://play.google.com/console/about/guides/review/

## Cost Summary

- **Apple Developer:** $99/year
- **Google Play:** $25 one-time
- **EAS Build (Free Tier):**
  - iOS: 30 builds/month
  - Android: 30 builds/month
- **EAS Build (Production - $29/month):**
  - Unlimited builds
  - Faster build queue
  - Priority support

---

**Ready to deploy?** Start with:
```bash
eas login
eas build:configure
eas build --platform all --profile production
```
