import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sparkles, HelpCircle } from "lucide-react";
import { SEO, PAGE_SEO } from "@/components/SEO";

export default function FAQ() {
  const [, setLocation] = useLocation();

  const faqs = [
    {
      question: "Can I import plans from ChatGPT into JournalMate?",
      answer: "Yes! JournalMate.ai automatically imports and tracks plans from ChatGPT, Claude AI, Google Gemini, and other AI chatbots. Simply copy your conversation or use our browser extension for one-click import."
    },
    {
      question: "How does JournalMate track progress on AI-generated plans?",
      answer: "JournalMate uses AI to parse your plan into actionable tasks, categorize them, and create a tracking dashboard. It journals your progress automatically based on your activities, with photo capture, location tracking, and completion notes."
    },
    {
      question: "Is JournalMate free to use?",
      answer: "Yes! JournalMate offers a free tier that includes plan importing, basic tracking, and community plan discovery. Pro features include unlimited plans, advanced AI journaling, and priority support."
    },
    {
      question: "What AI chatbots does JournalMate support?",
      answer: "JournalMate supports ChatGPT (OpenAI), Claude (Anthropic), Google Gemini, Perplexity, and other AI assistants. Our AI parser can extract action items from any structured conversation."
    },
    {
      question: "How do I import a plan from ChatGPT or Claude?",
      answer: "Go to the Import Plan page, paste your AI conversation, and click Import. JournalMate's AI will automatically extract tasks, categorize them, and set up tracking. You can also use our browser extension for one-click import."
    },
    {
      question: "Can I share my plans with others?",
      answer: "Yes! Every plan can be shared with a public link. You can also publish plans to the community discovery page for others to find and use as templates."
    },
    {
      question: "Does JournalMate work on mobile?",
      answer: "Yes! JournalMate is fully responsive and works on all devices. We also offer iOS and Android apps with additional features like push notifications, offline mode, and camera integration for automatic journaling."
    },
    {
      question: "What is automatic journaling?",
      answer: "As you complete tasks in your plan, JournalMate automatically creates journal entries with your photos, location, completion time, and notes. It's like having a personal assistant documenting your journey."
    },
    {
      question: "Can I use JournalMate for team or group goals?",
      answer: "Yes! JournalMate supports group goals where multiple users can collaborate on the same plan, assign tasks, and track collective progress."
    },
    {
      question: "How does the community plan discovery work?",
      answer: "Users can publish their plans to the community for others to discover. You can browse by category (travel, fitness, learning, etc.), search by keywords, and use plans as templates for your own goals."
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-blue-50">
      <SEO {...PAGE_SEO.faq} />
      {/* JSON-LD FAQ Schema */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": faqs.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": faq.answer
            }
          }))
        })}
      </script>

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

      {/* Hero */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full mb-6 text-sm font-medium">
          <HelpCircle className="w-4 h-4" />
          Frequently Asked Questions
        </div>

        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Questions? We've Got Answers
        </h1>

        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Everything you need to know about JournalMate.ai, AI plan importing, and automatic progress tracking.
        </p>
      </section>

      {/* FAQ Accordion */}
      <section className="container mx-auto px-4 py-12 max-w-3xl">
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, idx) => (
            <AccordionItem key={idx} value={`item-${idx}`}>
              <AccordionTrigger className="text-left text-lg font-semibold">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 text-base leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Related Links */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Learn More</h2>
          <div className="grid sm:grid-cols-3 gap-6 text-center">
            <div className="p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation('/chatgpt-plan-tracker')}>
              <h3 className="font-semibold text-lg mb-2">ChatGPT Integration</h3>
              <p className="text-sm text-gray-600">How to import ChatGPT plans</p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation('/claude-ai-integration')}>
              <h3 className="font-semibold text-lg mb-2">Claude AI Integration</h3>
              <p className="text-sm text-gray-600">Track Claude AI plans</p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation('/support')}>
              <h3 className="font-semibold text-lg mb-2">Support</h3>
              <p className="text-sm text-gray-600">Get help from our team</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-2xl mx-auto bg-gradient-to-r from-blue-600 to-purple-600 text-white p-12 rounded-3xl shadow-2xl">
          <h2 className="text-3xl font-bold mb-4">
            Still Have Questions?
          </h2>
          <p className="text-lg mb-6 opacity-90">
            Our support team is here to help you get started with JournalMate.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100"
              onClick={() => setLocation('/support')}
            >
              Contact Support
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10"
              onClick={() => setLocation('/login')}
            >
              Try JournalMate Free
            </Button>
          </div>
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
                <li><a href="/weekend-plans" className="hover:text-blue-600">Weekend Plans</a></li>
                <li><a href="/chatgpt-plan-tracker" className="hover:text-blue-600">ChatGPT</a></li>
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
