# Design Guidelines: AI-Powered Journaling App

## Design Approach
**Reference-Based Approach**: Drawing inspiration from Notion's clean interface and Apple Health's progress visualization while creating an exciting, celebration-focused mobile experience.

## Core Design Principles
- Mobile-first design with smooth swipe interactions
- Celebration-driven UX with immediate positive feedback
- Clean, card-based layout emphasizing progress and achievement
- Intuitive voice/text input with clear AI-generated actionable outputs

## Color Palette

### Primary Colors
- **Primary Purple**: 258 62% 59% (#6C5CE7)
- **Secondary Emerald**: 165 100% 36% (#00B894) 
- **Background Light**: 220 14% 98% (#F8F9FA)
- **Text Dark**: 210 11% 21% (#2D3436)

### Accent Colors
- **Success Green**: 165 100% 36% (#00B894)
- **Warning Yellow**: 35 89% 70% (#FDCB6E)
- **Celebration Gradient**: Use vibrant gradients from purple to emerald for success states

### Dark Mode Colors
- **Background Dark**: 220 15% 8%
- **Card Dark**: 220 10% 12%
- **Text Light**: 220 8% 92%

## Typography
- **Primary**: Inter (Google Fonts)
- **Display**: SF Pro Display fallback for iOS devices
- **Weights**: Regular (400), Medium (500), Semibold (600), Bold (700)

## Layout System
**Consistent Spacing**: Tailwind units of 4, 6, 8, and 12 (p-4, m-6, h-8, gap-12)
- Mobile-first responsive grid
- 20px base spacing between major components
- Card-based layout with consistent padding

## Component Library

### Core Elements
- **Swipeable Task Cards**: Smooth left/right swipe with visual feedback
- **Voice Input Button**: Prominent microphone icon with pulse animation during recording
- **Progress Rings**: Circular progress indicators inspired by Apple Health
- **Achievement Badges**: Streak counters and milestone celebrations

### Navigation
- **Bottom Tab Bar**: Primary navigation for mobile
- **Floating Action Button**: Quick voice/text input access
- **Gesture Navigation**: Swipe-based interactions throughout

### Forms & Input
- **Voice/Text Toggle**: Seamless switching between input methods
- **AI Response Cards**: Clean display of generated action plans
- **Completion Checkboxes**: Large, satisfying tap targets

### Celebrations & Feedback
- **Swipe Right Animation**: Confetti particles and success colors
- **Completion Memes**: Embedded celebration GIFs/images on task completion
- **Progress Streaks**: Visual streak counters with flame/lightning imagery
- **Haptic Feedback**: Simulated through visual cues and micro-animations

### Data Visualization
- **Progress Charts**: Clean line graphs showing completion trends
- **Calendar Integration**: Visual task scheduling with color coding
- **Lifestyle Suggestions**: Card-based recommendations with imagery

## Animations
**Celebration-Focused**: 
- Task completion confetti/particle effects
- Smooth swipe transitions with spring physics
- Progress ring fill animations
- Gentle micro-interactions for input states

## Images
**Celebration Content**:
- Embedded GIFs or meme images for task completion celebrations
- Lifestyle activity suggestion images (hiking, journaling, wellness)
- Progress milestone badges and achievement icons
- No large hero image needed - focus on card-based content layout

## Mobile Experience Priority
- Large touch targets (minimum 44px)
- Swipe gesture optimization
- One-handed usage patterns
- Offline-capable journaling functionality
- Fast loading with skeleton states during AI processing