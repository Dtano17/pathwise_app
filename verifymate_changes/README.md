# 🔍 VerifyMate - Verify Before You Trust

> AI-powered fact-checking, business verification, and AI detection for social media

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-verifymate.ai-blue?style=for-the-badge)](https://verifymate.ai)
[![App Store](https://img.shields.io/badge/📱_App_Store-Coming_Soon-black?style=for-the-badge)](https://verifymate.ai)
[![Google Play](https://img.shields.io/badge/📱_Google_Play-Coming_Soon-green?style=for-the-badge)](https://verifymate.ai)

---

## 🎯 What is VerifyMate?

VerifyMate is an AI-powered verification app that helps you check the credibility of any social media post, verify if businesses are legitimate, and detect AI-generated content. Simply share any post from Instagram, TikTok, YouTube, or any platform, and get an instant trust score with detailed analysis.

### ✨ Key Features

- **🔍 Fact-Check Claims**: Verify claims in posts with real-time web verification
- **🏪 Business Verification**: Check if promoted businesses are legitimate (BBB, reviews, domain age)
- **🤖 AI Detection**: Detect AI-generated text, images, and deepfake videos
- **👤 Account Analysis**: Determine if accounts are bots or authentic
- **📊 Trust Score**: Get a clear 0-100 credibility score with detailed breakdown
- **📤 Share Results**: Share verification results to warn others about scams

---

## 📱 Supported Platforms

| Platform | Posts | Stories | Reels | Ads |
|----------|-------|---------|-------|-----|
| Instagram | ✅ | ✅ | ✅ | ✅ |
| TikTok | ✅ | - | ✅ | ✅ |
| YouTube | ✅ | - | ✅ | ✅ |
| X (Twitter) | ✅ | - | - | ✅ |
| Facebook | ✅ | ✅ | ✅ | ✅ |
| Threads | ✅ | - | - | - |
| LinkedIn | ✅ | - | - | ✅ |
| News Articles | ✅ | - | - | - |
| Screenshots | ✅ | - | - | - |

---

## 🚀 How It Works

### For Consumers
1. **See a suspicious post** on any social media platform
2. **Tap Share** → Select VerifyMate
3. **Get instant analysis** with trust score and claim breakdown
4. **Share the warning** if it's a scam

### For Creators
1. **Draft your content** with claims or statistics
2. **Verify before posting** to ensure accuracy
3. **Get a credibility badge** for verified content
4. **Build trust** with your audience

---

## 💳 Pricing

| Plan | Price | Verifications | Features |
|------|-------|---------------|----------|
| **Free** | $0/month | 5/month | Basic analysis |
| **Pro** | $4.99/month | Unlimited | Detailed reports, history, creator badges |
| **Business** | $29.99/month | Unlimited | API access, white-label, priority support |

---

## 🛠️ Technical Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL + Drizzle ORM
- **AI**: Google Gemini with web grounding
- **Mobile**: Capacitor for iOS/Android
- **Auth**: Google Sign-In (OAuth 2.0)

---

## 🔧 Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Google Gemini API key
- Apify API key (for social media extraction)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/verifymate.git
cd verifymate

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Initialize the database
npm run db:push

# Start development server
npm run dev
```

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://...
GEMINI_API_KEY=your_gemini_api_key
SESSION_SECRET=your_session_secret

# Optional (for social media extraction)
APIFY_TOKEN=your_apify_token
HIVE_API_KEY=your_hive_api_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

---

## 📁 Project Structure

```
verifymate/
├── client/src/           # React frontend
│   ├── components/       # UI components
│   │   └── VerdictCard.tsx    # Main result display
│   ├── pages/            # App screens
│   │   ├── VerifyPage.tsx     # Main verification screen
│   │   └── HistoryPage.tsx    # Past verifications
│   └── lib/              # Utilities
├── server/               # Express backend
│   ├── services/         # Core services
│   │   ├── geminiVerificationService.ts  # Fact-checking
│   │   ├── businessVerificationService.ts # BBB, reviews
│   │   └── aiDetectionService.ts         # AI detection
│   └── routes.ts         # API endpoints
├── shared/               # Shared types
│   └── schema.ts         # Database schema
└── capacitor.config.ts   # Mobile config
```

---

## 🎨 Brand Guidelines

### Colors
- **Trust Blue**: `#0EA5E9` - Primary brand color
- **Verify Green**: `#10B981` - Success/verified states
- **Caution Amber**: `#F59E0B` - Warning states
- **Danger Red**: `#EF4444` - False/scam states
- **Background**: `#0F172A` - Dark slate

### Logo
Magnifying glass with checkmark inside - represents searching for truth and verification.

### Tagline
"Verify before you trust"

---

## 🔒 Privacy & Security

- **Minimal Data**: We only store verification results, not the content itself
- **No Tracking**: We don't track your browsing or social media activity
- **Secure Auth**: Google OAuth with session-based authentication
- **Encrypted**: All data encrypted in transit (HTTPS)

---

## 📜 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- **Google Gemini** for AI-powered fact-checking
- **Apify** for social media content extraction
- **Hive Moderation** for AI detection
- **JournalMate** for the foundational codebase

---

**Made with 💙 by the VerifyMate Team**

> *"In an age of misinformation, trust is the most valuable currency. VerifyMate helps you spend it wisely."*
