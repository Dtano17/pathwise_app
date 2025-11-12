# JournalMate Branding & Icon Assets

Complete branding package for JournalMate across all platforms including web, mobile apps, and social media.

## 📦 What's Included

This branding package includes:

1. **Icon Generator Script** - Automated generation of 78+ icon sizes
2. **Complete Specifications** - Technical requirements for every platform
3. **Deployment Checklist** - Step-by-step guide for publishing
4. **Quick Reference** - Visual guide and size recommendations

## 🚀 Quick Start

### Generate All Icons

```bash
npm run generate:icons
```

This will generate **78+ optimized icons** in under 30 seconds:
- ✅ Web favicons (16x16 to 512x512)
- ✅ PWA icons (72x72 to 512x512)
- ✅ iOS app icons (40x40 to 1024x1024)
- ✅ Android icons (36x36 to 512x512)
- ✅ Social media profiles (180x180 to 1080x1080)
- ✅ Social media banners (820x312 to 2560x1440)
- ✅ Email signatures (150x40 to 600x200)
- ✅ Desktop icons (Windows, macOS)

**Output:** `client/public/icons/` (organized by platform)

---

## 📚 Documentation

### 1. [Icon Specifications](./ICON_SPECIFICATIONS.md)
**Complete technical requirements for all platforms**
- Exact pixel dimensions for every icon
- File format specifications
- Background requirements (transparent vs gradient)
- Platform-specific notes (iOS, Android, Web, Social Media)
- **Total platforms covered:** 10+ (Web, iOS, Android, Facebook, Twitter, LinkedIn, Instagram, YouTube, TikTok, Discord, Windows, macOS)

### 2. [Icon Quick Reference](./ICON_QUICK_REFERENCE.md)
**Visual guide and size recommendations**
- At-a-glance size reference
- Platform comparison chart
- Design principles and best practices
- Quality checklist
- Common use cases

### 3. [Deployment Checklist](./ICON_DEPLOYMENT_CHECKLIST.md)
**Step-by-step deployment guide**
- Platform-by-platform instructions
- Testing procedures
- App store submission guidelines
- Social media profile setup
- Launch phase priorities
- Success metrics

### 4. [Generator Script](./scripts/generate-icons.js)
**Automated icon generation**
- Generates all 78+ icons automatically
- Creates proper directory structure
- Applies gradient backgrounds where needed
- Optimizes file sizes
- Handles transparent and opaque variants

---

## 🎨 Brand Assets

### Source Files

| File | Size | Purpose |
|------|------|---------|
| `journalmate-logo-transparent.png` | 1024x1024 | Master icon (transparent) |
| `journalmate-icon.png` | 301x78 | Horizontal logo with text |
| `journalmate-logo-final.png` | varies | Full logo with background |

**Location:** `client/public/`

### Brand Colors

```css
/* Primary Gradient */
background: linear-gradient(135deg, #7C3AED 0%, #14B8A6 100%);

/* Individual Colors */
--purple: #7C3AED;
--teal: #14B8A6;
--dark-purple: #1e1b4b;
--emerald: #10b981;
```

### Tagline

**Primary:** "Transform Goals Into Reality"
**Alternative:** "Adaptive Planning Engine | Transform Dreams into Reality"
**CTA:** "Plan → Execute → Reflect → Share with AI-powered adaptive intelligence"

---

## 📁 Generated File Structure

After running `npm run generate:icons`:

```
client/public/icons/
├── web/               # Favicons & web icons (6 files)
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── favicon-48x48.png
│   ├── apple-touch-icon.png
│   ├── android-chrome-192x192.png
│   └── android-chrome-512x512.png
│
├── pwa/               # Progressive Web App icons (8 files)
│   ├── icon-72x72.png
│   ├── icon-96x96.png
│   ├── icon-128x128.png
│   └── ... (through 512x512)
│
├── ios/               # iOS App Store icons (10 files)
│   ├── icon-60@2x.png
│   ├── icon-120.png
│   ├── icon-180.png
│   └── ... (through 1024x1024)
│
├── android/           # Android Play Store icons (7 files)
│   ├── mipmap-ldpi-ic_launcher.png
│   ├── mipmap-mdpi-ic_launcher.png
│   └── ... (through xxxhdpi)
│
├── social/            # Social media profiles (13 files)
│   ├── facebook-profile-360.png
│   ├── twitter-profile-400.png
│   ├── linkedin-profile-400.png
│   ├── instagram-profile-180.png
│   └── ... (all social platforms)
│
├── banners/           # Social media banners (8 files)
│   ├── facebook-cover-820x312.png
│   ├── twitter-header-1500x500.png
│   ├── youtube-banner-2560x1440.png
│   └── ... (all banner sizes)
│
├── email/             # Email signatures (3 files)
│   ├── email-signature-150x40.png
│   ├── email-profile-100.png
│   └── email-header-600x200.png
│
├── windows/           # Microsoft Store (4 files)
│   ├── windows-icon-44.png
│   └── ... (through 310x310)
│
└── macos/             # Mac App Store (10 files)
    ├── icon_16x16.png
    └── ... (through 1024x1024)
```

**Total:** ~78 icon files + ~8 banners = **86 assets**

---

## ⚡ Usage Examples

### Web (HTML)

```html
<!-- Favicons -->
<link rel="icon" type="image/png" sizes="16x16" href="/icons/web/favicon-16x16.png">
<link rel="icon" type="image/png" sizes="32x32" href="/icons/web/favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/icons/web/apple-touch-icon.png">

<!-- PWA Manifest -->
<link rel="manifest" href="/manifest.json">
```

### manifest.json (PWA)

```json
{
  "name": "JournalMate",
  "short_name": "JournalMate",
  "icons": [
    { "src": "/icons/pwa/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/pwa/icon-512x512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Email Signature (HTML)

```html
<img src="https://yoursite.com/icons/email/email-signature-150x40.png"
     alt="JournalMate"
     style="height:40px; display:block;">
```

### iOS (Xcode)

1. Create `Assets.xcassets/AppIcon.appiconset/`
2. Add all icons from `icons/ios/`
3. Update `Contents.json` with paths

### Android (res/)

Copy mipmap folders to `app/src/main/res/`:
```
res/
├── mipmap-ldpi/ic_launcher.png
├── mipmap-mdpi/ic_launcher.png
└── ... (all densities)
```

---

## 🎯 Platform Deployment Priority

### Phase 1: Essential (Week 1)
1. ✅ **Web/PWA** - Update favicons and manifest
2. ✅ **Social OG Images** - Already implemented!
3. ⏳ **Email** - Update signatures and headers

### Phase 2: Social Presence (Week 2)
4. ⏳ **Facebook** - Profile + cover photo
5. ⏳ **Twitter/X** - Profile + header
6. ⏳ **LinkedIn** - Logo + banner
7. ⏳ **Instagram** - Profile picture

### Phase 3: App Stores (Week 3-4)
8. ⏳ **iOS App Store** - Submit with icons
9. ⏳ **Google Play Store** - Submit with icons

### Phase 4: Extended Presence (Month 2)
10. ⏳ **YouTube** - Channel branding
11. ⏳ **TikTok** - Profile setup
12. ⏳ **Discord** - Server branding
13. ⏳ **Windows/macOS Stores**

---

## ✅ Quality Standards

Every generated icon meets:

- ✅ **Exact dimensions** specified by platform
- ✅ **PNG-24/32 format** with alpha channel
- ✅ **Optimized file size** (<100KB for most)
- ✅ **10% padding** for safe zones
- ✅ **Gradient background** where required
- ✅ **Transparent background** where allowed
- ✅ **sRGB color space** for consistency
- ✅ **High quality** (no artifacts or blurring)

---

## 🛠️ Customization

### Modify Brand Colors

Edit `scripts/generate-icons.js`:

```javascript
const BRAND_COLORS = {
  gradient: {
    start: '#7C3AED',  // Change purple
    end: '#14B8A6'     // Change teal
  }
};
```

### Adjust Padding

Modify icon padding percentage:

```javascript
const iconPadding = Math.floor(size * 0.1);  // 10% default
```

### Change Source File

Update source icon path:

```javascript
const SOURCE_ICON = path.join(SOURCE_DIR, 'your-icon.png');
```

---

## 🧪 Testing

### Before Deployment

- [ ] Generate all icons: `npm run generate:icons`
- [ ] Verify file sizes (<100KB each)
- [ ] Check transparency where expected
- [ ] Validate gradient backgrounds
- [ ] Test on actual devices (iOS, Android)
- [ ] Verify in browsers (Chrome, Safari, Firefox)
- [ ] Check social media link previews
- [ ] Test email rendering (Gmail, Outlook)

### Validation Tools

- **Favicon:** https://realfavicongenerator.net/
- **OG Preview:** https://www.opengraph.xyz/
- **iOS:** Xcode simulator
- **Android:** Android Studio emulator
- **Email:** Litmus, Email on Acid

---

## 📊 Asset Inventory

| Category | Count | Total Size (est.) |
|----------|-------|-------------------|
| Web/PWA | 14 | ~500 KB |
| iOS | 10 | ~8 MB |
| Android | 7 | ~2 MB |
| Social Profiles | 13 | ~5 MB |
| Social Banners | 8 | ~10 MB |
| Email | 3 | ~200 KB |
| Desktop | 14 | ~3 MB |
| **TOTAL** | **69** | **~29 MB** |

---

## 🚨 Important Notes

1. **Source File Required:** `journalmate-logo-transparent.png` must exist at 1024x1024
2. **No Emoji in Filenames:** Use platform-specific names only
3. **Transparency:** iOS requires opaque backgrounds, others prefer transparent
4. **Testing:** Always test on actual devices before app store submission
5. **Backup:** Keep original high-res files (1024x1024+)
6. **Version Control:** Commit generated icons to git

---

## 🆘 Troubleshooting

### Icons not generating?
- Check if `journalmate-logo-transparent.png` exists
- Verify Sharp is installed: `npm list sharp`
- Run with: `node --trace-warnings scripts/generate-icons.js`

### Icons look blurry?
- Use higher resolution source (1024x1024 minimum)
- Check export quality settings
- Verify no upscaling from smaller images

### Wrong colors?
- Verify source PNG has correct colors
- Check BRAND_COLORS in generator script
- Ensure sRGB color space

### File size too large?
- Use PNG optimization tools (TinyPNG, ImageOptim)
- Reduce to PNG-8 if no transparency needed
- Check for embedded metadata

---

## 📞 Support

- **Documentation:** See above guides
- **Issues:** Open GitHub issue
- **Questions:** Check ICON_QUICK_REFERENCE.md first

---

## 📄 License

All JournalMate branding assets are proprietary.
For usage guidelines, contact: [your-email]

---

**Generated:** November 2025
**Version:** 1.0.0
**Maintained by:** JournalMate Team
