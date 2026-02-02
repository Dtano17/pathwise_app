# 🎨 JournalMate Social Media Assets - Usage Guide

**All assets are HD quality with transparent backgrounds**

---

## 📱 INSTAGRAM

### Profile Picture
- **File:** `instagram/profile.png`
- **Size:** 1080 x 1080 px
- **Upload to:** Instagram → Settings → Edit Profile → Change Profile Photo
- **Notes:** Will display as circle (110x110 px), keep logo centered

### Story Template
- **File:** `instagram/story.png`
- **Size:** 1080 x 1920 px
- **Upload to:** Use in Instagram Stories as background/watermark
- **Notes:** Safe zone: center 1080x1350 px

---

## 💼 LINKEDIN

### Profile Picture (Personal)
- **File:** `linkedin/profile.png`
- **Size:** 800 x 800 px
- **Upload to:** LinkedIn → Profile → Photo → Upload photo
- **Notes:** Displays as circle, max 8 MB

### Cover Photo
- **File:** `linkedin/cover.png`
- **Size:** 1584 x 396 px
- **Upload to:** LinkedIn → Profile → Background photo → Upload
- **Notes:** Logo positioned center-left for visibility

---

## 🐦 TWITTER / X

### Profile Picture
- **File:** `twitter-x/profile.png`
- **Size:** 400 x 400 px
- **Upload to:** Twitter/X → Profile → Edit profile → Change avatar
- **Notes:** Displays as circle (~200x200 on profile, 48x48 in feed)

### Header Image
- **File:** `twitter-x/header.png`
- **Size:** 1500 x 500 px
- **Upload to:** Twitter/X → Profile → Edit profile → Change header
- **Notes:** Logo centered for best visibility

---

## 📘 FACEBOOK

### Profile Picture
- **File:** `facebook/profile.png`
- **Size:** 500 x 500 px
- **Upload to:** Facebook Page → Profile Picture → Upload Photo
- **Notes:** Desktop: 176x176 px, Mobile: 196x196 px, displays as circle

### Cover Photo
- **File:** `facebook/cover.png`
- **Size:** 820 x 312 px
- **Upload to:** Facebook Page → Cover Photo → Upload Photo
- **Notes:** Safe area: avoid placing logo in bottom 75 px (mobile nav overlap)

---

## ▶️ YOUTUBE

### Channel Icon
- **File:** `youtube/profile.png`
- **Size:** 800 x 800 px
- **Upload to:** YouTube Studio → Customization → Branding → Picture
- **Notes:** Displays as circle (98x98 px minimum)

### Channel Banner
- **File:** `youtube/banner.png`
- **Size:** 2560 x 1440 px
- **Upload to:** YouTube Studio → Customization → Branding → Banner image
- **Notes:** Safe area (visible on all devices): 1546 x 423 px center

---

## 🌐 GOOGLE

### Google Profile
- **File:** `google/profile.png`
- **Size:** 800 x 800 px
- **Upload to:** myaccount.google.com → Personal info → Photo
- **Notes:** Used across Gmail, Drive, Meet, etc. Displays as circle

---

## 📱 APP ICONS

### iOS App Icon
- **File:** `app-icons/ios-1024x1024.png`
- **Size:** 1024 x 1024 px
- **Use for:** App Store, Xcode asset catalog
- **Notes:** No transparency allowed for iOS (add background if needed)

### Android App Icon
- **File:** `app-icons/android-512x512.png`
- **Size:** 512 x 512 px
- **Use for:** Google Play Store, Android Studio
- **Notes:** Adaptive icon guidelines - keep within safe zone

---

## 🌐 WEB / MARKETING

### Open Graph Image (Social Sharing)
- **File:** `web/og-image-1200x630.png`
- **Size:** 1200 x 630 px
- **Use for:** Website meta tags, link previews on Facebook/LinkedIn/Twitter
- **Implementation:**
```html
<meta property="og:image" content="https://journalmate.ai/social-media-assets/web/og-image-1200x630.png" />
```

### Video Thumbnail
- **File:** `web/thumbnail-1920x1080.png`
- **Size:** 1920 x 1080 px (Full HD)
- **Use for:** YouTube video thumbnails, presentations, marketing materials

---

## 📋 QUICK REFERENCE TABLE

| Platform | Profile Size | Cover/Header Size | Circle Display? |
|----------|-------------|-------------------|-----------------|
| Instagram | 1080x1080 | 1080x1920 (story) | ✅ Yes |
| LinkedIn | 800x800 | 1584x396 | ✅ Yes (personal) |
| Twitter/X | 400x400 | 1500x500 | ✅ Yes |
| Facebook | 500x500 | 820x312 | ✅ Yes |
| YouTube | 800x800 | 2560x1440 | ✅ Yes |
| Google | 800x800 | N/A | ✅ Yes |
| iOS App | 1024x1024 | N/A | ❌ No (square with rounded corners) |
| Android | 512x512 | N/A | Adaptive |

---

## ✅ BEST PRACTICES

### Upload Guidelines:
1. **Always use PNG format** - Maintains transparency and quality
2. **Upload highest resolution available** - Platforms will resize down
3. **Check mobile view** - Most users view on phones
4. **Keep logo centered** - All profile pics display as circles
5. **Test on dark/light backgrounds** - Ensure logo is visible in both themes

### File Management:
- **Keep original files** - Don't delete these HD versions
- **Backup regularly** - Store in cloud storage (Google Drive, Dropbox)
- **Version control** - If logo updates, regenerate all assets

### Platform-Specific Tips:
- **Instagram:** Use Stories to showcase logo animation (add to highlights)
- **LinkedIn:** Update cover monthly with seasonal/campaign themes
- **Twitter/X:** Match header color scheme to brand (purple-emerald gradient)
- **Facebook:** Ensure cover doesn't violate 20% text rule
- **YouTube:** Banner should include CTA or tagline
- **All platforms:** Consistent branding = better recognition

---

## 🎯 IMPLEMENTATION CHECKLIST

- [ ] Instagram profile updated
- [ ] Instagram story highlight cover created
- [ ] LinkedIn personal profile updated
- [ ] LinkedIn company page updated
- [ ] Twitter/X profile + header updated
- [ ] Facebook page profile + cover updated
- [ ] YouTube channel icon + banner updated
- [ ] Google profile updated
- [ ] Website favicon updated
- [ ] Open Graph meta tags implemented
- [ ] App store icons submitted

---

## 📍 FILE LOCATION

All assets are located in:
```
client/public/social-media-assets/
```

**Direct access URL** (when app is deployed):
```
https://journalmate.replit.app/social-media-assets/[platform]/[filename].png
```

---

## 🆘 NEED HELP?

If you need to regenerate assets or create additional sizes:
1. Run: `node scripts/generate-social-media-assets.js`
2. All assets will be recreated from the source logo
3. New platforms can be added to the script configuration

---

**Generated:** November 2025
**Source Logo:** `client/public/journalmate-logo-transparent.png`
**Quality:** HD (maximum quality, transparent backgrounds)
**Format:** PNG (universal compatibility)
