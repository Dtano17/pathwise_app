import { useState } from "react";
import type { ElementType } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen, Tag, FileText, Calendar, Camera, Sparkles,
  ChevronRight, ChevronLeft, Check, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface JournalOnboardingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

interface TutorialStep {
  title: string;
  description: string;
  icon: ElementType;
  tips: string[];
  color: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    title: "Welcome to Smart Journaling!",
    description: "Your journal understands you. Using AI-powered categorization and smart templates, capture your life's moments effortlessly.",
    icon: BookOpen,
    color: "from-purple-500 to-emerald-500",
    tips: [
      "Automatic categorization using @keywords",
      "Rich media support (photos, videos)",
      "Pre-built templates for common entries",
      "Timeline view with powerful search"
    ]
  },
  {
    title: "Use @Keywords for Smart Organization",
    description: "Type @keywords in your entries and JournalMate automatically categorizes them. No manual sorting needed!",
    icon: Tag,
    color: "from-blue-500 to-cyan-500",
    tips: [
      "Type '@restaurants' for dining experiences",
      "Use '@travel' for trip memories",
      "@movies, @books, @music for entertainment",
      "@fitness, @health for wellness tracking",
      "Autocomplete suggests keywords as you type"
    ]
  },
  {
    title: "Quick Capture Button",
    description: "The floating purple button in the bottom-right lets you instantly capture thoughts, anywhere in the app.",
    icon: Zap,
    color: "from-orange-500 to-red-500",
    tips: [
      "Always accessible from any screen",
      "Add photos and videos on the go",
      "Keywords are detected automatically",
      "Entries sync across all your devices"
    ]
  },
  {
    title: "Use Templates for Structured Entries",
    description: "Pre-built templates guide you through detailed entries like trip reflections, restaurant reviews, and workout logs.",
    icon: FileText,
    color: "from-green-500 to-emerald-500",
    tips: [
      "Click 'Templates' button to browse options",
      "Step-by-step wizard makes it easy",
      "Templates auto-add relevant @keywords",
      "Perfect for recurring entry types"
    ]
  },
  {
    title: "Timeline: Your Life's Story",
    description: "Browse all your entries in a beautiful timeline. Search, filter by category, mood, or date range.",
    icon: Calendar,
    color: "from-pink-500 to-purple-500",
    tips: [
      "Click 'Timeline' to view all entries",
      "Filter by category, mood, or date",
      "Search across all your memories",
      "See keywords and linked activities"
    ]
  },
  {
    title: "Post-Activity Journaling",
    description: "After completing tasks, JournalMate prompts you to capture reflections while they're fresh.",
    icon: Sparkles,
    color: "from-yellow-500 to-orange-500",
    tips: [
      "Automatic prompts after activity completion",
      "Entries are linked to specific activities",
      "'Remind Later' if you're busy",
      "Track how tasks made you feel"
    ]
  },
  {
    title: "Rich Media Support",
    description: "Every entry can include photos and videos. Perfect for visual memories!",
    icon: Camera,
    color: "from-indigo-500 to-purple-500",
    tips: [
      "Click camera icon to add images",
      "Multiple photos per entry",
      "Video support coming soon",
      "Media is stored securely in the cloud"
    ]
  }
];

export default function JournalOnboarding({ open, onOpenChange, onComplete }: JournalOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Tutorial complete
      localStorage.setItem('journalmate_journal_onboarding_completed', 'true');
      onComplete();
      onOpenChange(false);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('journalmate_journal_onboarding_completed', 'true');
    onComplete();
    onOpenChange(false);
  };

  const step = tutorialSteps[currentStep];
  const Icon = step.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <div className="relative">
          {/* Progress Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
            <motion.div
              className={`h-full bg-gradient-to-r ${step.color}`}
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="p-6 sm:p-8 pt-8">
            <DialogHeader className="mb-6">
              {/* Icon */}
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-4 mx-auto`}>
                <Icon className="h-8 w-8 text-white" />
              </div>

              <DialogTitle className="text-2xl font-bold text-center">
                {step.title}
              </DialogTitle>
            </DialogHeader>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <p className="text-muted-foreground text-center text-base">
                  {step.description}
                </p>

                <Card className="border-2 border-primary/20">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {step.tips.map((tip, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className={`mt-0.5 rounded-full p-1 bg-gradient-to-br ${step.color} flex-shrink-0`}>
                            <Check className="h-3 w-3 text-white" />
                          </div>
                          <p className="text-sm text-foreground flex-1">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8">
              <Button
                variant="ghost"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex gap-1">
                {tutorialSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 rounded-full transition-all ${
                      index === currentStep
                        ? 'w-6 bg-primary'
                        : index < currentStep
                        ? 'w-2 bg-primary/50'
                        : 'w-2 bg-muted'
                    }`}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                {currentStep < tutorialSteps.length - 1 && (
                  <Button variant="ghost" onClick={handleSkip}>
                    Skip
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  className={`gap-2 bg-gradient-to-r ${step.color} text-white hover:opacity-90`}
                >
                  {currentStep === tutorialSteps.length - 1 ? (
                    <>
                      Get Started
                      <Sparkles className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Step Counter */}
            <p className="text-center text-xs text-muted-foreground mt-4">
              Step {currentStep + 1} of {tutorialSteps.length}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
