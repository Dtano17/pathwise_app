import { useState, useEffect, useRef } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import MainApp from "@/pages/MainApp";
import SharedActivity from "@/pages/SharedActivity";
import AuthCallback from "@/pages/AuthCallback";
import Login from "@/pages/Login";
import CommunityPlansPage from "@/pages/CommunityPlansPage";
import GroupGoalsPage from "@/pages/GroupGoalsPage";
import SubscriptionSuccess from "@/pages/SubscriptionSuccess";
import SubscriptionCanceled from "@/pages/SubscriptionCanceled";
import ImportPlan from "@/pages/ImportPlan";
import Updates from "@/pages/Updates";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import Support from "@/pages/Support";
import LandingPage from "@/pages/LandingPage";
import ChatGPTPlanTracker from "@/pages/ChatGPTPlanTracker";
import ClaudeIntegration from "@/pages/ClaudeIntegration";
import WeekendPlans from "@/pages/WeekendPlans";
import FAQ from "@/pages/FAQ";
import PerplexityPlans from "@/pages/PerplexityPlans";
import SocialMediaSaver from "@/pages/SocialMediaSaver";
import NotificationService from "@/components/NotificationService";
import { AuthHandler } from "@/components/AuthHandler";
import { useAuth } from "@/hooks/useAuth";
import { UpgradeModal } from "@/components/UpgradeModal";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { initializeMobileFeatures } from "@/lib/mobile";
import { ThemeProvider } from "@/components/ThemeProvider";
import ErrorBoundary from "@/components/ErrorBoundary";

interface SubscriptionStatus {
  tier: string;
  status: string;
  planCount: number;
  planLimit: number | null;
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
}

function AppContent() {
  // Get authenticated user - use isAuthenticated to distinguish from demo/guest users
  const { user, isAuthenticated } = useAuth();

  // Shared state for sidebar and main app communication
  const [selectedTheme, setSelectedTheme] = useState<string>('');
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showLocationDatePlanner, setShowLocationDatePlanner] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [showLifestylePlanner, setShowLifestylePlanner] = useState(false);
  const [showRecentGoals, setShowRecentGoals] = useState(false);
  const [showProgressReport, setShowProgressReport] = useState(false);
  const [showEndOfDayReview, setShowEndOfDayReview] = useState(false);

  // Track current tab to sync between AppSidebar and MainApp
  const mainAppTabRef = useRef<(tab: string) => void>(() => { });

  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeTrigger, setUpgradeTrigger] = useState<'planLimit' | 'favorites' | 'export' | 'insights'>('planLimit');

  // Fetch subscription status for upgrade modal
  const { data: subscriptionStatus } = useQuery<SubscriptionStatus>({
    queryKey: ['/api/subscription/status'],
    enabled: isAuthenticated,
    staleTime: 60000, // Cache for 1 minute
  });

  // Custom sidebar width for better content display
  const style = {
    "--sidebar-width": "20rem",       // 320px for better content
    "--sidebar-width-icon": "4rem",   // default icon width
  };

  // Save user ID for native widgets (Android)
  useEffect(() => {
    if (user?.id) {
      import('@capacitor/preferences').then(({ Preferences }) => {
        Preferences.set({ key: 'user_id', value: user.id.toString() });
        Preferences.set({ key: 'userId', value: user.id.toString() }); // Redundant but safe
      });
    }
  }, [user?.id]);

  return (
    <TooltipProvider>
      <AuthHandler />
      <Switch>
        {/* Auth Callback Page (no sidebar) */}
        <Route path="/auth/callback" component={AuthCallback} />

        {/* Login Page (no sidebar) */}
        <Route path="/login" component={Login} />

        {/* Shared Activity Page (no sidebar) */}
        <Route path="/share/:token" component={SharedActivity} />

        {/* Community Plans Discovery Page (no sidebar, publicly accessible) */}
        <Route path="/discover" component={CommunityPlansPage} />

        {/* Group Goals Page (no sidebar) */}
        <Route path="/groups" component={GroupGoalsPage} />

        {/* Subscription Success Page (no sidebar) */}
        <Route path="/subscription/success" component={SubscriptionSuccess} />

        {/* Subscription Canceled Page (no sidebar) */}
        <Route path="/subscription/canceled" component={SubscriptionCanceled} />

        {/* AI Plan Import Page (no sidebar) */}
        <Route path="/import-plan" component={ImportPlan} />

        {/* Updates/Blog Page (no sidebar) */}
        <Route path="/updates" component={Updates} />

        {/* Privacy Policy Page (no sidebar) */}
        <Route path="/privacy" component={Privacy} />

        {/* Terms of Service Page (no sidebar) */}
        <Route path="/terms" component={Terms} />

        {/* Support & Help Page (no sidebar) */}
        <Route path="/support" component={Support} />

        {/* SEO Landing Pages - AI Integration */}
        <Route path="/chatgpt-plan-tracker" component={ChatGPTPlanTracker} />
        <Route path="/claude-ai-integration" component={ClaudeIntegration} />
        <Route path="/perplexity-plans" component={PerplexityPlans} />

        {/* SEO Landing Pages - Discovery */}
        <Route path="/weekend-plans" component={WeekendPlans} />
        <Route path="/save-social-media" component={SocialMediaSaver} />
        <Route path="/faq" component={FAQ} />

        {/* Main App Route - Shows landing page for unauthenticated users, main app for authenticated */}
        <Route path="/">
          {isAuthenticated ? (
            <SidebarProvider defaultOpen={window.innerWidth >= 1024} style={style as React.CSSProperties}>
              <div className="flex h-screen w-full overflow-hidden" style={{ height: '100dvh' }}>
                <AppSidebar
                  selectedTheme={selectedTheme}
                  onThemeSelect={setSelectedTheme}
                  onShowThemeSelector={() => setShowThemeSelector(true)}
                  onShowDatePlanner={() => setShowLocationDatePlanner(true)}
                  onShowContacts={() => setShowContacts(true)}
                  onShowChatHistory={() => setShowChatHistory(true)}
                  onShowLifestylePlanner={() => setShowLifestylePlanner(true)}
                  onShowRecentGoals={() => setShowRecentGoals(true)}
                  onShowProgressReport={() => setShowProgressReport(true)}
                  onShowEndOfDayReview={() => setShowEndOfDayReview(true)}
                  onOpenUpgradeModal={(trigger) => {
                    setUpgradeTrigger(trigger);
                    setShowUpgradeModal(true);
                  }}
                  onShowGoalInput={() => mainAppTabRef.current('input')}
                  onShowDiscover={() => mainAppTabRef.current('discover')}
                  onShowActivities={() => mainAppTabRef.current('activities')}
                  onShowAllTasks={() => mainAppTabRef.current('tasks')}
                  onShowProgress={() => mainAppTabRef.current('progress')}
                  onShowGroups={() => mainAppTabRef.current('groups')}
                  onShowIntegrations={() => mainAppTabRef.current('sync')}
                />
                <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                  <MainApp
                    selectedTheme={selectedTheme}
                    onThemeSelect={setSelectedTheme}
                    showThemeSelector={showThemeSelector}
                    onShowThemeSelector={setShowThemeSelector}
                    showLocationDatePlanner={showLocationDatePlanner}
                    onShowLocationDatePlanner={setShowLocationDatePlanner}
                    showContacts={showContacts}
                    onShowContacts={setShowContacts}
                    showChatHistory={showChatHistory}
                    onShowChatHistory={setShowChatHistory}
                    showLifestylePlanner={showLifestylePlanner}
                    onShowLifestylePlanner={setShowLifestylePlanner}
                    showRecentGoals={showRecentGoals}
                    onShowRecentGoals={setShowRecentGoals}
                    showProgressReport={showProgressReport}
                    onShowProgressReport={setShowProgressReport}
                    showEndOfDayReview={showEndOfDayReview}
                    onShowEndOfDayReview={setShowEndOfDayReview}
                    onTabChange={(setter) => {
                      mainAppTabRef.current = setter;
                    }}
                  />
                </div>
              </div>
            </SidebarProvider>
          ) : (
            <LandingPage />
          )}
        </Route>

      </Switch>
      {user?.id && <NotificationService userId={user.id} />}
      <Toaster />

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Global Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        trigger={upgradeTrigger}
        planCount={subscriptionStatus?.planCount ?? 0}
        planLimit={subscriptionStatus ? subscriptionStatus.planLimit ?? undefined : 5}
      />
    </TooltipProvider>
  );
}

function App() {
  // Initialize mobile features on app startup
  useEffect(() => {
    initializeMobileFeatures().catch(console.error);
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;