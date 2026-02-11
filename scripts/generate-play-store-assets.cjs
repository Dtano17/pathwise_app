#!/usr/bin/env node
/**
 * Generate Google Play Store graphics for JournalMate.ai
 *
 * Generates:
 * - App Icon (512x512)
 * - Feature Graphic (1024x500)
 * - Phone Screenshots (1080x1920, 9:16) x 6
 * - 7-inch Tablet Screenshots (1200x1920, 10:16) x 4
 * - 10-inch Tablet Screenshots (1200x1920, 10:16) x 4
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname, '..', 'store-assets', 'google-play');

// Brand colors
const COLORS = {
  primary: '#6C5CE7',
  primaryDark: '#5A4BD1',
  primaryLight: '#8B7CF0',
  accent: '#A29BFE',
  dark: '#0B0F1A',
  darkCard: '#151929',
  darkCardBorder: '#2A2D45',
  white: '#FFFFFF',
  lightGray: '#F0F0FF',
  textMuted: '#9CA3AF',
  green: '#22C55E',
  greenLight: '#4ADE80',
  amber: '#F59E0B',
  red: '#EF4444',
  cyan: '#06B6D4',
  pink: '#EC4899',
  indigo: '#818CF8',
  gradientStart: '#6C5CE7',
  gradientEnd: '#06B6D4',
};

// Book/journal icon SVG (matching the app icon style)
const BOOK_ICON_SVG = `
<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M20 15 C20 15, 20 65, 20 65 C20 68, 22 70, 25 70 L60 70 C60 70, 60 65, 60 65 L25 65 C23 65, 23 63, 25 63 L60 63 L60 15 Z"
        fill="white" opacity="0.95" stroke="white" stroke-width="2"/>
  <path d="M35 30 C35 30, 40 40, 45 30" stroke="${COLORS.primary}" stroke-width="3" fill="none" stroke-linecap="round"/>
</svg>`;

// Helper: Create gradient background SVG
function createGradientBg(width, height, angle = 135) {
  return `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${COLORS.dark};stop-opacity:1" />
        <stop offset="50%" style="stop-color:#111528;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#0D1225;stop-opacity:1" />
      </linearGradient>
      <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:${COLORS.primary};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${COLORS.cyan};stop-opacity:1" />
      </linearGradient>
      <radialGradient id="glow1" cx="20%" cy="30%" r="40%">
        <stop offset="0%" style="stop-color:${COLORS.primary};stop-opacity:0.15" />
        <stop offset="100%" style="stop-color:${COLORS.primary};stop-opacity:0" />
      </radialGradient>
      <radialGradient id="glow2" cx="80%" cy="70%" r="35%">
        <stop offset="0%" style="stop-color:${COLORS.cyan};stop-opacity:0.1" />
        <stop offset="100%" style="stop-color:${COLORS.cyan};stop-opacity:0" />
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <rect width="100%" height="100%" fill="url(#glow1)"/>
    <rect width="100%" height="100%" fill="url(#glow2)"/>
  </svg>`;
}

// Helper: Phone frame SVG with content
function createPhoneFrame(width, height, screenContent, frameX, frameY, frameW, frameH) {
  const cornerRadius = 28;
  const screenPadding = 8;
  const screenRadius = 22;

  return `
    <!-- Phone Frame -->
    <rect x="${frameX}" y="${frameY}" width="${frameW}" height="${frameH}"
          rx="${cornerRadius}" ry="${cornerRadius}"
          fill="#1A1A2E" stroke="#333355" stroke-width="2"/>
    <!-- Screen -->
    <rect x="${frameX + screenPadding}" y="${frameY + screenPadding + 20}"
          width="${frameW - screenPadding * 2}" height="${frameH - screenPadding * 2 - 40}"
          rx="${screenRadius}" ry="${screenRadius}"
          fill="${COLORS.dark}"/>
    <!-- Notch -->
    <rect x="${frameX + frameW/2 - 40}" y="${frameY + 6}" width="80" height="18" rx="9" fill="#000"/>
    <!-- Screen Content Group -->
    <g transform="translate(${frameX + screenPadding + 4}, ${frameY + screenPadding + 24})">
      ${screenContent}
    </g>
  `;
}

// ============================================
// ASSET 1: App Icon (512x512)
// ============================================
async function generateAppIcon() {
  // The existing icon at android-play-store-512.png is already perfect
  // Just copy it to the output directory
  const src = path.join(__dirname, '..', 'client/public/icons/android/android-play-store-512.png');
  const dest = path.join(OUTPUT_DIR, 'app-icon-512x512.png');
  fs.copyFileSync(src, dest);
  console.log('✓ App Icon (512x512) - copied existing icon');
}

// ============================================
// ASSET 2: Feature Graphic (1024x500)
// ============================================
async function generateFeatureGraphic() {
  const width = 1024;
  const height = 500;

  const svg = `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#0B0F1A;stop-opacity:1" />
        <stop offset="40%" style="stop-color:#111528;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#0D1225;stop-opacity:1" />
      </linearGradient>
      <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${COLORS.primary};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${COLORS.primaryLight};stop-opacity:1" />
      </linearGradient>
      <linearGradient id="accentLine" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:${COLORS.primary};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${COLORS.cyan};stop-opacity:1" />
      </linearGradient>
      <radialGradient id="glow1" cx="25%" cy="40%" r="50%">
        <stop offset="0%" style="stop-color:${COLORS.primary};stop-opacity:0.2" />
        <stop offset="100%" style="stop-color:${COLORS.primary};stop-opacity:0" />
      </radialGradient>
      <radialGradient id="glow2" cx="75%" cy="60%" r="40%">
        <stop offset="0%" style="stop-color:${COLORS.cyan};stop-opacity:0.12" />
        <stop offset="100%" style="stop-color:${COLORS.cyan};stop-opacity:0" />
      </radialGradient>
      <filter id="shadow1" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="${COLORS.primary}" flood-opacity="0.4"/>
      </filter>
      <filter id="textGlow" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="1"/>
      </filter>
    </defs>

    <!-- Background -->
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <rect width="100%" height="100%" fill="url(#glow1)"/>
    <rect width="100%" height="100%" fill="url(#glow2)"/>

    <!-- Decorative grid dots -->
    ${Array.from({length: 20}, (_, i) =>
      Array.from({length: 10}, (_, j) =>
        `<circle cx="${i * 55 + 20}" cy="${j * 55 + 20}" r="1" fill="${COLORS.accent}" opacity="0.08"/>`
      ).join('')
    ).join('')}

    <!-- Left side: Text Content -->
    <!-- App Icon Circle -->
    <circle cx="130" cy="190" r="55" fill="url(#purpleGrad)" filter="url(#shadow1)"/>
    <g transform="translate(90, 150)">
      ${BOOK_ICON_SVG}
    </g>

    <!-- App Name -->
    <text x="72" y="295" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="bold" fill="${COLORS.white}" letter-spacing="-0.5">
      JournalMate.ai
    </text>

    <!-- Tagline -->
    <text x="72" y="332" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="${COLORS.textMuted}" letter-spacing="0.5">
      AI-Powered Lifestyle Planner
    </text>

    <!-- Accent line under tagline -->
    <rect x="72" y="345" width="180" height="3" rx="1.5" fill="url(#accentLine)"/>

    <!-- Feature pills -->
    <g transform="translate(72, 370)">
      <rect x="0" y="0" width="110" height="32" rx="16" fill="${COLORS.primary}" opacity="0.2" stroke="${COLORS.primary}" stroke-opacity="0.4" stroke-width="1"/>
      <text x="55" y="21" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="${COLORS.accent}" text-anchor="middle">AI Planning</text>

      <rect x="120" y="0" width="90" height="32" rx="16" fill="${COLORS.cyan}" opacity="0.15" stroke="${COLORS.cyan}" stroke-opacity="0.3" stroke-width="1"/>
      <text x="165" y="21" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="${COLORS.cyan}" text-anchor="middle">Goals</text>

      <rect x="220" y="0" width="110" height="32" rx="16" fill="${COLORS.green}" opacity="0.15" stroke="${COLORS.green}" stroke-opacity="0.3" stroke-width="1"/>
      <text x="275" y="21" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="${COLORS.greenLight}" text-anchor="middle">Analytics</text>
    </g>

    <!-- Subtitle -->
    <text x="72" y="442" font-family="Arial, Helvetica, sans-serif" font-size="15" fill="${COLORS.textMuted}" opacity="0.7">
      Discover plans. Make them yours. Share the journey.
    </text>

    <!-- Right side: Phone mockup -->
    <g transform="translate(530, 30)">
      <!-- Phone frame -->
      <rect x="40" y="0" width="220" height="440" rx="24" ry="24" fill="#1A1A2E" stroke="#333355" stroke-width="2"/>
      <!-- Screen -->
      <rect x="48" y="28" width="204" height="384" rx="18" fill="${COLORS.dark}"/>
      <!-- Notch -->
      <rect x="110" y="6" width="60" height="16" rx="8" fill="#000"/>

      <!-- Screen Content: Activities Dashboard -->
      <g transform="translate(56, 40)">
        <!-- Status bar -->
        <text x="4" y="12" font-family="Arial" font-size="10" fill="${COLORS.textMuted}">9:41</text>
        <text x="170" y="12" font-family="Arial" font-size="10" fill="${COLORS.textMuted}" text-anchor="end">100%</text>

        <!-- Header -->
        <text x="4" y="38" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="bold" fill="${COLORS.white}">My Activities</text>
        <text x="4" y="52" font-family="Arial" font-size="10" fill="${COLORS.textMuted}">3 active plans</text>

        <!-- Activity Card 1 -->
        <rect x="0" y="62" width="188" height="72" rx="12" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
        <circle cx="22" cy="88" r="12" fill="${COLORS.primary}" opacity="0.3"/>
        <text x="22" y="92" font-family="Arial" font-size="12" fill="${COLORS.primary}" text-anchor="middle">🎯</text>
        <text x="42" y="82" font-family="Arial" font-size="11" font-weight="bold" fill="${COLORS.white}">Morning Routine</text>
        <text x="42" y="95" font-family="Arial" font-size="9" fill="${COLORS.textMuted}">5 of 8 tasks done</text>
        <!-- Progress bar -->
        <rect x="42" y="104" width="130" height="5" rx="2.5" fill="#2A2D45"/>
        <rect x="42" y="104" width="81" height="5" rx="2.5" fill="${COLORS.green}"/>
        <text x="176" y="110" font-family="Arial" font-size="9" fill="${COLORS.green}" text-anchor="end">63%</text>

        <!-- Activity Card 2 -->
        <rect x="0" y="142" width="188" height="72" rx="12" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
        <circle cx="22" cy="168" r="12" fill="${COLORS.cyan}" opacity="0.3"/>
        <text x="22" y="172" font-family="Arial" font-size="12" fill="${COLORS.cyan}" text-anchor="middle">✈️</text>
        <text x="42" y="162" font-family="Arial" font-size="11" font-weight="bold" fill="${COLORS.white}">Weekend Trip Plan</text>
        <text x="42" y="175" font-family="Arial" font-size="9" fill="${COLORS.textMuted}">2 of 6 tasks done</text>
        <rect x="42" y="184" width="130" height="5" rx="2.5" fill="#2A2D45"/>
        <rect x="42" y="184" width="43" height="5" rx="2.5" fill="${COLORS.cyan}"/>
        <text x="176" y="190" font-family="Arial" font-size="9" fill="${COLORS.cyan}" text-anchor="end">33%</text>

        <!-- Activity Card 3 -->
        <rect x="0" y="222" width="188" height="72" rx="12" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
        <circle cx="22" cy="248" r="12" fill="${COLORS.amber}" opacity="0.3"/>
        <text x="22" y="252" font-family="Arial" font-size="12" fill="${COLORS.amber}" text-anchor="middle">💪</text>
        <text x="42" y="242" font-family="Arial" font-size="11" font-weight="bold" fill="${COLORS.white}">Fitness Challenge</text>
        <text x="42" y="255" font-family="Arial" font-size="9" fill="${COLORS.textMuted}">7 of 10 tasks done</text>
        <rect x="42" y="264" width="130" height="5" rx="2.5" fill="#2A2D45"/>
        <rect x="42" y="264" width="91" height="5" rx="2.5" fill="${COLORS.amber}"/>
        <text x="176" y="270" font-family="Arial" font-size="9" fill="${COLORS.amber}" text-anchor="end">70%</text>

        <!-- Bottom nav -->
        <rect x="-8" y="310" width="204" height="50" rx="0" fill="${COLORS.darkCard}"/>
        <text x="25" y="340" font-family="Arial" font-size="9" fill="${COLORS.primary}" text-anchor="middle">Home</text>
        <text x="72" y="340" font-family="Arial" font-size="9" fill="${COLORS.textMuted}" text-anchor="middle">Discover</text>
        <text x="120" y="340" font-family="Arial" font-size="9" fill="${COLORS.textMuted}" text-anchor="middle">Tasks</text>
        <text x="168" y="340" font-family="Arial" font-size="9" fill="${COLORS.textMuted}" text-anchor="middle">Reports</text>
      </g>
    </g>

    <!-- Second phone (partial, behind) -->
    <g transform="translate(710, 60)" opacity="0.5">
      <rect x="0" y="0" width="200" height="400" rx="22" fill="#1A1A2E" stroke="#333355" stroke-width="1.5"/>
      <rect x="7" y="26" width="186" height="348" rx="16" fill="${COLORS.dark}"/>
      <rect x="55" y="6" width="56" height="14" rx="7" fill="#000"/>

      <!-- Reports screen hint -->
      <g transform="translate(16, 44)">
        <text x="4" y="22" font-family="Arial" font-size="14" font-weight="bold" fill="${COLORS.white}">Reports</text>

        <!-- Stat cards row -->
        <rect x="0" y="34" width="76" height="50" rx="10" fill="${COLORS.primary}" opacity="0.2"/>
        <text x="38" y="56" font-family="Arial" font-size="18" font-weight="bold" fill="${COLORS.primary}" text-anchor="middle">87%</text>
        <text x="38" y="72" font-family="Arial" font-size="8" fill="${COLORS.textMuted}" text-anchor="middle">Completion</text>

        <rect x="84" y="34" width="76" height="50" rx="10" fill="${COLORS.green}" opacity="0.15"/>
        <text x="122" y="56" font-family="Arial" font-size="18" font-weight="bold" fill="${COLORS.green}" text-anchor="middle">12</text>
        <text x="122" y="72" font-family="Arial" font-size="8" fill="${COLORS.textMuted}" text-anchor="middle">Day Streak</text>

        <!-- Chart area hint -->
        <rect x="0" y="96" width="160" height="80" rx="10" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
        <polyline points="10,160 30,140 55,150 80,130 105,120 130,135 150,110"
                  fill="none" stroke="${COLORS.primary}" stroke-width="2" stroke-linecap="round"/>
        <polyline points="10,160 30,140 55,150 80,130 105,120 130,135 150,110"
                  fill="url(#purpleGrad)" opacity="0.1"/>
      </g>
    </g>
  </svg>`;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(OUTPUT_DIR, 'feature-graphic-1024x500.png'));
  console.log('✓ Feature Graphic (1024x500)');
}

// ============================================
// Phone Screenshots (1080x1920)
// ============================================

function phoneScreenSvg(width, height, headerText, subtitleText, bodyContent) {
  return `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#0B0F1A;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#111528;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#0D1225;stop-opacity:1" />
      </linearGradient>
      <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${COLORS.primary};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${COLORS.primaryLight};stop-opacity:1" />
      </linearGradient>
      <linearGradient id="accentLine" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:${COLORS.primary};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${COLORS.cyan};stop-opacity:1" />
      </linearGradient>
      <radialGradient id="glow1" cx="30%" cy="20%" r="50%">
        <stop offset="0%" style="stop-color:${COLORS.primary};stop-opacity:0.15" />
        <stop offset="100%" style="stop-color:${COLORS.primary};stop-opacity:0" />
      </radialGradient>
      <radialGradient id="glow2" cx="70%" cy="80%" r="40%">
        <stop offset="0%" style="stop-color:${COLORS.cyan};stop-opacity:0.08" />
        <stop offset="100%" style="stop-color:${COLORS.cyan};stop-opacity:0" />
      </radialGradient>
      <filter id="cardShadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="#000" flood-opacity="0.3"/>
      </filter>
    </defs>

    <rect width="100%" height="100%" fill="url(#bg)"/>
    <rect width="100%" height="100%" fill="url(#glow1)"/>
    <rect width="100%" height="100%" fill="url(#glow2)"/>

    <!-- Decorative elements -->
    ${Array.from({length: 15}, (_, i) =>
      Array.from({length: 26}, (_, j) =>
        `<circle cx="${i * 75 + 30}" cy="${j * 75 + 30}" r="1" fill="${COLORS.accent}" opacity="0.05"/>`
      ).join('')
    ).join('')}

    <!-- Header marketing text -->
    <text x="${width/2}" y="120" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="bold" fill="${COLORS.white}" text-anchor="middle" letter-spacing="-1">
      ${headerText}
    </text>
    <text x="${width/2}" y="170" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="${COLORS.textMuted}" text-anchor="middle">
      ${subtitleText}
    </text>

    <!-- Accent line -->
    <rect x="${width/2 - 60}" y="190" width="120" height="3" rx="1.5" fill="url(#accentLine)"/>

    <!-- Phone mockup -->
    <g transform="translate(${width/2 - 190}, 240)">
      <rect x="0" y="0" width="380" height="760" rx="40" ry="40" fill="#1A1A2E" stroke="#333355" stroke-width="3"/>
      <rect x="12" y="40" width="356" height="680" rx="30" fill="${COLORS.dark}"/>
      <rect x="130" y="10" width="120" height="24" rx="12" fill="#000"/>

      <!-- Screen content -->
      <g transform="translate(24, 60)">
        ${bodyContent}
      </g>
    </g>

    <!-- Bottom branding -->
    <text x="${width/2}" y="1860" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="${COLORS.textMuted}" text-anchor="middle" opacity="0.6">
      JournalMate.ai
    </text>
  </svg>`;
}

// Screenshot 1: AI Goal Input
function screenshot1_GoalInput() {
  const body = `
    <!-- Status bar -->
    <text x="8" y="18" font-family="Arial" font-size="14" fill="${COLORS.textMuted}">9:41</text>

    <!-- Header -->
    <text x="8" y="55" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="bold" fill="${COLORS.white}">What's your goal?</text>
    <text x="8" y="78" font-family="Arial" font-size="14" fill="${COLORS.textMuted}">Tell us what you want to achieve</text>

    <!-- Input area -->
    <rect x="0" y="96" width="332" height="110" rx="16" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="16" y="125" font-family="Arial" font-size="15" fill="${COLORS.white}">I want to start a morning</text>
    <text x="16" y="145" font-family="Arial" font-size="15" fill="${COLORS.white}">workout routine and eat</text>
    <text x="16" y="165" font-family="Arial" font-size="15" fill="${COLORS.white}">healthier this month</text>
    <rect x="250" y="172" width="16" height="2" fill="${COLORS.primary}">
      <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/>
    </rect>

    <!-- Voice button -->
    <circle cx="296" y="186" r="22" fill="${COLORS.primary}"/>
    <text x="296" y="192" font-family="Arial" font-size="18" fill="white" text-anchor="middle">🎙</text>

    <!-- Category selector -->
    <text x="8" y="245" font-family="Arial" font-size="13" fill="${COLORS.textMuted}">Choose a theme</text>

    <!-- Category pills -->
    <rect x="0" y="258" width="85" height="38" rx="19" fill="${COLORS.green}" opacity="0.2" stroke="${COLORS.green}" stroke-opacity="0.4" stroke-width="1"/>
    <text x="42" y="282" font-family="Arial" font-size="13" fill="${COLORS.greenLight}" text-anchor="middle">Wellness</text>

    <rect x="95" y="258" width="85" height="38" rx="19" fill="${COLORS.primary}" opacity="0.2" stroke="${COLORS.primary}" stroke-opacity="0.4" stroke-width="1"/>
    <text x="137" y="282" font-family="Arial" font-size="13" fill="${COLORS.accent}" text-anchor="middle">Work</text>

    <rect x="190" y="258" width="85" height="38" rx="19" fill="${COLORS.cyan}" opacity="0.2" stroke="${COLORS.cyan}" stroke-opacity="0.4" stroke-width="1"/>
    <text x="232" y="282" font-family="Arial" font-size="13" fill="${COLORS.cyan}" text-anchor="middle">Travel</text>

    <rect x="0" y="306" width="105" height="38" rx="19" fill="${COLORS.amber}" opacity="0.15" stroke="${COLORS.amber}" stroke-opacity="0.3" stroke-width="1"/>
    <text x="52" y="330" font-family="Arial" font-size="13" fill="${COLORS.amber}" text-anchor="middle">Adventure</text>

    <rect x="115" y="306" width="100" height="38" rx="19" fill="${COLORS.pink}" opacity="0.15" stroke="${COLORS.pink}" stroke-opacity="0.3" stroke-width="1"/>
    <text x="165" y="330" font-family="Arial" font-size="13" fill="${COLORS.pink}" text-anchor="middle">Romance</text>

    <rect x="225" y="306" width="100" height="38" rx="19" fill="${COLORS.indigo}" opacity="0.15" stroke="${COLORS.indigo}" stroke-opacity="0.3" stroke-width="1"/>
    <text x="275" y="330" font-family="Arial" font-size="13" fill="${COLORS.indigo}" text-anchor="middle">Spiritual</text>

    <!-- Planning mode selector -->
    <text x="8" y="380" font-family="Arial" font-size="13" fill="${COLORS.textMuted}">Planning mode</text>

    <rect x="0" y="394" width="160" height="52" rx="14" fill="${COLORS.primary}" opacity="0.15" stroke="${COLORS.primary}" stroke-width="1.5"/>
    <text x="80" y="416" font-family="Arial" font-size="14" font-weight="bold" fill="${COLORS.primary}" text-anchor="middle">Quick Plan</text>
    <text x="80" y="432" font-family="Arial" font-size="10" fill="${COLORS.textMuted}" text-anchor="middle">5 AI questions</text>

    <rect x="170" y="394" width="160" height="52" rx="14" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="250" y="416" font-family="Arial" font-size="14" font-weight="bold" fill="${COLORS.white}" text-anchor="middle">Smart Plan</text>
    <text x="250" y="432" font-family="Arial" font-size="10" fill="${COLORS.textMuted}" text-anchor="middle">7 deep questions</text>

    <!-- Generate button -->
    <rect x="0" y="470" width="332" height="54" rx="27" fill="url(#purpleGrad)"/>
    <text x="166" y="503" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="bold" fill="white" text-anchor="middle">Generate My Plan</text>

    <!-- Recent plans -->
    <text x="8" y="560" font-family="Arial" font-size="13" fill="${COLORS.textMuted}">Recent plans</text>
    <rect x="0" y="572" width="332" height="50" rx="12" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="16" y="596" font-family="Arial" font-size="13" fill="${COLORS.white}">Weekend Meal Prep</text>
    <text x="16" y="612" font-family="Arial" font-size="11" fill="${COLORS.textMuted}">Completed yesterday</text>
    <text x="310" y="598" font-family="Arial" font-size="12" fill="${COLORS.green}" text-anchor="end">✓</text>
  `;

  return phoneScreenSvg(1080, 1920, 'Plan Any Goal with AI', 'Voice or text — your AI planner handles the rest', body);
}

// Screenshot 2: Activities Dashboard
function screenshot2_Activities() {
  const body = `
    <text x="8" y="18" font-family="Arial" font-size="14" fill="${COLORS.textMuted}">9:41</text>

    <text x="8" y="55" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="bold" fill="${COLORS.white}">My Activities</text>
    <text x="8" y="78" font-family="Arial" font-size="14" fill="${COLORS.textMuted}">4 active plans</text>

    <!-- Search bar -->
    <rect x="0" y="94" width="332" height="44" rx="22" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="40" y="121" font-family="Arial" font-size="14" fill="${COLORS.textMuted}">Search activities...</text>
    <text x="20" y="122" font-family="Arial" font-size="16" fill="${COLORS.textMuted}">🔍</text>

    <!-- Activity Card 1 - Wellness -->
    <rect x="0" y="152" width="332" height="120" rx="16" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1" filter="url(#cardShadow)"/>
    <rect x="0" y="152" width="6" height="120" rx="3" fill="${COLORS.green}"/>
    <circle cx="36" cy="188" r="20" fill="${COLORS.green}" opacity="0.2"/>
    <text x="36" y="194" font-family="Arial" font-size="18" text-anchor="middle">💪</text>
    <text x="66" y="184" font-family="Arial" font-size="16" font-weight="bold" fill="${COLORS.white}">Morning Fitness Routine</text>
    <text x="66" y="204" font-family="Arial" font-size="12" fill="${COLORS.textMuted}">7 of 10 tasks complete</text>
    <rect x="66" y="216" width="240" height="6" rx="3" fill="#2A2D45"/>
    <rect x="66" y="216" width="168" height="6" rx="3" fill="${COLORS.green}"/>
    <text x="312" y="225" font-family="Arial" font-size="12" fill="${COLORS.green}" text-anchor="end">70%</text>
    <text x="66" y="253" font-family="Arial" font-size="11" fill="${COLORS.textMuted}">Due: Today  •  Wellness</text>

    <!-- Activity Card 2 - Travel -->
    <rect x="0" y="286" width="332" height="120" rx="16" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1" filter="url(#cardShadow)"/>
    <rect x="0" y="286" width="6" height="120" rx="3" fill="${COLORS.cyan}"/>
    <circle cx="36" cy="322" r="20" fill="${COLORS.cyan}" opacity="0.2"/>
    <text x="36" y="328" font-family="Arial" font-size="18" text-anchor="middle">✈️</text>
    <text x="66" y="318" font-family="Arial" font-size="16" font-weight="bold" fill="${COLORS.white}">Japan Trip Planning</text>
    <text x="66" y="338" font-family="Arial" font-size="12" fill="${COLORS.textMuted}">3 of 12 tasks complete</text>
    <rect x="66" y="350" width="240" height="6" rx="3" fill="#2A2D45"/>
    <rect x="66" y="350" width="60" height="6" rx="3" fill="${COLORS.cyan}"/>
    <text x="312" y="359" font-family="Arial" font-size="12" fill="${COLORS.cyan}" text-anchor="end">25%</text>
    <text x="66" y="387" font-family="Arial" font-size="11" fill="${COLORS.textMuted}">Due: Mar 15  •  Travel</text>

    <!-- Activity Card 3 - Work -->
    <rect x="0" y="420" width="332" height="120" rx="16" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1" filter="url(#cardShadow)"/>
    <rect x="0" y="420" width="6" height="120" rx="3" fill="${COLORS.primary}"/>
    <circle cx="36" cy="456" r="20" fill="${COLORS.primary}" opacity="0.2"/>
    <text x="36" y="462" font-family="Arial" font-size="18" text-anchor="middle">📋</text>
    <text x="66" y="452" font-family="Arial" font-size="16" font-weight="bold" fill="${COLORS.white}">Product Launch Prep</text>
    <text x="66" y="472" font-family="Arial" font-size="12" fill="${COLORS.textMuted}">5 of 8 tasks complete</text>
    <rect x="66" y="484" width="240" height="6" rx="3" fill="#2A2D45"/>
    <rect x="66" y="484" width="150" height="6" rx="3" fill="${COLORS.primary}"/>
    <text x="312" y="493" font-family="Arial" font-size="12" fill="${COLORS.primary}" text-anchor="end">63%</text>
    <text x="66" y="521" font-family="Arial" font-size="11" fill="${COLORS.textMuted}">Due: This week  •  Work</text>

    <!-- Activity Card 4 - Romance -->
    <rect x="0" y="554" width="332" height="120" rx="16" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1" filter="url(#cardShadow)"/>
    <rect x="0" y="554" width="6" height="120" rx="3" fill="${COLORS.pink}"/>
    <circle cx="36" cy="590" r="20" fill="${COLORS.pink}" opacity="0.2"/>
    <text x="36" y="596" font-family="Arial" font-size="18" text-anchor="middle">💝</text>
    <text x="66" y="586" font-family="Arial" font-size="16" font-weight="bold" fill="${COLORS.white}">Date Night Ideas</text>
    <text x="66" y="606" font-family="Arial" font-size="12" fill="${COLORS.textMuted}">1 of 5 tasks complete</text>
    <rect x="66" y="618" width="240" height="6" rx="3" fill="#2A2D45"/>
    <rect x="66" y="618" width="48" height="6" rx="3" fill="${COLORS.pink}"/>
    <text x="312" y="627" font-family="Arial" font-size="12" fill="${COLORS.pink}" text-anchor="end">20%</text>
    <text x="66" y="655" font-family="Arial" font-size="11" fill="${COLORS.textMuted}">Due: Saturday  •  Romance</text>
  `;

  return phoneScreenSvg(1080, 1920, 'Track All Your Plans', 'Organized activities with real-time progress', body);
}

// Screenshot 3: Tasks View
function screenshot3_Tasks() {
  const body = `
    <text x="8" y="18" font-family="Arial" font-size="14" fill="${COLORS.textMuted}">9:41</text>

    <text x="8" y="55" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="bold" fill="${COLORS.white}">Today's Tasks</text>
    <text x="8" y="78" font-family="Arial" font-size="14" fill="${COLORS.textMuted}">8 tasks remaining</text>

    <!-- Priority filter pills -->
    <rect x="0" y="94" width="60" height="30" rx="15" fill="${COLORS.primary}" opacity="0.25" stroke="${COLORS.primary}" stroke-opacity="0.5" stroke-width="1"/>
    <text x="30" y="114" font-family="Arial" font-size="12" fill="${COLORS.accent}" text-anchor="middle">All</text>
    <rect x="68" y="94" width="70" height="30" rx="15" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="103" y="114" font-family="Arial" font-size="12" fill="${COLORS.textMuted}" text-anchor="middle">High</text>
    <rect x="146" y="94" width="80" height="30" rx="15" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="186" y="114" font-family="Arial" font-size="12" fill="${COLORS.textMuted}" text-anchor="middle">Medium</text>

    <!-- Completed task -->
    <rect x="0" y="140" width="332" height="64" rx="14" fill="${COLORS.darkCard}" stroke="${COLORS.green}" stroke-opacity="0.3" stroke-width="1" opacity="0.6"/>
    <circle cx="28" cy="172" r="14" fill="${COLORS.green}" opacity="0.3"/>
    <text x="28" y="177" font-family="Arial" font-size="14" fill="${COLORS.green}" text-anchor="middle">✓</text>
    <text x="52" y="166" font-family="Arial" font-size="14" fill="${COLORS.textMuted}" text-decoration="line-through">Wake up at 6:00 AM</text>
    <text x="52" y="186" font-family="Arial" font-size="11" fill="${COLORS.textMuted}">Morning Routine  •  Done</text>

    <!-- Task 1 - High priority -->
    <rect x="0" y="214" width="332" height="64" rx="14" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <circle cx="28" cy="246" r="14" fill="none" stroke="${COLORS.red}" stroke-opacity="0.5" stroke-width="2"/>
    <text x="52" y="240" font-family="Arial" font-size="14" fill="${COLORS.white}">30-min HIIT workout</text>
    <text x="52" y="260" font-family="Arial" font-size="11" fill="${COLORS.textMuted}">Morning Fitness  •  </text>
    <text x="165" y="260" font-family="Arial" font-size="11" fill="${COLORS.red}">High</text>
    <rect x="290" y="236" width="32" height="20" rx="10" fill="${COLORS.red}" opacity="0.2"/>
    <text x="306" y="250" font-family="Arial" font-size="9" fill="${COLORS.red}" text-anchor="middle">!</text>

    <!-- Task 2 -->
    <rect x="0" y="288" width="332" height="64" rx="14" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <circle cx="28" cy="320" r="14" fill="none" stroke="${COLORS.amber}" stroke-opacity="0.5" stroke-width="2"/>
    <text x="52" y="314" font-family="Arial" font-size="14" fill="${COLORS.white}">Prepare healthy breakfast</text>
    <text x="52" y="334" font-family="Arial" font-size="11" fill="${COLORS.textMuted}">Morning Routine  •  </text>
    <text x="157" y="334" font-family="Arial" font-size="11" fill="${COLORS.amber}">Medium</text>

    <!-- Task 3 -->
    <rect x="0" y="362" width="332" height="64" rx="14" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <circle cx="28" cy="394" r="14" fill="none" stroke="${COLORS.primary}" stroke-opacity="0.5" stroke-width="2"/>
    <text x="52" y="388" font-family="Arial" font-size="14" fill="${COLORS.white}">Review product roadmap</text>
    <text x="52" y="408" font-family="Arial" font-size="11" fill="${COLORS.textMuted}">Product Launch  •  </text>
    <text x="155" y="408" font-family="Arial" font-size="11" fill="${COLORS.primary}">Normal</text>

    <!-- Task 4 -->
    <rect x="0" y="436" width="332" height="64" rx="14" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <circle cx="28" cy="468" r="14" fill="none" stroke="${COLORS.cyan}" stroke-opacity="0.5" stroke-width="2"/>
    <text x="52" y="462" font-family="Arial" font-size="14" fill="${COLORS.white}">Book flight to Tokyo</text>
    <text x="52" y="482" font-family="Arial" font-size="11" fill="${COLORS.textMuted}">Japan Trip  •  </text>
    <text x="120" y="482" font-family="Arial" font-size="11" fill="${COLORS.cyan}">Normal</text>

    <!-- Task 5 -->
    <rect x="0" y="510" width="332" height="64" rx="14" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <circle cx="28" cy="542" r="14" fill="none" stroke="${COLORS.pink}" stroke-opacity="0.5" stroke-width="2"/>
    <text x="52" y="536" font-family="Arial" font-size="14" fill="${COLORS.white}">Research restaurant options</text>
    <text x="52" y="556" font-family="Arial" font-size="11" fill="${COLORS.textMuted}">Date Night  •  </text>
    <text x="130" y="556" font-family="Arial" font-size="11" fill="${COLORS.pink}">Normal</text>

    <!-- Task 6 -->
    <rect x="0" y="584" width="332" height="64" rx="14" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <circle cx="28" cy="616" r="14" fill="none" stroke="${COLORS.primary}" stroke-opacity="0.5" stroke-width="2"/>
    <text x="52" y="610" font-family="Arial" font-size="14" fill="${COLORS.white}">Write team update email</text>
    <text x="52" y="630" font-family="Arial" font-size="11" fill="${COLORS.textMuted}">Product Launch  •  </text>
    <text x="155" y="630" font-family="Arial" font-size="11" fill="${COLORS.primary}">Normal</text>

    <!-- Swipe hint -->
    <text x="166" y="672" font-family="Arial" font-size="11" fill="${COLORS.textMuted}" text-anchor="middle" opacity="0.6">Swipe right to complete • Swipe left to skip</text>
  `;

  return phoneScreenSvg(1080, 1920, 'Manage Every Task', 'Swipe to complete, prioritize, and conquer your day', body);
}

// Screenshot 4: Reports & Analytics
function screenshot4_Reports() {
  const body = `
    <text x="8" y="18" font-family="Arial" font-size="14" fill="${COLORS.textMuted}">9:41</text>

    <text x="8" y="55" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="bold" fill="${COLORS.white}">Reports</text>
    <text x="8" y="78" font-family="Arial" font-size="14" fill="${COLORS.textMuted}">Your progress this week</text>

    <!-- Summary stat cards -->
    <rect x="0" y="96" width="105" height="80" rx="14" fill="${COLORS.primary}" opacity="0.15" stroke="${COLORS.primary}" stroke-opacity="0.3" stroke-width="1"/>
    <text x="52" y="130" font-family="Arial" font-size="30" font-weight="bold" fill="${COLORS.primary}" text-anchor="middle">87%</text>
    <text x="52" y="152" font-family="Arial" font-size="11" fill="${COLORS.textMuted}" text-anchor="middle">Completion</text>

    <rect x="113" y="96" width="105" height="80" rx="14" fill="${COLORS.green}" opacity="0.12" stroke="${COLORS.green}" stroke-opacity="0.25" stroke-width="1"/>
    <text x="165" y="130" font-family="Arial" font-size="30" font-weight="bold" fill="${COLORS.green}" text-anchor="middle">12</text>
    <text x="165" y="152" font-family="Arial" font-size="11" fill="${COLORS.textMuted}" text-anchor="middle">Day Streak 🔥</text>

    <rect x="226" y="96" width="105" height="80" rx="14" fill="${COLORS.cyan}" opacity="0.12" stroke="${COLORS.cyan}" stroke-opacity="0.25" stroke-width="1"/>
    <text x="278" y="130" font-family="Arial" font-size="30" font-weight="bold" fill="${COLORS.cyan}" text-anchor="middle">48</text>
    <text x="278" y="152" font-family="Arial" font-size="11" fill="${COLORS.textMuted}" text-anchor="middle">Tasks Done</text>

    <!-- Weekly chart -->
    <rect x="0" y="192" width="332" height="180" rx="16" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="16" y="220" font-family="Arial" font-size="14" font-weight="bold" fill="${COLORS.white}">Weekly Progress</text>

    <!-- Chart bars -->
    <rect x="30" y="320" width="30" height="38" rx="4" fill="${COLORS.primary}" opacity="0.7"/>
    <text x="45" y="348" font-family="Arial" font-size="9" fill="${COLORS.textMuted}" text-anchor="middle">Mon</text>

    <rect x="75" y="295" width="30" height="63" rx="4" fill="${COLORS.primary}" opacity="0.8"/>
    <text x="90" y="348" font-family="Arial" font-size="9" fill="${COLORS.textMuted}" text-anchor="middle">Tue</text>

    <rect x="120" y="278" width="30" height="80" rx="4" fill="${COLORS.primary}" opacity="0.85"/>
    <text x="135" y="348" font-family="Arial" font-size="9" fill="${COLORS.textMuted}" text-anchor="middle">Wed</text>

    <rect x="165" y="260" width="30" height="98" rx="4" fill="${COLORS.primary}" opacity="0.9"/>
    <text x="180" y="348" font-family="Arial" font-size="9" fill="${COLORS.textMuted}" text-anchor="middle">Thu</text>

    <rect x="210" y="248" width="30" height="110" rx="4" fill="${COLORS.primary}"/>
    <text x="225" y="348" font-family="Arial" font-size="9" fill="${COLORS.textMuted}" text-anchor="middle">Fri</text>

    <rect x="255" y="270" width="30" height="88" rx="4" fill="${COLORS.primary}" opacity="0.85"/>
    <text x="270" y="348" font-family="Arial" font-size="9" fill="${COLORS.textMuted}" text-anchor="middle">Sat</text>

    <rect x="300" y="290" width="30" height="68" rx="4" fill="${COLORS.accent}" opacity="0.5"/>
    <text x="315" y="348" font-family="Arial" font-size="9" fill="${COLORS.textMuted}" text-anchor="middle">Sun</text>

    <!-- Category breakdown -->
    <text x="8" y="400" font-family="Arial" font-size="14" font-weight="bold" fill="${COLORS.white}">By Category</text>

    <rect x="0" y="414" width="332" height="54" rx="12" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="16" y="438" font-family="Arial" font-size="13" fill="${COLORS.white}">Wellness</text>
    <rect x="120" y="432" width="160" height="6" rx="3" fill="#2A2D45"/>
    <rect x="120" y="432" width="128" height="6" rx="3" fill="${COLORS.green}"/>
    <text x="312" y="440" font-family="Arial" font-size="12" fill="${COLORS.green}" text-anchor="end">80%</text>

    <rect x="0" y="476" width="332" height="54" rx="12" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="16" y="500" font-family="Arial" font-size="13" fill="${COLORS.white}">Work</text>
    <rect x="120" y="494" width="160" height="6" rx="3" fill="#2A2D45"/>
    <rect x="120" y="494" width="144" height="6" rx="3" fill="${COLORS.primary}"/>
    <text x="312" y="502" font-family="Arial" font-size="12" fill="${COLORS.primary}" text-anchor="end">90%</text>

    <rect x="0" y="538" width="332" height="54" rx="12" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="16" y="562" font-family="Arial" font-size="13" fill="${COLORS.white}">Travel</text>
    <rect x="120" y="556" width="160" height="6" rx="3" fill="#2A2D45"/>
    <rect x="120" y="556" width="56" height="6" rx="3" fill="${COLORS.cyan}"/>
    <text x="312" y="564" font-family="Arial" font-size="12" fill="${COLORS.cyan}" text-anchor="end">35%</text>

    <!-- Achievements -->
    <text x="8" y="622" font-family="Arial" font-size="14" font-weight="bold" fill="${COLORS.white}">Achievements</text>

    <rect x="0" y="636" width="105" height="48" rx="12" fill="${COLORS.amber}" opacity="0.15" stroke="${COLORS.amber}" stroke-opacity="0.3" stroke-width="1"/>
    <text x="52" y="665" font-family="Arial" font-size="12" fill="${COLORS.amber}" text-anchor="middle">🏆 First 50</text>

    <rect x="113" y="636" width="105" height="48" rx="12" fill="${COLORS.primary}" opacity="0.15" stroke="${COLORS.primary}" stroke-opacity="0.3" stroke-width="1"/>
    <text x="165" y="665" font-family="Arial" font-size="12" fill="${COLORS.accent}" text-anchor="middle">🔥 10 Streak</text>

    <rect x="226" y="636" width="105" height="48" rx="12" fill="${COLORS.green}" opacity="0.12" stroke="${COLORS.green}" stroke-opacity="0.25" stroke-width="1"/>
    <text x="278" y="665" font-family="Arial" font-size="12" fill="${COLORS.greenLight}" text-anchor="middle">⭐ Top 5%</text>
  `;

  return phoneScreenSvg(1080, 1920, 'See Your Progress', 'Streaks, analytics, and achievements at a glance', body);
}

// Screenshot 5: Discover Plans
function screenshot5_Discover() {
  const body = `
    <text x="8" y="18" font-family="Arial" font-size="14" fill="${COLORS.textMuted}">9:41</text>

    <text x="8" y="55" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="bold" fill="${COLORS.white}">Discover</text>
    <text x="8" y="78" font-family="Arial" font-size="14" fill="${COLORS.textMuted}">Trending community plans</text>

    <!-- Category filter -->
    <rect x="0" y="94" width="70" height="30" rx="15" fill="${COLORS.primary}" opacity="0.25" stroke="${COLORS.primary}" stroke-opacity="0.5" stroke-width="1"/>
    <text x="35" y="114" font-family="Arial" font-size="12" fill="${COLORS.accent}" text-anchor="middle">Trending</text>
    <rect x="78" y="94" width="70" height="30" rx="15" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="113" y="114" font-family="Arial" font-size="12" fill="${COLORS.textMuted}" text-anchor="middle">Travel</text>
    <rect x="156" y="94" width="70" height="30" rx="15" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="191" y="114" font-family="Arial" font-size="12" fill="${COLORS.textMuted}" text-anchor="middle">Fitness</text>
    <rect x="234" y="94" width="70" height="30" rx="15" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="269" y="114" font-family="Arial" font-size="12" fill="${COLORS.textMuted}" text-anchor="middle">Career</text>

    <!-- Plan Card 1 - Large -->
    <rect x="0" y="138" width="332" height="180" rx="16" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <!-- Gradient overlay for image area -->
    <rect x="1" y="139" width="330" height="110" rx="15" fill="${COLORS.primary}" opacity="0.3"/>
    <text x="166" y="190" font-family="Arial" font-size="40" text-anchor="middle">🏔️</text>
    <text x="16" y="280" font-family="Arial" font-size="16" font-weight="bold" fill="${COLORS.white}">Ultimate Hiking Adventure</text>
    <text x="16" y="300" font-family="Arial" font-size="12" fill="${COLORS.textMuted}">12 tasks  •  3.2k views  •  Adventure</text>
    <text x="300" y="296" font-family="Arial" font-size="14" fill="${COLORS.pink}">♥ 284</text>

    <!-- Plan Card 2 -->
    <rect x="0" y="330" width="160" height="165" rx="14" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <rect x="1" y="331" width="158" height="80" rx="13" fill="${COLORS.cyan}" opacity="0.25"/>
    <text x="80" y="375" font-family="Arial" font-size="32" text-anchor="middle">🍳</text>
    <text x="12" y="434" font-family="Arial" font-size="13" font-weight="bold" fill="${COLORS.white}">Meal Prep Sunday</text>
    <text x="12" y="452" font-family="Arial" font-size="10" fill="${COLORS.textMuted}">8 tasks  •  1.5k views</text>
    <text x="12" y="470" font-family="Arial" font-size="11" fill="${COLORS.pink}">♥ 156</text>

    <!-- Plan Card 3 -->
    <rect x="170" y="330" width="162" height="165" rx="14" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <rect x="171" y="331" width="160" height="80" rx="13" fill="${COLORS.green}" opacity="0.2"/>
    <text x="251" y="375" font-family="Arial" font-size="32" text-anchor="middle">🧘</text>
    <text x="182" y="434" font-family="Arial" font-size="13" font-weight="bold" fill="${COLORS.white}">30-Day Mindfulness</text>
    <text x="182" y="452" font-family="Arial" font-size="10" fill="${COLORS.textMuted}">30 tasks  •  2.1k views</text>
    <text x="182" y="470" font-family="Arial" font-size="11" fill="${COLORS.pink}">♥ 203</text>

    <!-- Plan Card 4 -->
    <rect x="0" y="505" width="160" height="165" rx="14" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <rect x="1" y="506" width="158" height="80" rx="13" fill="${COLORS.amber}" opacity="0.2"/>
    <text x="80" y="550" font-family="Arial" font-size="32" text-anchor="middle">💼</text>
    <text x="12" y="609" font-family="Arial" font-size="13" font-weight="bold" fill="${COLORS.white}">Interview Mastery</text>
    <text x="12" y="627" font-family="Arial" font-size="10" fill="${COLORS.textMuted}">10 tasks  •  890 views</text>
    <text x="12" y="645" font-family="Arial" font-size="11" fill="${COLORS.pink}">♥ 98</text>

    <!-- Plan Card 5 -->
    <rect x="170" y="505" width="162" height="165" rx="14" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <rect x="171" y="506" width="160" height="80" rx="13" fill="${COLORS.pink}" opacity="0.2"/>
    <text x="251" y="550" font-family="Arial" font-size="32" text-anchor="middle">💑</text>
    <text x="182" y="609" font-family="Arial" font-size="13" font-weight="bold" fill="${COLORS.white}">Perfect Date Night</text>
    <text x="182" y="627" font-family="Arial" font-size="10" fill="${COLORS.textMuted}">6 tasks  •  1.8k views</text>
    <text x="182" y="645" font-family="Arial" font-size="11" fill="${COLORS.pink}">♥ 175</text>
  `;

  return phoneScreenSvg(1080, 1920, 'Discover &amp; Remix Plans', 'Browse trending plans from the community', body);
}

// Screenshot 6: Groups & Collaboration
function screenshot6_Groups() {
  const body = `
    <text x="8" y="18" font-family="Arial" font-size="14" fill="${COLORS.textMuted}">9:41</text>

    <text x="8" y="55" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="bold" fill="${COLORS.white}">Groups</text>
    <text x="8" y="78" font-family="Arial" font-size="14" fill="${COLORS.textMuted}">Collaborate on shared goals</text>

    <!-- Create group button -->
    <rect x="0" y="96" width="332" height="48" rx="24" fill="url(#purpleGrad)"/>
    <text x="166" y="126" font-family="Arial" font-size="15" font-weight="bold" fill="white" text-anchor="middle">+ Create New Group</text>

    <!-- Group Card 1 -->
    <rect x="0" y="160" width="332" height="140" rx="16" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="16" y="190" font-family="Arial" font-size="16" font-weight="bold" fill="${COLORS.white}">Fitness Squad</text>
    <text x="16" y="210" font-family="Arial" font-size="12" fill="${COLORS.textMuted}">5 members  •  3 shared goals</text>

    <!-- Member avatars -->
    <circle cx="28" cy="240" r="14" fill="${COLORS.primary}"/>
    <text x="28" y="245" font-family="Arial" font-size="12" fill="white" text-anchor="middle">JM</text>
    <circle cx="52" cy="240" r="14" fill="${COLORS.cyan}"/>
    <text x="52" y="245" font-family="Arial" font-size="12" fill="white" text-anchor="middle">SK</text>
    <circle cx="76" cy="240" r="14" fill="${COLORS.green}"/>
    <text x="76" y="245" font-family="Arial" font-size="12" fill="white" text-anchor="middle">AR</text>
    <circle cx="100" cy="240" r="14" fill="${COLORS.amber}"/>
    <text x="100" y="245" font-family="Arial" font-size="12" fill="white" text-anchor="middle">LP</text>
    <circle cx="124" cy="240" r="14" fill="${COLORS.darkCardBorder}"/>
    <text x="124" y="245" font-family="Arial" font-size="10" fill="${COLORS.textMuted}" text-anchor="middle">+1</text>

    <!-- Group progress -->
    <text x="16" y="278" font-family="Arial" font-size="12" fill="${COLORS.textMuted}">Team progress</text>
    <rect x="16" y="284" width="300" height="6" rx="3" fill="#2A2D45"/>
    <rect x="16" y="284" width="210" height="6" rx="3" fill="${COLORS.green}"/>
    <text x="316" y="293" font-family="Arial" font-size="11" fill="${COLORS.green}" text-anchor="end">70%</text>

    <!-- Group Card 2 -->
    <rect x="0" y="316" width="332" height="140" rx="16" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="16" y="346" font-family="Arial" font-size="16" font-weight="bold" fill="${COLORS.white}">Book Club</text>
    <text x="16" y="366" font-family="Arial" font-size="12" fill="${COLORS.textMuted}">8 members  •  2 shared goals</text>

    <circle cx="28" cy="396" r="14" fill="${COLORS.pink}"/>
    <text x="28" y="401" font-family="Arial" font-size="12" fill="white" text-anchor="middle">EM</text>
    <circle cx="52" cy="396" r="14" fill="${COLORS.indigo}"/>
    <text x="52" y="401" font-family="Arial" font-size="12" fill="white" text-anchor="middle">TC</text>
    <circle cx="76" cy="396" r="14" fill="${COLORS.amber}"/>
    <text x="76" y="401" font-family="Arial" font-size="12" fill="white" text-anchor="middle">RD</text>
    <circle cx="100" cy="396" r="14" fill="${COLORS.darkCardBorder}"/>
    <text x="100" y="401" font-family="Arial" font-size="10" fill="${COLORS.textMuted}" text-anchor="middle">+5</text>

    <text x="16" y="434" font-family="Arial" font-size="12" fill="${COLORS.textMuted}">Team progress</text>
    <rect x="16" y="440" width="300" height="6" rx="3" fill="#2A2D45"/>
    <rect x="16" y="440" width="135" height="6" rx="3" fill="${COLORS.primary}"/>
    <text x="316" y="449" font-family="Arial" font-size="11" fill="${COLORS.primary}" text-anchor="end">45%</text>

    <!-- Activity Feed -->
    <text x="8" y="492" font-family="Arial" font-size="14" font-weight="bold" fill="${COLORS.white}">Recent Activity</text>

    <rect x="0" y="506" width="332" height="52" rx="12" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <circle cx="24" cy="532" r="12" fill="${COLORS.green}" opacity="0.3"/>
    <text x="24" y="536" font-family="Arial" font-size="10" fill="${COLORS.green}" text-anchor="middle">✓</text>
    <text x="44" y="528" font-family="Arial" font-size="12" fill="${COLORS.white}">Sarah completed "5K Run"</text>
    <text x="44" y="546" font-family="Arial" font-size="10" fill="${COLORS.textMuted}">Fitness Squad  •  2h ago</text>

    <rect x="0" y="566" width="332" height="52" rx="12" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <circle cx="24" cy="592" r="12" fill="${COLORS.primary}" opacity="0.3"/>
    <text x="24" y="596" font-family="Arial" font-size="10" fill="${COLORS.primary}" text-anchor="middle">+</text>
    <text x="44" y="588" font-family="Arial" font-size="12" fill="${COLORS.white}">Alex shared "Read Ch. 5"</text>
    <text x="44" y="606" font-family="Arial" font-size="10" fill="${COLORS.textMuted}">Book Club  •  5h ago</text>

    <rect x="0" y="626" width="332" height="52" rx="12" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <circle cx="24" cy="652" r="12" fill="${COLORS.amber}" opacity="0.3"/>
    <text x="24" y="656" font-family="Arial" font-size="10" fill="${COLORS.amber}" text-anchor="middle">🎯</text>
    <text x="44" y="648" font-family="Arial" font-size="12" fill="${COLORS.white}">New goal: "Run 50 miles"</text>
    <text x="44" y="666" font-family="Arial" font-size="10" fill="${COLORS.textMuted}">Fitness Squad  •  1d ago</text>
  `;

  return phoneScreenSvg(1080, 1920, 'Achieve Together', 'Create groups and collaborate on shared goals', body);
}

// ============================================
// Tablet Screenshots
// ============================================

function tabletScreenSvg(width, height, headerText, subtitleText, bodyContent) {
  return `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#0B0F1A;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#111528;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#0D1225;stop-opacity:1" />
      </linearGradient>
      <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${COLORS.primary};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${COLORS.primaryLight};stop-opacity:1" />
      </linearGradient>
      <linearGradient id="accentLine" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:${COLORS.primary};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${COLORS.cyan};stop-opacity:1" />
      </linearGradient>
      <radialGradient id="glow1" cx="30%" cy="20%" r="50%">
        <stop offset="0%" style="stop-color:${COLORS.primary};stop-opacity:0.15" />
        <stop offset="100%" style="stop-color:${COLORS.primary};stop-opacity:0" />
      </radialGradient>
      <radialGradient id="glow2" cx="70%" cy="80%" r="40%">
        <stop offset="0%" style="stop-color:${COLORS.cyan};stop-opacity:0.08" />
        <stop offset="100%" style="stop-color:${COLORS.cyan};stop-opacity:0" />
      </radialGradient>
      <filter id="cardShadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="#000" flood-opacity="0.3"/>
      </filter>
    </defs>

    <rect width="100%" height="100%" fill="url(#bg)"/>
    <rect width="100%" height="100%" fill="url(#glow1)"/>
    <rect width="100%" height="100%" fill="url(#glow2)"/>

    <!-- Header -->
    <text x="${width/2}" y="80" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="bold" fill="${COLORS.white}" text-anchor="middle">
      ${headerText}
    </text>
    <text x="${width/2}" y="118" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="${COLORS.textMuted}" text-anchor="middle">
      ${subtitleText}
    </text>
    <rect x="${width/2 - 50}" y="135" width="100" height="3" rx="1.5" fill="url(#accentLine)"/>

    <!-- Body content -->
    <g transform="translate(${(width - Math.min(width * 0.9, 1000)) / 2}, 170)">
      ${bodyContent}
    </g>

    <!-- Bottom branding -->
    <text x="${width/2}" y="${height - 30}" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="${COLORS.textMuted}" text-anchor="middle" opacity="0.5">
      JournalMate.ai — AI-Powered Lifestyle Planner
    </text>
  </svg>`;
}

// Tablet: Activities overview
function tabletScreenshot1_Overview(width, height) {
  const cw = Math.min(width * 0.9, 1000);
  const cardW = (cw - 24) / 3;

  const body = `
    <!-- Three-column activity cards -->
    ${[
      { emoji: '💪', title: 'Morning Fitness', tasks: '7/10', pct: 70, color: COLORS.green, cat: 'Wellness' },
      { emoji: '✈️', title: 'Japan Trip', tasks: '3/12', pct: 25, color: COLORS.cyan, cat: 'Travel' },
      { emoji: '📋', title: 'Product Launch', tasks: '5/8', pct: 63, color: COLORS.primary, cat: 'Work' },
    ].map((item, i) => `
      <rect x="${i * (cardW + 12)}" y="0" width="${cardW}" height="150" rx="16" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
      <rect x="${i * (cardW + 12)}" y="0" width="6" height="150" rx="3" fill="${item.color}"/>
      <circle cx="${i * (cardW + 12) + 36}" cy="40" r="20" fill="${item.color}" opacity="0.2"/>
      <text x="${i * (cardW + 12) + 36}" y="46" font-family="Arial" font-size="18" text-anchor="middle">${item.emoji}</text>
      <text x="${i * (cardW + 12) + 66}" y="36" font-family="Arial" font-size="15" font-weight="bold" fill="${COLORS.white}">${item.title}</text>
      <text x="${i * (cardW + 12) + 66}" y="56" font-family="Arial" font-size="12" fill="${COLORS.textMuted}">${item.tasks} tasks  •  ${item.cat}</text>
      <rect x="${i * (cardW + 12) + 16}" y="80" width="${cardW - 32}" height="6" rx="3" fill="#2A2D45"/>
      <rect x="${i * (cardW + 12) + 16}" y="80" width="${(cardW - 32) * item.pct / 100}" height="6" rx="3" fill="${item.color}"/>
      <text x="${i * (cardW + 12) + cardW - 16}" y="90" font-family="Arial" font-size="12" fill="${item.color}" text-anchor="end">${item.pct}%</text>
      <!-- Quick tasks preview -->
      <text x="${i * (cardW + 12) + 16}" y="115" font-family="Arial" font-size="11" fill="${COLORS.textMuted}">Next: ${['30-min HIIT', 'Book flight', 'Review roadmap'][i]}</text>
      <text x="${i * (cardW + 12) + 16}" y="135" font-family="Arial" font-size="11" fill="${COLORS.textMuted}">Due: ${['Today', 'Mar 15', 'This week'][i]}</text>
    `).join('')}

    <!-- Stats row -->
    ${[
      { label: 'Completion Rate', value: '87%', color: COLORS.primary },
      { label: 'Current Streak', value: '12 days', color: COLORS.green },
      { label: 'Tasks Today', value: '5 left', color: COLORS.amber },
      { label: 'Total Plans', value: '14', color: COLORS.cyan },
    ].map((s, i) => `
      <rect x="${i * (cw/4 + 1)}" y="175" width="${cw/4 - 8}" height="70" rx="14" fill="${s.color}" opacity="0.12" stroke="${s.color}" stroke-opacity="0.25" stroke-width="1"/>
      <text x="${i * (cw/4 + 1) + (cw/4 - 8)/2}" y="210" font-family="Arial" font-size="22" font-weight="bold" fill="${s.color}" text-anchor="middle">${s.value}</text>
      <text x="${i * (cw/4 + 1) + (cw/4 - 8)/2}" y="230" font-family="Arial" font-size="11" fill="${COLORS.textMuted}" text-anchor="middle">${s.label}</text>
    `).join('')}

    <!-- Weekly chart -->
    <rect x="0" y="270" width="${cw}" height="160" rx="16" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="20" y="300" font-family="Arial" font-size="16" font-weight="bold" fill="${COLORS.white}">Weekly Progress</text>

    <!-- Chart bars -->
    ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
      const barH = [38, 63, 80, 98, 110, 88, 68][i];
      const x = 40 + i * ((cw - 80) / 7);
      const barW = (cw - 120) / 9;
      return `
        <rect x="${x}" y="${410 - barH}" width="${barW}" height="${barH}" rx="4" fill="${COLORS.primary}" opacity="${0.5 + i * 0.07}"/>
        <text x="${x + barW/2}" y="${420}" font-family="Arial" font-size="10" fill="${COLORS.textMuted}" text-anchor="middle">${day}</text>
      `;
    }).join('')}

    <!-- Bottom row: Tasks + Discover preview -->
    <rect x="0" y="450" width="${cw * 0.55 - 6}" height="200" rx="16" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="16" y="478" font-family="Arial" font-size="14" font-weight="bold" fill="${COLORS.white}">Today's Tasks</text>
    ${['Wake up at 6 AM', '30-min HIIT workout', 'Healthy breakfast', 'Review roadmap'].map((task, i) => `
      <circle cx="28" cy="${502 + i * 34}" r="10" fill="${i === 0 ? COLORS.green : 'none'}" ${i > 0 ? `stroke="${COLORS.darkCardBorder}" stroke-width="1.5"` : ''}/>
      ${i === 0 ? `<text x="28" y="506" font-family="Arial" font-size="10" fill="${COLORS.green}" text-anchor="middle">✓</text>` : ''}
      <text x="46" y="${506 + i * 34}" font-family="Arial" font-size="12" fill="${i === 0 ? COLORS.textMuted : COLORS.white}" ${i === 0 ? 'text-decoration="line-through"' : ''}>${task}</text>
    `).join('')}

    <rect x="${cw * 0.55 + 6}" y="450" width="${cw * 0.45 - 6}" height="200" rx="16" fill="${COLORS.darkCard}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
    <text x="${cw * 0.55 + 22}" y="478" font-family="Arial" font-size="14" font-weight="bold" fill="${COLORS.white}">Trending Plans</text>
    ${['Ultimate Hiking', '30-Day Mindfulness', 'Interview Mastery'].map((plan, i) => `
      <rect x="${cw * 0.55 + 16}" y="${492 + i * 46}" width="${cw * 0.45 - 32}" height="38" rx="10" fill="${COLORS.dark}" stroke="${COLORS.darkCardBorder}" stroke-width="1"/>
      <text x="${cw * 0.55 + 36}" y="${516 + i * 46}" font-family="Arial" font-size="12" fill="${COLORS.white}">${plan}</text>
      <text x="${cw - 16}" y="${516 + i * 46}" font-family="Arial" font-size="11" fill="${COLORS.pink}" text-anchor="end">${['♥ 284', '♥ 203', '♥ 98'][i]}</text>
    `).join('')}
  `;

  return tabletScreenSvg(width, height, 'Your AI Lifestyle Planner', 'Plan, track, and achieve your goals with JournalMate.ai', body);
}

// ============================================
// Main generation function
// ============================================
async function main() {
  console.log('Generating Google Play Store assets...\n');
  console.log(`Output directory: ${OUTPUT_DIR}\n`);

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(path.join(OUTPUT_DIR, 'phone'), { recursive: true });
  fs.mkdirSync(path.join(OUTPUT_DIR, 'tablet-7inch'), { recursive: true });
  fs.mkdirSync(path.join(OUTPUT_DIR, 'tablet-10inch'), { recursive: true });

  // 1. App Icon
  await generateAppIcon();

  // 2. Feature Graphic
  await generateFeatureGraphic();

  // 3. Phone Screenshots (1080x1920 = 9:16)
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
    console.log(`✓ Phone Screenshot: ${ss.name} (1080x1920)`);
  }

  // 4. 7-inch Tablet Screenshots (1200x1920)
  const tablet7Svg = tabletScreenshot1_Overview(1200, 1920);
  await sharp(Buffer.from(tablet7Svg))
    .png()
    .toFile(path.join(OUTPUT_DIR, 'tablet-7inch', '01-overview-1200x1920.png'));
  console.log('✓ 7-inch Tablet Screenshot: overview (1200x1920)');

  // Generate additional tablet screenshots by reusing phone designs at tablet aspect ratio
  for (const ss of phoneScreenshots.slice(0, 3)) {
    const svg = ss.fn().replace(/width="1080"/g, 'width="1200"');
    await sharp(Buffer.from(svg))
      .resize(1200, 1920)
      .png()
      .toFile(path.join(OUTPUT_DIR, 'tablet-7inch', `${ss.name}-1200x1920.png`));
    console.log(`✓ 7-inch Tablet Screenshot: ${ss.name} (1200x1920)`);
  }

  // 5. 10-inch Tablet Screenshots (1200x1920, min 1080px each side)
  const tablet10Svg = tabletScreenshot1_Overview(1920, 1200);
  await sharp(Buffer.from(tablet10Svg))
    .png()
    .toFile(path.join(OUTPUT_DIR, 'tablet-10inch', '01-overview-1920x1200.png'));
  console.log('✓ 10-inch Tablet Screenshot: overview (1920x1200)');

  // Landscape versions for 10-inch
  for (const ss of phoneScreenshots.slice(0, 3)) {
    const svg = ss.fn()
      .replace(/width="1080"/, 'width="1920"')
      .replace(/height="1920"/, 'height="1200"');
    await sharp(Buffer.from(svg))
      .resize(1920, 1200)
      .png()
      .toFile(path.join(OUTPUT_DIR, 'tablet-10inch', `${ss.name}-1920x1200.png`));
    console.log(`✓ 10-inch Tablet Screenshot: ${ss.name} (1920x1200)`);
  }

  console.log('\n=== Generation Complete ===');
  console.log(`\nAll assets saved to: ${OUTPUT_DIR}`);
  console.log('\nAsset Summary:');
  console.log('  - App Icon: app-icon-512x512.png (512x512, PNG)');
  console.log('  - Feature Graphic: feature-graphic-1024x500.png (1024x500, PNG)');
  console.log('  - Phone Screenshots: phone/*.png (1080x1920, 9:16) x 6');
  console.log('  - 7-inch Tablet: tablet-7inch/*.png (1200x1920) x 4');
  console.log('  - 10-inch Tablet: tablet-10inch/*.png (1920x1200) x 4');
}

main().catch(console.error);
