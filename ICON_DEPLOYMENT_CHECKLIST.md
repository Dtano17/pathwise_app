# JournalMate Icon Deployment Checklist

Quick reference for deploying icons across all platforms after generation.

## 🚀 Generate Icons

```bash
npm run generate:icons
```

This will create ~70 icon files in `client/public/icons/` organized by platform.

---

## ✅ Deployment Checklist

### 1. Web & PWA

- [ ] Copy `icons/web/*` to `client/public/`
- [ ] Update `client/public/manifest.json`:
  ```json
  {
    "icons": [
      { "src": "/icons/pwa/icon-72x72.png", "sizes": "72x72", "type": "image/png" },
      { "src": "/icons/pwa/icon-96x96.png", "sizes": "96x96", "type": "image/png" },
      { "src": "/icons/pwa/icon-128x128.png", "sizes": "128x128", "type": "image/png" },
      { "src": "/icons/pwa/icon-144x144.png", "sizes": "144x144", "type": "image/png" },
      { "src": "/icons/pwa/icon-152x152.png", "sizes": "152x152", "type": "image/png" },
      { "src": "/icons/pwa/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
      { "src": "/icons/pwa/icon-384x384.png", "sizes": "384x384", "type": "image/png" },
      { "src": "/icons/pwa/icon-512x512.png", "sizes": "512x512", "type": "image/png" }
    ]
  }
  ```
- [ ] Update `client/index.html` with meta tags:
  ```html
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.json">
  ```
- [ ] Generate `favicon.ico`:
  ```bash
  npx png-to-ico icons/web/favicon-16x16.png icons/web/favicon-32x32.png icons/web/favicon-48x48.png > client/public/favicon.ico
  ```
- [ ] Test PWA install on mobile devices
- [ ] Verify icons appear correctly in browser tabs

### 2. iOS App Store

**Files needed from `icons/ios/`:**
- [ ] Prepare all icon sizes (10 files)
- [ ] Create `Assets.xcassets/AppIcon.appiconset/`
- [ ] Add icons to Xcode project
- [ ] Update `Contents.json` with all sizes
- [ ] Upload `ios-app-store-1024.png` to App Store Connect
- [ ] Test on iPhone and iPad simulators
- [ ] Submit for App Store review

**App Store Connect:**
- [ ] Upload screenshots (6.5", 5.5", 12.9")
- [ ] App icon: 1024x1024
- [ ] App preview videos (optional)

### 3. Google Play Store

**Files needed from `icons/android/`:**
- [ ] Copy `mipmap-*` folders to `android/app/src/main/res/`
- [ ] Update `AndroidManifest.xml`:
  ```xml
  <application
    android:icon="@mipmap/ic_launcher"
    android:roundIcon="@mipmap/ic_launcher_round">
  ```
- [ ] Upload `android-play-store-512.png` to Play Console
- [ ] Create feature graphic (1024x500)
- [ ] Upload screenshots (phone, tablet, 7", 10")
- [ ] Test on multiple Android devices
- [ ] Submit for Play Store review

**Play Console:**
- [ ] App icon: 512x512
- [ ] Feature graphic: 1024x500
- [ ] Screenshots: Various sizes
- [ ] Video (optional)

### 4. Social Media Profiles

#### Facebook
**Files:** `icons/social/facebook-*`
- [ ] Profile picture: Upload `facebook-profile-360.png`
- [ ] Cover photo: Upload `banners/facebook-cover-820x312.png`
- [ ] Verify mobile and desktop appearance
- [ ] Test link sharing (OG image should work automatically)

#### Twitter/X
**Files:** `icons/social/twitter-*`
- [ ] Profile picture: Upload `twitter-profile-400.png`
- [ ] Header image: Upload `banners/twitter-header-1500x500.png`
- [ ] Verify crop on mobile
- [ ] Test tweet with link (should show OG image)

#### LinkedIn
**Files:** `icons/social/linkedin-*`
- [ ] Company logo: Upload `linkedin-profile-400.png`
- [ ] Cover image: Upload `banners/linkedin-cover-1128x191.png`
- [ ] Update company page
- [ ] Test post sharing

#### Instagram
**Files:** `icons/social/instagram-*`
- [ ] Profile picture: Upload `instagram-profile-180.png`
- [ ] Create posts using `instagram-post-1080.png` as template
- [ ] Update bio with app link
- [ ] Create Instagram Stories templates

#### YouTube
**Files:** `icons/social/youtube-*`
- [ ] Channel icon: Upload `youtube-profile-800.png`
- [ ] Banner: Upload `banners/youtube-banner-2560x1440.png`
- [ ] Test on various screen sizes
- [ ] Create video thumbnails (1280x720)

#### TikTok
**Files:** `icons/social/tiktok-*`
- [ ] Profile picture: Upload `tiktok-profile-200.png`
- [ ] Update bio with app link
- [ ] Create video watermark

#### Discord
**Files:** `icons/social/discord-*`
- [ ] Server icon: Upload `discord-server-512.png`
- [ ] Server banner: Upload `banners/discord-banner-1920x1080.png` (boost level 2+)
- [ ] Create custom emojis
- [ ] Set up bot avatar

### 5. Email & Marketing

**Files:** `icons/email/`
- [ ] Add to email signature: `email-signature-150x40.png`
- [ ] Email header: `email-header-600x200.png`
- [ ] Profile avatar: `email-profile-100.png`
- [ ] Update email templates
- [ ] Test across email clients (Gmail, Outlook, Apple Mail)
- [ ] Update SendGrid/Mailchimp templates

**Email Platforms:**
- [ ] SendGrid: Update email templates with icons
- [ ] Mailchimp: Update campaign templates
- [ ] Outlook signature: Add logo
- [ ] Gmail signature: Add logo

### 6. Microsoft Store (Windows)

**Files:** `icons/windows/`
- [ ] Add all Windows icon sizes to app package
- [ ] Store logo: Upload `banners/windows-store-1240x600.png`
- [ ] Update app manifest
- [ ] Test on Windows 11
- [ ] Submit to Microsoft Store

### 7. Mac App Store

**Files:** `icons/macos/`
- [ ] Create `.icns` file from PNG set:
  ```bash
  mkdir MyIcon.iconset
  cp icons/macos/icon_*.png MyIcon.iconset/
  iconutil -c icns MyIcon.iconset
  ```
- [ ] Add to Xcode project
- [ ] Update `Info.plist`
- [ ] Test on macOS 12+
- [ ] Submit to Mac App Store

### 8. Website & Landing Pages

- [ ] Update website favicon
- [ ] Add logo to header/footer
- [ ] Create loading screen with logo
- [ ] Update 404/500 error pages
- [ ] Add to login/signup pages
- [ ] Update documentation sites

### 9. Marketing Materials

**Files:** Various from `icons/banners/`
- [ ] Create business cards
- [ ] Design letterhead
- [ ] Create presentation templates
- [ ] Design merchandise (t-shirts, mugs, etc.)
- [ ] Create promotional banners
- [ ] Design print ads

### 10. Testing & Validation

- [ ] Test on iPhone (various models)
- [ ] Test on iPad
- [ ] Test on Android phones (Samsung, Google, OnePlus)
- [ ] Test on Android tablets
- [ ] Test on Windows 10/11
- [ ] Test on macOS
- [ ] Test on Chrome, Firefox, Safari, Edge
- [ ] Test PWA installation
- [ ] Verify social media link previews
- [ ] Check email rendering across clients

---

## 📊 Platform Priority (Launch Order)

### Phase 1: Essential (Week 1)
1. ✅ Web/PWA icons
2. ✅ Favicon
3. ✅ Social media OG images (already implemented!)
4. ⏳ Email signatures

### Phase 2: Social Presence (Week 2)
5. ⏳ Facebook page
6. ⏳ Twitter/X profile
7. ⏳ LinkedIn company page
8. ⏳ Instagram account

### Phase 3: App Stores (Week 3-4)
9. ⏳ iOS App Store
10. ⏳ Google Play Store

### Phase 4: Additional Platforms (Month 2)
11. ⏳ Microsoft Store
12. ⏳ Mac App Store
13. ⏳ YouTube channel
14. ⏳ TikTok profile
15. ⏳ Discord server

---

## 🛠️ Tools & Resources

### Icon Validation
- **Favicon**: https://realfavicongenerator.net/
- **iOS**: https://developer.apple.com/design/human-interface-guidelines/app-icons
- **Android**: https://developer.android.com/distribute/google-play/resources/icon-design-specifications
- **PWA**: https://web.dev/add-manifest/

### Testing Tools
- **Mobile Simulator**: BrowserStack, Sauce Labs
- **PWA Tester**: Lighthouse (Chrome DevTools)
- **OG Preview**: https://www.opengraph.xyz/
- **Email Preview**: Litmus, Email on Acid

### Design Tools
- **Figma**: For mockups and variants
- **Sketch**: macOS icon design
- **Adobe Illustrator**: Vector editing
- **GIMP/Photoshop**: Raster editing

---

## 📝 Notes

- Always maintain source files at highest resolution (1024x1024+)
- Keep transparent PNG as master file
- Document brand colors and gradients
- Create style guide for consistency
- Version control all icon files
- Back up generated icons before re-running script

---

## 🎯 Success Metrics

After deployment, verify:
- [ ] Icons load in <100ms on all platforms
- [ ] No broken image links
- [ ] Consistent branding across platforms
- [ ] Proper sizing on all devices
- [ ] Accessibility compliance
- [ ] App store approval received
- [ ] Social media previews working
- [ ] Email signatures rendering correctly

---

Generated icons location: `client/public/icons/`

Total files: ~78 icons + ~8 banners = **86 assets**
