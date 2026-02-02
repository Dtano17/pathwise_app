# JournalMate Icon Quick Reference Guide

Visual reference for icon usage across platforms.

## 🎨 Brand Identity

### Logo Design
- **Primary:** Purple sparkle icon with "JournalMate" text
- **Icon Only:** Sparkle symbol on gradient background
- **Colors:** Purple (#7C3AED) to Teal (#14B8A6) gradient
- **Tagline:** "Transform Goals Into Reality"

### File Structure
```
journalmate-logo-transparent.png  → Master source (1024x1024)
journalmate-icon.png              → Horizontal logo with text
journalmate-logo-final.png        → Full logo with background
```

---

## 📱 Icon Sizes by Platform

### Web Browsers
```
16x16   → Browser tab (zoomed out)
32x32   → Browser tab (normal)
48x48   → Browser tab (HD displays)
180x180 → iOS Safari bookmark
```

### Progressive Web App
```
72x72   → Android (ldpi)
96x96   → Android (mdpi)
128x128 → Android (hdpi)
144x144 → Windows tile
152x152 → iOS/iPad
192x192 → Android home screen
384x384 → Large displays
512x512 → Splash screen
```

### iOS App
```
40x40   → Notification (small)
58x58   → Settings
80x80   → Spotlight
120x120 → App icon (iPhone @2x)
152x152 → App icon (iPad)
167x167 → App icon (iPad Pro)
180x180 → App icon (iPhone @3x)
1024x1024 → App Store
```

### Android App
```
36x36   → ldpi (120dpi)
48x48   → mdpi (160dpi)
72x72   → hdpi (240dpi)
96x96   → xhdpi (320dpi)
144x144 → xxhdpi (480dpi)
192x192 → xxxhdpi (640dpi)
512x512 → Play Store
```

---

## 📊 Social Media Specifications

### Profile Pictures (Square)

| Platform | Size | Background | Filename |
|----------|------|------------|----------|
| **Facebook** | 360x360 | Gradient | `facebook-profile-360.png` |
| **Twitter/X** | 400x400 | Gradient | `twitter-profile-400.png` |
| **LinkedIn** | 400x400 | Gradient | `linkedin-profile-400.png` |
| **Instagram** | 180x180 | Gradient | `instagram-profile-180.png` |
| **YouTube** | 800x800 | Gradient | `youtube-profile-800.png` |
| **TikTok** | 200x200 | Gradient | `tiktok-profile-200.png` |
| **Discord** | 512x512 | Gradient | `discord-server-512.png` |

### Cover/Banner Images (Rectangular)

| Platform | Size | Layout | Filename |
|----------|------|--------|----------|
| **Facebook** | 820x312 | Logo left + tagline right | `facebook-cover-820x312.png` |
| **Twitter/X** | 1500x500 | Logo left + tagline right | `twitter-header-1500x500.png` |
| **LinkedIn** | 1128x191 | Logo left + tagline right | `linkedin-cover-1128x191.png` |
| **YouTube** | 2560x1440 | Logo centered + tagline | `youtube-banner-2560x1440.png` |
| **Discord** | 1920x1080 | Logo centered + tagline | `discord-banner-1920x1080.png` |

---

## 📧 Email & Marketing

### Email Signatures
```
150x40  → Horizontal logo (standard)
200x53  → Horizontal logo (@2x retina)
100x100 → Square profile picture
```

### Email Headers
```
600x200   → Email template header
1200x400  → Email template header (@2x)
```

**Usage:**
```html
<!-- Email signature -->
<img src="email-signature-150x40.png" alt="JournalMate" style="height:40px;">

<!-- Email header -->
<img src="email-header-600x200.png" alt="JournalMate" style="width:100%; max-width:600px;">
```

---

## 💻 Desktop Applications

### Windows
```
44x44   → Small tile
71x71   → Medium tile
150x150 → Large tile
310x310 → Wide tile
1240x600 → Store banner
```

### macOS
```
16x16   → Menu bar
32x32   → Retina menu bar
128x128 → Finder (normal)
256x256 → Finder (retina)
512x512 → Finder (large)
1024x1024 → Retina display
```

---

## 🎯 Icon Appearance by Context

### Transparent Background
**Use for:**
- Web favicons
- PWA icons
- Android launcher
- macOS icons
- Windows tiles

**Appearance:** Icon only, no background fill

### Gradient Background
**Use for:**
- iOS app icons (Apple doesn't allow transparency)
- Social media profiles (better visibility)
- Email signatures (professional look)
- Marketing materials

**Appearance:** Purple-to-teal gradient (#7C3AED → #14B8A6)

### With Tagline
**Use for:**
- Social media banners
- Email headers
- Website headers
- Marketing materials
- Presentation slides

**Layout:** Logo on left, "Transform Goals Into Reality" on right

---

## ✨ Design Principles

### Spacing & Padding
- **10% padding** on all sides for square icons
- **Safe zone:** Keep important elements within center 80%
- **Minimum size:** 16x16px must be recognizable

### Color Consistency
```css
Primary Gradient:
  background: linear-gradient(135deg, #7C3AED 0%, #14B8A6 100%);

Solid Colors (if needed):
  Purple: #7C3AED
  Teal:   #14B8A6
  Dark:   #1e1b4b
```

### Accessibility
- Minimum contrast ratio: 4.5:1
- Recognizable at small sizes (16px)
- Works in grayscale
- Clear silhouette

---

## 📏 Size Recommendations

### Minimum Sizes
- **Web favicon:** 16x16px (must be clear)
- **Mobile touch target:** 44x44px (iOS), 48x48dp (Android)
- **Profile picture:** 180x180px (most platforms)
- **App store:** 1024x1024px (universal)

### Recommended Sizes
- **Web:** 32x32px (standard clarity)
- **Mobile app:** 120x120px (iPhone), 192x192px (Android)
- **Social media:** 400x400px (crisp on all devices)
- **Marketing:** 600x600px+ (print quality)

---

## 🔍 Quality Checklist

Before deployment, verify each icon:

- [ ] **Resolution:** Correct pixel dimensions
- [ ] **Format:** PNG-24 or PNG-32 (with alpha)
- [ ] **Transparency:** Appropriate for platform
- [ ] **Background:** Gradient for non-transparent contexts
- [ ] **Padding:** 10% space around edges
- [ ] **Sharpness:** No blurring or artifacts
- [ ] **File size:** Optimized (<100KB for most sizes)
- [ ] **Filename:** Matches specification exactly

---

## 🚀 Generation Command

Generate all icons automatically:

```bash
npm run generate:icons
```

This creates:
- **~70 icon files** across all platforms
- **~8 banner images** for social media
- **Total: 78+ assets**

Output location: `client/public/icons/`

---

## 📖 Platform-Specific Notes

### iOS
- No transparency allowed (gradient background required)
- iOS applies corner radius automatically
- Safe area: Keep content within center 80%
- Test on iPhone and iPad separately

### Android
- Transparency preferred (adaptive icons)
- Foreground + background layers for adaptive icon
- Safe zone: 66dp diameter circle
- Test across multiple manufacturers (Samsung, Google, OnePlus)

### Web
- Multi-size favicon.ico includes 16, 32, 48px
- PWA icons should be square
- Apple touch icon should be 180x180
- Test across Chrome, Firefox, Safari, Edge

### Social Media
- Profile pictures should have gradient background
- Banners include logo + tagline
- Test mobile and desktop views
- Verify link preview (OG image) separately

---

## 🎨 Design Tools

**Recommended:**
- **Figma** - Design and prototyping
- **Sharp (Node.js)** - Automated generation ✅ (already implemented)
- **ImageMagick** - Batch processing
- **Icon Composer** - macOS .icns creation

**Online Validators:**
- https://realfavicongenerator.net/ (Favicon)
- https://www.opengraph.xyz/ (OG preview)
- https://app-icon.com/ (iOS/Android preview)

---

## 📞 Support Resources

**Documentation:**
- [Icon Specifications](./ICON_SPECIFICATIONS.md) - Full technical specs
- [Deployment Checklist](./ICON_DEPLOYMENT_CHECKLIST.md) - Step-by-step deployment
- [Generate Script](./scripts/generate-icons.js) - Automated icon generation

**Questions?**
- Review this guide first
- Check platform-specific requirements
- Validate with online tools
- Test on actual devices before publishing

---

**Last Updated:** November 2025
**Version:** 1.0
**Generated Assets:** 78+ icons and banners
