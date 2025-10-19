import { useState } from "react";
import type { ElementType } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Sparkles, CheckCircle2, Mic, Target, Share2, Copy, 
  ChevronRight, ChevronLeft, Zap, Brain, Users, Play,
  UserCircle, Shield, MessageSquare, Palette, Plug, BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface OnboardingTutorialProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

interface TutorialStep {
  title: string;
  description: string;
  icon: ElementType;
  tips: string[];
  image?: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    title: "Welcome to JournalMate!",
    description: "Your AI-powered social planning and adaptive journal. JournalMate only uses what you permit—you control what's shared and how personalized your experience is. Let's set you up for success!",
    icon: Sparkles,
    tips: [
      "This tutorial takes about 3 minutes to complete",
      "You control your privacy and personalization level",
      "The app only accesses what you explicitly allow",
      "You can replay this tutorial anytime from the Tutorial badge"
    ]
  },
  {
    title: "Start with Your Profile & Privacy",
    description: "Your profile is the foundation. Set your priorities, define what makes you unique, and control what you share publicly. This drives how personalized your plans become.",
    icon: UserCircle,
    tips: [
      "Profile tab: Add priorities like 'family time', 'career growth', 'health'",
      "Set what defines you—the app uses this to personalize plans",
      "Control what's public vs. private with the shield icon",
      "Make it fun! Share what you want others to see about you",
      "The app automatically factors your priorities into every plan"
    ]
  },
  {
    title: "Share & Collaborate—For Creators & Planners",
    description: "Not just planning—collaborate in real-time! Plan group trips, customize share themes/backgrounds, control what's shared with gated access. Perfect for travel agents, event planners, and lifestyle creators who want followers to instantly copy and own your plans.",
    icon: Share2,
    tips: [
      "Plan group trips or adventures with real-time collaboration",
      "Customize share preview: themes, backgrounds, tone—make it yours",
      "Gated sharing: Control exactly what gets shared publicly",
      "Instant copy-and-own: Followers click your link and get their own editable copy",
      "Travel agents, event planners, creators: Build your following with shareable plans"
    ]
  },
  {
    title: "Smart Planning Agent with Live Updates",
    description: "Our LangGraph agent creates priority-aware plans enriched with live updates. Plan a romantic date? It factors your profile, checks traffic/weather, alerts you about reservations, detects your mood, and lets you share with your date beforehand for alignment.",
    icon: Brain,
    tips: [
      "Example: 'Plan a romantic date'—uses your profile preferences",
      "Live updates: traffic conditions, weather forecast, venue busy-ness",
      "Proactive alerts: 'You'll need reservations at this restaurant'",
      "Mood detection sets the tone for success based on your style",
      "Share with your date beforehand so you're both on the same page"
    ]
  },
  {
    title: "Create Action Plan (Same Chatbox Iteration)",
    description: "Already have plan details? Use 'Create Action Plan' to instantly generate structured tasks. Then keep iterating in THE SAME chatbox—no new interface, just describe your changes and the AI refines it.",
    icon: MessageSquare,
    tips: [
      "Type or paste all your plan details at once",
      "The AI generates a complete action plan with tasks",
      "Iterate in THE SAME chatbox—just type what you want to change",
      "When you receive a shared plan, edit it the same way",
      "Every plan respects your profile priorities automatically"
    ]
  },
  {
    title: "Automatic AI Journaling",
    description: "JournalMate does the journaling FOR YOU using AI. It learns from your task feedback (likes/dislikes), then you just tag images/videos and link activities. You choose when to add more details—let JournalMate do the rest.",
    icon: BookOpen,
    tips: [
      "AI automatically journals based on your task feedback (thumbs up/down)",
      "You just tag images/videos with @restaurants, @travel, @music, etc.",
      "Link to activities—JournalMate enriches entries with AI",
      "You choose when to add more details, AI handles the rest",
      "Your journal builds over time with rich, AI-powered memories"
    ]
  },
  {
    title: "Themes & LLM Integration",
    description: "Set your mood or rhythm with theme customization. Integrate any LLM you prefer via copy/paste or backend integration—full flexibility for your workflow.",
    icon: Palette,
    tips: [
      "Theme settings: Adjust mood, color schemes, and rhythm",
      "Dark/Light mode toggle in the header",
      "Integrate OpenAI, Claude, or any other LLM",
      "Copy/paste approach or backend API integration",
      "Customize the AI experience to match your style"
    ]
  }
];

export default function OnboardingTutorial({ open, onOpenChange, onComplete }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = tutorialSteps[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === tutorialSteps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
      onOpenChange(false);
      setCurrentStep(0);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
    onOpenChange(false);
    setCurrentStep(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0"
        data-testid="onboarding-tutorial"
      >
        {/* Progress Bar */}
        <div className="sticky top-0 z-10 bg-background border-b">
          <div className="h-1 bg-muted">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-600 to-emerald-600"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="w-3 h-3" />
                Tutorial
              </Badge>
              <span className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {tutorialSteps.length}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              data-testid="button-skip-tutorial"
            >
              Skip Tutorial
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <DialogHeader className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-emerald-500 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <DialogTitle className="text-2xl">
                    {step.title}
                  </DialogTitle>
                </div>
                <DialogDescription className="text-base leading-relaxed">
                  {step.description}
                </DialogDescription>
              </DialogHeader>

              {/* Tips Card */}
              <Card className="p-5 bg-gradient-to-br from-purple-50/50 to-emerald-50/50 dark:from-purple-950/20 dark:to-emerald-950/20 border-purple-200/50 dark:border-purple-800/50">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="font-semibold text-sm">Quick Tips:</span>
                </div>
                <ul className="space-y-2">
                  {step.tips.map((tip, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span>{tip}</span>
                    </motion.li>
                  ))}
                </ul>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Footer */}
        <div className="sticky bottom-0 bg-background border-t p-4 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstStep}
            className="gap-2"
            data-testid="button-previous-step"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          
          <div className="flex gap-1">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep
                    ? 'bg-purple-600'
                    : index < currentStep
                    ? 'bg-emerald-600'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>

          <Button
            onClick={handleNext}
            className="gap-2 bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-700 hover:to-emerald-700"
            data-testid={isLastStep ? "button-complete-tutorial" : "button-next-step"}
          >
            {isLastStep ? (
              <>
                Complete Tutorial
                <CheckCircle2 className="w-4 h-4" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
