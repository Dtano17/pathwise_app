import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight, Sparkles, Instagram, Youtube, Link2, Heart, Bookmark, Camera } from "lucide-react";

export default function SocialMediaSaver() {
  const [, setLocation] = useLocation();

  const platforms = [
    { icon: <Instagram className="w-6 h-6" />, name: "Instagram", color: "from-pink-500 to-purple-500", desc: "Reels, posts, recipes, workouts" },
    { icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>, name: "TikTok", color: "from-black to-pink-600", desc: "Videos, trends, tutorials" },
    { icon: <Youtube className="w-6 h-6" />, name: "YouTube", color: "from-red-500 to-red-600", desc: "Videos, playlists, how-tos" },
    { icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm0 19c-.66 0-1.2-.54-1.2-1.2 0-.66.54-1.2 1.2-1.2.66 0 1.2.54 1.2 1.2 0 .66-.54 1.2-1.2 1.2zm0-4.8c-2.32 0-4.2-1.88-4.2-4.2S9.68 5.8 12 5.8s4.2 1.88 4.2 4.2-1.88 4.2-4.2 4.2z"/></svg>, name: "Pinterest", color: "from-red-600 to-red-700", desc: "Pins, boards, inspiration" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-pink-600" />
            <span className="font-bold text-xl">JournalMate.ai</span>
          </div>
          <Button onClick={() => setLocation('/')} variant="outline">Go to App</Button>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-pink-100 text-pink-700 rounded-full mb-6 text-sm font-medium">
            <Bookmark className="w-4 h-4" />
            Save & Track Social Content
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
            Save Instagram, TikTok & Pinterest Content to Track Later
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-8">
            See a workout on Instagram? A recipe on TikTok? A travel plan on Pinterest? Save the URL to JournalMate and automatically track your progress as you complete it.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="gap-2 text-lg px-8 bg-gradient-to-r from-pink-600 to-purple-600" onClick={() => setLocation('/login')}>
              Start Saving Content <ArrowRight className="w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-lg px-8" onClick={() => setLocation('/discover')}>
              Browse Saved Plans
            </Button>
          </div>

          <p className="text-sm text-gray-500 mt-4">
            Free to use • Works with Instagram, TikTok, YouTube, Pinterest • Auto-extracts tasks
          </p>
        </div>
      </section>

      {/* Platforms */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-center mb-8">Supported Platforms</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {platforms.map((platform, idx) => (
            <Card key={idx} className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className={`w-12 h-12 bg-gradient-to-r ${platform.color} rounded-full flex items-center justify-center text-white mb-3 mx-auto`}>
                  {platform.icon}
                </div>
                <CardTitle className="text-lg">{platform.name}</CardTitle>
                <CardDescription className="text-sm">{platform.desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16 bg-white rounded-3xl my-12 shadow-xl">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Link2 className="w-8 h-8 text-pink-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">1. Copy the URL</h3>
            <p className="text-gray-600">
              Found a recipe on TikTok or workout on Instagram? Copy the post URL.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">2. Paste in JournalMate</h3>
            <p className="text-gray-600">
              Our AI extracts the content, images, and steps automatically.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">3. Track & Journal</h3>
            <p className="text-gray-600">
              Get reminders, check off steps, and journal your progress with photos.
            </p>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">What Can You Save?</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            { emoji: "🍳", title: "Recipes & Cooking", platforms: "TikTok, Instagram, YouTube", desc: "Save recipes, track ingredients, journal your cooking" },
            { emoji: "💪", title: "Workout Routines", platforms: "Instagram, TikTok", desc: "30-day challenges, exercise videos, fitness plans" },
            { emoji: "✈️", title: "Travel Itineraries", platforms: "Pinterest, Instagram", desc: "Destination guides, bucket lists, travel inspiration" },
            { emoji: "🎨", title: "DIY & Crafts", platforms: "Pinterest, YouTube", desc: "Tutorials, project ideas, step-by-step guides" },
            { emoji: "💄", title: "Beauty Routines", platforms: "TikTok, Instagram", desc: "Skincare routines, makeup tutorials, product reviews" },
            { emoji: "🏡", title: "Home Decor", platforms: "Pinterest, Instagram", desc: "Room makeovers, organization hacks, design ideas" },
          ].map((useCase, idx) => (
            <Card key={idx} className="hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="text-4xl mb-2">{useCase.emoji}</div>
                <CardTitle className="text-lg">{useCase.title}</CardTitle>
                <CardDescription className="text-xs text-purple-600 font-medium mb-2">{useCase.platforms}</CardDescription>
                <CardDescription className="text-sm">{useCase.desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16 bg-gradient-to-r from-pink-50 to-purple-50 rounded-3xl">
        <h2 className="text-3xl font-bold text-center mb-12">Smart Features</h2>
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {[
            { title: "Auto Extract Steps", desc: "AI parses video captions and descriptions to extract actionable steps" },
            { title: "Save Images", desc: "Automatically saves thumbnails and key frames for reference" },
            { title: "Ingredient Lists", desc: "Detects and organizes recipes with shopping lists" },
            { title: "Progress Photos", desc: "Journal your attempts with before/after photo comparisons" },
            { title: "Reminders", desc: "Set reminders to try saved content (e.g., 'Try this recipe this weekend')" },
            { title: "Collections", desc: "Organize saves into collections (Recipes, Workouts, DIY, etc.)" },
          ].map((feat, idx) => (
            <div key={idx} className="flex gap-4 bg-white p-6 rounded-xl shadow-sm">
              <Heart className="w-6 h-6 text-pink-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-1">{feat.title}</h3>
                <p className="text-gray-600 text-sm">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Schema.org for SEO */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "JournalMate - Social Media Content Saver",
          "applicationCategory": "LifestyleApplication",
          "description": "Save and track Instagram, TikTok, YouTube, and Pinterest content. Extract recipes, workouts, DIY projects and track your progress automatically.",
          "featureList": [
            "Save Instagram posts and reels",
            "Import TikTok videos and extract steps",
            "Save YouTube videos and playlists",
            "Save Pinterest pins and boards",
            "Auto-extract recipes and ingredients",
            "Track workout challenges",
            "Journal progress with photos"
          ]
        })}
      </script>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 text-white p-12 rounded-3xl shadow-2xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Stop Losing Great Content in Saves
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Turn your social media saves into completed goals. Track recipes you cook, workouts you complete, and projects you finish.
          </p>
          <Button size="lg" className="bg-white text-pink-600 hover:bg-gray-100 gap-2 text-lg px-8" onClick={() => setLocation('/login')}>
            Start Saving & Tracking Free <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-4">AI Integrations</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="/chatgpt-plan-tracker" className="hover:text-pink-600">ChatGPT</a></li>
                <li><a href="/claude-ai-integration" className="hover:text-pink-600">Claude AI</a></li>
                <li><a href="/perplexity-plans" className="hover:text-pink-600">Perplexity</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Discovery</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="/weekend-plans" className="hover:text-pink-600">Weekend Plans</a></li>
                <li><a href="/discover" className="hover:text-pink-600">Community Plans</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="/faq" className="hover:text-pink-600">FAQ</a></li>
                <li><a href="/support" className="hover:text-pink-600">Help</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">JournalMate.ai</h4>
              <p className="text-sm text-gray-600">
                Save social media content and track your progress automatically.
              </p>
            </div>
          </div>
          <div className="text-center text-sm text-gray-500 pt-8 border-t">
            © 2024 JournalMate.ai. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
