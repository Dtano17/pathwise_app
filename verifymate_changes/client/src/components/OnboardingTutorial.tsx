import { useState } from "react";
import type { ElementType } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Sparkles, CheckCircle2, Mic, Target, Share2, Copy, 
  ChevronRight, ChevronLeft, Zap, Brain, Users, Play,
  UserCircle, Shield, MessageSquare, Palette, Plug, BookOpen, Globe,
  ArrowRight, ListTodo
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
    description: "Your AI-powered planning and journaling app. Everything flows together: Journal → AI Plans → Activities → Groups. You control what's shared and how personalized your experience is.",
    icon: Sparkles,
    tips: [
      "Quick 1-minute overview of core features",
      "You control privacy and personalization at every step",
      "Journal feeds AI planning, which creates activities for groups",
      "Replay this tutorial anytime from the info icon"
    ]
  },
  {
    title: "Profile & AI Planning",
    description: "Set your priorities in Profile settings to personalize all AI plans. The AI creates smart plans with live updates (weather, traffic, reservations) and you can refine them in the same chatbox.",
    icon: Brain,
    tips: [
      "Profile tab: Add priorities like 'family time' or 'fitness goals'",
      "AI plans factor your profile and provide real-time updates",
      "Iterate in the same chat—just describe what to change",
      "AI automatically journals based on your task feedback"
    ]
  },
  {
    title: "Discover & Use Plans",
    description: "Get inspired by our growing collection of community plans or create your own. One-click copy, then customize tasks and budgets to match your style.",
    icon: Globe,
    tips: [
      "Filter by Travel, Fitness, Career, or Personal",
      "Click 'Use This Plan' to copy with all tasks",
      "Tag journal entries to capture preferences automatically",
      "Plans include 7-10 tasks and realistic budgets"
    ]
  },
  {
    title: "Share & Collaborate",
    description: "Share activities publicly or create groups for collaborative planning. Customize share previews with Privacy Shield to control what's visible. Perfect for trip planning, events, or fitness challenges.",
    icon: Users,
    tips: [
      "Groups require a linked activity for alignment",
      "Privacy Shield: choose what info to share publicly",
      "Track group progress and see real-time activity feed",
      "Followers can copy your shared plans instantly"
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
