# JournalMate Icon & Branding Assets Specification

Complete guide for generating all required icon sizes and branding assets for JournalMate across all platforms.

## Source File Requirements

**Master Icon:** `journalmate-logo-transparent.png` (1024x1024, transparent background)
- Currently exists at: `client/public/journalmate-logo-transparent.png`
- High-resolution square logo with transparent background
- Centered design with adequate padding

---

## 1. Web & PWA Icons

### Favicons
| Size | Filename | Purpose | Format |
|------|----------|---------|--------|
| 16x16 | `favicon-16x16.png` | Browser tab (small) | PNG-24 |
| 32x32 | `favicon-32x32.png` | Browser tab (standard) | PNG-24 |
| 48x48 | `favicon-48x48.png` | Browser tab (large) | PNG-24 |
| 180x180 | `apple-touch-icon.png` | iOS Safari bookmark | PNG-24 |
| 192x192 | `android-chrome-192x192.png` | Android home screen | PNG-24 |
| 512x512 | `android-chrome-512x512.png` | Android splash screen | PNG-24 |
| - | `favicon.ico` | Multi-size ICO (16,32,48) | ICO |

### PWA Manifest Icons
| Size | Filename | Purpose | Format |
|------|----------|---------|--------|
| 72x72 | `icon-72x72.png` | PWA icon (ldpi) | PNG-24 |
| 96x96 | `icon-96x96.png` | PWA icon (mdpi) | PNG-24 |
| 128x128 | `icon-128x128.png` | PWA icon (hdpi) | PNG-24 |
| 144x144 | `icon-144x144.png` | PWA icon (xhdpi) | PNG-24 |
| 152x152 | `icon-152x152.png` | PWA icon (xxhdpi) | PNG-24 |
| 192x192 | `icon-192x192.png` | PWA icon (xxxhdpi) | PNG-24 |
| 384x384 | `icon-384x384.png` | PWA icon (large) | PNG-24 |
| 512x512 | `icon-512x512.png` | PWA icon (splash) | PNG-24 |

### Web Thumbnails
| Size | Filename | Purpose | Format |
|------|----------|---------|--------|
| 150x150 | `thumbnail-150.png` | Small preview | PNG-24 |
| 300x300 | `thumbnail-300.png` | Medium preview | PNG-24 |
| 600x600 | `thumbnail-600.png` | Large preview | PNG-24 |

---

## 2. iOS App Icons (All Required Sizes)

**Format:** PNG-24, no transparency (use solid background color)
**Background:** Gradient purple-to-teal (#7C3AED to #14B8A6)
**Corner Radius:** Applied by iOS automatically - provide square images

### iPhone
| Size | Scale | Purpose | Filename |
|------|-------|---------|----------|
| 60x60 | @2x | iPhone Notification | `icon-60@2x.png` (120x120) |
| 60x60 | @3x | iPhone Notification | `icon-60@3x.png` (180x180) |
| 76x76 | @2x | iPhone Settings | `icon-76@2x.png` (152x152) |
| 120x120 | @1x | iPhone App Icon | `icon-120.png` |
| 180x180 | @1x | iPhone App Icon (@3x) | `icon-180.png` |

### iPad
| Size | Scale | Purpose | Filename |
|------|-------|---------|----------|
| 20x20 | @2x | iPad Notification | `icon-20@2x.png` (40x40) |
| 29x29 | @2x | iPad Settings | `icon-29@2x.png` (58x58) |
| 40x40 | @2x | iPad Spotlight | `icon-40@2x.png` (80x80) |
| 76x76 | @2x | iPad App Icon | `icon-76@2x.png` (152x152) |
| 83.5x83.5 | @2x | iPad Pro App Icon | `icon-83.5@2x.png` (167x167) |

### App Store
| Size | Purpose | Filename |
|------|---------|----------|
| 1024x1024 | App Store listing | `ios-app-store-1024.png` |

---

## 3. Android App Icons

**Format:** PNG-24 or WebP
**Background:** Transparent (Android applies adaptive icon background)
**Safe Zone:** Keep important content within 66dp diameter circle

### Launcher Icons (Adaptive Icons)
| Density | Size | Filename |
|---------|------|----------|
| ldpi | 36x36 | `mipmap-ldpi/ic_launcher.png` |
| mdpi | 48x48 | `mipmap-mdpi/ic_launcher.png` |
| hdpi | 72x72 | `mipmap-hdpi/ic_launcher.png` |
| xhdpi | 96x96 | `mipmap-xhdpi/ic_launcher.png` |
| xxhdpi | 144x144 | `mipmap-xxhdpi/ic_launcher.png` |
| xxxhdpi | 192x192 | `mipmap-xxxhdpi/ic_launcher.png` |

### Adaptive Icon Layers
Each density needs both foreground and background:
- `ic_launcher_foreground.xml` or `ic_launcher_foreground.png`
- `ic_launcher_background.xml` or `ic_launcher_background.png`

### Google Play Store
| Size | Purpose | Filename |
|------|---------|----------|
| 512x512 | Play Store listing | `android-play-store-512.png` |

---

## 4. Social Media Profile Images

### Facebook
| Size | Purpose | Filename |
|------|---------|----------|
| 180x180 | Profile picture (min) | `facebook-profile-180.png` |
| 360x360 | Profile picture (recommended) | `facebook-profile-360.png` |
| 820x312 | Cover photo | `facebook-cover-820x312.png` |
| 1200x630 | Link preview (OG image) | Already handled by OG generator |

### Twitter/X
| Size | Purpose | Filename |
|------|---------|----------|
| 400x400 | Profile picture | `twitter-profile-400.png` |
| 1500x500 | Header image | `twitter-header-1500x500.png` |

### LinkedIn
| Size | Purpose | Filename |
|------|---------|----------|
| 300x300 | Company logo (min) | `linkedin-profile-300.png` |
| 400x400 | Company logo (recommended) | `linkedin-profile-400.png` |
| 1128x191 | Cover image | `linkedin-cover-1128x191.png` |

### Instagram
| Size | Purpose | Filename |
|------|---------|----------|
| 320x320 | Profile picture (min) | `instagram-profile-320.png` |
| 180x180 | Profile picture (recommended) | `instagram-profile-180.png` |
| 1080x1080 | Post image | `instagram-post-1080.png` |

### YouTube
| Size | Purpose | Filename |
|------|---------|----------|
| 800x800 | Channel icon | `youtube-profile-800.png` |
| 2560x1440 | Channel banner | `youtube-banner-2560x1440.png` |

### TikTok
| Size | Purpose | Filename |
|------|---------|----------|
| 200x200 | Profile picture | `tiktok-profile-200.png` |

### Discord
| Size | Purpose | Filename |
|------|---------|----------|
| 512x512 | Server icon | `discord-server-512.png` |
| 1920x1080 | Server banner | `discord-banner-1920x1080.png` |

---

## 5. Email & Marketing Assets

### Email Signature Logo
| Size | Purpose | Filename |
|------|---------|----------|
| 150x40 | Email signature (horizontal) | `email-signature-150x40.png` |
| 200x53 | Email signature @2x | `email-signature-200x53.png` |
| 100x100 | Email profile (square) | `email-profile-100.png` |

### Email Header
| Size | Purpose | Filename |
|------|---------|----------|
| 600x200 | Email header | `email-header-600x200.png` |
| 1200x400 | Email header @2x | `email-header-1200x400.png` |

---

## 6. Microsoft Store (Windows)

| Size | Purpose | Filename |
|------|---------|----------|
| 44x44 | Small tile | `windows-icon-44.png` |
| 71x71 | Medium tile | `windows-icon-71.png` |
| 150x150 | Large tile | `windows-icon-150.png` |
| 310x310 | Extra large tile | `windows-icon-310.png` |
| 1240x600 | Store logo | `windows-store-1240x600.png` |

---

## 7. macOS App Icons

**Format:** ICNS (Icon Composer) or PNG set
**Background:** Transparent or gradient

| Size | Scale | Filename |
|------|-------|----------|
| 16x16 | @1x, @2x | `icon_16x16.png`, `icon_16x16@2x.png` |
| 32x32 | @1x, @2x | `icon_32x32.png`, `icon_32x32@2x.png` |
| 128x128 | @1x, @2x | `icon_128x128.png`, `icon_128x128@2x.png` |
| 256x256 | @1x, @2x | `icon_256x256.png`, `icon_256x256@2x.png` |
| 512x512 | @1x, @2x | `icon_512x512.png`, `icon_512x512@2x.png` |

---

## 8. Open Graph & Social Sharing

Already implemented via OG image generator! ✅
- Dynamic 1200x630 images with activity details
- See: `server/services/ogImageGenerator.ts`

---

## Design Guidelines

### Color Palette
- **Primary Gradient:** Purple to Teal (#7C3AED → #14B8A6)
- **Background (if needed):** Deep purple (#1e1b4b)
- **Accent:** Emerald (#10b981)

### Safe Zones
- **iOS:** 10% padding from edges
- **Android:** Content within 66dp diameter circle
- **Social Media:** 10% padding to avoid cropping

### Export Settings
- **Format:** PNG-24 with transparency (where allowed)
- **Color Space:** sRGB
- **Compression:** Optimize for web (80-90% quality)
- **Metadata:** Include copyright and description

---

## File Organization

```
client/public/icons/
├── web/
│   ├── favicon.ico
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   └── apple-touch-icon.png
├── pwa/
│   ├── icon-72x72.png
│   ├── icon-96x96.png
│   └── ... (all PWA sizes)
├── ios/
│   ├── icon-60@2x.png
│   ├── icon-120.png
│   └── ... (all iOS sizes)
├── android/
│   ├── mipmap-ldpi/
│   ├── mipmap-mdpi/
│   └── ... (all densities)
├── social/
│   ├── facebook-profile-360.png
│   ├── twitter-profile-400.png
│   └── ... (all social sizes)
└── email/
    ├── email-signature-150x40.png
    └── email-profile-100.png
```

---

## Total Files Needed

- **Web/PWA:** 15 files
- **iOS:** 12 files
- **Android:** 8 files (per layer)
- **Social Media:** 18 files
- **Email:** 5 files
- **Desktop (Windows/macOS):** 12 files

**Grand Total:** ~70 icon files across all platforms

---

## Next Steps

1. Run the icon generator script (see `generate-icons.js`)
2. Validate all icons with platform-specific tools
3. Update manifest files with new icon paths
4. Test on actual devices for each platform
5. Upload to respective app stores and social platforms
