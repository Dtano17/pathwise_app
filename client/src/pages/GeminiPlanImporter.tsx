import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Sparkles, Zap } from "lucide-react";
import { ImportMethods } from "@/components/ImportMethods";

export default function GeminiPlanImporter() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-600" />
            <span className="font-bold text-xl">JournalMate.ai</span>
          </div>
          <Button onClick={() => setLocation('/')} variant="outline">Go to App</Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full mb-6 text-sm font-medium">
            <Zap className="w-4 h-4" />
            Google Gemini Integration
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Import Gemini AI Plans to JournalMate
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-8">
            Planning with Google Gemini? Import your multimodal plans (text, images, research) to JournalMate and track execution automatically. Perfect for complex projects with visual references.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="gap-2 text-lg px-8 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:opacity-90"
              onClick={() => setLocation('/login')}
            >
              Import Gemini Plans Now
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
            Free to start • Google Gemini compatible • Supports images & documents
          </p>
        </div>
      </section>

      {/* How to Import */}
      <section className="container mx-auto px-4 py-16 bg-white rounded-3xl my-12 shadow-xl">
        <ImportMethods
          aiName="Gemini"
          shareUrlExample="https://gemini.google.com/app/abc123def456"
          primaryColor="blue"
        />
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Why Pair Google Gemini with JournalMate?
        </h2>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="flex gap-4">
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Multimodal Plan Import</h3>
              <p className="text-gray-600">
                Gemini's strength is understanding images and documents. JournalMate preserves visual references from your Gemini plans.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Research Integration</h3>
              <p className="text-gray-600">
                Gemini excels at research and analysis. Import comprehensive research plans with sources and visual data.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Document-Based Planning</h3>
              <p className="text-gray-600">
                Upload PDFs, images, spreadsheets to Gemini → get a plan → import to JournalMate with attachments.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Visual Progress Tracking</h3>
              <p className="text-gray-600">
                Track progress on visual tasks (design projects, recipes with photos, fitness form checks).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="container mx-auto px-4 py-16 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-3xl my-12">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Perfect For Gemini Users Planning...
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {[
            { icon: "🎨", title: "Design Projects", desc: "Import mood boards, wireframes, and visual references" },
            { icon: "📊", title: "Data Analysis", desc: "Plans based on spreadsheets and charts" },
            { icon: "🍳", title: "Recipe Collections", desc: "Import recipes with ingredient photos" },
            { icon: "🏗️", title: "Construction Plans", desc: "Visual blueprints and step-by-step builds" },
          ].map((useCase, idx) => (
            <div key={idx} className="bg-white p-6 rounded-xl shadow-lg text-center">
              <div className="text-4xl mb-3">{useCase.icon}</div>
              <h3 className="font-semibold text-lg mb-2">{useCase.title}</h3>
              <p className="text-gray-600 text-sm">{useCase.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Gemini-Specific Value Prop */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-8 rounded-2xl border-2 border-blue-200">
          <h3 className="text-2xl font-bold mb-4 text-center">
            ⚡ Why Gemini Users Love JournalMate
          </h3>
          <div className="space-y-4 text-gray-700">
            <p>
              <strong>Google Gemini excels at multimodal understanding</strong> - analyzing images, documents, and complex data to create comprehensive plans.
            </p>
            <p>
              <strong>JournalMate excels at execution</strong> - turning those rich, visual plans into tracked tasks with photo references, reminders, and completion journaling.
            </p>
            <p className="text-center font-semibold text-blue-800 pt-4">
              Multimodal Planning + Execution Tracking = Completed Visual Projects ✨
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Schema */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": "How to Import Google Gemini Plans to JournalMate",
          "description": "Learn how to import and track multimodal plans created with Google Gemini using JournalMate.ai",
          "step": [
            {
              "@type": "HowToStep",
              "name": "Create a plan with Google Gemini",
              "text": "Use Gemini to plan your project with text, images, and documents for comprehensive visual planning"
            },
            {
              "@type": "HowToStep",
              "name": "Copy to JournalMate",
              "text": "Copy your Gemini conversation including visual references and paste into JournalMate's import feature"
            },
            {
              "@type": "HowToStep",
              "name": "Track progress automatically",
              "text": "JournalMate organizes tasks with visual context, sends reminders, and journals your execution journey"
            }
          ]
        })}
      </script>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white p-12 rounded-3xl shadow-2xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Start Tracking Your Gemini Plans Today
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Turn Gemini's multimodal intelligence into completed goals with JournalMate's visual tracking and automatic journaling.
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
                <li><a href="/claude-ai-integration" className="hover:text-blue-600">Claude AI</a></li>
                <li><a href="/perplexity-plans" className="hover:text-blue-600">Perplexity</a></li>
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
                Import from any AI engine and track your progress automatically.
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
