import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Sparkles, Search, ListChecks, Bell } from "lucide-react";

export default function PerplexityPlans() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-teal-50">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-emerald-600" />
            <span className="font-bold text-xl">JournalMate.ai</span>
          </div>
          <Button onClick={() => setLocation('/')} variant="outline">Go to App</Button>
        </div>
      </header>

      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full mb-6 text-sm font-medium">
            <Search className="w-4 h-4" />
            Perplexity Integration
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Track Your Perplexity Research Plans
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-8">
            Research with Perplexity AI? Import your findings and action items to JournalMate. Turn research into execution with automatic progress tracking.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="gap-2 text-lg px-8 bg-gradient-to-r from-emerald-600 to-teal-600" onClick={() => setLocation('/login')}>
              Import Perplexity Plans Now <ArrowRight className="w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-lg px-8" onClick={() => setLocation('/discover')}>
              Browse Community Plans
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 bg-white rounded-3xl my-12 shadow-xl">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">1. Research with Perplexity</h3>
            <p className="text-gray-600">Use Perplexity AI to research with curated sources.</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ListChecks className="w-8 h-8 text-teal-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">2. Import to JournalMate</h3>
            <p className="text-gray-600">Copy your research. JournalMate extracts tasks automatically.</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">3. Execute & Track</h3>
            <p className="text-gray-600">Get tasks, reminders, and automatic journaling.</p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Why Pair Perplexity with JournalMate?</h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {[
            { title: "Research to Action", desc: "Perplexity gives answers. JournalMate turns them into actionable steps." },
            { title: "Source-Backed Planning", desc: "Import cited sources alongside tasks for reference." },
            { title: "Smart Task Extraction", desc: "AI parses comprehensive answers and identifies action items." },
            { title: "Progress Documentation", desc: "Document your journey with photos and notes." }
          ].map((feat, idx) => (
            <div key={idx} className="flex gap-4">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-2">{feat.title}</h3>
                <p className="text-gray-600">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": "How to Import Perplexity AI Plans to JournalMate",
          "step": [
            { "@type": "HowToStep", "name": "Research with Perplexity AI", "text": "Use Perplexity to research your topic" },
            { "@type": "HowToStep", "name": "Copy to JournalMate", "text": "Copy your Perplexity summary and paste into JournalMate" },
            { "@type": "HowToStep", "name": "Track progress", "text": "JournalMate extracts tasks and journals your journey" }
          ]
        })}
      </script>

      <footer className="border-t bg-gray-50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          © 2024 JournalMate.ai • <a href="/privacy">Privacy</a> • <a href="/terms">Terms</a>
        </div>
      </footer>
    </div>
  );
}
