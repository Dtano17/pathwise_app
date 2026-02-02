import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Sparkles, MessageSquare } from "lucide-react";
import { ImportMethods } from "@/components/ImportMethods";
import { SEO, PAGE_SEO } from "@/components/SEO";

export default function ChatGPTPlanTracker() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-blue-50">
      <SEO {...PAGE_SEO.chatgptTracker} />
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            <span className="font-bold text-xl">JournalMate.ai</span>
          </div>
          <Button onClick={() => setLocation('/')} variant="outline">
            Go to App
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full mb-6 text-sm font-medium">
            <MessageSquare className="w-4 h-4" />
            ChatGPT Integration
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Track Your ChatGPT Plans Automatically
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-8">
            Planning with ChatGPT? Import and track your progress on JournalMate.ai. Turn conversations into actionable plans with AI-powered journaling.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="gap-2 text-lg px-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              onClick={() => setLocation('/login')}
            >
              Import ChatGPT Plans Now
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 text-lg px-8"
              onClick={() => setLocation('/discover')}
            >
              Browse Community Plans
            </Button>
          </div>

          <p className="text-sm text-gray-500 mt-4">
            Free to start • No credit card required • Import plans in seconds
          </p>
        </div>
      </section>

      {/* How to Import */}
      <section className="container mx-auto px-4 py-16 bg-white rounded-3xl my-12 shadow-xl">
        <ImportMethods
          aiName="ChatGPT"
          shareUrlExample="https://chat.openai.com/share/abc123-def456-789"
          primaryColor="purple"
        />
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Why Use JournalMate with ChatGPT?
        </h2>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="flex gap-4">
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">AI-Powered Task Parsing</h3>
              <p className="text-gray-600">
                Our AI automatically extracts action items from your ChatGPT conversation and organizes them into trackable tasks.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Smart Categorization</h3>
              <p className="text-gray-600">
                Tasks are automatically categorized by type (travel, work, health) for easy organization and filtering.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Automatic Reminders</h3>
              <p className="text-gray-600">
                Never miss a task. Get timely reminders for your ChatGPT-planned activities.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Progress Journaling</h3>
              <p className="text-gray-600">
                JournalMate automatically journals your progress with photos, notes, and completion tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="container mx-auto px-4 py-16 bg-gradient-to-r from-purple-50 to-blue-50 rounded-3xl my-12">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Perfect For ChatGPT Users Planning...
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {[
            { icon: "✈️", title: "Travel Itineraries", desc: "Multi-day trips with activities and bookings" },
            { icon: "💪", title: "Fitness Goals", desc: "Workout plans and nutrition tracking" },
            { icon: "📚", title: "Learning Projects", desc: "Course curriculum and study schedules" },
            { icon: "🏠", title: "Home Renovations", desc: "Project timelines and task lists" },
          ].map((useCase, idx) => (
            <div key={idx} className="bg-white p-6 rounded-xl shadow-lg text-center">
              <div className="text-4xl mb-3">{useCase.icon}</div>
              <h3 className="font-semibold text-lg mb-2">{useCase.title}</h3>
              <p className="text-gray-600 text-sm">{useCase.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Schema */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": "How to Track ChatGPT Plans with JournalMate",
          "description": "Learn how to import and track plans created in ChatGPT using JournalMate.ai",
          "step": [
            {
              "@type": "HowToStep",
              "name": "Create a plan in ChatGPT",
              "text": "Ask ChatGPT to help you plan an activity (e.g., 'Plan a weekend trip to Miami' or 'Create a 12-week fitness plan')"
            },
            {
              "@type": "HowToStep",
              "name": "Import to JournalMate",
              "text": "Copy the ChatGPT conversation or use our browser extension to import it with one click to JournalMate.ai"
            },
            {
              "@type": "HowToStep",
              "name": "Track your progress",
              "text": "JournalMate automatically tracks your progress, sends reminders, and journals your journey with photos and notes"
            }
          ]
        })}
      </script>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto bg-gradient-to-r from-purple-600 to-blue-600 text-white p-12 rounded-3xl shadow-2xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Start Tracking Your ChatGPT Plans Today
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Join thousands of users who trust JournalMate to turn their ChatGPT conversations into completed goals.
          </p>
          <Button
            size="lg"
            className="bg-white text-purple-600 hover:bg-gray-100 gap-2 text-lg px-8"
            onClick={() => setLocation('/login')}
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="/discover" className="hover:text-purple-600">Discover Plans</a></li>
                <li><a href="/claude-ai-integration" className="hover:text-purple-600">Claude AI</a></li>
                <li><a href="/gemini-plan-importer" className="hover:text-purple-600">Gemini</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="/faq" className="hover:text-purple-600">FAQ</a></li>
                <li><a href="/support" className="hover:text-purple-600">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="/privacy" className="hover:text-purple-600">Privacy</a></li>
                <li><a href="/terms" className="hover:text-purple-600">Terms</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">JournalMate.ai</h4>
              <p className="text-sm text-gray-600">
                AI-powered planning and progress tracking for your goals.
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
