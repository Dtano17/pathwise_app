# 🌟 JournalMate - AI-Powered Lifestyle Planner & Journaling Platform

> Transform your intentions into actionable plans with AI-powered insights, collaborative planning, and celebratory task completion

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Visit_App-blue?style=for-the-badge)](https://your-app-url.replit.app)
[![Made with Replit](https://img.shields.io/badge/Made%20with-Replit-orange?style=for-the-badge&logo=replit)](https://replit.com)

---

## 🎯 **What is JournalMate?**

JournalMate is a revolutionary **AI-powered lifestyle planner and journaling application** that transforms your personal goals into concrete, achievable action plans. Whether you want to "work out more," "plan a trip to Dallas," or "start a family fitness challenge," simply speak or type your goal, and our AI creates a personalized, step-by-step roadmap tailored to your lifestyle and preferences.

### ✨ **The Magic Behind JournalMate**

- **🎙️ Natural Input**: Speak or write your goals naturally - "I want to work out, take vitamins, prep for my Dallas trip"
- **🤖 AI Processing**: Powered by OpenAI and Claude AI models for intelligent goal breakdown and analysis
- **📱 Mobile-First**: Swipeable task cards designed for on-the-go productivity
- **🎉 Celebration-Focused**: Instant gratification with confetti animations and progress celebrations
- **👥 Social Collaboration**: Share plans with friends, family, and accountability partners
- **📊 Smart Analytics**: Track streaks, completion rates, and personal growth over time

---

## 🚀 **Core Features**

### 🎙️ **Voice & AI Planning (Three Modes)**

#### **Quick Plan** - Fast planning with minimal questions
- 5 AI-generated questions ordered by priority
- Claude-powered gap analysis
- Real-time web enrichment (weather, events, etc.)
- Complete plan in 2-3 minutes
- Cost-optimized with Claude Haiku (~$0.025 per plan)

#### **Smart Plan** - Detailed, personalized planning
- 7 questions tailored to your profile
- Profile-aware recommendations (location, timezone, preferences)
- Enhanced enrichment with multiple data sources
- Motivational notes and detailed timeframes
- ~$0.037 per plan

#### **Create Action Plan** - Instant plan from any input
- **Zero questions** - just type/paste/upload and go!
- Accepts ANY format: text, numbered lists, screenshots, AI content
- Claude guardrail validates plan-related inputs
- Session-based editing for iterative refinement
- Fastest mode: 10-30 seconds
- Most cost-effective: ~$0.004-0.011 per plan

**All modes include:**
- **Natural Language Processing**: Speak your goals conversationally
- **Intelligent Title Extraction**: Clear, specific activity titles
- **Copy & Paste Support**: Import from ChatGPT, Claude, screenshots
- **Smart Task Generation**: Actionable tasks with priorities and time estimates
- **Cross-Pane Sync**: Activities and tasks appear in all tabs automatically

### 📱 **Swipeable Task Management**
- **Intuitive Gestures**: Swipe right to complete, left to skip tasks
- **Real-Time Celebrations**: Instant confetti effects and motivational feedback
- **Customizable Reminders**: Hourly, daily, or weekly nudges based on your pace
- **Progress Logging**: Automatic checkpoint creation for completed and missed tasks

### 👥 **Collaborative Planning**
- **Shared Goal Creation**: Invite members to contribute to group objectives
- **Real-Time Activity Feed**: See live updates when team members complete tasks
- **Contact Integration**: Secure phone contact syncing with privacy protection
- **Group Journaling**: Share daily reflections and mood tracking with your circle

### 📊 **Advanced Analytics**
- **Streak Tracking**: Monitor consistency and build lasting habits
- **Completion Insights**: Understand your productivity patterns
- **Mood Analytics**: Correlate emotional states with goal achievement
- **Progress Visualization**: Beautiful charts and progress indicators

---

## 🛠️ **Technical Architecture**

### **Frontend Stack**
- **Framework**: React 18 with TypeScript for type-safe development
- **Styling**: Tailwind CSS with custom design system
- **Animations**: Framer Motion, React Spring, React Confetti
- **UI Components**: Shadcn/ui component library
- **State Management**: TanStack Query for server state, React hooks for local state
- **Routing**: Wouter for lightweight client-side routing

### **Backend Stack**
- **Runtime**: Node.js with Express.js server
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Multi-provider auth (Gmail, Facebook, Replit)
- **AI Integration**: OpenAI GPT models and Anthropic Claude
- **Real-time**: WebSocket support for live collaboration

### **Key Integrations**
- **OpenAI API**: Goal processing and intelligent task generation
- **Anthropic Claude**: Advanced chat analysis and planning assistance
- **Contact Sync**: Secure phone contact integration with privacy controls
- **Location Services**: Date planning with location-based suggestions

---

## 🎨 **Design Philosophy**

### **Mobile-First Approach**
- **Responsive Design**: Seamless experience across all device sizes
- **Touch-Optimized**: Gesture-based interactions for natural mobile usage
- **Progressive Enhancement**: Works offline with cached data

### **Celebration-Centered UX**
- **Immediate Feedback**: Instant visual rewards for task completion
- **Motivational Design**: Encouraging copy and positive reinforcement
- **Gamification Elements**: Streaks, achievements, and progress milestones

### **Accessibility & Inclusion**
- **Dark/Light Modes**: Automatic theme switching with user preferences
- **Keyboard Navigation**: Full accessibility for all interactive elements
- **Screen Reader Support**: Semantic HTML and ARIA labels
- **Voice Input Fallbacks**: Web Speech API with graceful degradation

---

## 🔧 **Development Setup**

### **Prerequisites**
- Node.js 18+ installed
- PostgreSQL database (or use Replit's built-in database)
- OpenAI API key
- Anthropic API key (optional)

### **Quick Start**

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/journalmate.git
   cd journalmate
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy example environment file
   cp .env.example .env
   
   # Add your API keys
   OPENAI_API_KEY=your_openai_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   DATABASE_URL=your_database_url
   SESSION_SECRET=your_session_secret
   ```

4. **Initialize the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5000`

### **Project Structure**
```
journalmate/
├── client/src/           # React frontend application
│   ├── components/       # Reusable UI components
│   ├── pages/           # Application pages/routes
│   ├── lib/             # Utility functions and configs
│   └── hooks/           # Custom React hooks
├── server/              # Express.js backend
│   ├── routes.ts        # API endpoint definitions
│   ├── storage.ts       # Database interface layer
│   └── utils/           # Backend utility functions
├── shared/              # Shared TypeScript types
│   └── schema.ts        # Database schema and types
└── package.json         # Dependencies and scripts
```

---

## 🌟 **Use Cases & Examples**

### **Personal Productivity**
- **Fitness Goals**: "I want to work out 3x per week and track my nutrition"
- **Learning Objectives**: "Learn Spanish for my trip to Mexico in 6 months"
- **Habit Building**: "Establish a morning routine with meditation and reading"

### **Collaborative Planning**
- **Couple Goals**: "Plan our anniversary trip to Paris"
- **Family Projects**: "Organize a family reunion for 30+ people"
- **Team Challenges**: "Complete a group fitness challenge at work"

### **Event Planning**
- **Travel Itineraries**: "Plan a 10-day backpacking trip through Europe"
- **Special Occasions**: "Organize a surprise birthday party"
- **Life Milestones**: "Prepare for buying our first home"

---

## 🔒 **Privacy & Security**

- **End-to-End Encryption**: Sensitive data encrypted in transit and at rest
- **Privacy-First Design**: Minimal data collection with user consent
- **Secure Authentication**: Multi-provider OAuth with session management
- **Contact Protection**: Phone contacts processed locally with opt-in sharing
- **GDPR Compliant**: Full data export and deletion capabilities

---

## 🤝 **Contributing**

We welcome contributions from the community! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

### **Development Guidelines**
- Follow TypeScript best practices
- Use Conventional Commits for commit messages
- Write tests for new features
- Ensure accessibility compliance
- Maintain responsive design principles

---

## 📜 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 **Support & Community**

- **Issues**: [GitHub Issues](https://github.com/yourusername/journalmate/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/journalmate/discussions)
- **Email**: support@journalmate.com

---

## 🙏 **Acknowledgments**

- **OpenAI** for providing the GPT models that power our AI planning
- **Anthropic** for Claude AI integration and advanced reasoning
- **Replit** for the amazing development platform and hosting
- **Shadcn/ui** for the beautiful component library
- **The open-source community** for the incredible tools and libraries

---

**Made with ❤️ using Replit** | **Powered by AI** | **Built for Goal Achievers**

---

> *"The best way to predict the future is to create it. JournalMate helps you create yours, one goal at a time."*