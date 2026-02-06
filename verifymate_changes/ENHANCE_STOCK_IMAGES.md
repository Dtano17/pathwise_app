# Quick Guide: Enhance Stock Images

## 🎯 Goal

Replace 28 placeholder stock images with high-quality, HD, production-ready images for the JournalMate Community Plans page.

---

## ⚡ Quick Start (Easiest Method)

### Option 1: Automated Download from Unsplash (Recommended)

```bash
# Step 1: Get free Unsplash API key
# Visit: https://unsplash.com/developers
# Click "Register as a developer" → "New Application"
# Copy your "Access Key"

# Step 2: Set environment variable
set UNSPLASH_ACCESS_KEY=your_access_key_here

# Step 3: Download all images automatically
npm run download:images
```

**That's it!** The script will download all 28 high-quality images automatically.

---

## 📋 Manual Alternative

If you prefer to manually download images:

1. **Visit Unsplash.com**
2. **Search for each theme** (see [STOCK_IMAGES_ENHANCEMENT_GUIDE.md](STOCK_IMAGES_ENHANCEMENT_GUIDE.md) for themes)
3. **Download in highest resolution**
4. **Rename to exact filename** (see list below)
5. **Place in:** `attached_assets/stock_images/`

---

## 📁 Required Filenames (28 images)

```
romantic_paris_citys_dfc7c798.jpg
fitness_workout_gym__2325ee98.jpg
elegant_wedding_cere_9aa2c585.jpg
modern_tech_workspac_ef8fa108.jpg
beautiful_modern_hom_0f24a3e6.jpg
organized_productivi_df70e725.jpg
tokyo_japan_travel_d_8a196170.jpg
bali_indonesia_tropi_95575be5.jpg
new_york_city_times__e09e766b.jpg
paris_eiffel_tower_f_fce5772c.jpg
iceland_northern_lig_9fbbf14d.jpg
runner_jogging_on_tr_9a63ddad.jpg
yoga_studio_peaceful_84f9a366.jpg
cyclist_riding_bike__9ae17ca2.jpg
modern_gym_workout_w_99dc5406.jpg
modern_workspace_des_9f6c2608.jpg
business_presentatio_aee687af.jpg
professional_network_48ccc448.jpg
person_reading_book__bc916131.jpg
birthday_party_celeb_414d649e.jpg
concert_music_festiv_18316657.jpg
person_coding_on_lap_ba381062.jpg
home_renovation_kitc_0ceb0522.jpg
spanish_language_lea_2d2edb39.jpg
modern_kitchen_renov_a5563863.jpg
professional_develop_960cd8cf.jpg
spanish_language_lea_269b1aa7.jpg
person_meditating_pe_43f13693.jpg
```

---

## ✅ Image Requirements

- **Format:** JPEG (.jpg)
- **Minimum Resolution:** 1920x1080 (Full HD)
- **Aspect Ratio:** 16:9 (landscape)
- **Quality:** Professional photography
- **File Size:** 200KB - 2MB (web-optimized)
- **No watermarks**

---

## 🧪 Testing After Images Are Added

```bash
# 1. Build the project
npm run build

# 2. Run the app
npm run dev

# 3. Visit Community Plans page
# Navigate to: http://localhost:5173/community-plans

# 4. Verify images display correctly
```

---

## 📚 Full Documentation

For detailed specifications, sourcing options, and troubleshooting:
- See: [STOCK_IMAGES_ENHANCEMENT_GUIDE.md](STOCK_IMAGES_ENHANCEMENT_GUIDE.md)

---

## 🚀 What Happens Next

After images are replaced:
1. Community Plans page will look professional
2. App ready for production deployment
3. Ready for Week 5: App Store preparation

---

## ❓ Troubleshooting

**Script fails with API error:**
- Check your Unsplash API key is correct
- Verify you haven't exceeded free tier limits (50 requests/hour)

**Images not displaying:**
- Verify filenames match exactly (case-sensitive)
- Check files are in `attached_assets/stock_images/` directory
- Run `npm run build` again

**Images look pixelated:**
- Download higher resolution versions
- Ensure minimum 1920x1080 resolution

---

## 📞 Resources

- **Unsplash:** https://unsplash.com (Free, recommended)
- **Pexels:** https://pexels.com (Free alternative)
- **Image Optimizer:** https://tinyjpg.com (Compress images)

---

**Status:** Ready to download images
**Estimated Time:** 3-5 minutes with automated script, 1-2 hours manually
**Priority:** High - Required for production

---

*Part of JournalMate Mobile App Development - Week 5*
*Generated: 2025-11-12*
