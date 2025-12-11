# iOS App Release Setup Guide

This guide will walk you through configuring your iOS app for release to the Apple App Store.

## Prerequisites

- **macOS** (required for iOS development)
- **Xcode 15** or higher
- **Apple Developer Account** ($99/year)
- **CocoaPods** installed (`sudo gem install cocoapods`)

## Step 1: Apple Developer Account Setup

### Enroll in Apple Developer Program

1. Go to [Apple Developer](https://developer.apple.com/programs/)
2. Enroll as an individual or organization ($99/year)
3. Wait for enrollment approval (usually 24-48 hours)

### Create App ID

1. Go to [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/)
2. Click **Identifiers** → **+** button
3. Select **App IDs** → **Continue**
4. Configure:
   - **Description**: JournalMate.ai
   - **Bundle ID**: `ai.journalmate.app` (Explicit)
   - **Capabilities**: Enable required capabilities:
     - [x] Associated Domains (for universal links)
     - [x] Push Notifications
     - [x] Sign in with Apple (if using)
5. Click **Continue** → **Register**

## Step 2: Certificates and Provisioning Profiles

### Create Distribution Certificate

1. Open **Keychain Access** on Mac
2. Menu: **Keychain Access** → **Certificate Assistant** → **Request a Certificate from a Certificate Authority**
3. Enter email and name, select **Saved to disk**
4. Save as `JournalMate_CertificateSigningRequest.certSigningRequest`

5. Go to Apple Developer Portal → **Certificates**
6. Click **+** button
7. Select **Apple Distribution** → **Continue**
8. Upload the `.certSigningRequest` file
9. Download the certificate and double-click to install in Keychain

### Create Provisioning Profile

1. Go to **Profiles** → **+** button
2. Select **App Store** → **Continue**
3. Select **App ID**: ai.journalmate.app
4. Select **Distribution Certificate** (created above)
5. Name: `JournalMate App Store Profile`
6. Download and double-click to install

## Step 3: Configure Xcode Project

### Open Project in Xcode

```bash
# Open iOS project
npx cap open ios
```

### Configure Signing & Capabilities

1. In Xcode, select **App** target
2. Go to **Signing & Capabilities** tab
3. **Automatically manage signing**: ☑️ (recommended)
4. **Team**: Select your Apple Developer team
5. **Bundle Identifier**: `ai.journalmate.app`

**OR** for manual signing:

1. **Automatically manage signing**: ☐
2. **Provisioning Profile (Release)**: Select "JournalMate App Store Profile"
3. **Signing Certificate (Release)**: Select "Apple Distribution"

### Update App Version

1. Select **App** target → **General** tab
2. Update version numbers:
   - **Version**: `1.0.0` (CFBundleShortVersionString)
   - **Build**: `1` (CFBundleVersion)

**Rules:**
- **Version**: Semantic versioning (1.0.0, 1.0.1, 1.1.0, 2.0.0)
- **Build**: Integer that increments with each build (1, 2, 3, ...)

## Step 4: Add Required Capabilities

### Universal Links (Deep Linking)

Already configured in `Info.plist`:

```xml
<key>com.apple.developer.associated-domains</key>
<array>
    <string>applinks:journalmate.ai</string>
    <string>applinks:journalmate.replit.app</string>
</array>
```

### Push Notifications

1. In Xcode: **Signing & Capabilities** → **+ Capability**
2. Add **Push Notifications**

### Background Modes (if needed)

1. Add **Background Modes** capability
2. Enable:
   - [ ] Remote notifications
   - [ ] Background fetch (if applicable)

## Step 5: Update App Icons and Assets

Icons are already deployed by the build script:

```bash
npm run build:ios
```

This generates and deploys:
- `ios/App/App/Assets.xcassets/AppIcon.appiconset/` (all sizes)
- `ios/App/App/Assets.xcassets/Splash.imageset/` (splash screen)
- App Store icon: `ios-app-store-1024.png` (1024x1024px)

### Verify Icons in Xcode

1. Open **Assets.xcassets** in Xcode
2. Check **AppIcon** contains all required sizes
3. Check **Splash** has the splash screen image

## Step 6: Build Archive for App Store

### Prepare for Archive

1. In Xcode, select **Any iOS Device (arm64)** as the destination
2. Menu: **Product** → **Scheme** → **Edit Scheme**
3. Select **Archive** → **Build Configuration**: **Release**
4. Close scheme editor

### Create Archive

1. Menu: **Product** → **Clean Build Folder** (⇧⌘K)
2. Menu: **Product** → **Archive** (⌘B then wait)
3. Wait for archive to complete (5-10 minutes)
4. **Organizer** window will open automatically

### Validate Archive

1. In Organizer, select the archive
2. Click **Validate App**
3. Select distribution options:
   - **App Store Connect** distribution
   - **Include bitcode**: ☐ (not required for iOS 14+)
   - **Upload symbols**: ☑️ (for crash reports)
   - **Manage version and build**: ☑️
4. Click **Validate**
5. Wait for validation (2-5 minutes)
6. Resolve any issues if validation fails

## Step 7: Upload to App Store Connect

### Create App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **My Apps** → **+** → **New App**
3. Configure:
   - **Platform**: iOS
   - **Name**: JournalMate.ai
   - **Primary Language**: English (U.S.)
   - **Bundle ID**: ai.journalmate.app
   - **SKU**: journalmate-ios-app
   - **User Access**: Full Access
4. Click **Create**

### Upload Build

1. In Xcode Organizer, select the archive
2. Click **Distribute App**
3. Select **App Store Connect** → **Next**
4. Select **Upload** → **Next**
5. Configure options:
   - **Include bitcode**: ☐
   - **Upload symbols**: ☑️
   - **Manage version and build**: ☑️
6. Review `JournalMate.ipa` summary → **Upload**
7. Wait for upload (5-15 minutes depending on speed)

### Wait for Processing

After upload:
1. Build appears in App Store Connect after 5-10 minutes
2. Processing takes 15-30 minutes
3. You'll receive an email when processing completes

## Step 8: Prepare App Store Listing

### Required Screenshots

Create screenshots for:

**iPhone (required)**:
- 6.7" Display (iPhone 14 Pro Max): 1290 x 2796 pixels (2-10 screenshots)
- 6.5" Display (iPhone 11 Pro Max): 1242 x 2688 pixels (2-10 screenshots)

**iPad (optional)**:
- 12.9" Display (iPad Pro 3rd gen): 2048 x 2732 pixels (2-10 screenshots)

**Tip**: Use Xcode Simulator to capture screenshots:
```bash
# Launch simulator
xcrun simctl list devices available

# Boot desired simulator
xcrun simctl boot "iPhone 14 Pro Max"

# Open simulator
open -a Simulator

# Take screenshot: Cmd+S (saves to Desktop)
```

### Required App Information

Fill in App Store Connect:

**App Information:**
- **Name**: JournalMate.ai (30 characters max)
- **Subtitle**: Track plans, achieve goals (30 characters max)
- **Privacy Policy URL**: https://journalmate.ai/privacy
- **Category**: Productivity
- **Secondary Category**: Health & Fitness (optional)
- **Content Rights**: Confirm you own rights to all content

**Promotional Text** (170 characters, updatable without review):
```
Import plans from AI engines, track social media inspiration, plan with friends, and journal your journey automatically. Start achieving your goals today!
```

**Description** (4000 characters max):
```
JournalMate.ai - Your AI-Powered Plan & Goal Tracker

Transform ideas into action with JournalMate.ai, the intelligent app that helps you import, track, and achieve your goals from any source.

KEY FEATURES:

📋 Universal Plan Import
• Import from ANY AI engine (ChatGPT, Claude, Gemini, Perplexity)
• Save social media content (Instagram, TikTok, Pinterest, YouTube)
• Convert any URL or text into trackable plans

🤖 AI-Powered Journaling
• Automatic progress tracking
• Smart task categorization
• AI-generated insights about your journey

👥 Social Planning
• Share plans with friends
• Collaborative group goals
• Discover community plans and templates

📍 Location-Based Activities
• Attach places to your plans
• Track location-based goals
• Discover nearby activities

📸 Visual Progress Tracking
• Photo journaling
• Progress documentation
• Before/after comparisons

🔐 Privacy & Security
• Face ID / Touch ID support
• End-to-end encryption
• Your data stays yours

PERFECT FOR:
✓ Fitness enthusiasts tracking workout plans
✓ Foodies saving recipes from social media
✓ DIY lovers organizing project ideas
✓ Students managing study schedules
✓ Teams collaborating on group goals
✓ Anyone wanting to turn plans into reality

WHY JOURNALMATE.AI?
Unlike simple to-do apps, JournalMate.ai intelligently parses any plan from any source, automatically tracks your progress, and journals your journey. Whether you're following an AI-generated workout plan, a Pinterest recipe, or a collaborative project, JournalMate.ai keeps you on track.

Start your journey today. Download JournalMate.ai and turn inspiration into achievement!

---

Terms of Service: https://journalmate.ai/terms
Privacy Policy: https://journalmate.ai/privacy
Support: support@journalmate.ai
```

**Keywords** (100 characters, comma-separated):
```
plan tracker,goal planner,ai journal,social media saver,chatgpt,instagram,tiktok,collaboration
```

**Support URL**: https://journalmate.ai/support
**Marketing URL**: https://journalmate.ai

### App Privacy

1. Go to **App Privacy** section
2. Answer questionnaire about data collection:
   - User data collected: Email, name, photos (if using)
   - Data linked to user: Yes (for account management)
   - Data used for tracking: No (or Yes if using analytics)
   - Third-party analytics: List services (Firebase, etc.)

### Age Rating

Complete questionnaire based on app content (likely 4+ or 9+).

## Step 9: Submit for Review

### Version Information

1. Go to **App Store** → **[Version]** → **Prepare for Submission**
2. Fill in **What's New in This Version** (4000 chars):
   ```
   Welcome to JournalMate.ai 1.0!

   🎉 Initial Release Features:
   • Import plans from ChatGPT, Claude AI, Gemini, and more
   • Save content from Instagram, TikTok, Pinterest, YouTube
   • Share plans with friends and collaborate on group goals
   • Biometric authentication (Face ID / Touch ID)
   • AI-powered automatic journaling
   • Beautiful native iOS experience

   We're excited to help you turn your plans into reality!
   ```

### Review Information

- **Sign-In Required**: Yes
- **Demo Account**:
  - Username: `demo@journalmate.ai`
  - Password: `DemoPassword123!`
- **Notes**: "Test social sign-in and biometric authentication on device"

### Submit

1. Ensure build is selected
2. Click **Add for Review**
3. Click **Submit for Review**
4. Wait for review (typically 24-48 hours)

## Step 10: After Approval

### Release Options

- **Automatic Release**: App goes live immediately after approval
- **Manual Release**: You control when app goes live
- **Scheduled Release**: Set a specific date/time

### Monitor App

1. Check **App Analytics** for downloads and usage
2. Monitor **Ratings & Reviews**
3. Check **Crashes** for crash reports
4. Review **App Store Optimization** metrics

## Automated Build Script

Use npm scripts for automated builds:

```bash
# Full build pipeline (generates assets, builds web, syncs to iOS)
npm run build:ios

# Then open in Xcode to archive
npx cap open ios
```

## Security Checklist

- [ ] Code signing certificate installed
- [ ] Provisioning profile configured
- [ ] All API keys moved to backend or secure storage
- [ ] App uses HTTPS for all requests
- [ ] Privacy policy URL is live and accurate
- [ ] Terms of service URL is live
- [ ] Support email is monitored
- [ ] Demo account works for reviewers
- [ ] Universal links are configured
- [ ] Deep links work correctly

## Troubleshooting

### "No profiles for 'ai.journalmate.app' were found"

1. Download provisioning profile from Apple Developer Portal
2. Double-click to install
3. In Xcode: **Preferences** → **Accounts** → Select team → **Download Manual Profiles**

### "Code signing error"

1. Clean build folder: **Product** → **Clean Build Folder**
2. Verify team selection in **Signing & Capabilities**
3. Try **Automatically manage signing**

### "App Store Connect operation failed"

1. Ensure app exists in App Store Connect
2. Verify bundle ID matches exactly
3. Check Apple system status: https://www.apple.com/support/systemstatus/

### Archive is Missing or Grayed Out

1. Ensure **Any iOS Device (arm64)** is selected (not a simulator)
2. Verify **Release** build configuration for Archive scheme
3. Clean build folder and try again

## Version Management

Increment version for each release:

| Type | Version | Build | Description |
|------|---------|-------|-------------|
| Major | 2.0.0 | 1 | Breaking changes, major new features |
| Minor | 1.1.0 | 1 | New features, backward compatible |
| Patch | 1.0.1 | 1 | Bug fixes only |
| Build | 1.0.0 | 2 | Same version, new build (for review fixes) |

Track in `CHANGELOG.md`:

```markdown
## [1.0.0] - 2025-01-15
### Added
- Initial App Store release
- OAuth social sign-in
- Biometric authentication
- Universal links for deep linking
```

## Next Steps

After successful App Store launch:

1. Set up **TestFlight** for beta testing future updates
2. Configure **App Store optimization** (ASO) experiments
3. Enable **Family Sharing** if applicable
4. Set up **In-App Purchases** or subscriptions (if monetizing)
5. Configure **StoreKit** testing for IAP
6. Monitor **App Store Connect API** for automation
