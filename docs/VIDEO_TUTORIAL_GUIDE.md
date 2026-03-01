# PathWise Video Tutorial Creation Guide

## Using Google's Gemini + AI Studio Stack for Recording, Editing & Publishing

---

## Overview

This guide walks you through creating a professional video tutorial for PathWise using screen recording and Google's Gemini/AI Studio tools for editing, narration, captions, and post-production.

---

## Phase 1: Planning Your Recording

### Recommended Tutorial Structure (8 Scenes)

Record these scenes in order. Each maps to a core app feature:

| Scene | Feature | Duration | What to Show |
|-------|---------|----------|--------------|
| 1 | **Landing & Signup** | 1-2 min | Landing page → Sign up → Profile setup (age, interests, goals) → Onboarding tutorial |
| 2 | **Goal Input / AI Planning** | 3-4 min | Quick Plan (5 questions), Smart Plan (7 questions), Direct Plan (paste text/screenshot) |
| 3 | **Plan Output & Actions** | 2-3 min | View generated plan, tasks, budget, alternatives. Save/activate, share, export |
| 4 | **Activities & Tasks** | 2-3 min | Activities tab → view plans, All Tasks tab → filter/search, mark tasks complete (show celebration) |
| 5 | **Discover & Community** | 1-2 min | Discover tab → browse community plans, copy a plan, customize it |
| 6 | **Groups & Collaboration** | 2-3 min | Create a group, share an activity, invite members, view group feed |
| 7 | **Reports & Progress** | 1-2 min | Reports tab → dashboard, streaks, achievements, badges, end-of-day review |
| 8 | **Integrations & Import** | 1-2 min | Import from ChatGPT/Gemini/Claude, social media links, calendar export |

**Total raw footage target: 15-20 minutes**
**Final edited tutorial target: 8-12 minutes**

### Key User Journeys to Capture

**Journey A: First-time user creates a plan**
```
Landing Page → Sign Up → Profile Setup → Goal Input Tab
→ Select "Quick Plan" → Answer 5 AI questions
→ View generated plan with tasks → Click "Activate"
→ See plan in Activities tab → Complete a task → Celebration!
```

**Journey B: Import from another AI tool**
```
Goal Input Tab → Select "Direct Plan" → Paste ChatGPT conversation
→ Instant plan generated → Review tasks → Save
→ Share to a group
```

**Journey C: Discover and remix a community plan**
```
Discover Tab → Browse travel plans → Click "Use This Plan"
→ Plan copied to Activities → Edit tasks to customize
→ Start completing tasks
```

---

## Phase 2: Recording Your Screen

### Setup Recommendations

**Screen Recording Tools:**
- **Desktop**: OBS Studio (free), Loom, or built-in OS recorder
- **Mobile (Capacitor app)**: iOS Screen Recording / Android Screen Record
- **Browser**: Chrome DevTools device emulation for mobile-responsive views

**Recording Settings:**
- Resolution: 1920x1080 (desktop) or 1080x1920 (mobile demo)
- Frame rate: 30fps minimum
- Format: MP4 (H.264)
- Record system audio OFF (you'll add narration later)

**Tips for Clean Footage:**
- Use a demo/test account with sample data pre-loaded
- Pre-create a group with 2-3 members for the Groups scene
- Have a sample ChatGPT export ready for the Import scene
- Clear browser notifications and bookmarks bar
- Use the app's theme selector to pick a visually appealing theme
- Slow down mouse movements - viewers need to follow your cursor

### Recording Checklist Per Scene

```
[ ] Clear browser history/tabs
[ ] Resize window to target resolution
[ ] Start recording
[ ] Pause 2 seconds before first action (gives editing room)
[ ] Perform actions slowly and deliberately
[ ] Pause 2 seconds after final action
[ ] Stop recording
[ ] Review footage immediately - re-record if needed
```

---

## Phase 3: Editing with Google's Gemini + AI Studio Stack

### Step 1: Generate a Script with Gemini

Use **Google AI Studio** (aistudio.google.com) or the **Gemini API** to generate your tutorial narration script from your recording notes.

**Prompt template for Gemini:**

```
You are a product tutorial scriptwriter. I'm creating a video tutorial for
PathWise, an AI-powered life planning app.

Write a narration script for the following scene:

Scene: [SCENE NAME]
What's happening on screen: [DESCRIBE THE ACTIONS]
Key features to highlight: [LIST FEATURES]
Target audience: New users who want to organize their goals with AI

Requirements:
- Conversational, friendly tone
- 30-60 seconds of narration per scene
- Include transitions like "Next, let's look at..."
- Call out UI elements by name ("Click the Goal Input tab")
- Emphasize the AI-powered aspects
```

**Example for Scene 2 (AI Planning):**

```
Scene: AI Planning - Quick Plan Mode
What's happening: User clicks Goal Input tab, selects Quick Plan,
types "Plan a trip to Tokyo next month", answers 5 questions about
budget ($3000), travel style (adventure), duration (7 days),
accommodation (mid-range hotel), transportation (public transit).
AI generates a full itinerary with daily tasks, budget breakdown,
and packing list.

Key features: 3 planning modes, AI asks personalized questions,
real-time web enrichment for current data, structured task output
```

### Step 2: Generate Voiceover with Google Cloud Text-to-Speech

Use **Google Cloud Text-to-Speech** (or Gemini's audio capabilities) to convert your script into natural-sounding narration.

**Using Google Cloud TTS API:**

```javascript
// Example: Generate voiceover using Google Cloud TTS
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');

const client = new textToSpeech.TextToSpeechClient();

async function generateVoiceover(scriptText, outputFile) {
  const request = {
    input: { text: scriptText },
    voice: {
      languageCode: 'en-US',
      // Studio voices sound most natural for tutorials
      name: 'en-US-Studio-O',  // or en-US-Studio-Q for male voice
      ssmlGender: 'FEMALE',
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 0.95,  // slightly slower for tutorials
      pitch: 0.0,
    },
  };

  const [response] = await client.synthesizeSpeech(request);
  fs.writeFileSync(outputFile, response.audioContent, 'binary');
  console.log(`Audio saved to ${outputFile}`);
}

// Generate per-scene voiceovers
const scenes = [
  { text: "Welcome to PathWise...", file: 'scene1_signup.mp3' },
  { text: "Now let's create your first AI plan...", file: 'scene2_planning.mp3' },
  // ... etc
];

for (const scene of scenes) {
  await generateVoiceover(scene.text, scene.file);
}
```

**Alternative - Use Gemini 2.0 with Audio Generation:**

```python
# Using Gemini 2.0 Flash for audio generation via AI Studio
import google.generativeai as genai

genai.configure(api_key="YOUR_API_KEY")

model = genai.GenerativeModel('gemini-2.0-flash')

# Generate audio narration directly
response = model.generate_content(
    "Read this tutorial script aloud in a friendly, clear tone: "
    "'Welcome to PathWise! In this tutorial, we'll show you how to "
    "create AI-powered plans for any area of your life...'"
)
```

### Step 3: Generate Captions/Subtitles with Gemini

**Using Gemini to create timed SRT subtitles from your script:**

```
Prompt for Gemini:

Convert the following tutorial narration script into SRT subtitle format.
Each subtitle should be 1-2 lines, max 42 characters per line.
Estimate timing based on natural speaking pace (~150 words/minute).
Start at 00:00:02 to account for intro.

Script:
[PASTE YOUR FULL NARRATION SCRIPT]
```

**Output example:**
```srt
1
00:00:02,000 --> 00:00:05,500
Welcome to PathWise, your AI-powered
life planning companion.

2
00:00:05,800 --> 00:00:09,200
In this tutorial, we'll walk through
every feature step by step.

3
00:00:09,500 --> 00:00:13,000
Let's start by creating your account
and setting up your profile.
```

### Step 4: Generate Chapter Markers & Timestamps

**Prompt for Gemini:**

```
Based on this tutorial structure, generate YouTube-style chapter
timestamps. Each scene has an approximate duration noted.

Scene 1: Landing & Signup (1-2 min)
Scene 2: AI Planning (3-4 min)
Scene 3: Plan Output (2-3 min)
Scene 4: Activities & Tasks (2-3 min)
Scene 5: Discover Community (1-2 min)
Scene 6: Groups & Collaboration (2-3 min)
Scene 7: Reports & Progress (1-2 min)
Scene 8: Integrations (1-2 min)

Format as YouTube description timestamps.
```

**Output:**
```
0:00 - Introduction
0:15 - Creating Your Account & Profile Setup
1:45 - Creating Your First AI Plan (Quick/Smart/Direct)
5:00 - Understanding Your Plan Output
7:30 - Managing Activities & Completing Tasks
10:00 - Discovering Community Plans
11:30 - Groups & Collaboration
14:00 - Progress Reports & Achievements
15:30 - Importing from ChatGPT, Gemini & More
```

### Step 5: Generate Thumbnail & Graphics with Gemini + Imagen

**Using Google's Imagen (via Vertex AI) for tutorial graphics:**

```python
# Generate tutorial thumbnail
from google.cloud import aiplatform

# Prompt for thumbnail
prompt = """
Create a modern, clean tutorial thumbnail for a mobile app called
'PathWise'. Show a phone screen with a colorful task list,
AI sparkle effects, and the text 'Complete Tutorial' in bold.
Style: flat design, gradient background (blue to purple),
professional but approachable.
"""

# Use Imagen 3 via Vertex AI
model = aiplatform.ImageGenerationModel.from_pretrained("imagen-3.0-generate-002")
response = model.generate_images(prompt=prompt, number_of_images=4)
```

**For in-video callout graphics, prompt Gemini:**

```
Create SVG callout annotations for a tutorial video. I need:
1. A "Click Here" arrow pointing right
2. A "Pro Tip" badge with a lightbulb icon
3. A numbered step indicator (circle with number inside)
4. A "New Feature" sparkle badge

Style: Modern, rounded corners, primary color #6366f1 (indigo)
```

---

## Phase 4: Video Assembly & Post-Production

### Option A: FFmpeg Command-Line Assembly (Free)

Combine screen recording + voiceover + captions:

```bash
# 1. Overlay voiceover audio onto screen recording
ffmpeg -i screen_recording.mp4 -i narration.mp3 \
  -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 \
  -shortest combined.mp4

# 2. Burn subtitles into video
ffmpeg -i combined.mp4 \
  -vf "subtitles=captions.srt:force_style='FontSize=24,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2'" \
  -c:a copy final_with_subs.mp4

# 3. Add intro/outro cards (using concat)
ffmpeg -f concat -i file_list.txt -c copy final_tutorial.mp4

# 4. Generate chapters for MP4 metadata
ffmpeg -i final_tutorial.mp4 -c copy \
  -metadata:s:v:0 title="PathWise Tutorial" \
  -f mp4 tutorial_with_chapters.mp4
```

### Option B: Use Google Vids (Google Workspace)

If you have access to **Google Vids** (part of Google Workspace):

1. Upload screen recordings as media assets
2. Use Gemini integration to auto-generate script
3. Add AI-generated voiceover directly in editor
4. Apply templates for intro/outro slides
5. Auto-caption with Google's speech recognition
6. Export as MP4

### Option C: Programmatic Assembly with Node.js

Since this is a Node.js project, you could create a build script:

```javascript
// scripts/build-tutorial.js
const { execSync } = require('child_process');
const fs = require('fs');

const scenes = [
  { video: 'recordings/01_signup.mp4', audio: 'narration/01_signup.mp3' },
  { video: 'recordings/02_planning.mp4', audio: 'narration/02_planning.mp3' },
  { video: 'recordings/03_output.mp4', audio: 'narration/03_output.mp3' },
  { video: 'recordings/04_tasks.mp4', audio: 'narration/04_tasks.mp3' },
  { video: 'recordings/05_discover.mp4', audio: 'narration/05_discover.mp3' },
  { video: 'recordings/06_groups.mp4', audio: 'narration/06_groups.mp3' },
  { video: 'recordings/07_reports.mp4', audio: 'narration/07_reports.mp3' },
  { video: 'recordings/08_integrations.mp4', audio: 'narration/08_integrations.mp3' },
];

// Step 1: Combine each scene with its audio
scenes.forEach((scene, i) => {
  const output = `temp/scene_${i + 1}_combined.mp4`;
  execSync(
    `ffmpeg -y -i ${scene.video} -i ${scene.audio} ` +
    `-c:v libx264 -c:a aac -map 0:v:0 -map 1:a:0 -shortest ${output}`
  );
  console.log(`Combined scene ${i + 1}`);
});

// Step 2: Create concat file
const concatList = scenes.map((_, i) =>
  `file 'scene_${i + 1}_combined.mp4'`
).join('\n');
fs.writeFileSync('temp/concat.txt', concatList);

// Step 3: Concatenate all scenes
execSync(
  `ffmpeg -y -f concat -safe 0 -i temp/concat.txt ` +
  `-c:v libx264 -c:a aac tutorial_raw.mp4`
);

// Step 4: Add subtitles
execSync(
  `ffmpeg -y -i tutorial_raw.mp4 ` +
  `-vf "subtitles=captions.srt:force_style='FontSize=22,PrimaryColour=&HFFFFFF'" ` +
  `-c:a copy pathwise_tutorial_final.mp4`
);

console.log('Tutorial built: pathwise_tutorial_final.mp4');
```

---

## Phase 5: AI-Enhanced Post-Processing with Gemini

### Auto-Generate Tutorial Description

```
Prompt for Gemini:

Write a YouTube video description for a PathWise app tutorial video.
Include:
- Brief summary (2-3 sentences)
- Chapter timestamps (provided above)
- Feature highlights as bullet points
- Call-to-action to try the app
- Relevant hashtags

App URL: [YOUR_APP_URL]
Features covered: AI planning, task management, community plans,
group collaboration, progress tracking, AI chat imports
```

### Auto-Generate Social Media Posts

```
Prompt for Gemini:

Create social media posts promoting this PathWise tutorial video for:
1. Twitter/X (280 chars max)
2. Instagram caption (with hashtags)
3. LinkedIn post (professional tone)
4. TikTok caption (casual, with hooks)

Video URL: [URL]
Key hook: "Plan any goal with AI in under 2 minutes"
```

### Analyze Tutorial Quality

**Upload your finished video to Gemini (multimodal) for review:**

```
Prompt for Gemini (with video upload):

Review this tutorial video and provide feedback on:
1. Pacing - are any sections too fast or too slow?
2. Clarity - are all features clearly demonstrated?
3. Missing content - what important features were skipped?
4. Engagement - suggestions to make it more engaging
5. Accessibility - are captions readable? Is contrast good?

The app being demonstrated is PathWise, an AI-powered life
planning platform with these features:
- AI plan generation (Quick/Smart/Direct modes)
- Task management with celebrations
- Community plan discovery
- Group collaboration
- Progress reports and achievements
- Import from ChatGPT, Gemini, Claude
```

---

## Phase 6: Publishing & Distribution

### Recommended Platforms

| Platform | Format | Dimensions | Max Length |
|----------|--------|------------|-----------|
| YouTube | MP4 | 1920x1080 | Full tutorial (10-15 min) |
| TikTok | MP4 | 1080x1920 | 60-sec feature clips |
| Instagram Reels | MP4 | 1080x1920 | 90-sec feature clips |
| Twitter/X | MP4 | 1280x720 | 2:20 min clips |
| LinkedIn | MP4 | 1920x1080 | 3-5 min highlights |

### Creating Short-Form Clips from Full Tutorial

**Prompt for Gemini:**

```
I have a 12-minute PathWise tutorial video. Suggest 5 short-form
clips (30-60 seconds each) that would work well on TikTok/Reels.

For each clip, provide:
- Timestamp range from the full video
- Hook line (first 3 seconds text overlay)
- Caption text
- Target audience

The tutorial covers: signup, AI planning, task management,
community discovery, groups, reports, and integrations.
```

**FFmpeg to extract clips:**

```bash
# Extract a 45-second clip starting at 1:45 (AI Planning demo)
ffmpeg -i pathwise_tutorial_final.mp4 \
  -ss 00:01:45 -t 00:00:45 \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:-1:-1" \
  -c:a aac clip_ai_planning.mp4
```

---

## Quick Reference: Google AI Studio Workflow

```
1. SCRIPT     → Gemini (aistudio.google.com) → Generate narration text
2. VOICEOVER  → Google Cloud TTS or Gemini Audio → Convert script to speech
3. CAPTIONS   → Gemini → Convert script to SRT subtitle format
4. GRAPHICS   → Imagen 3 (Vertex AI) → Generate thumbnail & callouts
5. REVIEW     → Gemini Vision → Upload video for quality feedback
6. MARKETING  → Gemini → Generate descriptions, social posts, SEO tags
7. CLIPS      → Gemini → Identify best short-form clip segments
```

---

## File Organization

```
docs/
└── VIDEO_TUTORIAL_GUIDE.md     ← This file

tutorial/                        ← Create this directory for your assets
├── recordings/                  ← Raw screen recordings per scene
│   ├── 01_signup.mp4
│   ├── 02_planning.mp4
│   ├── ...
│   └── 08_integrations.mp4
├── narration/                   ← AI-generated voiceover files
│   ├── 01_signup.mp3
│   └── ...
├── scripts/                     ← Narration scripts from Gemini
│   ├── full_script.md
│   └── per_scene/
├── captions/                    ← SRT subtitle files
│   └── captions.srt
├── graphics/                    ← Thumbnails, callout images
│   ├── thumbnail.png
│   └── callouts/
├── output/                      ← Final exported videos
│   ├── pathwise_tutorial_full.mp4
│   └── clips/
└── build-tutorial.js            ← Assembly script (optional)
```
