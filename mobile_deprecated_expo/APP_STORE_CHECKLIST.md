# App Store Submission Checklist

## ✅ Pre-Submission Checklist

### iOS App Store

#### Required Assets
- [ ] App Icon (1024x1024px PNG, no transparency)
- [ ] iPhone 6.7" Screenshots (1290 x 2796px) - Minimum 3 images
- [ ] iPhone 6.5" Screenshots (1284 x 2778px) - Minimum 3 images  
- [ ] iPad Pro 12.9" Screenshots (2048 x 2732px) - Minimum 3 images
- [ ] Privacy Policy URL (publicly accessible)
- [ ] Support URL (publicly accessible)

#### App Information
- [ ] App Name: **JournalMate**
- [ ] Subtitle: (50 characters max)
  - "AI-Powered Planning & Journaling"
- [ ] Category: **Productivity** or **Lifestyle**
- [ ] Keywords: (100 characters max)
  - "journal,planning,AI,tasks,goals,habits,productivity,planner,diary,lifestyle"

#### Description
```
Transform your intentions into action with JournalMate - the AI-powered planning and journaling app that helps you build better habits and achieve your goals.

FEATURES:
• Quick Plan & Smart Plan - AI-guided planning in minutes
• 9-Category Journaling System - Capture all aspects of your life
• Swipeable Task Management - Complete or skip tasks with a swipe
• Progress Tracking - Daily streaks and analytics
• Photo & Video Journaling - Rich media capture
• Dark Mode - Beautiful in any lighting

Whether you're planning your day, tracking habits, or reflecting on life, JournalMate adapts to your rhythm and helps you stay focused on what matters most.

Start your journey today!
```

#### App Privacy
- [ ] Complete App Privacy questionnaire
- [ ] Data types collected:
  - Contact Info (email, name)
  - User Content (journal entries, photos, tasks)
  - Usage Data (analytics)
- [ ] Data usage:
  - App functionality
  - Analytics
  - Product personalization
- [ ] Data linked to user: YES
- [ ] Data used for tracking: NO
- [ ] Third-party data collection: NO

#### Permissions Required
- [ ] Camera - "JournalMate needs camera access to capture journal photos"
- [ ] Photo Library - "JournalMate needs photo access to add images to entries"
- [ ] Notifications - "Get reminders for daily planning and habit tracking"

---

### Android Google Play

#### Required Assets
- [ ] App Icon (512x512px PNG)
- [ ] Feature Graphic (1024x500px JPG/PNG)
- [ ] Phone Screenshots (1080 x 1920px) - Minimum 2, Maximum 8
- [ ] 7" Tablet Screenshots (optional, 1024 x 600px)
- [ ] Privacy Policy URL
- [ ] Support Email Address

#### Store Listing
- [ ] App Name: **JournalMate**
- [ ] Short Description: (80 characters)
  - "AI-powered planning and journaling for building better habits"
- [ ] Full Description: (4000 characters max)
```
Transform your intentions into action with JournalMate!

🎯 SMART PLANNING
• Quick Plan: Get your day organized in 5 questions
• Smart Plan: Comprehensive planning with real-time data
• AI-powered suggestions tailored to your goals

📔 JOURNALING SYSTEM
• 9 categories for complete life tracking
• Photo and video capture
• Auto-save and cloud sync
• @keyword tagging for easy search

✅ TASK MANAGEMENT
• Swipe right to complete, left to skip
• Daily progress tracking
• Streak counters and analytics
• Celebration animations

🌙 BEAUTIFUL DESIGN
• Dark and light themes
• Smooth animations
• Native performance
• Offline support

Whether you're planning a trip, tracking fitness goals, preparing for interviews, or simply organizing your day, JournalMate helps you stay on track with intelligent AI assistance.

Download now and start building better habits!
```

- [ ] Category: **Productivity** or **Lifestyle**
- [ ] Tags: 
  - journal, planning, AI, productivity, habits, goals, tasks, diary

#### Content Rating
- [ ] Complete questionnaire
- [ ] Expected rating: **Everyone** or **Teen**
- [ ] Violence: None
- [ ] Mature content: None
- [ ] User-generated content: YES (journaling)

#### App Content
- [ ] Privacy policy URL
- [ ] Ads: NO
- [ ] In-app purchases: NO (or YES if adding premium features)
- [ ] Target audience: Everyone, 13+

---

## 📸 Screenshot Guidelines

### What to Capture

1. **Home Screen** - Task list with swipeable cards
2. **Planning Chat** - AI conversation showing Quick Plan
3. **Journal Entry** - Creating a journal entry with photo
4. **Progress Dashboard** - Showing streaks and analytics
5. **Profile Screen** - User settings and preferences

### Design Tips
- Use realistic demo data (not Lorem Ipsum)
- Show app in actual use
- Include UI elements (status bar, navigation)
- Use high contrast for readability
- Add text overlays highlighting features (optional)

### Tools
- **iOS:** Use Simulator + `Cmd+S` to save screenshots
- **Android:** Use Emulator + screenshot tool
- **Figma:** Design custom promotional screenshots
- **Fastlane Frameit:** Add device frames automatically

---

## 🚀 Deployment Steps

### Phase 1: Build & Test (Week 1)
- [ ] Run `eas build:configure` to set up project
- [ ] Build iOS: `eas build --platform ios --profile production`
- [ ] Build Android: `eas build --platform android --profile production`
- [ ] Test on TestFlight (iOS) with 5-10 internal testers
- [ ] Test on Internal Testing (Android) with 5-10 testers
- [ ] Fix critical bugs and iterate

### Phase 2: Store Setup (Week 1-2)
- [ ] Create App Store Connect listing
- [ ] Create Google Play Console listing
- [ ] Upload all required assets
- [ ] Write compelling descriptions
- [ ] Complete privacy questionnaires
- [ ] Get content ratings

### Phase 3: Submission (Week 2)
- [ ] Submit iOS app for review
- [ ] Submit Android app for review
- [ ] Monitor review status daily
- [ ] Respond to any reviewer questions within 24 hours

### Phase 4: Launch (Week 2-3)
- [ ] iOS approved → Release to App Store
- [ ] Android approved → Gradual rollout (20% → 50% → 100%)
- [ ] Monitor crash reports and user feedback
- [ ] Respond to user reviews
- [ ] Plan first update with bug fixes

---

## ⚠️ Common Rejection Reasons

### iOS
1. **Privacy descriptions missing** - Ensure all permissions have clear explanations
2. **App crashes on launch** - Test thoroughly before submission
3. **Placeholder content** - Use real, functional features only
4. **Unclear app purpose** - Make onboarding crystal clear
5. **Payment violations** - Don't bypass App Store IAP

### Android  
1. **Incomplete store listing** - Fill out ALL required fields
2. **Privacy policy missing** - Must be publicly accessible URL
3. **Permissions not explained** - Justify each permission clearly
4. **Crashes or ANRs** - Test on multiple devices
5. **Misleading content** - Screenshots must match actual app

---

## 📊 Success Metrics

Track these post-launch:
- Downloads (first week, first month)
- Daily Active Users (DAU)
- Retention (Day 1, Day 7, Day 30)
- Crash-free rate (target: >99%)
- App Store rating (target: 4.5+)
- User reviews and feedback themes

---

## 🎯 Next Steps After Launch

1. **Week 1:** Monitor crashes, respond to reviews
2. **Week 2:** Analyze user behavior, identify pain points
3. **Week 3:** Plan v1.1 with bug fixes and improvements
4. **Month 2:** Add requested features, optimize onboarding
5. **Month 3:** Marketing push, influencer outreach

---

**Ready to submit?** Follow the deployment guide and use this checklist to ensure you don't miss anything!
