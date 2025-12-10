import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Sparkles, MessageSquare } from "lucide-react";
import { ImportMethods } from "@/components/ImportMethods";
import { SEO, PAGE_SEO } from "@/components/SEO";
import { Breadcrumb } from "@/components/Breadcrumb";
import { RelatedLinks } from "@/components/RelatedLinks";

export default function ClaudeIntegration() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-indigo-50">
      <SEO {...PAGE_SEO.claudeIntegration} />
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-600" />
            <span className="font-bold text-xl">JournalMate.ai</span>
          </div>
          <Button onClick={() => setLocation('/')} variant="outline">
            Go to App
          </Button>
        </div>
      </header>

      {/* Breadcrumb Navigation */}
      <div className="container mx-auto px-4 py-4">
        <Breadcrumb items={[
          { label: "Import Plans", href: "/import-plan" },
          { label: "Claude AI Integration" }
        ]} />
      </div>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full mb-6 text-sm font-medium">
            <MessageSquare className="w-4 h-4" />
            Claude AI Integration
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Import Claude AI Plans to JournalMate
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-8">
            Planning with Claude? Turn your AI conversations into trackable plans. Import instantly and let JournalMate handle progress tracking and journaling.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="gap-2 text-lg px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              onClick={() => setLocation('/login')}
            >
              Import Claude Plans Now
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
            Free to start • No credit card required • Claude AI compatible
          </p>
        </div>
      </section>

      {/* How to Import */}
      <section className="container mx-auto px-4 py-16 bg-white rounded-3xl my-12 shadow-xl">
        <ImportMethods
          aiName="Claude"
          shareUrlExample="https://claude.ai/chat/abc123-def456"
          primaryColor="indigo"
        />
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Why Pair Claude AI with JournalMate?
        </h2>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="flex gap-4">
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Intelligent Plan Parsing</h3>
              <p className="text-gray-600">
                JournalMate's AI understands Claude's output format and extracts actionable tasks automatically.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Context-Aware Organization</h3>
              <p className="text-gray-600">
                Tasks are categorized based on context from your Claude conversation for smart organization.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Seamless Import</h3>
              <p className="text-gray-600">
                One-click import from Claude. No formatting required - just copy and paste.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">AI-Powered Journaling</h3>
              <p className="text-gray-600">
                JournalMate automatically documents your progress with photos, notes, and reflections.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="container mx-auto px-4 py-16 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl my-12">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Perfect For Claude Users Planning...
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {[
            { icon: "🎯", title: "Business Projects", desc: "Strategic planning and execution roadmaps" },
            { icon: "📖", title: "Research Goals", desc: "Literature review and study protocols" },
            { icon: "🌱", title: "Personal Development", desc: "Skill acquisition and habit formation" },
            { icon: "🎨", title: "Creative Projects", desc: "Content creation and artistic endeavors" },
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
          "name": "How to Import Claude AI Plans to JournalMate",
          "description": "Learn how to import and track plans created with Claude AI using JournalMate.ai",
          "step": [
            {
              "@type": "HowToStep",
              "name": "Create a plan with Claude AI",
              "text": "Have a conversation with Claude about your project, goal, or activity planning"
            },
            {
              "@type": "HowToStep",
              "name": "Copy to JournalMate",
              "text": "Copy your Claude conversation and paste it into JournalMate's import feature"
            },
            {
              "@type": "HowToStep",
              "name": "Track progress automatically",
              "text": "JournalMate organizes tasks, sends reminders, and journals your journey automatically"
            }
          ]
        })}
      </script>

      {/* Related Links */}
      <section className="container mx-auto px-4 py-8">
        <RelatedLinks currentPath="/claude-ai-integration" />
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-12 rounded-3xl shadow-2xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Start Tracking Your Claude AI Plans Today
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Turn thoughtful conversations with Claude into completed goals with JournalMate's automatic tracking.
          </p>
          <Button
            size="lg"
            className="bg-white text-blue-600 hover:bg-gray-100 gap-2 text-lg px-8"
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
                <li><a href="/discover" className="hover:text-blue-600">Discover Plans</a></li>
                <li><a href="/chatgpt-plan-tracker" className="hover:text-blue-600">ChatGPT</a></li>
                <li><a href="/gemini-plan-importer" className="hover:text-blue-600">Gemini</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="/faq" className="hover:text-blue-600">FAQ</a></li>
                <li><a href="/support" className="hover:text-blue-600">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="/privacy" className="hover:text-blue-600">Privacy</a></li>
                <li><a href="/terms" className="hover:text-blue-600">Terms</a></li>
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
