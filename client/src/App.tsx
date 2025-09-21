import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ThemeToggle from "@/components/ThemeToggle";
import VoiceInputExample from "@/components/examples/VoiceInputExample";
import TaskCardExample from "@/components/examples/TaskCardExample";
import ProgressDashboardExample from "@/components/examples/ProgressDashboardExample";
import GoalInputExample from "@/components/examples/GoalInputExample";
import JournalEntryExample from "@/components/examples/JournalEntryExample";
import TaskListExample from "@/components/examples/TaskListExample";
import CelebrationModalExample from "@/components/examples/CelebrationModalExample";
import { Sparkles, Target, BarChart3, BookOpen, CheckSquare, Mic, PartyPopper } from "lucide-react";

function App() {
  const [activeTab, setActiveTab] = useState("voice");

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          {/* Header */}
          <header className="border-b border-border bg-card/50 backdrop-blur">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">IntentAI</h1>
                    <p className="text-sm text-muted-foreground">Transform Goals into Reality</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI-Powered
                  </Badge>
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="container mx-auto px-4 py-8">
            <div className="max-w-6xl mx-auto">
              {/* Hero Section */}
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-foreground mb-4">
                  Turn Intentions into <span className="text-primary">Action</span>
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Experience the future of productivity with swipeable tasks, AI-powered planning, 
                  and celebratory achievements that make reaching your goals exciting!
                </p>
              </div>

              {/* Component Showcase */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-7 mb-8">
                  <TabsTrigger value="voice" className="gap-2" data-testid="tab-voice">
                    <Mic className="w-4 h-4" />
                    Voice Input
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="gap-2" data-testid="tab-tasks">
                    <CheckSquare className="w-4 h-4" />
                    Swipe Tasks
                  </TabsTrigger>
                  <TabsTrigger value="progress" className="gap-2" data-testid="tab-progress">
                    <BarChart3 className="w-4 h-4" />
                    Progress
                  </TabsTrigger>
                  <TabsTrigger value="goals" className="gap-2" data-testid="tab-goals">
                    <Target className="w-4 h-4" />
                    Quick Goals
                  </TabsTrigger>
                  <TabsTrigger value="journal" className="gap-2" data-testid="tab-journal">
                    <BookOpen className="w-4 h-4" />
                    Journal
                  </TabsTrigger>
                  <TabsTrigger value="list" className="gap-2" data-testid="tab-list">
                    <CheckSquare className="w-4 h-4" />
                    Task List
                  </TabsTrigger>
                  <TabsTrigger value="celebration" className="gap-2" data-testid="tab-celebration">
                    <PartyPopper className="w-4 h-4" />
                    Celebrate
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="voice" className="space-y-4">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-semibold mb-2">Voice & Text Input</h3>
                    <p className="text-muted-foreground">
                      Speak or type your goals naturally - AI transforms them into actionable plans
                    </p>
                  </div>
                  <VoiceInputExample />
                </TabsContent>

                <TabsContent value="tasks" className="space-y-4">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-semibold mb-2">Swipeable Task Cards</h3>
                    <p className="text-muted-foreground">
                      Swipe right to complete with celebrations, swipe left to skip
                    </p>
                  </div>
                  <TaskCardExample />
                </TabsContent>

                <TabsContent value="progress" className="space-y-4">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-semibold mb-2">Progress Dashboard</h3>
                    <p className="text-muted-foreground">
                      Track streaks, completion rates, and achievements
                    </p>
                  </div>
                  <ProgressDashboardExample />
                </TabsContent>

                <TabsContent value="goals" className="space-y-4">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-semibold mb-2">Quick Goal Entry</h3>
                    <p className="text-muted-foreground">
                      Add goals quickly with categories and priorities
                    </p>
                  </div>
                  <GoalInputExample />
                </TabsContent>

                <TabsContent value="journal" className="space-y-4">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-semibold mb-2">Daily Journal</h3>
                    <p className="text-muted-foreground">
                      Reflect on your day with mood tracking and achievements
                    </p>
                  </div>
                  <JournalEntryExample />
                </TabsContent>

                <TabsContent value="list" className="space-y-4">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-semibold mb-2">Task Management</h3>
                    <p className="text-muted-foreground">
                      Search, filter, and manage all your tasks in one place
                    </p>
                  </div>
                  <TaskListExample />
                </TabsContent>

                <TabsContent value="celebration" className="space-y-4">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-semibold mb-2">Celebration Modals</h3>
                    <p className="text-muted-foreground">
                      Experience the joy of achievement with confetti and animations
                    </p>
                  </div>
                  <CelebrationModalExample />
                </TabsContent>
              </Tabs>
            </div>
          </main>

          {/* Footer */}
          <footer className="border-t border-border bg-card/30 mt-16">
            <div className="container mx-auto px-4 py-8">
              <div className="text-center text-muted-foreground">
                <p className="mb-2">
                  🚀 Ready to transform your goals into reality?
                </p>
                <p className="text-sm">
                  This is your AI-powered journaling companion for intentional living.
                </p>
              </div>
            </div>
          </footer>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
