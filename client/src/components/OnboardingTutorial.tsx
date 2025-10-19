import { useState } from "react";
import type { ElementType } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Sparkles, CheckCircle2, Mic, Target, Share2, Copy, 
  ChevronRight, ChevronLeft, Zap, Brain, Users, Play
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
    description: "Your AI-powered social planning and adaptive journal. Let's take a quick tour of the main features that will help you plan, execute, and reflect on your goals.",
    icon: Sparkles,
    tips: [
      "This tutorial takes about 2 minutes to complete",
      "You can always access it again from the help menu",
      "Feel free to skip and explore on your own"
    ]
  },
  {
    title: "Specialized Planning Agent",
    description: "JournalMate uses a LangGraph-based planning agent—not just simple prompt feeding. Our agent is optimized for creating personalized, context-aware plans.",
    icon: Brain,
    tips: [
      "Smart Plan: Deep dive with follow-up questions for personalized routines",
      "Quick Plan: Rapid action plan generation when you need speed",
      "The agent learns from your preferences and adapts over time",
      "Access via Goal Input tab (microphone icon)"
    ]
  },
  {
    title: "Creating Your First Plan",
    description: "Use voice or text input to describe any goal. The AI planning agent will ask clarifying questions, then generate a complete action plan with tasks, timeframes, and motivational insights.",
    icon: Mic,
    tips: [
      "Try saying: 'Help me plan a productive morning routine'",
      "Or type: 'Create a workout plan for beginners'",
      "Use Quick Plan for instant results or Smart Plan for deeper personalization",
      "You can refine the plan by chatting with the agent"
    ]
  },
  {
    title: "Managing Activities & Tasks",
    description: "Once your plan is generated, it becomes an Activity with trackable tasks. Navigate between tabs to view all your activities, individual tasks, and progress analytics.",
    icon: Target,
    tips: [
      "Activities tab: See all your plans with progress tracking",
      "All Tasks tab: View and complete tasks across all activities",
      "Swipe tasks right to complete, left to skip",
      "Give thumbs up/down feedback to help the AI learn your preferences"
    ]
  },
  {
    title: "Sharing Your Plans",
    description: "Make any activity public, customize the preview with beautiful backdrops, and share with friends. They can instantly copy it to their account and make it their own!",
    icon: Share2,
    tips: [
      "Toggle activity privacy (lock/unlock icon)",
      "Customize share preview with title and backdrop",
      "Share link works on mobile and desktop",
      "Recipients get the full plan with all tasks"
    ]
  },
  {
    title: "Copying Others' Plans",
    description: "When someone shares a plan with you, just sign in and it automatically copies to your account. You can then customize it, track your own progress, and share your version.",
    icon: Copy,
    tips: [
      "Click any shared activity link",
      "Sign in to automatically copy it",
      "All tasks are preserved with smart matching",
      "Update detection prevents duplicates"
    ]
  },
  {
    title: "Groups & Collaboration",
    description: "Create accountability groups, share activities with team members, and track collective progress. Perfect for workout buddies, study groups, or team goals.",
    icon: Users,
    tips: [
      "Groups tab: Create and manage your groups",
      "Invite members via email or share link",
      "See group-wide progress and activity feed",
      "Feature coming soon: Real-time collaboration"
    ]
  },
  {
    title: "Ready to Start!",
    description: "You're all set! Start by creating your first plan, explore the example activities, or try out the quick action buttons on the Goal Input tab.",
    icon: Play,
    tips: [
      "Click 'Complete Tutorial' to get started",
      "Try the example goals for inspiration",
      "Explore Personal Journal for life tracking",
      "Need help? Contact us at journamate@gmail.com"
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
