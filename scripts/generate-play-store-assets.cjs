#!/usr/bin/env node
/**
 * Generate Google Play Store graphics for JournalMate.ai
 *
 * SENSATIONALIZED REAL-APP EDITION
 * Each screenshot faithfully recreates the actual app UI with real data
 * from the live app, wrapped in vibrant themed gradient backgrounds
 * with aspirational marketing copy.
 *
 * Generates:
 * - App Icon (512x512)
 * - Feature Graphic (1024x500)
 * - Phone Screenshots (1080x1920, 9:16) x 6
 * - 7-inch Tablet Screenshots (1200x1920, 10:16) x 4
 * - 10-inch Tablet Screenshots (1920x1200, 16:10) x 4
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname, '..', 'store-assets', 'google-play');

// ============================
// BRAND COLOR SYSTEM (matches actual app)
// ============================
const C = {
  // Brand core
  primary: '#7C3AED',
  primaryLight: '#A78BFA',
  primaryDark: '#5B21B6',

  // Lifestyle accent palette
  teal: '#14B8A6',
  tealLight: '#5EEAD4',
  coral: '#F97316',
  coralLight: '#FB923C',
  rose: '#F43F5E',
  roseLight: '#FB7185',
  sky: '#0EA5E9',
  skyLight: '#38BDF8',
  amber: '#F59E0B',
  amberLight: '#FBBF24',
  emerald: '#10B981',
  emeraldLight: '#34D399',
  pink: '#EC4899',
  pinkLight: '#F472B6',
  indigo: '#6366F1',
  indigoLight: '#818CF8',

  // Dark UI (matches actual app theme)
  dark: '#0B0F1A',
  darkSurface: '#111827',
  darkCard: '#1F2937',
  darkCardBorder: '#374151',
  white: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',

  // Status
  green: '#22C55E',
  red: '#EF4444',
  cyan: '#06B6D4',
  yellow: '#EAB308',
};

// ============================
// THEMED GRADIENT BACKGROUNDS
// ============================
const THEMES = {
  shareImport: {
    name: 'Cosmic Purple',
    bg1: '#1A0533', bg2: '#0F1B4D', bg3: '#0A1628',
    glow1: '#7C3AED', glow2: '#14B8A6',
    accent: '#A78BFA',
  },
  discover: {
    name: 'Rose Adventure',
    bg1: '#1A0A2E', bg2: '#3B0764', bg3: '#1E1B4B',
    glow1: '#EC4899', glow2: '#F97316',
    accent: '#F472B6',
  },
  activities: {
    name: 'Ocean Depths',
    bg1: '#051937', bg2: '#0A2D5E', bg3: '#0D1F3C',
    glow1: '#0EA5E9', glow2: '#7C3AED',
    accent: '#38BDF8',
  },
  tasks: {
    name: 'Warm Sunset',
    bg1: '#1A0A2E', bg2: '#2D1041', bg3: '#1A0533',
    glow1: '#F97316', glow2: '#F43F5E',
    accent: '#FB923C',
  },
  reports: {
    name: 'Emerald Glow',
    bg1: '#042F2E', bg2: '#0A1628', bg3: '#064E3B',
    glow1: '#10B981', glow2: '#0EA5E9',
    accent: '#34D399',
  },
  groups: {
    name: 'Indigo Social',
    bg1: '#0C0A2E', bg2: '#1E1B4B', bg3: '#0E1744',
    glow1: '#6366F1', glow2: '#14B8A6',
    accent: '#818CF8',
  },
};

// ============================
// SVG HELPERS
// ============================

function xmlEsc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// Load an image file and return as base64 data URI (resized via sharp)
async function imageToBase64(filePath, width, height) {
  const buf = await sharp(filePath)
    .resize(width, height, { fit: 'cover', position: 'center' })
    .png()
    .toBuffer();
  return 'data:image/png;base64,' + buf.toString('base64');
}

// Pre-load all needed images into a cache
const IMG_CACHE = {};
async function preloadImages() {
  const backdropDir = path.join(__dirname, '..', 'client/public/community-backdrops');

  // Community backdrop photos for Discover cards
  const backdropFiles = {
    thanksgiving: 'heb-thanksgiving-parade.jpg',
    christmas: 'christmas-celebration.jpg',
    austin: 'austin_texas_zilker__3b0e26dc.jpg',
    nye: 'new_york_city_new_ye_43315f42.jpg',
    // For feature graphic mini cards
    fitness: 'fitness_workout_gym__e0b992c5.jpg',
    travel: 'bali_indonesia_tropi_95575be5.jpg',
  };

  for (const [key, file] of Object.entries(backdropFiles)) {
    const p = path.join(backdropDir, file);
    if (fs.existsSync(p)) {
      // Phone card: ~160x110, Feature graphic mini: ~60x48
      IMG_CACHE[key + '_card'] = await imageToBase64(p, 200, 130);
      IMG_CACHE[key + '_mini'] = await imageToBase64(p, 121, 48);
    } else {
      console.warn(`  Warning: missing backdrop ${file}`);
    }
  }

  console.log(`  Preloaded ${Object.keys(IMG_CACHE).length} image assets`);
}

// SVG platform icon paths (recognizable branded shapes)
function platformIcon(name, cx, cy, r) {
  switch (name) {
    case 'instagram':
      return `
        <defs><linearGradient id="igGrad_${cx}" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#FFDC80"/><stop offset="25%" stop-color="#F77737"/>
          <stop offset="50%" stop-color="#E1306C"/><stop offset="75%" stop-color="#C13584"/>
          <stop offset="100%" stop-color="#833AB4"/>
        </linearGradient></defs>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#igGrad_${cx})"/>
        <rect x="${cx - r * 0.5}" y="${cy - r * 0.5}" width="${r}" height="${r}" rx="${r * 0.22}" fill="none" stroke="white" stroke-width="${r * 0.14}"/>
        <circle cx="${cx}" cy="${cy}" r="${r * 0.25}" fill="none" stroke="white" stroke-width="${r * 0.14}"/>
        <circle cx="${cx + r * 0.3}" cy="${cy - r * 0.3}" r="${r * 0.07}" fill="white"/>`;
    case 'tiktok':
      return `
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="#000"/>
        <text x="${cx}" y="${cy + r * 0.15}" font-family="Arial" font-size="${r * 0.9}" font-weight="900" fill="#25F4EE" text-anchor="middle">d</text>
        <text x="${cx + 1}" y="${cy + r * 0.15 - 1}" font-family="Arial" font-size="${r * 0.9}" font-weight="900" fill="#FE2C55" text-anchor="middle">d</text>
        <text x="${cx + 0.5}" y="${cy + r * 0.15 - 0.5}" font-family="Arial" font-size="${r * 0.9}" font-weight="900" fill="white" text-anchor="middle">d</text>`;
    case 'youtube':
      return `
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="#FF0000"/>
        <polygon points="${cx - r * 0.3},${cy - r * 0.35} ${cx + r * 0.45},${cy} ${cx - r * 0.3},${cy + r * 0.35}" fill="white"/>`;
    case 'chatgpt':
      return `
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="#10A37F"/>
        <text x="${cx}" y="${cy + r * 0.35}" font-family="Arial" font-size="${r * 1.0}" font-weight="bold" fill="white" text-anchor="middle">G</text>`;
    case 'web':
      return `
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.sky}"/>
        <circle cx="${cx}" cy="${cy}" r="${r * 0.55}" fill="none" stroke="white" stroke-width="${r * 0.1}"/>
        <ellipse cx="${cx}" cy="${cy}" rx="${r * 0.25}" ry="${r * 0.55}" fill="none" stroke="white" stroke-width="${r * 0.1}"/>
        <line x1="${cx - r * 0.55}" y1="${cy}" x2="${cx + r * 0.55}" y2="${cy}" stroke="white" stroke-width="${r * 0.1}"/>`;
    case 'claude':
      return `
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="#D97706"/>
        <text x="${cx}" y="${cy + r * 0.35}" font-family="Arial" font-size="${r * 1.0}" font-weight="bold" fill="white" text-anchor="middle">C</text>`;
    default:
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.primary}"/>`;
  }
}

// Row of platform icons at given y position
function platformIconRow(startX, y, r, gap, icons) {
  return icons.map((name, i) => platformIcon(name, startX + i * gap, y, r)).join('\n');
}

function themedBackground(w, h, t) {
  return `
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${t.bg1}"/>
        <stop offset="50%" stop-color="${t.bg2}"/>
        <stop offset="100%" stop-color="${t.bg3}"/>
      </linearGradient>
      <radialGradient id="orb1" cx="20%" cy="25%" r="45%">
        <stop offset="0%" stop-color="${t.glow1}" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="${t.glow1}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="orb2" cx="80%" cy="75%" r="40%">
        <stop offset="0%" stop-color="${t.glow2}" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="${t.glow2}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="accentLine" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${t.glow1}"/>
        <stop offset="100%" stop-color="${t.glow2}"/>
      </linearGradient>
      <linearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${C.primary}"/>
        <stop offset="100%" stop-color="${t.glow1}"/>
      </linearGradient>
      <linearGradient id="phoneGlow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${t.glow1}" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="${t.glow2}" stop-opacity="0.2"/>
      </linearGradient>
      <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="20"/>
      </filter>
      <filter id="phoneShadow" x="-15%" y="-10%" width="130%" height="125%">
        <feDropShadow dx="0" dy="12" stdDeviation="30" flood-color="${t.glow1}" flood-opacity="0.35"/>
      </filter>
      <filter id="cardShadow">
        <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000" flood-opacity="0.4"/>
      </filter>
      <filter id="textShadow">
        <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000" flood-opacity="0.5"/>
      </filter>
    </defs>
    <rect width="100%" height="100%" fill="url(#bgGrad)"/>
    <rect width="100%" height="100%" fill="url(#orb1)"/>
    <rect width="100%" height="100%" fill="url(#orb2)"/>
    <circle cx="${w * 0.15}" cy="${h * 0.2}" r="${w * 0.12}" fill="${t.glow1}" opacity="0.15" filter="url(#softGlow)"/>
    <circle cx="${w * 0.85}" cy="${h * 0.7}" r="${w * 0.15}" fill="${t.glow2}" opacity="0.1" filter="url(#softGlow)"/>
    <circle cx="${w * 0.6}" cy="${h * 0.1}" r="${w * 0.06}" fill="${t.glow1}" opacity="0.12" filter="url(#softGlow)"/>
    <!-- Sparkles -->
    <circle cx="${w * 0.1}" cy="${h * 0.15}" r="2" fill="${t.accent}" opacity="0.6"/>
    <circle cx="${w * 0.25}" cy="${h * 0.08}" r="1.5" fill="white" opacity="0.4"/>
    <circle cx="${w * 0.85}" cy="${h * 0.12}" r="2" fill="${t.accent}" opacity="0.5"/>
    <circle cx="${w * 0.92}" cy="${h * 0.25}" r="1.5" fill="white" opacity="0.3"/>
    <circle cx="${w * 0.05}" cy="${h * 0.5}" r="2" fill="${t.accent}" opacity="0.4"/>
    <circle cx="${w * 0.95}" cy="${h * 0.55}" r="1.5" fill="white" opacity="0.35"/>
    <circle cx="${w * 0.15}" cy="${h * 0.92}" r="2" fill="${t.accent}" opacity="0.5"/>
    <circle cx="${w * 0.88}" cy="${h * 0.88}" r="1.5" fill="white" opacity="0.3"/>
  `;
}

function phoneFrame(fx, fy, fw, fh, screenSvg) {
  const cr = Math.round(fw * 0.07);
  const bz = Math.round(fw * 0.025);
  const sr = Math.round(fw * 0.06);
  const notchW = Math.round(fw * 0.28);
  const notchH = Math.round(fh * 0.016);

  return `
    <rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="${cr}" fill="url(#phoneGlow)" filter="url(#phoneShadow)" opacity="0.5"/>
    <rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="${cr}" fill="#1A1A2E" stroke="#3D3D5C" stroke-width="2"/>
    <rect x="${fx + bz}" y="${fy + bz + notchH + 8}" width="${fw - bz * 2}" height="${fh - bz * 2 - notchH * 2 - 16}" rx="${sr}" fill="${C.dark}"/>
    <rect x="${fx + (fw - notchW) / 2}" y="${fy + 6}" width="${notchW}" height="${notchH}" rx="${notchH / 2}" fill="#000"/>
    <g transform="translate(${fx + bz + 8}, ${fy + bz + notchH + 16})">
      ${screenSvg}
    </g>
  `;
}

function phoneScreenshot(w, h, theme, headline, subtitle, screenBody) {
  const phoneW = Math.round(w * 0.50);
  const phoneH = Math.round(phoneW * 2.05);
  const phoneX = Math.round((w - phoneW) / 2);
  const phoneY = Math.round(h * 0.145);

  return `
  <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    ${themedBackground(w, h, theme)}
    <text x="${w / 2}" y="${h * 0.048}" font-family="'Segoe UI', Arial, sans-serif" font-size="52" font-weight="800" fill="${C.white}" text-anchor="middle" letter-spacing="-1.5" filter="url(#textShadow)">${headline}</text>
    <text x="${w / 2}" y="${h * 0.082}" font-family="'Segoe UI', Arial, sans-serif" font-size="24" fill="${theme.accent}" text-anchor="middle" opacity="0.9">${subtitle}</text>
    <rect x="${(w - 80) / 2}" y="${h * 0.092}" width="80" height="4" rx="2" fill="url(#accentLine)"/>
    ${phoneFrame(phoneX, phoneY, phoneW, phoneH, screenBody)}
    <rect x="${(w - 240) / 2}" y="${h - 68}" width="240" height="40" rx="20" fill="${theme.glow1}" opacity="0.15"/>
    <text x="${w / 2}" y="${h - 42}" font-family="'Segoe UI', Arial, sans-serif" font-size="18" font-weight="600" fill="${C.white}" text-anchor="middle" opacity="0.8">JournalMate.ai</text>
  </svg>`;
}

function screenW(phoneW) {
  const bz = Math.round(phoneW * 0.025);
  return phoneW - bz * 2 - 16;
}

// ============================================
// SCREENSHOT 1: SHARE FROM ANYWHERE
// Hero differentiator — See it online, share it, own it
// ============================================
function screenshot1_ShareFromAnywhere() {
  const pw = Math.round(1080 * 0.50);
  const sw = screenW(pw);
  const pillW = Math.round((sw - 20) / 3);

  const body = `
    <!-- Status bar -->
    <text x="8" y="14" font-family="Arial" font-size="12" fill="${C.textSecondary}">9:41</text>
    <text x="${sw - 8}" y="14" font-family="Arial" font-size="12" fill="${C.textSecondary}" text-anchor="end">100%</text>

    <!-- Header -->
    <text x="8" y="46" font-family="'Segoe UI', Arial" font-size="22" font-weight="bold" fill="${C.white}">Create Plan</text>
    <text x="8" y="66" font-family="Arial" font-size="12" fill="${C.textSecondary}">Share from any app or paste a link</text>

    <!-- Source pill label -->
    <text x="8" y="92" font-family="Arial" font-size="10" font-weight="700" fill="${C.textMuted}" letter-spacing="1.5">SHARE FROM</text>

    <!-- Row 1: Instagram, TikTok, YouTube — with real branded icons -->
    <rect x="0" y="104" width="${pillW}" height="44" rx="12" fill="#E4405F" opacity="0.08" stroke="#E4405F" stroke-opacity="0.3" stroke-width="1"/>
    ${platformIcon('instagram', pillW / 2, 121, 10)}
    <text x="${pillW / 2}" y="139" font-family="Arial" font-size="9" font-weight="600" fill="#FB7185" text-anchor="middle">Instagram</text>

    <rect x="${pillW + 10}" y="104" width="${pillW}" height="44" rx="12" fill="#000" opacity="0.2" stroke="#555" stroke-opacity="0.3" stroke-width="1"/>
    ${platformIcon('tiktok', pillW + 10 + pillW / 2, 121, 10)}
    <text x="${pillW + 10 + pillW / 2}" y="139" font-family="Arial" font-size="9" font-weight="600" fill="${C.white}" text-anchor="middle">TikTok</text>

    <rect x="${(pillW + 10) * 2}" y="104" width="${pillW}" height="44" rx="12" fill="#FF0000" opacity="0.08" stroke="#FF0000" stroke-opacity="0.25" stroke-width="1"/>
    ${platformIcon('youtube', (pillW + 10) * 2 + pillW / 2, 121, 10)}
    <text x="${(pillW + 10) * 2 + pillW / 2}" y="139" font-family="Arial" font-size="9" font-weight="600" fill="#FB923C" text-anchor="middle">YouTube</text>

    <!-- Row 2: ChatGPT, Any URL, Claude — with real branded icons -->
    <rect x="0" y="156" width="${pillW}" height="44" rx="12" fill="#10A37F" opacity="0.08" stroke="#10A37F" stroke-opacity="0.3" stroke-width="1"/>
    ${platformIcon('chatgpt', pillW / 2, 173, 10)}
    <text x="${pillW / 2}" y="191" font-family="Arial" font-size="9" font-weight="600" fill="${C.emeraldLight}" text-anchor="middle">ChatGPT</text>

    <rect x="${pillW + 10}" y="156" width="${pillW}" height="44" rx="12" fill="${C.sky}" opacity="0.08" stroke="${C.sky}" stroke-opacity="0.3" stroke-width="1"/>
    ${platformIcon('web', pillW + 10 + pillW / 2, 173, 10)}
    <text x="${pillW + 10 + pillW / 2}" y="191" font-family="Arial" font-size="9" font-weight="600" fill="${C.skyLight}" text-anchor="middle">Any URL</text>

    <rect x="${(pillW + 10) * 2}" y="156" width="${pillW}" height="44" rx="12" fill="#D97706" opacity="0.08" stroke="#D97706" stroke-opacity="0.3" stroke-width="1"/>
    ${platformIcon('claude', (pillW + 10) * 2 + pillW / 2, 173, 10)}
    <text x="${(pillW + 10) * 2 + pillW / 2}" y="191" font-family="Arial" font-size="9" font-weight="600" fill="${C.amberLight}" text-anchor="middle">Claude</text>

    <!-- Paste input area -->
    <rect x="0" y="214" width="${sw}" height="72" rx="16" fill="${C.darkCard}" stroke="${C.primary}" stroke-opacity="0.5" stroke-width="1.5"/>
    <text x="16" y="238" font-family="Arial" font-size="13" fill="${C.white}" opacity="0.9">https://instagram.com/reel/best-</text>
    <text x="16" y="256" font-family="Arial" font-size="13" fill="${C.white}" opacity="0.9">restaurants-lagos-2025...</text>
    <text x="16" y="276" font-family="Arial" font-size="10" fill="${C.textMuted}">Pasted from Instagram</text>

    <!-- Create Plan CTA -->
    <rect x="0" y="300" width="${sw}" height="50" rx="25" fill="url(#btnGrad)"/>
    <text x="${sw / 2}" y="331" font-family="'Segoe UI', Arial" font-size="16" font-weight="bold" fill="white" text-anchor="middle">&#10024; Create Plan Instantly</text>

    <!-- AI Extraction Result -->
    <text x="8" y="380" font-family="Arial" font-size="10" font-weight="700" fill="${C.textMuted}" letter-spacing="1.5">AI EXTRACTED</text>

    <rect x="0" y="394" width="${sw}" height="115" rx="14" fill="${C.darkCard}" stroke="${C.emerald}" stroke-opacity="0.3" stroke-width="1"/>
    <circle cx="24" cy="418" r="12" fill="${C.emerald}" opacity="0.2"/>
    <text x="24" y="422" font-family="Arial" font-size="10" fill="${C.emerald}" text-anchor="middle">&#10003;</text>
    <text x="44" y="416" font-family="'Segoe UI', Arial" font-size="14" font-weight="bold" fill="${C.white}">Lagos Foodie Tour</text>
    <text x="44" y="434" font-family="Arial" font-size="10" fill="${C.textSecondary}">From Instagram Reel &#183; 8 venues found</text>

    <text x="16" y="460" font-family="Arial" font-size="11" fill="${C.white}">&#127869; Nok by Alara &#183; $$$ &#183; Victoria Island</text>
    <text x="16" y="478" font-family="Arial" font-size="11" fill="${C.white}">&#127869; Sky Restaurant &#183; $$$$ &#183; Eko Atlantic</text>
    <text x="16" y="496" font-family="Arial" font-size="10" fill="${C.textMuted}">+ 6 more venues with prices &amp; booking info</text>

    <!-- Own & Customize button -->
    <rect x="0" y="520" width="${sw}" height="42" rx="21" fill="${C.darkCard}" stroke="${C.primary}" stroke-opacity="0.5" stroke-width="1.5"/>
    <text x="${sw / 2}" y="547" font-family="Arial" font-size="13" font-weight="bold" fill="${C.primaryLight}" text-anchor="middle">&#127912; Own &amp; Customize This Plan</text>

    <!-- Smart extraction badges -->
    <text x="8" y="590" font-family="Arial" font-size="10" font-weight="700" fill="${C.textMuted}" letter-spacing="1.5">SMART EXTRACTION</text>
    ${[
      { label: '&#127908; Audio', color: C.teal, bg: C.teal },
      { label: '&#128247; OCR', color: C.amber, bg: C.amber },
      { label: '&#128172; Captions', color: C.rose, bg: C.rose },
    ].map((b, i) => {
      const bw = Math.round((sw - 16) / 3);
      const bx = i * (bw + 8);
      return `
        <rect x="${bx}" y="602" width="${bw}" height="28" rx="14" fill="${b.bg}" opacity="0.12" stroke="${b.bg}" stroke-opacity="0.3" stroke-width="1"/>
        <text x="${bx + bw / 2}" y="621" font-family="Arial" font-size="10" fill="${b.color}" text-anchor="middle">${b.label}</text>
      `;
    }).join('')}
  `;

  return phoneScreenshot(1080, 1920, THEMES.shareImport,
    'See It Online? Own It.',
    'Share from any app &#8212; AI creates YOUR plan instantly',
    body
  );
}

// ============================================
// SCREENSHOT 2: DISCOVER COMMUNITY PLANS
// Uses real community-backdrop photos embedded as base64 in SVG
// ============================================
const DISCOVER_PLANS = [
  { title: 'Thanksgiving Feast', price: '$320', author: 'Sarah M.', views: '1.2k', tasks: '15 tasks', imgKey: 'thanksgiving_card' },
  { title: 'Christmas Celebration', price: '$850', author: 'James K.', views: '2.4k', tasks: '22 tasks', imgKey: 'christmas_card' },
  { title: 'Austin Weekend', price: '$400', author: 'Maria L.', views: '890', tasks: '12 tasks', imgKey: 'austin_card' },
  { title: 'NYE Party Planning', price: '$550', author: 'David R.', views: '1.8k', tasks: '18 tasks', imgKey: 'nye_card' },
];

function screenshot2_Discover() {
  const pw = Math.round(1080 * 0.50);
  const sw = screenW(pw);
  const cardW = Math.round((sw - 10) / 2);
  const imgH = 110;

  const body = `
    <!-- Status bar -->
    <text x="8" y="14" font-family="Arial" font-size="12" fill="${C.textSecondary}">9:41</text>
    <text x="${sw - 8}" y="14" font-family="Arial" font-size="12" fill="${C.textSecondary}" text-anchor="end">100%</text>

    <!-- Header -->
    <text x="8" y="46" font-family="'Segoe UI', Arial" font-size="22" font-weight="bold" fill="${C.white}">Discover</text>
    <text x="8" y="66" font-family="Arial" font-size="12" fill="${C.textSecondary}">Community plans you can use</text>

    <!-- Search bar -->
    <rect x="0" y="78" width="${sw}" height="40" rx="20" fill="${C.darkCard}" stroke="${C.darkCardBorder}" stroke-width="1"/>
    <text x="36" y="103" font-family="Arial" font-size="12" fill="${C.textMuted}">Search plans...</text>
    <text x="16" y="103" font-family="Arial" font-size="14" fill="${C.textMuted}">&#128269;</text>

    <!-- Category chips -->
    <rect x="0" y="128" width="70" height="28" rx="14" fill="${C.rose}" opacity="0.2" stroke="${C.rose}" stroke-opacity="0.4" stroke-width="1"/>
    <text x="35" y="147" font-family="Arial" font-size="11" fill="${C.roseLight}" text-anchor="middle">Trending</text>
    <rect x="78" y="128" width="60" height="28" rx="14" fill="${C.darkCard}" stroke="${C.darkCardBorder}" stroke-width="1"/>
    <text x="108" y="147" font-family="Arial" font-size="11" fill="${C.textSecondary}" text-anchor="middle">Food</text>
    <rect x="146" y="128" width="60" height="28" rx="14" fill="${C.darkCard}" stroke="${C.darkCardBorder}" stroke-width="1"/>
    <text x="176" y="147" font-family="Arial" font-size="11" fill="${C.textSecondary}" text-anchor="middle">Travel</text>
    <rect x="214" y="128" width="70" height="28" rx="14" fill="${C.darkCard}" stroke="${C.darkCardBorder}" stroke-width="1"/>
    <text x="249" y="147" font-family="Arial" font-size="11" fill="${C.textSecondary}" text-anchor="middle">Holidays</text>

    <!-- Plan cards grid (2x2) with real embedded photos -->
    ${DISCOVER_PLANS.map((p, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = col * (cardW + 10);
      const cy = 170 + row * 240;
      const b64 = IMG_CACHE[p.imgKey];
      const clipId = 'cardClip' + i;

      return `
        <rect x="${cx}" y="${cy}" width="${cardW}" height="225" rx="14" fill="${C.darkCard}" stroke="${C.darkCardBorder}" stroke-width="1"/>

        <!-- Real photo with rounded top corners -->
        <defs>
          <clipPath id="${clipId}">
            <rect x="${cx}" y="${cy}" width="${cardW}" height="${imgH}" rx="14"/>
          </clipPath>
        </defs>
        ${b64
          ? `<image x="${cx}" y="${cy}" width="${cardW}" height="${imgH}" href="${b64}" clip-path="url(#${clipId})" preserveAspectRatio="xMidYMid slice"/>`
          : `<rect x="${cx}" y="${cy}" width="${cardW}" height="${imgH}" rx="14" fill="#333"/>`
        }

        <!-- Slight dark overlay at bottom of photo for contrast -->
        <rect x="${cx}" y="${cy + imgH - 30}" width="${cardW}" height="30" fill="${C.dark}" opacity="0.35"/>

        <!-- Price badge -->
        <rect x="${cx + cardW - 58}" y="${cy + 8}" width="50" height="24" rx="12" fill="#000" opacity="0.65"/>
        <text x="${cx + cardW - 33}" y="${cy + 25}" font-family="Arial" font-size="12" font-weight="bold" fill="${C.white}" text-anchor="middle">${p.price}</text>

        <!-- Title and meta -->
        <text x="${cx + 12}" y="${cy + imgH + 22}" font-family="'Segoe UI', Arial" font-size="13" font-weight="bold" fill="${C.white}">${p.title}</text>
        <text x="${cx + 12}" y="${cy + imgH + 40}" font-family="Arial" font-size="10" fill="${C.textSecondary}">${p.author} &#183; ${p.tasks}</text>
        <text x="${cx + 12}" y="${cy + imgH + 56}" font-family="Arial" font-size="10" fill="${C.textMuted}">&#128065; ${p.views} views</text>

        <!-- Action buttons row -->
        <rect x="${cx + 6}" y="${cy + imgH + 66}" width="${Math.round((cardW - 18) * 0.48)}" height="30" rx="15" fill="${C.darkSurface}" stroke="${C.darkCardBorder}" stroke-width="1"/>
        <text x="${cx + 6 + Math.round((cardW - 18) * 0.24)}" y="${cy + imgH + 85}" font-family="Arial" font-size="10" fill="${C.textSecondary}" text-anchor="middle">Preview</text>

        <rect x="${cx + 6 + Math.round((cardW - 18) * 0.52)}" y="${cy + imgH + 66}" width="${Math.round((cardW - 18) * 0.48)}" height="30" rx="15" fill="${C.primary}" opacity="0.9"/>
        <text x="${cx + 6 + Math.round((cardW - 18) * 0.76)}" y="${cy + imgH + 85}" font-family="Arial" font-size="10" font-weight="bold" fill="${C.white}" text-anchor="middle">+ Use Plan</text>
      `;
    }).join('')}

    <!-- Bottom nav hint -->
    <rect x="0" y="${170 + 2 * 240 + 14}" width="${sw}" height="36" rx="18" fill="${C.primary}" opacity="0.1"/>
    <text x="${sw / 2}" y="${170 + 2 * 240 + 37}" font-family="Arial" font-size="12" fill="${C.primaryLight}" text-anchor="middle">&#128640; Browse 500+ community plans</text>
  `;

  return phoneScreenshot(1080, 1920, THEMES.discover,
    'Copy Plans, Make Them Yours',
    'Browse community plans &#8212; use them with one tap',
    body
  );
}

// ============================================
// SCREENSHOT 3: MY ACTIVITIES
// Faithful recreation: real plan names & progress
// ============================================
function screenshot3_Activities() {
  const pw = Math.round(1080 * 0.50);
  const sw = screenW(pw);

  // Actual data from the app screenshots
  const activities = [
    { title: 'Austin to Los Angeles Adventure', sub: '12/12 tasks &#183; Completed', pct: 100, color: C.emerald, icon: '&#9992;', badge: '&#10003; Done', badgeColor: C.emerald },
    { title: 'Weekend Fitness Plan', sub: '8/10 tasks &#183; In Progress', pct: 80, color: C.sky, icon: '&#127947;', badge: '&#128293; Active', badgeColor: C.coral },
    { title: 'System Design Prep', sub: '5/12 tasks &#183; In Progress', pct: 42, color: C.primary, icon: '&#128187;', badge: '&#128293; Active', badgeColor: C.coral },
    { title: 'Thanksgiving Feast Plan', sub: '3/15 tasks &#183; Just Started', pct: 20, color: C.amber, icon: '&#127835;', badge: 'New', badgeColor: C.amber },
    { title: 'Date Night in Houston', sub: '0/7 tasks &#183; Ready', pct: 0, color: C.rose, icon: '&#128150;', badge: 'Planned', badgeColor: C.rose },
  ];

  const cardH = 98;
  const gap = 10;

  const body = `
    <text x="8" y="14" font-family="Arial" font-size="12" fill="${C.textSecondary}">9:41</text>
    <text x="${sw - 8}" y="14" font-family="Arial" font-size="12" fill="${C.textSecondary}" text-anchor="end">100%</text>

    <text x="8" y="46" font-family="'Segoe UI', Arial" font-size="22" font-weight="bold" fill="${C.white}">My Activities</text>
    <text x="8" y="66" font-family="Arial" font-size="12" fill="${C.textSecondary}">5 plans &#183; 28/56 tasks complete</text>

    <!-- Filter pills -->
    <rect x="0" y="78" width="50" height="28" rx="14" fill="${C.primary}" opacity="0.25" stroke="${C.primary}" stroke-opacity="0.5" stroke-width="1"/>
    <text x="25" y="97" font-family="Arial" font-size="11" fill="${C.primaryLight}" text-anchor="middle">All</text>
    <rect x="58" y="78" width="65" height="28" rx="14" fill="${C.darkCard}" stroke="${C.darkCardBorder}" stroke-width="1"/>
    <text x="90" y="97" font-family="Arial" font-size="11" fill="${C.textSecondary}" text-anchor="middle">Active</text>
    <rect x="131" y="78" width="80" height="28" rx="14" fill="${C.darkCard}" stroke="${C.darkCardBorder}" stroke-width="1"/>
    <text x="171" y="97" font-family="Arial" font-size="11" fill="${C.textSecondary}" text-anchor="middle">Completed</text>

    ${activities.map((a, i) => {
      const y = 120 + i * (cardH + gap);
      const barW = sw - 32;
      return `
        <rect x="0" y="${y}" width="${sw}" height="${cardH}" rx="14" fill="${C.darkCard}" stroke="${C.darkCardBorder}" stroke-width="1"/>
        <rect x="0" y="${y}" width="4" height="${cardH}" rx="2" fill="${a.color}"/>

        <!-- Icon circle -->
        <circle cx="28" cy="${y + 30}" r="16" fill="${a.color}" opacity="0.15"/>
        <text x="28" y="${y + 36}" font-family="Arial" font-size="15" text-anchor="middle">${a.icon}</text>

        <!-- Badge -->
        <rect x="${sw - 60}" y="${y + 10}" width="52" height="20" rx="10" fill="${a.badgeColor}" opacity="0.15"/>
        <text x="${sw - 34}" y="${y + 24}" font-family="Arial" font-size="9" fill="${a.badgeColor}" text-anchor="middle">${a.badge}</text>

        <!-- Title & subtitle -->
        <text x="52" y="${y + 26}" font-family="'Segoe UI', Arial" font-size="13" font-weight="bold" fill="${C.white}">${a.title}</text>
        <text x="52" y="${y + 44}" font-family="Arial" font-size="10" fill="${C.textSecondary}">${a.sub}</text>

        <!-- Progress bar -->
        <rect x="16" y="${y + 60}" width="${barW}" height="6" rx="3" fill="#1F2937"/>
        <rect x="16" y="${y + 60}" width="${Math.round(barW * a.pct / 100)}" height="6" rx="3" fill="${a.color}"/>
        <text x="${sw - 16}" y="${y + 84}" font-family="Arial" font-size="11" fill="${a.color}" text-anchor="end">${a.pct}%</text>
      `;
    }).join('')}

    <!-- Floating action button -->
    <circle cx="${sw - 30}" cy="${120 + activities.length * (cardH + gap) + 20}" r="24" fill="${C.primary}"/>
    <text x="${sw - 30}" y="${120 + activities.length * (cardH + gap) + 27}" font-family="Arial" font-size="24" fill="white" text-anchor="middle">+</text>
  `;

  return phoneScreenshot(1080, 1920, THEMES.activities,
    'For Everyday Planners',
    'AI-powered plans with real-time progress tracking',
    body
  );
}

// ============================================
// SCREENSHOT 4: TASK DETAIL VIEW
// Faithful: Flight from Austin to LAX, $350
// ============================================
function screenshot4_TaskDetail() {
  const pw = Math.round(1080 * 0.50);
  const sw = screenW(pw);

  const body = `
    <text x="8" y="14" font-family="Arial" font-size="12" fill="${C.textSecondary}">9:41</text>
    <text x="${sw - 8}" y="14" font-family="Arial" font-size="12" fill="${C.textSecondary}" text-anchor="end">100%</text>

    <!-- Back arrow + Activity name -->
    <text x="8" y="40" font-family="Arial" font-size="14" fill="${C.primaryLight}">&#8592; Austin to LA Adventure</text>

    <!-- Task title card -->
    <rect x="0" y="56" width="${sw}" height="120" rx="16" fill="${C.darkCard}" stroke="${C.darkCardBorder}" stroke-width="1"/>
    <circle cx="28" cy="84" r="16" fill="${C.sky}" opacity="0.15"/>
    <text x="28" y="90" font-family="Arial" font-size="15" text-anchor="middle">&#9992;</text>
    <text x="52" y="80" font-family="'Segoe UI', Arial" font-size="16" font-weight="bold" fill="${C.white}">Book Flight: Austin to LAX</text>
    <text x="52" y="100" font-family="Arial" font-size="11" fill="${C.textSecondary}">Task 1 of 12 &#183; High Priority</text>

    <!-- Cost badge -->
    <rect x="16" y="116" width="80" height="28" rx="14" fill="${C.emerald}" opacity="0.12" stroke="${C.emerald}" stroke-opacity="0.3" stroke-width="1"/>
    <text x="56" y="135" font-family="Arial" font-size="13" font-weight="bold" fill="${C.emeraldLight}" text-anchor="middle">$350</text>

    <rect x="108" y="116" width="100" height="28" rx="14" fill="${C.sky}" opacity="0.12" stroke="${C.sky}" stroke-opacity="0.3" stroke-width="1"/>
    <text x="158" y="135" font-family="Arial" font-size="11" fill="${C.skyLight}" text-anchor="middle">&#128339; 3h 30m flight</text>

    <rect x="220" y="116" width="80" height="28" rx="14" fill="${C.amber}" opacity="0.12" stroke="${C.amber}" stroke-opacity="0.3" stroke-width="1"/>
    <text x="260" y="135" font-family="Arial" font-size="11" fill="${C.amberLight}" text-anchor="middle">&#9993; Direct</text>

    <!-- AI Tips section -->
    <text x="8" y="200" font-family="Arial" font-size="11" font-weight="700" fill="${C.textMuted}" letter-spacing="1.5">AI RECOMMENDATIONS</text>

    <rect x="0" y="214" width="${sw}" height="155" rx="14" fill="${C.darkCard}" stroke="${C.darkCardBorder}" stroke-width="1"/>
    <circle cx="24" cy="238" r="10" fill="${C.primary}" opacity="0.2"/>
    <text x="24" y="242" font-family="Arial" font-size="10" fill="${C.primaryLight}" text-anchor="middle">&#9733;</text>
    <text x="42" y="238" font-family="Arial" font-size="12" fill="${C.white}">Book 2+ weeks ahead for best prices</text>
    <text x="42" y="254" font-family="Arial" font-size="10" fill="${C.textSecondary}">Average savings: $75-120</text>

    <line x1="16" y1="268" x2="${sw - 16}" y2="268" stroke="${C.darkCardBorder}" stroke-width="1"/>

    <circle cx="24" cy="288" r="10" fill="${C.teal}" opacity="0.2"/>
    <text x="24" y="292" font-family="Arial" font-size="10" fill="${C.tealLight}" text-anchor="middle">&#9733;</text>
    <text x="42" y="288" font-family="Arial" font-size="12" fill="${C.white}">Tue-Thu departures are cheapest</text>
    <text x="42" y="304" font-family="Arial" font-size="10" fill="${C.textSecondary}">Southwest &amp; United have direct flights</text>

    <line x1="16" y1="318" x2="${sw - 16}" y2="318" stroke="${C.darkCardBorder}" stroke-width="1"/>

    <circle cx="24" cy="338" r="10" fill="${C.coral}" opacity="0.2"/>
    <text x="24" y="342" font-family="Arial" font-size="10" fill="${C.coralLight}" text-anchor="middle">&#9733;</text>
    <text x="42" y="338" font-family="Arial" font-size="12" fill="${C.white}">AUS Terminal 2 for Southwest</text>
    <text x="42" y="354" font-family="Arial" font-size="10" fill="${C.textSecondary}">Arrive 90 min early for weekend flights</text>

    <!-- Action buttons (faithful to actual app) -->
    <text x="8" y="400" font-family="Arial" font-size="11" font-weight="700" fill="${C.textMuted}" letter-spacing="1.5">ACTIONS</text>

    <!-- Complete button (green, prominent) -->
    <rect x="0" y="414" width="${sw}" height="48" rx="24" fill="${C.emerald}"/>
    <text x="${sw / 2}" y="444" font-family="'Segoe UI', Arial" font-size="15" font-weight="bold" fill="white" text-anchor="middle">&#10003; Complete Task</text>

    <!-- Secondary action row -->
    <rect x="0" y="474" width="${Math.round((sw - 16) / 3)}" height="42" rx="14" fill="${C.darkCard}" stroke="${C.darkCardBorder}" stroke-width="1"/>
    <text x="${Math.round((sw - 16) / 6)}" y="500" font-family="Arial" font-size="11" fill="${C.amber}" text-anchor="middle">&#128337; Snooze</text>

    <rect x="${Math.round((sw - 16) / 3) + 8}" y="474" width="${Math.round((sw - 16) / 3)}" height="42" rx="14" fill="${C.darkCard}" stroke="${C.darkCardBorder}" stroke-width="1"/>
    <text x="${Math.round((sw - 16) / 3) + 8 + Math.round((sw - 16) / 6)}" y="500" font-family="Arial" font-size="11" fill="${C.sky}" text-anchor="middle">&#128197; Calendar</text>

    <rect x="${Math.round((sw - 16) / 3) * 2 + 16}" y="474" width="${Math.round((sw - 16) / 3)}" height="42" rx="14" fill="${C.darkCard}" stroke="${C.darkCardBorder}" stroke-width="1"/>
    <text x="${Math.round((sw - 16) / 3) * 2 + 16 + Math.round((sw - 16) / 6)}" y="500" font-family="Arial" font-size="11" fill="${C.textSecondary}" text-anchor="middle">&#128451; Archive</text>

    <!-- Skip link -->
    <text x="${sw / 2}" y="540" font-family="Arial" font-size="12" fill="${C.textMuted}" text-anchor="middle">Skip this task &#8594;</text>

    <!-- Related tasks preview -->
    <text x="8" y="572" font-family="Arial" font-size="11" font-weight="700" fill="${C.textMuted}" letter-spacing="1.5">UP NEXT</text>

    <rect x="0" y="586" width="${sw}" height="44" rx="12" fill="${C.darkCard}" stroke="${C.darkCardBorder}" stroke-width="1"/>
    <circle cx="22" cy="608" r="10" fill="none" stroke="${C.darkCardBorder}" stroke-width="1.5"/>
    <text x="40" y="612" font-family="Arial" font-size="12" fill="${C.white}">Book Hotel: Santa Monica Beach</text>
  `;

  return phoneScreenshot(1080, 1920, THEMES.tasks,
    'AI Plans Every Detail',
    'Smart recommendations, costs, and one-tap actions',
    body
  );
}

// ============================================
// SCREENSHOT 5: REPORTS & BADGES
// Faithful: actual badge names from the app
// ============================================
function screenshot5_Reports() {
  const pw = Math.round(1080 * 0.50);
  const sw = screenW(pw);
  const statW = Math.round((sw - 16) / 3);

  // Actual badges from the app screenshot
  const badges = [
    { name: 'Task Rookie', icon: '&#127941;', color: C.amber, desc: '10 tasks done' },
    { name: 'Task Pro', icon: '&#9889;', color: C.sky, desc: '50 tasks done' },
    { name: 'Perfectionist', icon: '&#127775;', color: C.emerald, desc: '100% plan' },
    { name: 'Social Butterfly', icon: '&#129419;', color: C.pink, desc: 'Shared 5 plans' },
    { name: 'Group Leader', icon: '&#128081;', color: C.primary, desc: 'Led 3 groups' },
    { name: 'Planner', icon: '&#128203;', color: C.teal, desc: '10 plans created' },
  ];

  const body = `
    <text x="8" y="14" font-family="Arial" font-size="12" fill="${C.textSecondary}">9:41</text>
    <text x="${sw - 8}" y="14" font-family="Arial" font-size="12" fill="${C.textSecondary}" text-anchor="end">100%</text>

    <text x="8" y="46" font-family="'Segoe UI', Arial" font-size="22" font-weight="bold" fill="${C.white}">Reports &amp; Progress</text>
    <text x="8" y="66" font-family="Arial" font-size="12" fill="${C.textSecondary}">Your achievements this month</text>

    <!-- Stat cards -->
    <rect x="0" y="82" width="${statW}" height="68" rx="14" fill="${C.primary}" opacity="0.12" stroke="${C.primary}" stroke-opacity="0.3" stroke-width="1"/>
    <text x="${statW / 2}" y="112" font-family="Arial" font-size="24" font-weight="bold" fill="${C.primaryLight}" text-anchor="middle">87%</text>
    <text x="${statW / 2}" y="132" font-family="Arial" font-size="9" fill="${C.textMuted}" text-anchor="middle">Completion</text>

    <rect x="${statW + 8}" y="82" width="${statW}" height="68" rx="14" fill="${C.emerald}" opacity="0.1" stroke="${C.emerald}" stroke-opacity="0.25" stroke-width="1"/>
    <text x="${statW + 8 + statW / 2}" y="112" font-family="Arial" font-size="24" font-weight="bold" fill="${C.emeraldLight}" text-anchor="middle">12</text>
    <text x="${statW + 8 + statW / 2}" y="132" font-family="Arial" font-size="9" fill="${C.textMuted}" text-anchor="middle">Day Streak</text>

    <rect x="${(statW + 8) * 2}" y="82" width="${statW}" height="68" rx="14" fill="${C.sky}" opacity="0.1" stroke="${C.sky}" stroke-opacity="0.25" stroke-width="1"/>
    <text x="${(statW + 8) * 2 + statW / 2}" y="112" font-family="Arial" font-size="24" font-weight="bold" fill="${C.skyLight}" text-anchor="middle">48</text>
    <text x="${(statW + 8) * 2 + statW / 2}" y="132" font-family="Arial" font-size="9" fill="${C.textMuted}" text-anchor="middle">Tasks Done</text>

    <!-- Weekly chart -->
    <rect x="0" y="164" width="${sw}" height="155" rx="16" fill="${C.darkCard}" stroke="${C.darkCardBorder}" stroke-width="1"/>
    <text x="16" y="188" font-family="Arial" font-size="13" font-weight="bold" fill="${C.white}">Weekly Progress</text>
    ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
      const barH = [28, 45, 60, 78, 88, 65, 48][i];
      const bw = Math.round((sw - 48) / 8);
      const bx = 16 + i * (bw + Math.round(bw * 0.3));
      return `
        <rect x="${bx}" y="${300 - barH}" width="${bw}" height="${barH}" rx="4" fill="${C.emerald}" opacity="${0.35 + i * 0.08}"/>
        <text x="${bx + bw / 2}" y="312" font-family="Arial" font-size="8" fill="${C.textMuted}" text-anchor="middle">${day}</text>
      `;
    }).join('')}

    <!-- Badges section (actual app data: 6/20 earned) -->
    <text x="8" y="346" font-family="'Segoe UI', Arial" font-size="14" font-weight="bold" fill="${C.white}">Badges Earned</text>
    <text x="${sw - 8}" y="346" font-family="Arial" font-size="12" fill="${C.primaryLight}" text-anchor="end">6/20</text>

    <!-- Badge grid 3x2 -->
    ${badges.map((b, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const bw = Math.round((sw - 16) / 3);
      const bx = col * (bw + 8);
      const by = 360 + row * 90;
      return `
        <rect x="${bx}" y="${by}" width="${bw}" height="78" rx="14" fill="${b.color}" opacity="0.08" stroke="${b.color}" stroke-opacity="0.25" stroke-width="1"/>
        <text x="${bx + bw / 2}" y="${by + 32}" font-family="Arial" font-size="22" text-anchor="middle">${b.icon}</text>
        <text x="${bx + bw / 2}" y="${by + 52}" font-family="Arial" font-size="10" font-weight="bold" fill="${b.color}" text-anchor="middle">${b.name}</text>
        <text x="${bx + bw / 2}" y="${by + 66}" font-family="Arial" font-size="8" fill="${C.textMuted}" text-anchor="middle">${b.desc}</text>
      `;
    }).join('')}

    <!-- Locked badges hint -->
    <rect x="0" y="546" width="${sw}" height="36" rx="18" fill="${C.darkCard}" stroke="${C.darkCardBorder}" stroke-width="1"/>
    <text x="${sw / 2}" y="569" font-family="Arial" font-size="11" fill="${C.textMuted}" text-anchor="middle">&#128274; 14 more badges to unlock &#8594;</text>

    <!-- Category breakdown -->
    <text x="8" y="608" font-family="Arial" font-size="12" font-weight="bold" fill="${C.white}">By Category</text>
    ${[
      { name: 'Travel', pct: 90, color: C.sky },
      { name: 'Fitness', pct: 75, color: C.emerald },
    ].map((cat, i) => {
      const cy = 620 + i * 38;
      const barAreaW = sw - 110;
      return `
        <text x="8" y="${cy + 18}" font-family="Arial" font-size="11" fill="${C.white}">${cat.name}</text>
        <rect x="80" y="${cy + 10}" width="${barAreaW}" height="6" rx="3" fill="#1F2937"/>
        <rect x="80" y="${cy + 10}" width="${Math.round(barAreaW * cat.pct / 100)}" height="6" rx="3" fill="${cat.color}"/>
        <text x="${sw - 8}" y="${cy + 18}" font-family="Arial" font-size="11" fill="${cat.color}" text-anchor="end">${cat.pct}%</text>
      `;
    }).join('')}
  `;

  return phoneScreenshot(1080, 1920, THEMES.reports,
    'Track Growth &amp; Earn Badges',
    'Streaks, achievements, and analytics at a glance',
    body
  );
}

// ============================================
// SCREENSHOT 6: GROUPS & COLLABORATION
// Faithful: real group names from the app
// ============================================
function screenshot6_Groups() {
  const pw = Math.round(1080 * 0.50);
  const sw = screenW(pw);

  // Real group names from app screenshots
  const groups = [
    { name: 'Thanksgiving Group', members: '6 members', goals: '3 shared goals', pct: 65, color: C.amber, avatars: ['SM', 'JK', 'ML', 'DR'] },
    { name: 'Dirty December Plan', members: '4 members', goals: '2 shared goals', pct: 40, color: C.rose, avatars: ['AK', 'TJ', 'RB'] },
    { name: 'Fitness Squad 2025', members: '5 members', goals: '4 shared goals', pct: 78, color: C.emerald, avatars: ['LP', 'SK', 'AR', 'JM'] },
  ];

  const cardH = 132;
  const gap = 12;

  const body = `
    <text x="8" y="14" font-family="Arial" font-size="12" fill="${C.textSecondary}">9:41</text>
    <text x="${sw - 8}" y="14" font-family="Arial" font-size="12" fill="${C.textSecondary}" text-anchor="end">100%</text>

    <text x="8" y="46" font-family="'Segoe UI', Arial" font-size="22" font-weight="bold" fill="${C.white}">Groups</text>
    <text x="8" y="66" font-family="Arial" font-size="12" fill="${C.textSecondary}">Plan and achieve goals together</text>

    <!-- Create group button -->
    <rect x="0" y="80" width="${sw}" height="46" rx="23" fill="url(#btnGrad)"/>
    <text x="${sw / 2}" y="109" font-family="'Segoe UI', Arial" font-size="15" font-weight="bold" fill="white" text-anchor="middle">+ Create New Group</text>

    ${groups.map((g, i) => {
      const y = 140 + i * (cardH + gap);
      const avatarColors = [C.primary, C.teal, C.emerald, C.amber, C.rose, C.indigo, C.sky];
      return `
        <rect x="0" y="${y}" width="${sw}" height="${cardH}" rx="16" fill="${C.darkCard}" stroke="${C.darkCardBorder}" stroke-width="1"/>
        <rect x="0" y="${y}" width="4" height="${cardH}" rx="2" fill="${g.color}"/>

        <text x="16" y="${y + 26}" font-family="'Segoe UI', Arial" font-size="15" font-weight="bold" fill="${C.white}">${g.name}</text>
        <text x="16" y="${y + 46}" font-family="Arial" font-size="11" fill="${C.textSecondary}">${g.members} &#183; ${g.goals}</text>

        <!-- Avatars -->
        ${g.avatars.map((av, j) => `
          <circle cx="${16 + j * 24 + 12}" cy="${y + 68}" r="12" fill="${avatarColors[j % avatarColors.length]}"/>
          <text x="${16 + j * 24 + 12}" y="${y + 73}" font-family="Arial" font-size="9" fill="white" text-anchor="middle">${av}</text>
        `).join('')}
        ${g.avatars.length < parseInt(g.members) ? `
          <circle cx="${16 + g.avatars.length * 24 + 12}" cy="${y + 68}" r="12" fill="${C.darkCardBorder}"/>
          <text x="${16 + g.avatars.length * 24 + 12}" y="${y + 73}" font-family="Arial" font-size="9" fill="${C.textMuted}" text-anchor="middle">+${parseInt(g.members) - g.avatars.length}</text>
        ` : ''}

        <!-- Progress bar -->
        <text x="16" y="${y + 100}" font-family="Arial" font-size="10" fill="${C.textMuted}">Team progress</text>
        <rect x="16" y="${y + 108}" width="${sw - 32}" height="5" rx="2.5" fill="#1F2937"/>
        <rect x="16" y="${y + 108}" width="${Math.round((sw - 32) * g.pct / 100)}" height="5" rx="2.5" fill="${g.color}"/>
        <text x="${sw - 16}" y="${y + 116}" font-family="Arial" font-size="11" fill="${g.color}" text-anchor="end">${g.pct}%</text>
      `;
    }).join('')}

    <!-- Activity Feed -->
    <text x="8" y="${140 + groups.length * (cardH + gap) + 16}" font-family="'Segoe UI', Arial" font-size="13" font-weight="bold" fill="${C.white}">Recent Activity</text>

    ${[
      { text: 'Sarah completed "Buy Turkey"', sub: 'Thanksgiving &#183; 2h ago', color: C.emerald },
      { text: 'Alex shared a new workout plan', sub: 'Fitness Squad &#183; 5h ago', color: C.sky },
      { text: 'New goal: "Dec Party Budget"', sub: 'Dirty December &#183; 1d ago', color: C.amber },
    ].map((item, i) => {
      const y = 140 + groups.length * (cardH + gap) + 30 + i * 48;
      return `
        <rect x="0" y="${y}" width="${sw}" height="40" rx="12" fill="${C.darkCard}" stroke="${C.darkCardBorder}" stroke-width="1"/>
        <circle cx="20" cy="${y + 20}" r="10" fill="${item.color}" opacity="0.2"/>
        <text x="20" y="${y + 24}" font-family="Arial" font-size="9" fill="${item.color}" text-anchor="middle">&#10003;</text>
        <text x="38" y="${y + 16}" font-family="Arial" font-size="11" fill="${C.white}">${item.text}</text>
        <text x="38" y="${y + 32}" font-family="Arial" font-size="9" fill="${C.textMuted}">${item.sub}</text>
      `;
    }).join('')}
  `;

  return phoneScreenshot(1080, 1920, THEMES.groups,
    'Achieve Goals Together',
    'Create groups, share plans, and collaborate',
    body
  );
}

// ============================================
// SCREENSHOT 7: ACCOUNTABILITY & REMINDERS
// Set reminders, sync calendar, trending near you, plan for others
// ============================================
function screenshot7_Accountability() {
  const pw = Math.round(1080 * 0.50);
  const sw = screenW(pw);
  const halfW = Math.round((sw - 10) / 2);

  const body = `
    <text x="8" y="14" font-family="Arial" font-size="12" fill="${C.textSecondary}">9:41</text>
    <text x="${sw - 8}" y="14" font-family="Arial" font-size="12" fill="${C.textSecondary}" text-anchor="end">100%</text>

    <!-- Header -->
    <text x="8" y="46" font-family="'Segoe UI', Arial" font-size="22" font-weight="bold" fill="${C.white}">Stay on Track</text>
    <text x="8" y="66" font-family="Arial" font-size="12" fill="${C.textSecondary}">Your personal accountability system</text>

    <!-- REMINDERS SECTION -->
    <text x="8" y="96" font-family="Arial" font-size="10" font-weight="700" fill="${C.textMuted}" letter-spacing="1.5">UPCOMING REMINDERS</text>

    <!-- Today's reminder card (highlighted) -->
    <rect x="0" y="110" width="${sw}" height="72" rx="14" fill="${C.primary}" opacity="0.1" stroke="${C.primary}" stroke-opacity="0.4" stroke-width="1.5"/>
    <rect x="0" y="110" width="4" height="72" rx="2" fill="${C.primary}"/>
    <circle cx="28" cy="136" r="14" fill="${C.primary}" opacity="0.2"/>
    <text x="28" y="141" font-family="Arial" font-size="12" fill="${C.primaryLight}" text-anchor="middle">&#128276;</text>
    <text x="50" y="132" font-family="'Segoe UI', Arial" font-size="13" font-weight="bold" fill="${C.white}">Book Flight: Austin &#8594; LAX</text>
    <text x="50" y="150" font-family="Arial" font-size="10" fill="${C.primaryLight}">Today at 2:00 PM &#183; Austin to LA Adventure</text>
    <text x="50" y="170" font-family="Arial" font-size="10" fill="${C.textMuted}">Prices drop in 3 days &#8212; AI recommends booking now</text>

    <!-- Tomorrow's reminder -->
    <rect x="0" y="192" width="${sw}" height="56" rx="14" fill="${C.darkCard}" stroke="${C.darkCardBorder}" stroke-width="1"/>
    <rect x="0" y="192" width="4" height="56" rx="2" fill="${C.amber}"/>
    <circle cx="28" cy="220" r="14" fill="${C.amber}" opacity="0.15"/>
    <text x="28" y="225" font-family="Arial" font-size="12" fill="${C.amberLight}" text-anchor="middle">&#128197;</text>
    <text x="50" y="214" font-family="Arial" font-size="12" font-weight="bold" fill="${C.white}">Gym: Morning HIIT Session</text>
    <text x="50" y="232" font-family="Arial" font-size="10" fill="${C.textSecondary}">Tomorrow 6:30 AM &#183; Synced to Google Calendar</text>

    <!-- Weekend reminder -->
    <rect x="0" y="258" width="${sw}" height="56" rx="14" fill="${C.darkCard}" stroke="${C.darkCardBorder}" stroke-width="1"/>
    <rect x="0" y="258" width="4" height="56" rx="2" fill="${C.rose}"/>
    <circle cx="28" cy="286" r="14" fill="${C.rose}" opacity="0.15"/>
    <text x="28" y="291" font-family="Arial" font-size="12" fill="${C.roseLight}" text-anchor="middle">&#128150;</text>
    <text x="50" y="280" font-family="Arial" font-size="12" font-weight="bold" fill="${C.white}">Date Night Reservation</text>
    <text x="50" y="298" font-family="Arial" font-size="10" fill="${C.textSecondary}">Saturday 7:00 PM &#183; Added to Apple Calendar</text>

    <!-- CALENDAR SYNC SECTION -->
    <text x="8" y="342" font-family="Arial" font-size="10" font-weight="700" fill="${C.textMuted}" letter-spacing="1.5">CALENDAR SYNC</text>

    <rect x="0" y="356" width="${sw}" height="76" rx="14" fill="${C.darkCard}" stroke="${C.emerald}" stroke-opacity="0.3" stroke-width="1"/>
    <circle cx="28" cy="382" r="14" fill="${C.emerald}" opacity="0.15"/>
    <text x="28" y="387" font-family="Arial" font-size="12" fill="${C.emeraldLight}" text-anchor="middle">&#10003;</text>
    <text x="50" y="378" font-family="'Segoe UI', Arial" font-size="13" font-weight="bold" fill="${C.white}">Auto-Synced to Your Calendar</text>
    <text x="50" y="396" font-family="Arial" font-size="10" fill="${C.textSecondary}">Google Calendar &#183; Apple Calendar &#183; Outlook</text>
    <text x="50" y="416" font-family="Arial" font-size="10" fill="${C.emeraldLight}">12 events synced this week &#183; 0 missed</text>

    <!-- TRENDING NEAR YOU -->
    <text x="8" y="462" font-family="Arial" font-size="10" font-weight="700" fill="${C.textMuted}" letter-spacing="1.5">TRENDING NEAR YOU</text>
    <text x="${sw - 8}" y="462" font-family="Arial" font-size="10" fill="${C.primaryLight}" text-anchor="end">Austin, TX</text>

    ${[
      { title: 'ACL Fest Weekend Plan', uses: '340 using', icon: '&#127925;', color: C.coral },
      { title: 'Austin Freeze Prep', uses: '890 using', icon: '&#10052;', color: C.sky },
      { title: 'SXSW Conference Guide', uses: '1.2k using', icon: '&#127908;', color: C.teal },
    ].map((t, i) => {
      const ty = 476 + i * 50;
      return `
        <rect x="0" y="${ty}" width="${sw}" height="42" rx="12" fill="${C.darkCard}" stroke="${C.darkCardBorder}" stroke-width="1"/>
        <circle cx="22" cy="${ty + 21}" r="12" fill="${t.color}" opacity="0.15"/>
        <text x="22" y="${ty + 26}" font-family="Arial" font-size="11" fill="${t.color}" text-anchor="middle">${t.icon}</text>
        <text x="42" y="${ty + 17}" font-family="Arial" font-size="12" font-weight="bold" fill="${C.white}">${t.title}</text>
        <text x="42" y="${ty + 34}" font-family="Arial" font-size="9" fill="${C.textMuted}">${t.uses} &#183; Trending</text>
        <rect x="${sw - 68}" y="${ty + 8}" width="60" height="26" rx="13" fill="${C.primary}" opacity="0.9"/>
        <text x="${sw - 38}" y="${ty + 26}" font-family="Arial" font-size="9" font-weight="bold" fill="white" text-anchor="middle">+ Use</text>
      `;
    }).join('')}

    <!-- PLAN FOR OTHERS -->
    <text x="8" y="644" font-family="Arial" font-size="10" font-weight="700" fill="${C.textMuted}" letter-spacing="1.5">PLAN FOR OTHERS &amp; EARN</text>

    <rect x="0" y="658" width="${sw}" height="60" rx="14" fill="${C.amber}" opacity="0.08" stroke="${C.amber}" stroke-opacity="0.3" stroke-width="1"/>
    <circle cx="28" cy="688" r="14" fill="${C.amber}" opacity="0.2"/>
    <text x="28" y="693" font-family="Arial" font-size="13" fill="${C.amberLight}" text-anchor="middle">&#127942;</text>
    <text x="50" y="682" font-family="'Segoe UI', Arial" font-size="12" font-weight="bold" fill="${C.white}">Create plans for friends &amp; family</text>
    <text x="50" y="700" font-family="Arial" font-size="10" fill="${C.amberLight}">Share plans &#8594; Earn badges &#8594; Climb the leaderboard</text>
  `;

  return phoneScreenshot(1080, 1920, THEMES.reports,
    'Never Miss a Thing',
    'Reminders, calendar sync, and trending plans near you',
    body
  );
}

// ============================================
// FEATURE GRAPHIC (1024x500)
// ============================================
async function generateFeatureGraphic() {
  const w = 1024, h = 500;
  const phoneW = 145, phoneH = 295;

  const svg = `
  <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1A0533"/>
        <stop offset="30%" stop-color="#0F1B4D"/>
        <stop offset="70%" stop-color="#0E1744"/>
        <stop offset="100%" stop-color="#042F2E"/>
      </linearGradient>
      <radialGradient id="orb1" cx="12%" cy="35%" r="40%">
        <stop offset="0%" stop-color="${C.primary}" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="${C.primary}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="orb2" cx="88%" cy="65%" r="35%">
        <stop offset="0%" stop-color="${C.teal}" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="${C.teal}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${C.primary}"/>
        <stop offset="100%" stop-color="${C.teal}"/>
      </linearGradient>
      <linearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${C.primary}"/>
        <stop offset="100%" stop-color="${C.teal}"/>
      </linearGradient>
      <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="12"/>
      </filter>
      <filter id="phoneShadow" x="-15%" y="-10%" width="130%" height="125%">
        <feDropShadow dx="0" dy="6" stdDeviation="16" flood-color="${C.primary}" flood-opacity="0.35"/>
      </filter>
      <filter id="textShadow">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.5"/>
      </filter>
    </defs>

    <rect width="100%" height="100%" fill="url(#bgGrad)"/>
    <rect width="100%" height="100%" fill="url(#orb1)"/>
    <rect width="100%" height="100%" fill="url(#orb2)"/>
    <circle cx="80" cy="130" r="70" fill="rgba(124,58,237,0.18)" filter="url(#softGlow)"/>
    <circle cx="920" cy="380" r="90" fill="rgba(20,184,166,0.12)" filter="url(#softGlow)"/>
    <circle cx="550" cy="60" r="40" fill="rgba(236,72,153,0.1)" filter="url(#softGlow)"/>

    <!-- Sparkles -->
    <circle cx="45" cy="70" r="2" fill="${C.primaryLight}" opacity="0.5"/>
    <circle cx="200" cy="35" r="1.5" fill="white" opacity="0.35"/>
    <circle cx="480" cy="55" r="2" fill="${C.tealLight}" opacity="0.4"/>
    <circle cx="850" cy="90" r="2" fill="${C.primaryLight}" opacity="0.45"/>
    <circle cx="980" cy="160" r="1.5" fill="white" opacity="0.3"/>

    <!-- LEFT: Logo + Hero -->
    <!-- Logo composited via sharp at x=45, y=25, 65x65 -->
    <text x="120" y="55" font-family="'Segoe UI', Arial, sans-serif" font-size="26" font-weight="800" fill="${C.white}" letter-spacing="-0.5" filter="url(#textShadow)">JournalMate.ai</text>
    <text x="120" y="76" font-family="Arial" font-size="12" fill="${C.tealLight}">AI Lifestyle Planner</text>

    <!-- Hero tagline -->
    <text x="45" y="125" font-family="'Segoe UI', Arial, sans-serif" font-size="36" font-weight="800" fill="${C.white}" letter-spacing="-1" filter="url(#textShadow)">See It. Share It. Own It.</text>
    <text x="45" y="152" font-family="Arial" font-size="14" fill="${C.tealLight}">Share from any app &#8212; AI creates your plan instantly</text>
    <rect x="45" y="164" width="260" height="3" rx="1.5" fill="url(#accentGrad)"/>

    <!-- Source platform icons (real branded) -->
    <text x="45" y="190" font-family="Arial" font-size="9" fill="${C.textMuted}" letter-spacing="1">SHARE FROM ANYWHERE</text>

    ${['instagram', 'tiktok', 'youtube', 'chatgpt', 'web', 'claude'].map((name, i) => {
      const labels = ['Instagram', 'TikTok', 'YouTube', 'ChatGPT', 'Any URL', 'Claude'];
      return `
        ${platformIcon(name, 60 + i * 38, 212, 12)}
        <text x="${60 + i * 38}" y="${230}" font-family="Arial" font-size="7" fill="${C.textSecondary}" text-anchor="middle">${labels[i]}</text>
      `;
    }).join('')}

    <!-- Arrow to result -->
    <text x="300" y="220" font-family="Arial" font-size="20" fill="${C.tealLight}" opacity="0.8">&#8594;</text>
    <rect x="322" y="202" width="140" height="30" rx="15" fill="${C.emerald}" opacity="0.12" stroke="${C.emerald}" stroke-opacity="0.35" stroke-width="1"/>
    <text x="392" y="222" font-family="Arial" font-size="11" font-weight="bold" fill="${C.emeraldLight}" text-anchor="middle">&#10024; Your Plan</text>

    <!-- Key features row -->
    <g transform="translate(45, 255)">
      ${[
        { icon: '&#127919;', label: 'AI-Powered', sub: 'Everyday Planning', color: C.primary },
        { icon: '&#128640;', label: 'Copy &amp; Share', sub: 'Plans Online', color: C.rose },
        { icon: '&#128101;', label: 'Plan for Others', sub: 'Earn Rewards', color: C.teal },
        { icon: '&#127942;', label: 'Collaborate', sub: 'Track &amp; Achieve', color: C.amber },
      ].map((f, i) => {
        const fx = i * 112;
        return `
          <circle cx="${fx + 16}" cy="14" r="14" fill="${f.color}" opacity="0.15"/>
          <text x="${fx + 16}" y="19" font-family="Arial" font-size="12" text-anchor="middle">${f.icon}</text>
          <text x="${fx + 38}" y="10" font-family="Arial" font-size="10" font-weight="bold" fill="${C.white}">${f.label}</text>
          <text x="${fx + 38}" y="24" font-family="Arial" font-size="9" fill="${C.textSecondary}">${f.sub}</text>
        `;
      }).join('')}
    </g>

    <!-- CTA -->
    <rect x="45" y="305" width="150" height="34" rx="17" fill="url(#btnGrad)" opacity="0.9"/>
    <text x="120" y="327" font-family="Arial" font-size="12" font-weight="bold" fill="white" text-anchor="middle">Get Started Free</text>

    <!-- Use cases row -->
    <g transform="translate(45, 354)">
      ${[
        'Recipe Reel &#8594; Meal Plan',
        'Workout TikTok &#8594; Fitness Plan',
        'ChatGPT Convo &#8594; Itinerary',
      ].map((uc, i) => `
        <rect x="${i * 156}" y="0" width="148" height="24" rx="12" fill="${C.darkCard}" stroke="${C.darkCardBorder}" stroke-width="1"/>
        <text x="${i * 156 + 74}" y="16" font-family="Arial" font-size="9" fill="${C.textSecondary}" text-anchor="middle">${uc}</text>
      `).join('')}
    </g>

    <!-- Bottom categories -->
    <g transform="translate(45, 398)">
      ${['&#127947;', '&#9992;', '&#127835;', '&#127956;', '&#128150;', '&#128188;', '&#129495;'].map((e, i) => {
        const colors = [C.emerald, C.sky, C.coral, C.teal, C.rose, C.amber, C.indigo];
        return `
          <circle cx="${i * 34 + 10}" cy="10" r="12" fill="${colors[i]}" opacity="0.2"/>
          <text x="${i * 34 + 10}" y="15" font-family="Arial" font-size="11" text-anchor="middle">${e}</text>
        `;
      }).join('')}
      <text x="260" y="15" font-family="Arial" font-size="10" fill="${C.textMuted}" opacity="0.6">Fitness &#183; Travel &#183; Food &#183; Romance &#183; Career</text>
    </g>

    <!-- Available on badge -->
    <g transform="translate(45, 440)">
      <rect x="0" y="0" width="130" height="30" rx="6" fill="${C.darkCard}" stroke="${C.darkCardBorder}" stroke-width="1"/>
      <text x="14" y="20" font-family="Arial" font-size="14" fill="${C.white}">&#9654;</text>
      <text x="34" y="14" font-family="Arial" font-size="8" fill="${C.textMuted}">GET IT ON</text>
      <text x="34" y="25" font-family="Arial" font-size="10" font-weight="bold" fill="${C.white}">Google Play</text>
    </g>

    <!-- RIGHT SIDE: Phone mockups -->
    <!-- Phone 1: Discover page -->
    <g filter="url(#phoneShadow)">
      <rect x="540" y="25" width="${phoneW}" height="${phoneH}" rx="16" fill="#1A1A2E" stroke="#3D3D5C" stroke-width="1.5"/>
      <rect x="546" y="40" width="${phoneW - 12}" height="${phoneH - 30}" rx="12" fill="${C.dark}"/>
      <rect x="${540 + phoneW / 2 - 22}" y="29" width="44" height="10" rx="5" fill="#000"/>

      <g transform="translate(552, 50)">
        <text x="4" y="12" font-family="Arial" font-size="8" font-weight="bold" fill="${C.white}">Discover</text>
        <text x="4" y="24" font-family="Arial" font-size="6" fill="${C.textMuted}">Community plans</text>

        ${[
          { title: 'Thanksgiving', price: '$320', imgKey: 'thanksgiving_mini' },
          { title: 'Christmas', price: '$850', imgKey: 'christmas_mini' },
        ].map((p, i) => {
          const cy = 30 + i * 105;
          const b64 = IMG_CACHE[p.imgKey];
          return `
            <defs><clipPath id="fgClip${i}"><rect x="0" y="${cy}" width="121" height="48" rx="8"/></clipPath></defs>
            <rect x="0" y="${cy}" width="121" height="95" rx="8" fill="${C.darkCard}" stroke="${C.darkCardBorder}" stroke-width="0.5"/>
            ${b64
              ? `<image x="0" y="${cy}" width="121" height="48" href="${b64}" clip-path="url(#fgClip${i})" preserveAspectRatio="xMidYMid slice"/>`
              : `<rect x="0" y="${cy}" width="121" height="48" rx="8" fill="#444"/>`}
            <rect x="78" y="${cy + 4}" width="38" height="16" rx="8" fill="#000" opacity="0.6"/>
            <text x="97" y="${cy + 15}" font-family="Arial" font-size="8" font-weight="bold" fill="white" text-anchor="middle">${p.price}</text>
            <text x="8" y="${cy + 62}" font-family="Arial" font-size="8" font-weight="bold" fill="${C.white}">${p.title}</text>
            <text x="8" y="${cy + 74}" font-family="Arial" font-size="6" fill="${C.textMuted}">Preview  + Use Plan</text>
          `;
        }).join('')}
      </g>
    </g>

    <!-- Phone 2: Activities page -->
    <g filter="url(#phoneShadow)">
      <rect x="705" y="50" width="${phoneW - 5}" height="${phoneH - 15}" rx="15" fill="#1A1A2E" stroke="#3D3D5C" stroke-width="1.5"/>
      <rect x="710" y="64" width="${phoneW - 15}" height="${phoneH - 38}" rx="11" fill="${C.dark}"/>
      <rect x="${705 + (phoneW - 5) / 2 - 20}" y="54" width="40" height="9" rx="4.5" fill="#000"/>

      <g transform="translate(716, 72)">
        <text x="4" y="12" font-family="Arial" font-size="8" font-weight="bold" fill="${C.white}">My Activities</text>
        <text x="4" y="24" font-family="Arial" font-size="6" fill="${C.textMuted}">5 active plans</text>

        ${[
          { title: 'Austin to LA', pct: 100, color: C.emerald, icon: '&#9992;' },
          { title: 'Fitness Plan', pct: 80, color: C.sky, icon: '&#127947;' },
          { title: 'System Design', pct: 42, color: C.primary, icon: '&#128187;' },
          { title: 'Thanksgiving', pct: 20, color: C.amber, icon: '&#127835;' },
        ].map((a, i) => {
          const ay = 32 + i * 44;
          return `
            <rect x="0" y="${ay}" width="114" height="38" rx="8" fill="${C.darkCard}" stroke="${C.darkCardBorder}" stroke-width="0.5"/>
            <rect x="0" y="${ay}" width="3" height="38" rx="1.5" fill="${a.color}"/>
            <text x="12" y="${ay + 14}" font-family="Arial" font-size="8" font-weight="bold" fill="${C.white}">${a.title}</text>
            <rect x="12" y="${ay + 22}" width="72" height="3" rx="1.5" fill="#1F2937"/>
            <rect x="12" y="${ay + 22}" width="${Math.round(72 * a.pct / 100)}" height="3" rx="1.5" fill="${a.color}"/>
            <text x="102" y="${ay + 26}" font-family="Arial" font-size="7" fill="${a.color}" text-anchor="end">${a.pct}%</text>
          `;
        }).join('')}
      </g>
    </g>

    <!-- Phone 3 hint: Groups (faded) -->
    <g opacity="0.4" transform="translate(865, 90)">
      <rect x="0" y="0" width="110" height="230" rx="14" fill="#1A1A2E" stroke="#3D3D5C" stroke-width="1"/>
      <rect x="5" y="13" width="100" height="208" rx="11" fill="${C.dark}"/>
      <rect x="30" y="4" width="40" height="8" rx="4" fill="#000"/>
      <g transform="translate(12, 24)">
        <text x="0" y="10" font-family="Arial" font-size="7" font-weight="bold" fill="${C.white}">Groups</text>
        ${[
          { name: 'Thanksgiving', color: C.amber },
          { name: 'Fitness Squad', color: C.emerald },
          { name: 'December Plan', color: C.rose },
        ].map((g, i) => `
          <rect x="0" y="${18 + i * 38}" width="76" height="32" rx="6" fill="${C.darkCard}" stroke="${C.darkCardBorder}" stroke-width="0.5"/>
          <rect x="0" y="${18 + i * 38}" width="2" height="32" rx="1" fill="${g.color}"/>
          <text x="8" y="${30 + i * 38}" font-family="Arial" font-size="6" font-weight="bold" fill="${C.white}">${g.name}</text>
          <text x="8" y="${40 + i * 38}" font-family="Arial" font-size="5" fill="${C.textMuted}">Active &#183; ${3 + i} members</text>
        `).join('')}
      </g>
    </g>
  </svg>`;

  const bgBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  const logoPath = path.join(__dirname, '..', 'client/public/icons/android/android-play-store-512.png');
  const logoBuffer = await sharp(logoPath).resize(65, 65).png().toBuffer();

  await sharp(bgBuffer)
    .composite([{ input: logoBuffer, top: 20, left: 45 }])
    .png()
    .toFile(path.join(OUTPUT_DIR, 'feature-graphic-1024x500.png'));
  console.log('  Feature Graphic (1024x500) - with logo + share-to-plan flow');
}

// ============================================
// TABLET SCREENSHOTS
// ============================================
function tabletScreenSvg(w, h, theme, headline, subtitle, bodyContent) {
  return `
  <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    ${themedBackground(w, h, theme)}
    <text x="${w / 2}" y="${Math.round(h * 0.06)}" font-family="'Segoe UI', Arial, sans-serif" font-size="44" font-weight="800" fill="${C.white}" text-anchor="middle" letter-spacing="-1" filter="url(#textShadow)">${headline}</text>
    <text x="${w / 2}" y="${Math.round(h * 0.09)}" font-family="'Segoe UI', Arial, sans-serif" font-size="20" fill="${theme.accent}" text-anchor="middle">${subtitle}</text>
    <rect x="${(w - 80) / 2}" y="${Math.round(h * 0.1)}" width="80" height="4" rx="2" fill="url(#accentLine)"/>
    <g transform="translate(${(w - Math.min(w * 0.9, 1000)) / 2}, ${Math.round(h * 0.13)})">
      ${bodyContent}
    </g>
    <rect x="${(w - 280) / 2}" y="${h - 55}" width="280" height="36" rx="18" fill="${theme.glow1}" opacity="0.12"/>
    <text x="${w / 2}" y="${h - 30}" font-family="'Segoe UI', Arial, sans-serif" font-size="16" font-weight="600" fill="${C.white}" text-anchor="middle" opacity="0.7">JournalMate.ai &#8212; AI Lifestyle Planner</text>
  </svg>`;
}

function tablet1_ShareFromAnywhere(w, h) {
  const cw = Math.min(w * 0.9, 1000);
  const pillW = Math.round((cw - 40) / 6);

  const body = `
    <!-- Source platforms row -->
    <text x="0" y="16" font-family="Arial" font-size="11" font-weight="700" fill="${C.textMuted}" letter-spacing="1.5">SHARE FROM ANYWHERE</text>

    ${[
      { label: 'Instagram', color: '#E4405F' },
      { label: 'TikTok', color: '#FFF' },
      { label: 'YouTube', color: '#FF0000' },
      { label: 'ChatGPT', color: '#10A37F' },
      { label: 'Any URL', color: C.sky },
      { label: 'Claude', color: C.indigo },
    ].map((p, i) => `
      <rect x="${i * (pillW + 8)}" y="30" width="${pillW}" height="50" rx="14" fill="${p.color}" opacity="0.1" stroke="${p.color}" stroke-opacity="0.3" stroke-width="1"/>
      <text x="${i * (pillW + 8) + pillW / 2}" y="52" font-family="Arial" font-size="15" text-anchor="middle" fill="${p.color}">&#9679;</text>
      <text x="${i * (pillW + 8) + pillW / 2}" y="72" font-family="Arial" font-size="11" fill="${p.color}" text-anchor="middle">${p.label}</text>
    `).join('')}

    <!-- Arrow -->
    <text x="${cw / 2}" y="110" font-family="Arial" font-size="24" fill="${C.tealLight}" text-anchor="middle">&#8595;</text>

    <!-- URL Input example -->
    <rect x="${cw * 0.15}" y="120" width="${cw * 0.7}" height="55" rx="16" fill="${C.darkCard}" stroke="${C.primary}" stroke-opacity="0.5" stroke-width="1.5"/>
    <text x="${cw * 0.2}" y="146" font-family="Arial" font-size="14" fill="${C.white}">https://instagram.com/reel/best-restaurants-lagos...</text>
    <text x="${cw * 0.2}" y="164" font-family="Arial" font-size="11" fill="${C.textMuted}">Pasted from Instagram</text>

    <!-- Create Plan CTA -->
    <rect x="${cw * 0.3}" y="190" width="${cw * 0.4}" height="44" rx="22" fill="url(#btnGrad)"/>
    <text x="${cw * 0.5}" y="217" font-family="'Segoe UI', Arial" font-size="16" font-weight="bold" fill="white" text-anchor="middle">&#10024; Create Plan Instantly</text>

    <!-- Result cards row -->
    <text x="0" y="264" font-family="Arial" font-size="11" font-weight="700" fill="${C.textMuted}" letter-spacing="1.5">AI EXTRACTED</text>

    ${[
      { title: 'Lagos Foodie Tour', sub: 'Instagram &#183; 8 venues', color: C.emerald },
      { title: 'HIIT Workout Plan', sub: 'TikTok &#183; 12 exercises', color: C.sky },
      { title: 'Japan Trip Itinerary', sub: 'ChatGPT &#183; 14 days', color: C.amber },
    ].map((r, i) => {
      const rw = Math.round((cw - 24) / 3);
      const rx = i * (rw + 12);
      return `
        <rect x="${rx}" y="278" width="${rw}" height="100" rx="14" fill="${C.darkCard}" stroke="${r.color}" stroke-opacity="0.3" stroke-width="1"/>
        <circle cx="${rx + 24}" cy="306" r="12" fill="${r.color}" opacity="0.2"/>
        <text x="${rx + 24}" y="310" font-family="Arial" font-size="10" fill="${r.color}" text-anchor="middle">&#10003;</text>
        <text x="${rx + 44}" y="304" font-family="Arial" font-size="13" font-weight="bold" fill="${C.white}">${r.title}</text>
        <text x="${rx + 44}" y="322" font-family="Arial" font-size="10" fill="${C.textSecondary}">${r.sub}</text>
        <rect x="${rx + 12}" y="340" width="${rw - 24}" height="28" rx="14" fill="${C.primary}" opacity="0.15" stroke="${C.primary}" stroke-opacity="0.3" stroke-width="1"/>
        <text x="${rx + rw / 2}" y="359" font-family="Arial" font-size="10" font-weight="bold" fill="${C.primaryLight}" text-anchor="middle">Own &amp; Customize</text>
      `;
    }).join('')}

    <!-- Smart extraction badges -->
    <text x="0" y="412" font-family="Arial" font-size="11" font-weight="700" fill="${C.textMuted}" letter-spacing="1.5">SMART EXTRACTION</text>
    ${[
      { label: '&#127908; Audio Transcription', color: C.teal },
      { label: '&#128247; OCR Text Extraction', color: C.amber },
      { label: '&#128172; Caption Analysis', color: C.rose },
      { label: '&#128205; Venue Detection', color: C.primary },
    ].map((b, i) => {
      const bw = Math.round((cw - 24) / 4);
      return `
        <rect x="${i * (bw + 8)}" y="426" width="${bw}" height="30" rx="15" fill="${b.color}" opacity="0.1" stroke="${b.color}" stroke-opacity="0.25" stroke-width="1"/>
        <text x="${i * (bw + 8) + bw / 2}" y="446" font-family="Arial" font-size="10" fill="${b.color}" text-anchor="middle">${b.label}</text>
      `;
    }).join('')}
  `;

  return tabletScreenSvg(w, h, THEMES.shareImport,
    'See It Online? Own It.',
    'Share from any app &#8212; AI creates YOUR plan instantly',
    body
  );
}

function tablet2_Discover(w, h) {
  const cw = Math.min(w * 0.9, 1000);
  const cardW = Math.round((cw - 36) / 4);

  const plans = [
    { title: 'Thanksgiving Feast', price: '$320', views: '1.2k', c1: '#8B4513', c2: '#D2691E' },
    { title: 'Christmas Celebration', price: '$850', views: '2.4k', c1: '#B22222', c2: '#FF6347' },
    { title: 'HEB Shopping Guide', price: '$400', views: '890', c1: '#2E8B57', c2: '#3CB371' },
    { title: 'NYE Party Planning', price: '$550', views: '1.8k', c1: '#4B0082', c2: '#8A2BE2' },
  ];

  const body = `
    <!-- Search -->
    <rect x="${cw * 0.1}" y="0" width="${cw * 0.8}" height="40" rx="20" fill="${C.darkCard}" stroke="${C.darkCardBorder}" stroke-width="1"/>
    <text x="${cw * 0.15}" y="25" font-family="Arial" font-size="14" fill="${C.textMuted}">&#128269; Search community plans...</text>

    <!-- Category chips -->
    ${['Trending', 'Food', 'Travel', 'Fitness', 'Holidays', 'Career'].map((cat, i) => `
      <rect x="${i * (Math.round(cw / 7) + 4)}" y="52" width="${Math.round(cw / 7)}" height="28" rx="14" fill="${i === 0 ? C.rose : C.darkCard}" opacity="${i === 0 ? '0.2' : '1'}" stroke="${i === 0 ? C.rose : C.darkCardBorder}" stroke-opacity="${i === 0 ? '0.4' : '1'}" stroke-width="1"/>
      <text x="${i * (Math.round(cw / 7) + 4) + Math.round(cw / 14)}" y="71" font-family="Arial" font-size="12" fill="${i === 0 ? C.roseLight : C.textSecondary}" text-anchor="middle">${cat}</text>
    `).join('')}

    <!-- Plan cards grid -->
    ${plans.map((p, i) => {
      const cx = i * (cardW + 12);
      return `
        <defs><linearGradient id="tp${i}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${p.c1}"/><stop offset="100%" stop-color="${p.c2}"/>
        </linearGradient></defs>
        <rect x="${cx}" y="96" width="${cardW}" height="260" rx="14" fill="${C.darkCard}" stroke="${C.darkCardBorder}" stroke-width="1"/>
        <rect x="${cx}" y="96" width="${cardW}" height="130" rx="14" fill="url(#tp${i})"/>
        <circle cx="${cx + cardW * 0.35}" cy="155" r="18" fill="white" opacity="0.06"/>
        <circle cx="${cx + cardW * 0.65}" cy="170" r="24" fill="white" opacity="0.04"/>
        <rect x="${cx + cardW - 56}" y="104" width="48" height="22" rx="11" fill="#000" opacity="0.6"/>
        <text x="${cx + cardW - 32}" y="120" font-family="Arial" font-size="12" font-weight="bold" fill="white" text-anchor="middle">${p.price}</text>
        <text x="${cx + 12}" y="246" font-family="'Segoe UI', Arial" font-size="14" font-weight="bold" fill="${C.white}">${p.title}</text>
        <text x="${cx + 12}" y="266" font-family="Arial" font-size="11" fill="${C.textSecondary}">&#128065; ${p.views} views</text>
        <rect x="${cx + 8}" y="280" width="${Math.round((cardW - 20) * 0.45)}" height="28" rx="14" fill="${C.darkSurface}" stroke="${C.darkCardBorder}" stroke-width="1"/>
        <text x="${cx + 8 + Math.round((cardW - 20) * 0.225)}" y="298" font-family="Arial" font-size="10" fill="${C.textSecondary}" text-anchor="middle">Preview</text>
        <rect x="${cx + 8 + Math.round((cardW - 20) * 0.5)}" y="280" width="${Math.round((cardW - 20) * 0.48)}" height="28" rx="14" fill="${C.primary}"/>
        <text x="${cx + 8 + Math.round((cardW - 20) * 0.74)}" y="298" font-family="Arial" font-size="10" font-weight="bold" fill="white" text-anchor="middle">+ Use Plan</text>
      `;
    }).join('')}

    <!-- Bottom CTA -->
    <rect x="${cw * 0.3}" y="380" width="${cw * 0.4}" height="36" rx="18" fill="${C.primary}" opacity="0.12"/>
    <text x="${cw * 0.5}" y="403" font-family="Arial" font-size="13" fill="${C.primaryLight}" text-anchor="middle">&#128640; Browse 500+ community plans</text>
  `;

  return tabletScreenSvg(w, h, THEMES.discover,
    'Copy Plans, Make Them Yours',
    'Browse, preview, and use community plans with one tap',
    body
  );
}

function tablet3_Activities(w, h) {
  const cw = Math.min(w * 0.9, 1000);
  const cardW = Math.round((cw - 36) / 3);

  const activities = [
    { title: 'Austin to LA Adventure', sub: '12/12 tasks', pct: 100, color: C.emerald, icon: '&#9992;' },
    { title: 'Weekend Fitness', sub: '8/10 tasks', pct: 80, color: C.sky, icon: '&#127947;' },
    { title: 'System Design Prep', sub: '5/12 tasks', pct: 42, color: C.primary, icon: '&#128187;' },
    { title: 'Thanksgiving Feast', sub: '3/15 tasks', pct: 20, color: C.amber, icon: '&#127835;' },
    { title: 'Date Night Houston', sub: '0/7 tasks', pct: 0, color: C.rose, icon: '&#128150;' },
    { title: 'Book Reading List', sub: '6/8 tasks', pct: 75, color: C.indigo, icon: '&#128214;' },
  ];

  const body = `
    ${activities.map((a, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const cx = col * (cardW + 18);
      const cy = row * 180;
      return `
        <rect x="${cx}" y="${cy}" width="${cardW}" height="160" rx="16" fill="${C.darkCard}" stroke="${C.darkCardBorder}" stroke-width="1"/>
        <rect x="${cx}" y="${cy}" width="5" height="160" rx="2.5" fill="${a.color}"/>
        <circle cx="${cx + 32}" cy="${cy + 36}" r="18" fill="${a.color}" opacity="0.15"/>
        <text x="${cx + 32}" y="${cy + 42}" font-family="Arial" font-size="16" text-anchor="middle">${a.icon}</text>
        <text x="${cx + 58}" y="${cy + 32}" font-family="'Segoe UI', Arial" font-size="14" font-weight="bold" fill="${C.white}">${a.title}</text>
        <text x="${cx + 58}" y="${cy + 50}" font-family="Arial" font-size="11" fill="${C.textSecondary}">${a.sub}</text>
        <rect x="${cx + 16}" y="${cy + 66}" width="${cardW - 32}" height="6" rx="3" fill="#1F2937"/>
        <rect x="${cx + 16}" y="${cy + 66}" width="${Math.round((cardW - 32) * a.pct / 100)}" height="6" rx="3" fill="${a.color}"/>
        <text x="${cx + cardW - 16}" y="${cy + 76}" font-family="Arial" font-size="11" fill="${a.color}" text-anchor="end">${a.pct}%</text>
        ${a.pct === 100 ? `
          <rect x="${cx + cardW - 65}" y="${cy + 10}" width="55" height="22" rx="11" fill="${C.emerald}" opacity="0.15"/>
          <text x="${cx + cardW - 37}" y="${cy + 26}" font-family="Arial" font-size="9" fill="${C.emerald}" text-anchor="middle">&#10003; Done</text>
        ` : `
          <rect x="${cx + cardW - 65}" y="${cy + 10}" width="55" height="22" rx="11" fill="${C.coral}" opacity="0.15"/>
          <text x="${cx + cardW - 37}" y="${cy + 26}" font-family="Arial" font-size="9" fill="${C.coral}" text-anchor="middle">&#128293; Active</text>
        `}

        <!-- Quick actions -->
        <rect x="${cx + 16}" y="${cy + 100}" width="${Math.round((cardW - 40) / 2)}" height="30" rx="15" fill="${C.darkSurface}" stroke="${C.darkCardBorder}" stroke-width="1"/>
        <text x="${cx + 16 + Math.round((cardW - 40) / 4)}" y="${cy + 120}" font-family="Arial" font-size="10" fill="${C.textSecondary}" text-anchor="middle">View Tasks</text>
        <rect x="${cx + 16 + Math.round((cardW - 40) / 2) + 8}" y="${cy + 100}" width="${Math.round((cardW - 40) / 2)}" height="30" rx="15" fill="${C.primary}" opacity="0.2"/>
        <text x="${cx + 16 + Math.round((cardW - 40) / 2) + 8 + Math.round((cardW - 40) / 4)}" y="${cy + 120}" font-family="Arial" font-size="10" fill="${C.primaryLight}" text-anchor="middle">Continue</text>
      `;
    }).join('')}

    <!-- Stats summary -->
    ${[
      { label: 'Total Plans', value: '6', color: C.primary },
      { label: 'Completion', value: '53%', color: C.emerald },
      { label: 'Tasks Done', value: '34/64', color: C.sky },
    ].map((s, i) => {
      const sx = i * (Math.round(cw / 3) + 2);
      const sWidth = Math.round(cw / 3) - 8;
      return `
        <rect x="${sx}" y="380" width="${sWidth}" height="55" rx="14" fill="${s.color}" opacity="0.1" stroke="${s.color}" stroke-opacity="0.25" stroke-width="1"/>
        <text x="${sx + sWidth / 2}" y="408" font-family="Arial" font-size="20" font-weight="bold" fill="${s.color}" text-anchor="middle">${s.value}</text>
        <text x="${sx + sWidth / 2}" y="426" font-family="Arial" font-size="10" fill="${C.textMuted}" text-anchor="middle">${s.label}</text>
      `;
    }).join('')}
  `;

  return tabletScreenSvg(w, h, THEMES.activities,
    'Plan It. Track It. Crush It.',
    'All your AI-powered plans with real-time progress',
    body
  );
}

function tablet4_Groups(w, h) {
  const cw = Math.min(w * 0.9, 1000);
  const cardW = Math.round((cw - 24) / 3);

  const groups = [
    { name: 'Thanksgiving Group', members: '6 members', goals: '3 goals', pct: 65, color: C.amber, avatars: ['SM', 'JK', 'ML'] },
    { name: 'Dirty December Plan', members: '4 members', goals: '2 goals', pct: 40, color: C.rose, avatars: ['AK', 'TJ'] },
    { name: 'Fitness Squad 2025', members: '5 members', goals: '4 goals', pct: 78, color: C.emerald, avatars: ['LP', 'SK', 'AR'] },
  ];

  const avatarColors = [C.primary, C.teal, C.amber, C.rose, C.sky, C.emerald, C.indigo];

  const body = `
    <!-- Create group CTA -->
    <rect x="${cw * 0.25}" y="0" width="${cw * 0.5}" height="44" rx="22" fill="url(#btnGrad)"/>
    <text x="${cw * 0.5}" y="27" font-family="'Segoe UI', Arial" font-size="15" font-weight="bold" fill="white" text-anchor="middle">+ Create New Group</text>

    ${groups.map((g, i) => {
      const cx = i * (cardW + 12);
      return `
        <rect x="${cx}" y="64" width="${cardW}" height="200" rx="16" fill="${C.darkCard}" stroke="${C.darkCardBorder}" stroke-width="1"/>
        <rect x="${cx}" y="64" width="5" height="200" rx="2.5" fill="${g.color}"/>
        <text x="${cx + 16}" y="92" font-family="'Segoe UI', Arial" font-size="15" font-weight="bold" fill="${C.white}">${g.name}</text>
        <text x="${cx + 16}" y="112" font-family="Arial" font-size="11" fill="${C.textSecondary}">${g.members} &#183; ${g.goals}</text>

        <!-- Avatars -->
        ${g.avatars.map((av, j) => `
          <circle cx="${cx + 28 + j * 26}" cy="140" r="13" fill="${avatarColors[j]}"/>
          <text x="${cx + 28 + j * 26}" y="145" font-family="Arial" font-size="9" fill="white" text-anchor="middle">${av}</text>
        `).join('')}

        <!-- Progress -->
        <text x="${cx + 16}" y="178" font-family="Arial" font-size="10" fill="${C.textMuted}">Team progress</text>
        <rect x="${cx + 16}" y="186" width="${cardW - 32}" height="5" rx="2.5" fill="#1F2937"/>
        <rect x="${cx + 16}" y="186" width="${Math.round((cardW - 32) * g.pct / 100)}" height="5" rx="2.5" fill="${g.color}"/>
        <text x="${cx + cardW - 16}" y="196" font-family="Arial" font-size="11" fill="${g.color}" text-anchor="end">${g.pct}%</text>

        <!-- Invite button -->
        <rect x="${cx + 16}" y="210" width="${cardW - 32}" height="30" rx="15" fill="${g.color}" opacity="0.12" stroke="${g.color}" stroke-opacity="0.3" stroke-width="1"/>
        <text x="${cx + cardW / 2}" y="230" font-family="Arial" font-size="11" fill="${g.color}" text-anchor="middle">Invite Friends</text>
      `;
    }).join('')}

    <!-- Activity feed -->
    <text x="0" y="290" font-family="'Segoe UI', Arial" font-size="14" font-weight="bold" fill="${C.white}">Recent Activity</text>

    ${[
      { text: 'Sarah completed "Buy Turkey"', sub: 'Thanksgiving &#183; 2h ago', color: C.emerald },
      { text: 'Alex shared a new workout plan', sub: 'Fitness Squad &#183; 5h ago', color: C.sky },
      { text: 'New goal: "Dec Party Budget"', sub: 'Dirty December &#183; 1d ago', color: C.amber },
    ].map((item, i) => {
      const iy = 304 + i * 44;
      return `
        <rect x="0" y="${iy}" width="${cw}" height="36" rx="12" fill="${C.darkCard}" stroke="${C.darkCardBorder}" stroke-width="1"/>
        <circle cx="20" cy="${iy + 18}" r="10" fill="${item.color}" opacity="0.2"/>
        <text x="20" y="${iy + 22}" font-family="Arial" font-size="9" fill="${item.color}" text-anchor="middle">&#10003;</text>
        <text x="38" y="${iy + 14}" font-family="Arial" font-size="12" fill="${C.white}">${item.text}</text>
        <text x="38" y="${iy + 30}" font-family="Arial" font-size="10" fill="${C.textMuted}">${item.sub}</text>
      `;
    }).join('')}
  `;

  return tabletScreenSvg(w, h, THEMES.groups,
    'Achieve Goals Together',
    'Create groups, share plans, and collaborate with friends',
    body
  );
}

// ============================================
// MAIN GENERATION
// ============================================
async function main() {
  // Ensure output directories
  for (const dir of ['', '/phone', '/tablet-7inch', '/tablet-10inch']) {
    const fullDir = path.join(OUTPUT_DIR, dir);
    if (!fs.existsSync(fullDir)) fs.mkdirSync(fullDir, { recursive: true });
  }

  console.log('Generating Google Play Store Assets (Sensationalized Real-App Edition)...\n');

  // ---- Preload real images into cache ----
  await preloadImages();

  // ---- App Icon ----
  const iconSrc = path.join(__dirname, '..', 'client/public/icons/android/android-play-store-512.png');
  if (fs.existsSync(iconSrc)) {
    fs.copyFileSync(iconSrc, path.join(OUTPUT_DIR, 'app-icon-512x512.png'));
    console.log('  App Icon (512x512) - copied');
  }

  // ---- Feature Graphic ----
  await generateFeatureGraphic();

  // ---- Phone Screenshots (1080x1920) ----
  // Standard SVG-only screenshots
  const phoneScreenshots = [
    { fn: screenshot1_ShareFromAnywhere, name: '01-share-from-anywhere' },
    { fn: screenshot2_Discover, name: '02-discover-plans' },
    { fn: screenshot3_Activities, name: '03-my-activities' },
    { fn: screenshot4_TaskDetail, name: '04-smart-tasks' },
    { fn: screenshot5_Reports, name: '05-reports-badges' },
    { fn: screenshot6_Groups, name: '06-groups-collab' },
    { fn: screenshot7_Accountability, name: '07-accountability' },
  ];

  for (const ss of phoneScreenshots) {
    const svg = ss.fn();
    await sharp(Buffer.from(svg)).png().toFile(
      path.join(OUTPUT_DIR, 'phone', `${ss.name}-1080x1920.png`)
    );
    console.log(`  Phone: ${ss.name} (1080x1920)`);
  }

  // ---- 7-inch Tablet Screenshots (1200x1920) ----
  const tablet7 = [
    { fn: tablet1_ShareFromAnywhere, name: '01-share-from-anywhere' },
    { fn: tablet2_Discover, name: '02-discover-plans' },
    { fn: tablet3_Activities, name: '03-activities' },
    { fn: tablet4_Groups, name: '04-groups' },
  ];

  for (const ts of tablet7) {
    const svg = ts.fn(1200, 1920);
    await sharp(Buffer.from(svg)).png().toFile(
      path.join(OUTPUT_DIR, 'tablet-7inch', `${ts.name}-1200x1920.png`)
    );
    console.log(`  7" Tablet: ${ts.name} (1200x1920)`);
  }

  // ---- 10-inch Tablet Screenshots (1920x1200) ----
  for (const ts of tablet7) {
    const svg = ts.fn(1920, 1200);
    await sharp(Buffer.from(svg)).png().toFile(
      path.join(OUTPUT_DIR, 'tablet-10inch', `${ts.name}-1920x1200.png`)
    );
    console.log(`  10" Tablet: ${ts.name} (1920x1200)`);
  }

  console.log(`\nAll assets generated in: ${OUTPUT_DIR}`);
  console.log('Total: 1 icon + 1 feature graphic + 7 phone + 4 tablet-7" + 4 tablet-10" = 17 assets');
}

main().catch(console.error);
