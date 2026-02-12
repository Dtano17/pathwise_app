#!/usr/bin/env node
/**
 * Generate Google Play Store graphics for JournalMate.ai
 *
 * VIBRANT LIFESTYLE EDITION
 * Each screenshot has a unique gradient theme, large phone mockup,
 * floating decorative elements, and aspirational marketing copy.
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
// VIBRANT COLOR SYSTEM
// ============================
const COLORS = {
  // Brand core
  primary: '#7C3AED',       // Vivid purple
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

  // Dark UI (for phone screen content)
  dark: '#0F1225',
  darkCard: '#1A1F36',
  darkCardBorder: '#2D3352',
  white: '#FFFFFF',
  textMuted: '#94A3B8',

  // Progress colors
  green: '#22C55E',
  red: '#EF4444',
  cyan: '#06B6D4',
};

// ============================
// THEMED GRADIENT BACKGROUNDS
// ============================
// Each screenshot gets its own unique, vibrant gradient
const THEMES = {
  goalInput: {
    name: 'Cosmic Purple',
    bg1: '#1A0533', bg2: '#0F1B4D', bg3: '#0A1628',
    glow1: '#7C3AED', glow2: '#14B8A6',
    accent: '#A78BFA',
    orb1: 'rgba(124, 58, 237, 0.35)', orb2: 'rgba(20, 184, 166, 0.25)',
  },
  activities: {
    name: 'Ocean Depths',
    bg1: '#051937', bg2: '#0A2D5E', bg3: '#0D1F3C',
    glow1: '#0EA5E9', glow2: '#7C3AED',
    accent: '#38BDF8',
    orb1: 'rgba(14, 165, 233, 0.3)', orb2: 'rgba(124, 58, 237, 0.2)',
  },
  tasks: {
    name: 'Warm Sunset',
    bg1: '#1A0A2E', bg2: '#2D1041', bg3: '#1A0533',
    glow1: '#F97316', glow2: '#F43F5E',
    accent: '#FB923C',
    orb1: 'rgba(249, 115, 22, 0.25)', orb2: 'rgba(244, 63, 94, 0.2)',
  },
  reports: {
    name: 'Emerald Glow',
    bg1: '#042F2E', bg2: '#0A1628', bg3: '#064E3B',
    glow1: '#10B981', glow2: '#0EA5E9',
    accent: '#34D399',
    orb1: 'rgba(16, 185, 129, 0.3)', orb2: 'rgba(14, 165, 233, 0.2)',
  },
  discover: {
    name: 'Rose Adventure',
    bg1: '#1A0A2E', bg2: '#3B0764', bg3: '#1E1B4B',
    glow1: '#EC4899', glow2: '#F97316',
    accent: '#F472B6',
    orb1: 'rgba(236, 72, 153, 0.3)', orb2: 'rgba(249, 115, 22, 0.2)',
  },
  groups: {
    name: 'Indigo Social',
    bg1: '#0C0A2E', bg2: '#1E1B4B', bg3: '#0E1744',
    glow1: '#6366F1', glow2: '#14B8A6',
    accent: '#818CF8',
    orb1: 'rgba(99, 102, 241, 0.35)', orb2: 'rgba(20, 184, 166, 0.25)',
  },
};

// ============================
// SVG HELPER FUNCTIONS
// ============================

// Create a rich, themed gradient background with floating orbs
function createThemedBackground(width, height, theme) {
  return `
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${theme.bg1};stop-opacity:1" />
        <stop offset="50%" style="stop-color:${theme.bg2};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${theme.bg3};stop-opacity:1" />
      </linearGradient>
      <radialGradient id="orb1" cx="20%" cy="25%" r="45%">
        <stop offset="0%" style="stop-color:${theme.glow1};stop-opacity:0.3" />
        <stop offset="60%" style="stop-color:${theme.glow1};stop-opacity:0.08" />
        <stop offset="100%" style="stop-color:${theme.glow1};stop-opacity:0" />
      </radialGradient>
      <radialGradient id="orb2" cx="80%" cy="75%" r="40%">
        <stop offset="0%" style="stop-color:${theme.glow2};stop-opacity:0.25" />
        <stop offset="60%" style="stop-color:${theme.glow2};stop-opacity:0.06" />
        <stop offset="100%" style="stop-color:${theme.glow2};stop-opacity:0" />
      </radialGradient>
      <radialGradient id="orb3" cx="70%" cy="15%" r="30%">
        <stop offset="0%" style="stop-color:${theme.glow1};stop-opacity:0.15" />
        <stop offset="100%" style="stop-color:${theme.glow1};stop-opacity:0" />
      </radialGradient>
      <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:${theme.glow1};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${theme.glow2};stop-opacity:1" />
      </linearGradient>
      <linearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${COLORS.primary};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${theme.glow1};stop-opacity:1" />
      </linearGradient>
      <linearGradient id="phoneGlow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${theme.glow1};stop-opacity:0.4" />
        <stop offset="100%" style="stop-color:${theme.glow2};stop-opacity:0.2" />
      </linearGradient>
      <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="20"/>
      </filter>
      <filter id="phoneShadow" x="-15%" y="-10%" width="130%" height="125%">
        <feDropShadow dx="0" dy="12" stdDeviation="30" flood-color="${theme.glow1}" flood-opacity="0.35"/>
      </filter>
      <filter id="cardShadow" x="-5%" y="-5%" width="110%" height="115%">
        <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000" flood-opacity="0.4"/>
      </filter>
      <filter id="textShadow">
        <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000" flood-opacity="0.5"/>
      </filter>
    </defs>

    <!-- Rich gradient background -->
    <rect width="100%" height="100%" fill="url(#bgGrad)"/>

    <!-- Floating light orbs -->
    <rect width="100%" height="100%" fill="url(#orb1)"/>
    <rect width="100%" height="100%" fill="url(#orb2)"/>
    <rect width="100%" height="100%" fill="url(#orb3)"/>

    <!-- Subtle floating circles for depth -->
    <circle cx="${width * 0.15}" cy="${height * 0.2}" r="${width * 0.12}" fill="${theme.orb1}" filter="url(#softGlow)"/>
    <circle cx="${width * 0.85}" cy="${height * 0.7}" r="${width * 0.15}" fill="${theme.orb2}" filter="url(#softGlow)"/>
    <circle cx="${width * 0.6}" cy="${height * 0.1}" r="${width * 0.06}" fill="${theme.orb1}" filter="url(#softGlow)"/>
    <circle cx="${width * 0.3}" cy="${height * 0.85}" r="${width * 0.08}" fill="${theme.orb2}" filter="url(#softGlow)"/>

    <!-- Sparkle dots -->
    <circle cx="${width * 0.1}" cy="${height * 0.15}" r="2" fill="${theme.accent}" opacity="0.6"/>
    <circle cx="${width * 0.25}" cy="${height * 0.08}" r="1.5" fill="${COLORS.white}" opacity="0.4"/>
    <circle cx="${width * 0.85}" cy="${height * 0.12}" r="2" fill="${theme.accent}" opacity="0.5"/>
    <circle cx="${width * 0.92}" cy="${height * 0.25}" r="1.5" fill="${COLORS.white}" opacity="0.3"/>
    <circle cx="${width * 0.05}" cy="${height * 0.5}" r="2" fill="${theme.accent}" opacity="0.4"/>
    <circle cx="${width * 0.95}" cy="${height * 0.55}" r="1.5" fill="${COLORS.white}" opacity="0.35"/>
    <circle cx="${width * 0.15}" cy="${height * 0.92}" r="2" fill="${theme.accent}" opacity="0.5"/>
    <circle cx="${width * 0.88}" cy="${height * 0.88}" r="1.5" fill="${COLORS.white}" opacity="0.3"/>
  `;
}

// Phone frame mockup - MUCH LARGER, with glow effect
function createPhoneFrame(frameX, frameY, frameW, frameH, screenContent) {
  const cornerR = Math.round(frameW * 0.07);
  const bezel = Math.round(frameW * 0.02);
  const screenR = Math.round(frameW * 0.06);
  const notchW = Math.round(frameW * 0.28);
  const notchH = Math.round(frameH * 0.018);

  return `
    <!-- Phone shadow glow -->
    <rect x="${frameX}" y="${frameY}" width="${frameW}" height="${frameH}"
          rx="${cornerR}" ry="${cornerR}"
          fill="url(#phoneGlow)" filter="url(#phoneShadow)" opacity="0.5"/>

    <!-- Phone body -->
    <rect x="${frameX}" y="${frameY}" width="${frameW}" height="${frameH}"
          rx="${cornerR}" ry="${cornerR}"
          fill="#1A1A2E" stroke="#3D3D5C" stroke-width="2"/>

    <!-- Screen area -->
    <rect x="${frameX + bezel}" y="${frameY + bezel + notchH + 8}"
          width="${frameW - bezel * 2}" height="${frameH - bezel * 2 - notchH * 2 - 16}"
          rx="${screenR}" ry="${screenR}"
          fill="${COLORS.dark}"/>

    <!-- Notch -->
    <rect x="${frameX + (frameW - notchW) / 2}" y="${frameY + 6}"
          width="${notchW}" height="${notchH}" rx="${notchH / 2}" fill="#000"/>

    <!-- Screen content -->
    <g transform="translate(${frameX + bezel + 6}, ${frameY + bezel + notchH + 14})">
      ${screenContent}
    </g>
  `;
}

// ============================================
// PHONE SCREENSHOT TEMPLATE
// ============================================
function phoneScreenSvg(width, height, theme, headerText, subtitleText, bodyContent) {
  const phoneW = Math.round(width * 0.48);
  const phoneH = Math.round(phoneW * 2.0);
  const phoneX = Math.round((width - phoneW) / 2);
  const phoneY = Math.round(height * 0.16);

  return `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    ${createThemedBackground(width, height, theme)}

    <!-- Marketing headline -->
    <text x="${width / 2}" y="${height * 0.055}" font-family="'Segoe UI', Arial, Helvetica, sans-serif" font-size="56" font-weight="800" fill="${COLORS.white}" text-anchor="middle" letter-spacing="-1.5" filter="url(#textShadow)">
      ${headerText}
    </text>
    <text x="${width / 2}" y="${height * 0.09}" font-family="'Segoe UI', Arial, Helvetica, sans-serif" font-size="24" fill="${theme.accent}" text-anchor="middle" opacity="0.9">
      ${subtitleText}
    </text>

    <!-- Accent underline -->
    <rect x="${(width - 80) / 2}" y="${height * 0.1}" width="80" height="4" rx="2" fill="url(#accentGrad)"/>

    <!-- Phone mockup (LARGE) -->
    ${createPhoneFrame(phoneX, phoneY, phoneW, phoneH, bodyContent)}

    <!-- Bottom branding bar -->
    <rect x="${(width - 220) / 2}" y="${height - 70}" width="220" height="40" rx="20" fill="${theme.glow1}" opacity="0.15"/>
    <text x="${width / 2}" y="${height - 43}" font-family="'Segoe UI', Arial, Helvetica, sans-serif" font-size="18" font-weight="600" fill="${COLORS.white}" text-anchor="middle" opacity="0.8">
      JournalMate.ai
    </text>
  </svg>`;
}

// ============================================
// SCREEN CONTENT DIMENSIONS
// ============================================
function getScreenDims(phoneW) {
  const bezel = Math.round(phoneW * 0.02);
  return {
    sw: phoneW - bezel * 2 - 12, // screen width usable
  };
}

// ============================================
// SCREENSHOT 1: AI Goal Input
// ============================================
function screenshot1_GoalInput() {
  const phoneW = Math.round(1080 * 0.48);
  const { sw } = getScreenDims(phoneW);

  const body = `
    <!-- Status bar -->
    <text x="8" y="16" font-family="Arial" font-size="13" fill="${COLORS.textMuted}">9:41</text>
    <text x="${sw - 8}" y="16" font-family="Arial" font-size="13" fill="${COLORS.textMuted}" text-anchor="end">100%</text>

    <!-- Header -->
    <text x="8" y="50" font-family="'Segoe UI', Arial" font-size="22" font-weight="bold" fill="${COLORS.white}">What's your next adventure?</text>
    <text x="8" y="72" font-family="Arial" font-size="13" fill="${COLORS.textMuted}">Describe your goal or dream</text>

    <!-- Input area with glow border -->
    <rect x="0" y="88" width="${sw}" height="100" rx="16" fill="${COLORS.darkCard}" stroke="${COLORS.primary}" stroke-opacity="0.4" stroke-width="1.5"/>
    <text x="16" y="115" font-family="Arial" font-size="14" fill="${COLORS.white}" opacity="0.9">I want to start a morning</text>
    <text x="16" y="135" font-family="Arial" font-size="14" fill="${COLORS.white}" opacity="0.9">workout routine and eat</text>
    <text x="16" y="155" font-family="Arial" font-size="14" fill="${COLORS.white}" opacity="0.9">healthier this month</text>

    <!-- Voice mic button -->
    <circle cx="${sw - 32}" cy="168" r="18" fill="${COLORS.primary}" opacity="0.9"/>
    <text x="${sw - 32}" y="174" font-family="Arial" font-size="16" fill="white" text-anchor="middle">&#x1F3A4;</text>

    <!-- "Choose a vibe" section -->
    <text x="8" y="218" font-family="Arial" font-size="12" font-weight="600" fill="${COLORS.textMuted}" letter-spacing="1">CHOOSE A VIBE</text>

    <!-- Colorful category pills - 2 rows -->
    <rect x="0" y="232" width="${Math.round(sw * 0.3)}" height="36" rx="18" fill="${COLORS.emerald}" opacity="0.2" stroke="${COLORS.emerald}" stroke-opacity="0.5" stroke-width="1"/>
    <text x="${Math.round(sw * 0.15)}" y="255" font-family="Arial" font-size="13" fill="${COLORS.emeraldLight}" text-anchor="middle">Wellness</text>

    <rect x="${Math.round(sw * 0.33)}" y="232" width="${Math.round(sw * 0.3)}" height="36" rx="18" fill="${COLORS.sky}" opacity="0.2" stroke="${COLORS.sky}" stroke-opacity="0.5" stroke-width="1"/>
    <text x="${Math.round(sw * 0.48)}" y="255" font-family="Arial" font-size="13" fill="${COLORS.skyLight}" text-anchor="middle">Travel</text>

    <rect x="${Math.round(sw * 0.66)}" y="232" width="${Math.round(sw * 0.33)}" height="36" rx="18" fill="${COLORS.coral}" opacity="0.2" stroke="${COLORS.coral}" stroke-opacity="0.5" stroke-width="1"/>
    <text x="${Math.round(sw * 0.825)}" y="255" font-family="Arial" font-size="13" fill="${COLORS.coralLight}" text-anchor="middle">Adventure</text>

    <rect x="0" y="278" width="${Math.round(sw * 0.3)}" height="36" rx="18" fill="${COLORS.rose}" opacity="0.2" stroke="${COLORS.rose}" stroke-opacity="0.5" stroke-width="1"/>
    <text x="${Math.round(sw * 0.15)}" y="301" font-family="Arial" font-size="13" fill="${COLORS.roseLight}" text-anchor="middle">Romance</text>

    <rect x="${Math.round(sw * 0.33)}" y="278" width="${Math.round(sw * 0.3)}" height="36" rx="18" fill="${COLORS.indigo}" opacity="0.2" stroke="${COLORS.indigo}" stroke-opacity="0.5" stroke-width="1"/>
    <text x="${Math.round(sw * 0.48)}" y="301" font-family="Arial" font-size="13" fill="${COLORS.indigoLight}" text-anchor="middle">Spiritual</text>

    <rect x="${Math.round(sw * 0.66)}" y="278" width="${Math.round(sw * 0.33)}" height="36" rx="18" fill="${COLORS.amber}" opacity="0.2" stroke="${COLORS.amber}" stroke-opacity="0.5" stroke-width="1"/>
    <text x="${Math.round(sw * 0.825)}" y="301" font-family="Arial" font-size="13" fill="${COLORS.amberLight}" text-anchor="middle">Career</text>

    <!-- Planning mode cards -->
    <text x="8" y="345" font-family="Arial" font-size="12" font-weight="600" fill="${COLORS.textMuted}" letter-spacing="1">PLANNING MODE</text>

    <rect x="0" y="360" width="${Math.round(sw * 0.48)}" height="52" rx="14" fill="${COLORS.primary}" opacity="0.2" stroke="${COLORS.primary}" stroke-width="1.5"/>
    <text x="${Math.round(sw * 0.24)}" y="382" font-family="Arial" font-size="14" font-weight="bold" fill="${COLORS.primaryLight}" text-anchor="middle">Quick Plan</text>
    <text x="${Math.round(sw * 0.24)}" y="400" font-family="Arial" font-size="10" fill="${COLORS.textMuted}" text-anchor="middle">5 AI questions</text>

    <rect x="${Math.round(sw * 0.52)}" y="360" width="${Math.round(sw * 0.48)}" height="52" rx="14" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="${Math.round(sw * 0.76)}" y="382" font-family="Arial" font-size="14" font-weight="bold" fill="${COLORS.white}" text-anchor="middle">Smart Plan</text>
    <text x="${Math.round(sw * 0.76)}" y="400" font-family="Arial" font-size="10" fill="${COLORS.textMuted}" text-anchor="middle">7 deep questions</text>

    <!-- Vibrant CTA button -->
    <rect x="0" y="430" width="${sw}" height="52" rx="26" fill="url(#btnGrad)"/>
    <text x="${sw / 2}" y="462" font-family="'Segoe UI', Arial" font-size="17" font-weight="bold" fill="white" text-anchor="middle">Generate My Plan</text>

    <!-- Recent activity hint -->
    <text x="8" y="515" font-family="Arial" font-size="12" font-weight="600" fill="${COLORS.textMuted}" letter-spacing="1">RECENT</text>
    <rect x="0" y="528" width="${sw}" height="48" rx="12" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="16" y="550" font-family="Arial" font-size="13" fill="${COLORS.white}">Weekend Meal Prep</text>
    <text x="16" y="566" font-family="Arial" font-size="11" fill="${COLORS.textMuted}">Completed yesterday</text>
    <circle cx="${sw - 20}" cy="552" r="10" fill="${COLORS.green}" opacity="0.2"/>
    <text x="${sw - 20}" y="556" font-family="Arial" font-size="12" fill="${COLORS.green}" text-anchor="middle">&#10003;</text>
  `;

  return phoneScreenSvg(1080, 1920, THEMES.goalInput,
    'Plan Any Dream with AI',
    'Voice or text — your lifestyle planner handles the rest',
    body
  );
}

// ============================================
// SCREENSHOT 2: Activities Dashboard
// ============================================
function screenshot2_Activities() {
  const phoneW = Math.round(1080 * 0.48);
  const { sw } = getScreenDims(phoneW);

  const cards = [
    { emoji: '&#x1F4AA;', title: 'Morning Fitness', sub: '7 of 10 tasks', pct: 70, color: COLORS.emerald, colorLight: COLORS.emeraldLight, cat: 'Wellness', due: 'Today' },
    { emoji: '&#x2708;', title: 'Japan Trip Planning', sub: '3 of 12 tasks', pct: 25, color: COLORS.sky, colorLight: COLORS.skyLight, cat: 'Travel', due: 'Mar 15' },
    { emoji: '&#x1F4CB;', title: 'Product Launch Prep', sub: '5 of 8 tasks', pct: 63, color: COLORS.primary, colorLight: COLORS.primaryLight, cat: 'Work', due: 'This week' },
    { emoji: '&#x1F496;', title: 'Date Night Ideas', sub: '1 of 5 tasks', pct: 20, color: COLORS.rose, colorLight: COLORS.roseLight, cat: 'Romance', due: 'Saturday' },
  ];

  const cardH = 105;
  const gap = 12;

  const body = `
    <text x="8" y="16" font-family="Arial" font-size="13" fill="${COLORS.textMuted}">9:41</text>
    <text x="${sw - 8}" y="16" font-family="Arial" font-size="13" fill="${COLORS.textMuted}" text-anchor="end">100%</text>

    <text x="8" y="50" font-family="'Segoe UI', Arial" font-size="22" font-weight="bold" fill="${COLORS.white}">My Adventures</text>
    <text x="8" y="72" font-family="Arial" font-size="13" fill="${COLORS.textMuted}">4 active plans</text>

    <!-- Search -->
    <rect x="0" y="86" width="${sw}" height="40" rx="20" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="36" y="111" font-family="Arial" font-size="13" fill="${COLORS.textMuted}">Search adventures...</text>
    <text x="16" y="111" font-family="Arial" font-size="14" fill="${COLORS.textMuted}">&#x1F50D;</text>

    ${cards.map((c, i) => {
      const y = 140 + i * (cardH + gap);
      const barW = sw - 60;
      return `
        <!-- Card: ${c.title} -->
        <rect x="0" y="${y}" width="${sw}" height="${cardH}" rx="16" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1" filter="url(#cardShadow)"/>
        <rect x="0" y="${y}" width="5" height="${cardH}" rx="2.5" fill="${c.color}"/>
        <circle cx="32" cy="${y + 32}" r="18" fill="${c.color}" opacity="0.2"/>
        <text x="32" y="${y + 38}" font-family="Arial" font-size="16" text-anchor="middle">${c.emoji}</text>
        <text x="60" y="${y + 28}" font-family="Arial" font-size="15" font-weight="bold" fill="${COLORS.white}">${c.title}</text>
        <text x="60" y="${y + 46}" font-family="Arial" font-size="11" fill="${COLORS.textMuted}">${c.sub}</text>
        <rect x="60" y="${y + 56}" width="${barW - 40}" height="5" rx="2.5" fill="#2A2D45"/>
        <rect x="60" y="${y + 56}" width="${Math.round((barW - 40) * c.pct / 100)}" height="5" rx="2.5" fill="${c.color}"/>
        <text x="${sw - 10}" y="${y + 62}" font-family="Arial" font-size="11" fill="${c.colorLight}" text-anchor="end">${c.pct}%</text>
        <text x="60" y="${y + 84}" font-family="Arial" font-size="10" fill="${COLORS.textMuted}">Due: ${c.due}  &#183;  ${c.cat}</text>
      `;
    }).join('')}
  `;

  return phoneScreenSvg(1080, 1920, THEMES.activities,
    'All Your Plans, One Place',
    'Track progress across every adventure',
    body
  );
}

// ============================================
// SCREENSHOT 3: Tasks View
// ============================================
function screenshot3_Tasks() {
  const phoneW = Math.round(1080 * 0.48);
  const { sw } = getScreenDims(phoneW);

  const tasks = [
    { text: 'Wake up at 6:00 AM', ctx: 'Morning Routine', done: true, priority: 'Done', prioColor: COLORS.green },
    { text: '30-min HIIT workout', ctx: 'Morning Fitness', done: false, priority: 'High', prioColor: COLORS.red },
    { text: 'Healthy breakfast prep', ctx: 'Morning Routine', done: false, priority: 'Medium', prioColor: COLORS.amber },
    { text: 'Review product roadmap', ctx: 'Product Launch', done: false, priority: 'Normal', prioColor: COLORS.primary },
    { text: 'Book flight to Tokyo', ctx: 'Japan Trip', done: false, priority: 'Normal', prioColor: COLORS.cyan },
    { text: 'Research restaurants', ctx: 'Date Night', done: false, priority: 'Normal', prioColor: COLORS.rose },
    { text: 'Write team update', ctx: 'Product Launch', done: false, priority: 'Normal', prioColor: COLORS.primary },
  ];

  const taskH = 58;
  const gap = 8;

  const body = `
    <text x="8" y="16" font-family="Arial" font-size="13" fill="${COLORS.textMuted}">9:41</text>

    <text x="8" y="50" font-family="'Segoe UI', Arial" font-size="22" font-weight="bold" fill="${COLORS.white}">Today's Tasks</text>
    <text x="8" y="72" font-family="Arial" font-size="13" fill="${COLORS.textMuted}">7 tasks to conquer</text>

    <!-- Filter pills -->
    <rect x="0" y="86" width="55" height="28" rx="14" fill="${COLORS.primary}" opacity="0.3" stroke="${COLORS.primary}" stroke-opacity="0.6" stroke-width="1"/>
    <text x="27" y="105" font-family="Arial" font-size="12" fill="${COLORS.primaryLight}" text-anchor="middle">All</text>
    <rect x="63" y="86" width="55" height="28" rx="14" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="90" y="105" font-family="Arial" font-size="12" fill="${COLORS.textMuted}" text-anchor="middle">High</text>
    <rect x="126" y="86" width="70" height="28" rx="14" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="161" y="105" font-family="Arial" font-size="12" fill="${COLORS.textMuted}" text-anchor="middle">Medium</text>

    ${tasks.map((t, i) => {
      const y = 126 + i * (taskH + gap);
      return `
        <rect x="0" y="${y}" width="${sw}" height="${taskH}" rx="14" fill="${COLORS.darkCard}" stroke="${t.done ? COLORS.green : COLORS.darkCardBorder}" stroke-opacity="${t.done ? '0.4' : '1'}" stroke-width="1" ${t.done ? 'opacity="0.6"' : ''}/>
        <circle cx="26" cy="${y + taskH / 2}" r="12" fill="${t.done ? COLORS.green : 'none'}" ${t.done ? 'opacity="0.3"' : `stroke="${t.prioColor}" stroke-opacity="0.5" stroke-width="2"`}/>
        ${t.done ? `<text x="26" y="${y + taskH / 2 + 4}" font-family="Arial" font-size="12" fill="${COLORS.green}" text-anchor="middle">&#10003;</text>` : ''}
        <text x="48" y="${y + 22}" font-family="Arial" font-size="13" fill="${t.done ? COLORS.textMuted : COLORS.white}" ${t.done ? 'text-decoration="line-through"' : ''}>${t.text}</text>
        <text x="48" y="${y + 40}" font-family="Arial" font-size="10" fill="${COLORS.textMuted}">${t.ctx} &#183; </text>
        <text x="${48 + t.ctx.length * 5.5 + 18}" y="${y + 40}" font-family="Arial" font-size="10" fill="${t.prioColor}">${t.priority}</text>
      `;
    }).join('')}

    <!-- Swipe hint -->
    <text x="${sw / 2}" y="${126 + tasks.length * (taskH + gap) + 16}" font-family="Arial" font-size="10" fill="${COLORS.textMuted}" text-anchor="middle" opacity="0.6">Swipe to complete &#183; Tap to expand</text>
  `;

  return phoneScreenSvg(1080, 1920, THEMES.tasks,
    'Crush Your Daily Goals',
    'Swipe, prioritize, and conquer every task',
    body
  );
}

// ============================================
// SCREENSHOT 4: Reports & Analytics
// ============================================
function screenshot4_Reports() {
  const phoneW = Math.round(1080 * 0.48);
  const { sw } = getScreenDims(phoneW);
  const statW = Math.round((sw - 16) / 3);

  const body = `
    <text x="8" y="16" font-family="Arial" font-size="13" fill="${COLORS.textMuted}">9:41</text>

    <text x="8" y="50" font-family="'Segoe UI', Arial" font-size="22" font-weight="bold" fill="${COLORS.white}">Your Progress</text>
    <text x="8" y="72" font-family="Arial" font-size="13" fill="${COLORS.textMuted}">This week's highlights</text>

    <!-- Stat cards row -->
    <rect x="0" y="88" width="${statW}" height="72" rx="14" fill="${COLORS.primary}" opacity="0.15" stroke="${COLORS.primary}" stroke-opacity="0.3" stroke-width="1"/>
    <text x="${statW / 2}" y="118" font-family="Arial" font-size="26" font-weight="bold" fill="${COLORS.primaryLight}" text-anchor="middle">87%</text>
    <text x="${statW / 2}" y="140" font-family="Arial" font-size="10" fill="${COLORS.textMuted}" text-anchor="middle">Completion</text>

    <rect x="${statW + 8}" y="88" width="${statW}" height="72" rx="14" fill="${COLORS.emerald}" opacity="0.12" stroke="${COLORS.emerald}" stroke-opacity="0.25" stroke-width="1"/>
    <text x="${statW + 8 + statW / 2}" y="118" font-family="Arial" font-size="26" font-weight="bold" fill="${COLORS.emeraldLight}" text-anchor="middle">12</text>
    <text x="${statW + 8 + statW / 2}" y="140" font-family="Arial" font-size="10" fill="${COLORS.textMuted}" text-anchor="middle">Day Streak</text>

    <rect x="${(statW + 8) * 2}" y="88" width="${statW}" height="72" rx="14" fill="${COLORS.sky}" opacity="0.12" stroke="${COLORS.sky}" stroke-opacity="0.25" stroke-width="1"/>
    <text x="${(statW + 8) * 2 + statW / 2}" y="118" font-family="Arial" font-size="26" font-weight="bold" fill="${COLORS.skyLight}" text-anchor="middle">48</text>
    <text x="${(statW + 8) * 2 + statW / 2}" y="140" font-family="Arial" font-size="10" fill="${COLORS.textMuted}" text-anchor="middle">Tasks Done</text>

    <!-- Weekly chart -->
    <rect x="0" y="176" width="${sw}" height="170" rx="16" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="16" y="202" font-family="Arial" font-size="14" font-weight="bold" fill="${COLORS.white}">Weekly Progress</text>

    ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
      const barH = [32, 52, 68, 85, 95, 75, 55][i];
      const barW = Math.round((sw - 60) / 8);
      const x = 20 + i * (barW + Math.round(barW * 0.3));
      return `
        <rect x="${x}" y="${326 - barH}" width="${barW}" height="${barH}" rx="4" fill="${COLORS.emerald}" opacity="${0.4 + i * 0.08}"/>
        <text x="${x + barW / 2}" y="340" font-family="Arial" font-size="9" fill="${COLORS.textMuted}" text-anchor="middle">${day}</text>
      `;
    }).join('')}

    <!-- Category breakdown -->
    <text x="8" y="374" font-family="Arial" font-size="13" font-weight="bold" fill="${COLORS.white}">By Category</text>

    ${[
      { name: 'Wellness', pct: 80, color: COLORS.emerald },
      { name: 'Work', pct: 90, color: COLORS.primary },
      { name: 'Travel', pct: 35, color: COLORS.sky },
    ].map((cat, i) => {
      const y = 390 + i * 52;
      const barAreaW = sw - 120;
      return `
        <rect x="0" y="${y}" width="${sw}" height="44" rx="12" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
        <text x="16" y="${y + 27}" font-family="Arial" font-size="13" fill="${COLORS.white}">${cat.name}</text>
        <rect x="100" y="${y + 20}" width="${barAreaW}" height="5" rx="2.5" fill="#2A2D45"/>
        <rect x="100" y="${y + 20}" width="${Math.round(barAreaW * cat.pct / 100)}" height="5" rx="2.5" fill="${cat.color}"/>
        <text x="${sw - 10}" y="${y + 27}" font-family="Arial" font-size="12" fill="${cat.color}" text-anchor="end">${cat.pct}%</text>
      `;
    }).join('')}

    <!-- Achievements -->
    <text x="8" y="562" font-family="Arial" font-size="13" font-weight="bold" fill="${COLORS.white}">Achievements Unlocked</text>

    <rect x="0" y="576" width="${statW}" height="44" rx="12" fill="${COLORS.amber}" opacity="0.15" stroke="${COLORS.amber}" stroke-opacity="0.3" stroke-width="1"/>
    <text x="${statW / 2}" y="603" font-family="Arial" font-size="11" fill="${COLORS.amberLight}" text-anchor="middle">&#x1F3C6; First 50</text>

    <rect x="${statW + 8}" y="576" width="${statW}" height="44" rx="12" fill="${COLORS.coral}" opacity="0.15" stroke="${COLORS.coral}" stroke-opacity="0.3" stroke-width="1"/>
    <text x="${statW + 8 + statW / 2}" y="603" font-family="Arial" font-size="11" fill="${COLORS.coralLight}" text-anchor="middle">&#x1F525; 10 Streak</text>

    <rect x="${(statW + 8) * 2}" y="576" width="${statW}" height="44" rx="12" fill="${COLORS.emerald}" opacity="0.12" stroke="${COLORS.emerald}" stroke-opacity="0.25" stroke-width="1"/>
    <text x="${(statW + 8) * 2 + statW / 2}" y="603" font-family="Arial" font-size="11" fill="${COLORS.emeraldLight}" text-anchor="middle">&#x2B50; Top 5%</text>
  `;

  return phoneScreenSvg(1080, 1920, THEMES.reports,
    'See Your Growth',
    'Streaks, analytics, and achievements at a glance',
    body
  );
}

// ============================================
// SCREENSHOT 5: Discover Plans
// ============================================
function screenshot5_Discover() {
  const phoneW = Math.round(1080 * 0.48);
  const { sw } = getScreenDims(phoneW);
  const halfW = Math.round((sw - 10) / 2);

  const body = `
    <text x="8" y="16" font-family="Arial" font-size="13" fill="${COLORS.textMuted}">9:41</text>

    <text x="8" y="50" font-family="'Segoe UI', Arial" font-size="22" font-weight="bold" fill="${COLORS.white}">Discover</text>
    <text x="8" y="72" font-family="Arial" font-size="13" fill="${COLORS.textMuted}">Trending community plans</text>

    <!-- Category chips -->
    <rect x="0" y="86" width="70" height="28" rx="14" fill="${COLORS.rose}" opacity="0.25" stroke="${COLORS.rose}" stroke-opacity="0.5" stroke-width="1"/>
    <text x="35" y="105" font-family="Arial" font-size="11" fill="${COLORS.roseLight}" text-anchor="middle">Trending</text>
    <rect x="78" y="86" width="60" height="28" rx="14" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="108" y="105" font-family="Arial" font-size="11" fill="${COLORS.textMuted}" text-anchor="middle">Travel</text>
    <rect x="146" y="86" width="60" height="28" rx="14" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="176" y="105" font-family="Arial" font-size="11" fill="${COLORS.textMuted}" text-anchor="middle">Fitness</text>
    <rect x="214" y="86" width="60" height="28" rx="14" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="244" y="105" font-family="Arial" font-size="11" fill="${COLORS.textMuted}" text-anchor="middle">Career</text>

    <!-- Featured plan card -->
    <rect x="0" y="124" width="${sw}" height="155" rx="16" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <rect x="1" y="125" width="${sw - 2}" height="90" rx="15" fill="${COLORS.primary}" opacity="0.25"/>
    <text x="${sw / 2}" y="175" font-family="Arial" font-size="36" text-anchor="middle">&#x1F3D4;</text>
    <text x="16" y="242" font-family="Arial" font-size="15" font-weight="bold" fill="${COLORS.white}">Ultimate Hiking Adventure</text>
    <text x="16" y="262" font-family="Arial" font-size="11" fill="${COLORS.textMuted}">12 tasks &#183; 3.2k views &#183; Adventure</text>
    <text x="${sw - 16}" y="258" font-family="Arial" font-size="13" fill="${COLORS.rose}" text-anchor="end">&#x2764; 284</text>

    <!-- Grid of 4 plan cards -->
    ${[
      { emoji: '&#x1F373;', title: 'Meal Prep Sunday', meta: '8 tasks &#183; 1.5k', hearts: '156', bgColor: COLORS.teal },
      { emoji: '&#x1F9D8;', title: '30-Day Mindfulness', meta: '30 tasks &#183; 2.1k', hearts: '203', bgColor: COLORS.emerald },
      { emoji: '&#x1F4BC;', title: 'Interview Mastery', meta: '10 tasks &#183; 890', hearts: '98', bgColor: COLORS.amber },
      { emoji: '&#x1F491;', title: 'Perfect Date Night', meta: '6 tasks &#183; 1.8k', hearts: '175', bgColor: COLORS.rose },
    ].map((card, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = col * (halfW + 10);
      const y = 292 + row * 155;
      return `
        <rect x="${x}" y="${y}" width="${halfW}" height="142" rx="14" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
        <rect x="${x + 1}" y="${y + 1}" width="${halfW - 2}" height="70" rx="13" fill="${card.bgColor}" opacity="0.2"/>
        <text x="${x + halfW / 2}" y="${y + 44}" font-family="Arial" font-size="28" text-anchor="middle">${card.emoji}</text>
        <text x="${x + 12}" y="${y + 94}" font-family="Arial" font-size="12" font-weight="bold" fill="${COLORS.white}">${card.title}</text>
        <text x="${x + 12}" y="${y + 112}" font-family="Arial" font-size="10" fill="${COLORS.textMuted}">${card.meta}</text>
        <text x="${x + 12}" y="${y + 130}" font-family="Arial" font-size="11" fill="${COLORS.rose}">&#x2764; ${card.hearts}</text>
      `;
    }).join('')}
  `;

  return phoneScreenSvg(1080, 1920, THEMES.discover,
    'Explore &amp; Remix Plans',
    'Browse trending adventures from the community',
    body
  );
}

// ============================================
// SCREENSHOT 6: Groups & Collaboration
// ============================================
function screenshot6_Groups() {
  const phoneW = Math.round(1080 * 0.48);
  const { sw } = getScreenDims(phoneW);

  const body = `
    <text x="8" y="16" font-family="Arial" font-size="13" fill="${COLORS.textMuted}">9:41</text>

    <text x="8" y="50" font-family="'Segoe UI', Arial" font-size="22" font-weight="bold" fill="${COLORS.white}">Groups</text>
    <text x="8" y="72" font-family="Arial" font-size="13" fill="${COLORS.textMuted}">Achieve goals together</text>

    <!-- Create group CTA -->
    <rect x="0" y="88" width="${sw}" height="46" rx="23" fill="url(#btnGrad)"/>
    <text x="${sw / 2}" y="117" font-family="Arial" font-size="15" font-weight="bold" fill="white" text-anchor="middle">+ Create New Group</text>

    <!-- Group Card 1: Fitness Squad -->
    <rect x="0" y="148" width="${sw}" height="130" rx="16" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="16" y="175" font-family="Arial" font-size="15" font-weight="bold" fill="${COLORS.white}">Fitness Squad</text>
    <text x="16" y="195" font-family="Arial" font-size="11" fill="${COLORS.textMuted}">5 members &#183; 3 shared goals</text>

    <!-- Avatars -->
    <circle cx="28" cy="222" r="13" fill="${COLORS.primary}"/>
    <text x="28" y="227" font-family="Arial" font-size="11" fill="white" text-anchor="middle">JM</text>
    <circle cx="50" cy="222" r="13" fill="${COLORS.teal}"/>
    <text x="50" y="227" font-family="Arial" font-size="11" fill="white" text-anchor="middle">SK</text>
    <circle cx="72" cy="222" r="13" fill="${COLORS.emerald}"/>
    <text x="72" y="227" font-family="Arial" font-size="11" fill="white" text-anchor="middle">AR</text>
    <circle cx="94" cy="222" r="13" fill="${COLORS.amber}"/>
    <text x="94" y="227" font-family="Arial" font-size="11" fill="white" text-anchor="middle">LP</text>
    <circle cx="116" cy="222" r="13" fill="${COLORS.darkCardBorder}"/>
    <text x="116" y="227" font-family="Arial" font-size="10" fill="${COLORS.textMuted}" text-anchor="middle">+1</text>

    <text x="16" y="254" font-family="Arial" font-size="11" fill="${COLORS.textMuted}">Team progress</text>
    <rect x="16" y="260" width="${sw - 32}" height="5" rx="2.5" fill="#2A2D45"/>
    <rect x="16" y="260" width="${Math.round((sw - 32) * 0.7)}" height="5" rx="2.5" fill="${COLORS.emerald}"/>
    <text x="${sw - 16}" y="268" font-family="Arial" font-size="11" fill="${COLORS.emeraldLight}" text-anchor="end">70%</text>

    <!-- Group Card 2: Book Club -->
    <rect x="0" y="292" width="${sw}" height="130" rx="16" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="16" y="319" font-family="Arial" font-size="15" font-weight="bold" fill="${COLORS.white}">Book Club</text>
    <text x="16" y="339" font-family="Arial" font-size="11" fill="${COLORS.textMuted}">8 members &#183; 2 shared goals</text>

    <circle cx="28" cy="366" r="13" fill="${COLORS.rose}"/>
    <text x="28" y="371" font-family="Arial" font-size="11" fill="white" text-anchor="middle">EM</text>
    <circle cx="50" cy="366" r="13" fill="${COLORS.indigo}"/>
    <text x="50" y="371" font-family="Arial" font-size="11" fill="white" text-anchor="middle">TC</text>
    <circle cx="72" cy="366" r="13" fill="${COLORS.amber}"/>
    <text x="72" y="371" font-family="Arial" font-size="11" fill="white" text-anchor="middle">RD</text>
    <circle cx="94" cy="366" r="13" fill="${COLORS.darkCardBorder}"/>
    <text x="94" y="371" font-family="Arial" font-size="10" fill="${COLORS.textMuted}" text-anchor="middle">+5</text>

    <text x="16" y="398" font-family="Arial" font-size="11" fill="${COLORS.textMuted}">Team progress</text>
    <rect x="16" y="404" width="${sw - 32}" height="5" rx="2.5" fill="#2A2D45"/>
    <rect x="16" y="404" width="${Math.round((sw - 32) * 0.45)}" height="5" rx="2.5" fill="${COLORS.indigo}"/>
    <text x="${sw - 16}" y="412" font-family="Arial" font-size="11" fill="${COLORS.indigoLight}" text-anchor="end">45%</text>

    <!-- Activity Feed -->
    <text x="8" y="445" font-family="Arial" font-size="13" font-weight="bold" fill="${COLORS.white}">Recent Activity</text>

    ${[
      { text: 'Sarah completed "5K Run"', sub: 'Fitness Squad &#183; 2h ago', color: COLORS.emerald, icon: '&#10003;' },
      { text: 'Alex shared "Read Ch. 5"', sub: 'Book Club &#183; 5h ago', color: COLORS.indigo, icon: '+' },
      { text: 'New goal: "Run 50 miles"', sub: 'Fitness Squad &#183; 1d ago', color: COLORS.amber, icon: '&#x1F3AF;' },
    ].map((item, i) => {
      const y = 458 + i * 52;
      return `
        <rect x="0" y="${y}" width="${sw}" height="44" rx="12" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
        <circle cx="22" cy="${y + 22}" r="11" fill="${item.color}" opacity="0.25"/>
        <text x="22" y="${y + 27}" font-family="Arial" font-size="10" fill="${item.color}" text-anchor="middle">${item.icon}</text>
        <text x="40" y="${y + 18}" font-family="Arial" font-size="12" fill="${COLORS.white}">${item.text}</text>
        <text x="40" y="${y + 34}" font-family="Arial" font-size="10" fill="${COLORS.textMuted}">${item.sub}</text>
      `;
    }).join('')}
  `;

  return phoneScreenSvg(1080, 1920, THEMES.groups,
    'Achieve Together',
    'Team up with friends on shared goals',
    body
  );
}

// ============================================
// FEATURE GRAPHIC (1024x500)
// With actual app logo composite + Share/Customize/Community features
// ============================================
async function generateFeatureGraphic() {
  const width = 1024;
  const height = 500;

  const phoneW = 165;
  const phoneH = 330;

  const svg = `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#1A0533;stop-opacity:1" />
        <stop offset="30%" style="stop-color:#0F1B4D;stop-opacity:1" />
        <stop offset="70%" style="stop-color:#0E1744;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#042F2E;stop-opacity:1" />
      </linearGradient>
      <radialGradient id="orb1" cx="12%" cy="35%" r="40%">
        <stop offset="0%" style="stop-color:${COLORS.primary};stop-opacity:0.35" />
        <stop offset="100%" style="stop-color:${COLORS.primary};stop-opacity:0" />
      </radialGradient>
      <radialGradient id="orb2" cx="88%" cy="65%" r="35%">
        <stop offset="0%" style="stop-color:${COLORS.teal};stop-opacity:0.3" />
        <stop offset="100%" style="stop-color:${COLORS.teal};stop-opacity:0" />
      </radialGradient>
      <radialGradient id="orb3" cx="55%" cy="15%" r="25%">
        <stop offset="0%" style="stop-color:${COLORS.rose};stop-opacity:0.12" />
        <stop offset="100%" style="stop-color:${COLORS.rose};stop-opacity:0" />
      </radialGradient>
      <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:${COLORS.primary};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${COLORS.teal};stop-opacity:1" />
      </linearGradient>
      <linearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${COLORS.primary};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${COLORS.teal};stop-opacity:1" />
      </linearGradient>
      <linearGradient id="shareGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${COLORS.rose};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${COLORS.coral};stop-opacity:1" />
      </linearGradient>
      <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="12"/>
      </filter>
      <filter id="phoneShadow" x="-15%" y="-10%" width="130%" height="125%">
        <feDropShadow dx="0" dy="6" stdDeviation="16" flood-color="${COLORS.primary}" flood-opacity="0.35"/>
      </filter>
      <filter id="textShadow">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.5"/>
      </filter>
    </defs>

    <!-- Background -->
    <rect width="100%" height="100%" fill="url(#bgGrad)"/>
    <rect width="100%" height="100%" fill="url(#orb1)"/>
    <rect width="100%" height="100%" fill="url(#orb2)"/>
    <rect width="100%" height="100%" fill="url(#orb3)"/>

    <!-- Floating orbs -->
    <circle cx="80" cy="130" r="70" fill="rgba(124,58,237,0.18)" filter="url(#softGlow)"/>
    <circle cx="920" cy="380" r="90" fill="rgba(20,184,166,0.12)" filter="url(#softGlow)"/>
    <circle cx="550" cy="60" r="40" fill="rgba(236,72,153,0.1)" filter="url(#softGlow)"/>

    <!-- Sparkle dots -->
    <circle cx="45" cy="70" r="2" fill="${COLORS.primaryLight}" opacity="0.5"/>
    <circle cx="200" cy="35" r="1.5" fill="white" opacity="0.35"/>
    <circle cx="480" cy="55" r="2" fill="${COLORS.tealLight}" opacity="0.4"/>
    <circle cx="850" cy="90" r="2" fill="${COLORS.primaryLight}" opacity="0.45"/>
    <circle cx="980" cy="160" r="1.5" fill="white" opacity="0.3"/>
    <circle cx="30" cy="420" r="1.5" fill="${COLORS.tealLight}" opacity="0.4"/>
    <circle cx="500" cy="470" r="2" fill="${COLORS.primaryLight}" opacity="0.35"/>

    <!-- ========== LEFT SIDE: Logo + Branding ========== -->
    <!-- Logo placeholder (actual logo composited via sharp) -->
    <!-- Logo will be placed at x=50, y=42, size=80x80 -->

    <!-- App name (positioned next to logo) -->
    <text x="145" y="78" font-family="'Segoe UI', Arial, Helvetica, sans-serif" font-size="36" font-weight="800" fill="${COLORS.white}" letter-spacing="-0.5" filter="url(#textShadow)">
      JournalMate.ai
    </text>

    <!-- Tagline -->
    <text x="145" y="108" font-family="'Segoe UI', Arial, Helvetica, sans-serif" font-size="18" fill="${COLORS.tealLight}" opacity="0.95">
      Your AI Lifestyle Companion
    </text>

    <!-- Accent line -->
    <rect x="145" y="120" width="180" height="3" rx="1.5" fill="url(#accentGrad)"/>

    <!-- Three key feature rows with icons -->
    <!-- Feature 1: AI-Powered Planning -->
    <g transform="translate(50, 150)">
      <rect x="0" y="0" width="38" height="38" rx="10" fill="${COLORS.primary}" opacity="0.25"/>
      <text x="19" y="26" font-family="Arial" font-size="18" text-anchor="middle">&#x2728;</text>
      <text x="48" y="17" font-family="'Segoe UI', Arial" font-size="15" font-weight="700" fill="${COLORS.white}">AI-Powered Planning</text>
      <text x="48" y="33" font-family="Arial" font-size="11" fill="${COLORS.textMuted}">Voice or text — plans for any goal</text>
    </g>

    <!-- Feature 2: Share & Discover -->
    <g transform="translate(50, 200)">
      <rect x="0" y="0" width="38" height="38" rx="10" fill="${COLORS.rose}" opacity="0.2"/>
      <text x="19" y="26" font-family="Arial" font-size="18" text-anchor="middle">&#x1F4E4;</text>
      <text x="48" y="17" font-family="'Segoe UI', Arial" font-size="15" font-weight="700" fill="${COLORS.white}">Share &amp; Discover Plans</text>
      <text x="48" y="33" font-family="Arial" font-size="11" fill="${COLORS.textMuted}">Share to social media, remix community plans</text>
    </g>

    <!-- Feature 3: Own & Customize -->
    <g transform="translate(50, 250)">
      <rect x="0" y="0" width="38" height="38" rx="10" fill="${COLORS.teal}" opacity="0.2"/>
      <text x="19" y="26" font-family="Arial" font-size="18" text-anchor="middle">&#x1F3A8;</text>
      <text x="48" y="17" font-family="'Segoe UI', Arial" font-size="15" font-weight="700" fill="${COLORS.white}">Own &amp; Customize</text>
      <text x="48" y="33" font-family="Arial" font-size="11" fill="${COLORS.textMuted}">Make plans yours, edit tasks, set your pace</text>
    </g>

    <!-- Feature 4: Track Together -->
    <g transform="translate(50, 300)">
      <rect x="0" y="0" width="38" height="38" rx="10" fill="${COLORS.emerald}" opacity="0.2"/>
      <text x="19" y="26" font-family="Arial" font-size="18" text-anchor="middle">&#x1F91D;</text>
      <text x="48" y="17" font-family="'Segoe UI', Arial" font-size="15" font-weight="700" fill="${COLORS.white}">Achieve Together</text>
      <text x="48" y="33" font-family="Arial" font-size="11" fill="${COLORS.textMuted}">Groups, shared goals, team progress</text>
    </g>

    <!-- Category icons row -->
    <g transform="translate(50, 365)">
      <text x="0" y="0" font-family="Arial" font-size="10" fill="${COLORS.textMuted}" letter-spacing="1">PLAN ANYTHING</text>
      ${['&#x1F3CB;', '&#x2708;', '&#x1F373;', '&#x1F3D4;', '&#x1F496;', '&#x1F4BC;', '&#x1F9D8;', '&#x1F3B5;'].map((e, i) => `
        <circle cx="${i * 42 + 12}" cy="28" r="16" fill="${[COLORS.emerald, COLORS.sky, COLORS.coral, COLORS.teal, COLORS.rose, COLORS.amber, COLORS.indigo, COLORS.pink][i]}" opacity="0.2"/>
        <text x="${i * 42 + 12}" y="34" font-family="Arial" font-size="14" text-anchor="middle">${e}</text>
      `).join('')}
    </g>

    <!-- CTA -->
    <rect x="50" y="430" width="160" height="38" rx="19" fill="url(#btnGrad)" opacity="0.9"/>
    <text x="130" y="454" font-family="Arial" font-size="14" font-weight="bold" fill="white" text-anchor="middle">Get Started Free</text>

    <text x="225" y="454" font-family="Arial" font-size="12" fill="${COLORS.textMuted}" opacity="0.7">Wellness &#183; Travel &#183; Career &#183; Romance &#183; Fitness</text>

    <!-- ========== RIGHT SIDE: App screens ========== -->

    <!-- Main phone: Discover/Share screen -->
    <g filter="url(#phoneShadow)">
      <rect x="555" y="25" width="${phoneW}" height="${phoneH}" rx="18" fill="#1A1A2E" stroke="#3D3D5C" stroke-width="2"/>
      <rect x="562" y="44" width="${phoneW - 14}" height="${phoneH - 38}" rx="14" fill="${COLORS.dark}"/>
      <rect x="${555 + phoneW / 2 - 28}" y="30" width="56" height="13" rx="6.5" fill="#000"/>

      <g transform="translate(568, 54)">
        <text x="4" y="12" font-family="Arial" font-size="9" fill="${COLORS.textMuted}">9:41</text>
        <text x="4" y="30" font-family="Arial" font-size="13" font-weight="bold" fill="${COLORS.white}">Discover</text>
        <text x="4" y="44" font-family="Arial" font-size="8" fill="${COLORS.textMuted}">Trending plans</text>

        <!-- Featured plan with share button -->
        <rect x="0" y="54" width="137" height="100" rx="12" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="0.5"/>
        <rect x="1" y="55" width="135" height="50" rx="11" fill="${COLORS.primary}" opacity="0.25"/>
        <text x="68" y="84" font-family="Arial" font-size="22" text-anchor="middle">&#x1F3D4;</text>
        <text x="8" y="120" font-family="Arial" font-size="9" font-weight="bold" fill="${COLORS.white}">Hiking Adventure</text>
        <text x="8" y="132" font-family="Arial" font-size="7" fill="${COLORS.textMuted}">12 tasks &#183; 3.2k views</text>

        <!-- Share button overlay -->
        <rect x="98" y="132" width="34" height="18" rx="9" fill="url(#shareGrad)" opacity="0.9"/>
        <text x="115" y="144" font-family="Arial" font-size="8" fill="white" text-anchor="middle">Share</text>

        <!-- Heart count -->
        <text x="8" y="148" font-family="Arial" font-size="8" fill="${COLORS.rose}">&#x2764; 284</text>

        <!-- Small plan cards -->
        <rect x="0" y="158" width="65" height="75" rx="10" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="0.5"/>
        <rect x="1" y="159" width="63" height="35" rx="9" fill="${COLORS.teal}" opacity="0.2"/>
        <text x="32" y="180" font-family="Arial" font-size="16" text-anchor="middle">&#x1F373;</text>
        <text x="6" y="208" font-family="Arial" font-size="7" font-weight="bold" fill="${COLORS.white}">Meal Prep</text>
        <text x="6" y="220" font-family="Arial" font-size="6" fill="${COLORS.rose}">&#x2764; 156</text>

        <rect x="72" y="158" width="65" height="75" rx="10" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="0.5"/>
        <rect x="73" y="159" width="63" height="35" rx="9" fill="${COLORS.emerald}" opacity="0.2"/>
        <text x="104" y="180" font-family="Arial" font-size="16" text-anchor="middle">&#x1F9D8;</text>
        <text x="78" y="208" font-family="Arial" font-size="7" font-weight="bold" fill="${COLORS.white}">Mindfulness</text>
        <text x="78" y="220" font-family="Arial" font-size="6" fill="${COLORS.rose}">&#x2764; 203</text>

        <!-- Use Plan / Customize button -->
        <rect x="0" y="242" width="137" height="26" rx="13" fill="url(#btnGrad)" opacity="0.85"/>
        <text x="68" y="259" font-family="Arial" font-size="9" font-weight="bold" fill="white" text-anchor="middle">&#x2728; Use Plan &amp; Customize</text>
      </g>
    </g>

    <!-- Second phone: Activities (Share view) -->
    <g filter="url(#phoneShadow)">
      <rect x="740" y="55" width="${phoneW - 10}" height="${phoneH - 30}" rx="16" fill="#1A1A2E" stroke="#3D3D5C" stroke-width="1.5"/>
      <rect x="746" y="72" width="${phoneW - 22}" height="${phoneH - 62}" rx="13" fill="${COLORS.dark}"/>
      <rect x="${740 + (phoneW - 10) / 2 - 24}" y="60" width="48" height="11" rx="5.5" fill="#000"/>

      <g transform="translate(752, 80)">
        <text x="4" y="12" font-family="Arial" font-size="9" fill="${COLORS.textMuted}">9:41</text>
        <text x="4" y="28" font-family="Arial" font-size="12" font-weight="bold" fill="${COLORS.white}">My Adventures</text>
        <text x="4" y="42" font-family="Arial" font-size="8" fill="${COLORS.textMuted}">4 active plans</text>

        ${[
          { title: 'Morning Fitness', pct: 70, color: COLORS.emerald },
          { title: 'Japan Trip', pct: 25, color: COLORS.sky },
          { title: 'Product Launch', pct: 63, color: COLORS.primary },
          { title: 'Date Night', pct: 20, color: COLORS.rose },
        ].map((a, i) => {
          const y = 52 + i * 48;
          return `
            <rect x="0" y="${y}" width="131" height="40" rx="8" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="0.5"/>
            <rect x="0" y="${y}" width="3" height="40" rx="1.5" fill="${a.color}"/>
            <text x="10" y="${y + 16}" font-family="Arial" font-size="9" font-weight="bold" fill="${COLORS.white}">${a.title}</text>
            <rect x="10" y="${y + 22}" width="90" height="3" rx="1.5" fill="#2A2D45"/>
            <rect x="10" y="${y + 22}" width="${Math.round(90 * a.pct / 100)}" height="3" rx="1.5" fill="${a.color}"/>
            <text x="120" y="${y + 27}" font-family="Arial" font-size="8" fill="${a.color}" text-anchor="end">${a.pct}%</text>

            <!-- Share icon on each card -->
            <circle cx="120" cy="${y + 11}" r="7" fill="${a.color}" opacity="0.15"/>
            <text x="120" y="${y + 14}" font-family="Arial" font-size="7" fill="${a.color}" text-anchor="middle">&#x2197;</text>
          `;
        }).join('')}
      </g>
    </g>

    <!-- Third phone hint: Social share toast -->
    <g opacity="0.5" transform="translate(895, 120)">
      <rect x="0" y="0" width="110" height="${phoneH - 80}" rx="14" fill="#1A1A2E" stroke="#3D3D5C" stroke-width="1"/>
      <rect x="5" y="16" width="100" height="${phoneH - 100}" rx="11" fill="${COLORS.dark}"/>
      <rect x="30" y="5" width="40" height="10" rx="5" fill="#000"/>

      <!-- Share modal content -->
      <g transform="translate(12, 30)">
        <text x="38" y="14" font-family="Arial" font-size="9" font-weight="bold" fill="${COLORS.white}" text-anchor="middle">Share Plan</text>

        <!-- Social icons -->
        <circle cx="15" cy="40" r="12" fill="#1877F2" opacity="0.8"/>
        <text x="15" y="44" font-family="Arial" font-size="9" fill="white" text-anchor="middle">f</text>

        <circle cx="45" cy="40" r="12" fill="#25D366" opacity="0.8"/>
        <text x="45" y="44" font-family="Arial" font-size="9" fill="white" text-anchor="middle">W</text>

        <circle cx="75" cy="40" r="12" fill="#E4405F" opacity="0.8"/>
        <text x="75" y="44" font-family="Arial" font-size="9" fill="white" text-anchor="middle">IG</text>

        <circle cx="15" cy="72" r="12" fill="#1DA1F2" opacity="0.8"/>
        <text x="15" y="76" font-family="Arial" font-size="9" fill="white" text-anchor="middle">X</text>

        <circle cx="45" cy="72" r="12" fill="${COLORS.primary}" opacity="0.8"/>
        <text x="45" y="76" font-family="Arial" font-size="8" fill="white" text-anchor="middle">&#x1F517;</text>

        <circle cx="75" cy="72" r="12" fill="${COLORS.teal}" opacity="0.8"/>
        <text x="75" y="76" font-family="Arial" font-size="8" fill="white" text-anchor="middle">&#x2709;</text>

        <!-- Copy link -->
        <rect x="0" y="96" width="76" height="22" rx="11" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="0.5"/>
        <text x="38" y="110" font-family="Arial" font-size="7" fill="${COLORS.textMuted}" text-anchor="middle">&#x1F517; Copy Link</text>
      </g>
    </g>
  </svg>`;

  // Generate the SVG as PNG base
  const bgBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  // Load and resize the actual app logo
  const logoPath = path.join(__dirname, '..', 'client/public/icons/android/android-play-store-512.png');
  const logoBuffer = await sharp(logoPath)
    .resize(80, 80)
    .png()
    .toBuffer();

  // Composite the logo onto the feature graphic
  await sharp(bgBuffer)
    .composite([
      { input: logoBuffer, top: 42, left: 50 }
    ])
    .png()
    .toFile(path.join(OUTPUT_DIR, 'feature-graphic-1024x500.png'));
  console.log('  Feature Graphic (1024x500) - with logo + share features');
}

// ============================================
// TABLET SCREENSHOTS
// ============================================
function tabletScreenSvg(width, height, theme, headerText, subtitleText, bodyContent) {
  return `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    ${createThemedBackground(width, height, theme)}

    <!-- Header -->
    <text x="${width / 2}" y="${Math.round(height * 0.06)}" font-family="'Segoe UI', Arial, Helvetica, sans-serif" font-size="44" font-weight="800" fill="${COLORS.white}" text-anchor="middle" letter-spacing="-1" filter="url(#textShadow)">
      ${headerText}
    </text>
    <text x="${width / 2}" y="${Math.round(height * 0.09)}" font-family="'Segoe UI', Arial, Helvetica, sans-serif" font-size="20" fill="${theme.accent}" text-anchor="middle">
      ${subtitleText}
    </text>
    <rect x="${(width - 80) / 2}" y="${Math.round(height * 0.1)}" width="80" height="4" rx="2" fill="url(#accentGrad)"/>

    <!-- Content -->
    <g transform="translate(${(width - Math.min(width * 0.9, 1000)) / 2}, ${Math.round(height * 0.13)})">
      ${bodyContent}
    </g>

    <!-- Bottom branding -->
    <rect x="${(width - 280) / 2}" y="${height - 55}" width="280" height="36" rx="18" fill="${theme.glow1}" opacity="0.12"/>
    <text x="${width / 2}" y="${height - 30}" font-family="'Segoe UI', Arial, Helvetica, sans-serif" font-size="16" font-weight="600" fill="${COLORS.white}" text-anchor="middle" opacity="0.7">
      JournalMate.ai — AI Lifestyle Planner
    </text>
  </svg>`;
}

function tabletScreenshot1_Overview(width, height) {
  const cw = Math.min(width * 0.9, 1000);
  const cardW = Math.round((cw - 24) / 3);

  const body = `
    <!-- Three activity cards -->
    ${[
      { emoji: '&#x1F4AA;', title: 'Morning Fitness', tasks: '7/10', pct: 70, color: COLORS.emerald, cat: 'Wellness' },
      { emoji: '&#x2708;', title: 'Japan Trip', tasks: '3/12', pct: 25, color: COLORS.sky, cat: 'Travel' },
      { emoji: '&#x1F4CB;', title: 'Product Launch', tasks: '5/8', pct: 63, color: COLORS.primary, cat: 'Work' },
    ].map((item, i) => `
      <rect x="${i * (cardW + 12)}" y="0" width="${cardW}" height="140" rx="16" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
      <rect x="${i * (cardW + 12)}" y="0" width="5" height="140" rx="2.5" fill="${item.color}"/>
      <circle cx="${i * (cardW + 12) + 36}" cy="36" r="18" fill="${item.color}" opacity="0.2"/>
      <text x="${i * (cardW + 12) + 36}" y="42" font-family="Arial" font-size="16" text-anchor="middle">${item.emoji}</text>
      <text x="${i * (cardW + 12) + 64}" y="32" font-family="Arial" font-size="14" font-weight="bold" fill="${COLORS.white}">${item.title}</text>
      <text x="${i * (cardW + 12) + 64}" y="50" font-family="Arial" font-size="11" fill="${COLORS.textMuted}">${item.tasks} tasks &#183; ${item.cat}</text>
      <rect x="${i * (cardW + 12) + 16}" y="70" width="${cardW - 32}" height="5" rx="2.5" fill="#2A2D45"/>
      <rect x="${i * (cardW + 12) + 16}" y="70" width="${Math.round((cardW - 32) * item.pct / 100)}" height="5" rx="2.5" fill="${item.color}"/>
      <text x="${i * (cardW + 12) + cardW - 16}" y="80" font-family="Arial" font-size="11" fill="${item.color}" text-anchor="end">${item.pct}%</text>
      <text x="${i * (cardW + 12) + 16}" y="105" font-family="Arial" font-size="10" fill="${COLORS.textMuted}">Next: ${['30-min HIIT', 'Book flight', 'Review roadmap'][i]}</text>
      <text x="${i * (cardW + 12) + 16}" y="125" font-family="Arial" font-size="10" fill="${COLORS.textMuted}">Due: ${['Today', 'Mar 15', 'This week'][i]}</text>
    `).join('')}

    <!-- Stats row -->
    ${[
      { label: 'Completion', value: '87%', color: COLORS.primary },
      { label: 'Streak', value: '12 days', color: COLORS.emerald },
      { label: 'Today', value: '5 left', color: COLORS.amber },
      { label: 'Plans', value: '14', color: COLORS.sky },
    ].map((s, i) => `
      <rect x="${i * (cw / 4 + 1)}" y="165" width="${cw / 4 - 8}" height="65" rx="14" fill="${s.color}" opacity="0.12" stroke="${s.color}" stroke-opacity="0.25" stroke-width="1"/>
      <text x="${i * (cw / 4 + 1) + (cw / 4 - 8) / 2}" y="198" font-family="Arial" font-size="20" font-weight="bold" fill="${s.color}" text-anchor="middle">${s.value}</text>
      <text x="${i * (cw / 4 + 1) + (cw / 4 - 8) / 2}" y="218" font-family="Arial" font-size="10" fill="${COLORS.textMuted}" text-anchor="middle">${s.label}</text>
    `).join('')}

    <!-- Chart area -->
    <rect x="0" y="255" width="${cw}" height="150" rx="16" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="20" y="282" font-family="Arial" font-size="15" font-weight="bold" fill="${COLORS.white}">Weekly Progress</text>
    ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
      const barH = [32, 52, 68, 85, 95, 75, 55][i];
      const barW = Math.round((cw - 80) / 9);
      const x = 40 + i * (barW + Math.round(barW * 0.3));
      return `
        <rect x="${x}" y="${385 - barH}" width="${barW}" height="${barH}" rx="4" fill="${COLORS.primary}" opacity="${0.4 + i * 0.08}"/>
        <text x="${x + barW / 2}" y="395" font-family="Arial" font-size="9" fill="${COLORS.textMuted}" text-anchor="middle">${day}</text>
      `;
    }).join('')}

    <!-- Bottom sections -->
    <rect x="0" y="425" width="${Math.round(cw * 0.55 - 6)}" height="190" rx="16" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="16" y="452" font-family="Arial" font-size="14" font-weight="bold" fill="${COLORS.white}">Today's Tasks</text>
    ${['Wake up at 6 AM', '30-min HIIT workout', 'Healthy breakfast', 'Review roadmap'].map((task, i) => `
      <circle cx="28" cy="${474 + i * 32}" r="9" fill="${i === 0 ? COLORS.emerald : 'none'}" ${i > 0 ? `stroke="${COLORS.darkCardBorder}" stroke-width="1.5"` : ''}/>
      ${i === 0 ? `<text x="28" y="${478 + i * 32}" font-family="Arial" font-size="9" fill="${COLORS.emerald}" text-anchor="middle">&#10003;</text>` : ''}
      <text x="44" y="${478 + i * 32}" font-family="Arial" font-size="11" fill="${i === 0 ? COLORS.textMuted : COLORS.white}" ${i === 0 ? 'text-decoration="line-through"' : ''}>${task}</text>
    `).join('')}

    <rect x="${Math.round(cw * 0.55 + 6)}" y="425" width="${Math.round(cw * 0.45 - 6)}" height="190" rx="16" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="${Math.round(cw * 0.55 + 22)}" y="452" font-family="Arial" font-size="14" font-weight="bold" fill="${COLORS.white}">Trending Plans</text>
    ${['Ultimate Hiking', '30-Day Mindfulness', 'Interview Mastery'].map((plan, i) => `
      <rect x="${Math.round(cw * 0.55 + 16)}" y="${466 + i * 44}" width="${Math.round(cw * 0.45 - 32)}" height="36" rx="10" fill="${COLORS.dark}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
      <text x="${Math.round(cw * 0.55 + 34)}" y="${489 + i * 44}" font-family="Arial" font-size="11" fill="${COLORS.white}">${plan}</text>
      <text x="${cw - 16}" y="${489 + i * 44}" font-family="Arial" font-size="10" fill="${COLORS.rose}" text-anchor="end">${['&#x2764; 284', '&#x2764; 203', '&#x2764; 98'][i]}</text>
    `).join('')}
  `;

  return tabletScreenSvg(width, height, THEMES.activities,
    'Your AI Lifestyle Planner',
    'Plan, track, and achieve your goals with JournalMate.ai',
    body
  );
}

// ============================================
// APP ICON
// ============================================
async function generateAppIcon() {
  const src = path.join(__dirname, '..', 'client/public/icons/android/android-play-store-512.png');
  const dest = path.join(OUTPUT_DIR, 'app-icon-512x512.png');
  fs.copyFileSync(src, dest);
  console.log('  App Icon (512x512) - copied');
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log('\nGenerating vibrant Google Play Store assets...\n');

  // Ensure directories
  fs.mkdirSync(path.join(OUTPUT_DIR, 'phone'), { recursive: true });
  fs.mkdirSync(path.join(OUTPUT_DIR, 'tablet-7inch'), { recursive: true });
  fs.mkdirSync(path.join(OUTPUT_DIR, 'tablet-10inch'), { recursive: true });

  // 1. App Icon
  await generateAppIcon();

  // 2. Feature Graphic
  await generateFeatureGraphic();

  // 3. Phone Screenshots (1080x1920)
  const phoneScreenshots = [
    { fn: screenshot1_GoalInput, name: '01-goal-input' },
    { fn: screenshot2_Activities, name: '02-activities' },
    { fn: screenshot3_Tasks, name: '03-tasks' },
    { fn: screenshot4_Reports, name: '04-reports' },
    { fn: screenshot5_Discover, name: '05-discover' },
    { fn: screenshot6_Groups, name: '06-groups' },
  ];

  for (const ss of phoneScreenshots) {
    const svg = ss.fn();
    await sharp(Buffer.from(svg))
      .png()
      .toFile(path.join(OUTPUT_DIR, 'phone', `${ss.name}-1080x1920.png`));
    console.log(`  Phone: ${ss.name} (1080x1920)`);
  }

  // 4. 7-inch Tablet (1200x1920)
  const tablet7Svg = tabletScreenshot1_Overview(1200, 1920);
  await sharp(Buffer.from(tablet7Svg))
    .png()
    .toFile(path.join(OUTPUT_DIR, 'tablet-7inch', '01-overview-1200x1920.png'));
  console.log('  7" Tablet: overview (1200x1920)');

  for (const ss of phoneScreenshots.slice(0, 3)) {
    const svg = ss.fn().replace(/width="1080"/, 'width="1200"');
    await sharp(Buffer.from(svg))
      .resize(1200, 1920)
      .png()
      .toFile(path.join(OUTPUT_DIR, 'tablet-7inch', `${ss.name}-1200x1920.png`));
    console.log(`  7" Tablet: ${ss.name} (1200x1920)`);
  }

  // 5. 10-inch Tablet (1920x1200)
  const tablet10Svg = tabletScreenshot1_Overview(1920, 1200);
  await sharp(Buffer.from(tablet10Svg))
    .png()
    .toFile(path.join(OUTPUT_DIR, 'tablet-10inch', '01-overview-1920x1200.png'));
  console.log('  10" Tablet: overview (1920x1200)');

  for (const ss of phoneScreenshots.slice(0, 3)) {
    const svg = ss.fn()
      .replace(/width="1080"/, 'width="1920"')
      .replace(/height="1920"/, 'height="1200"');
    await sharp(Buffer.from(svg))
      .resize(1920, 1200)
      .png()
      .toFile(path.join(OUTPUT_DIR, 'tablet-10inch', `${ss.name}-1920x1200.png`));
    console.log(`  10" Tablet: ${ss.name} (1920x1200)`);
  }

  console.log('\n=== Generation Complete ===');
  console.log(`\nOutput: ${OUTPUT_DIR}`);
  console.log('\nAssets:');
  console.log('  - App Icon: 512x512');
  console.log('  - Feature Graphic: 1024x500');
  console.log('  - Phone Screenshots: 1080x1920 x 6');
  console.log('  - 7" Tablet: 1200x1920 x 4');
  console.log('  - 10" Tablet: 1920x1200 x 4');
}

main().catch(console.error);
