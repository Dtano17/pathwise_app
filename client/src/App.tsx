import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { HelmetProvider } from "react-helmet-async";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import NotificationService from "@/components/NotificationService";
import { AuthHandler } from "@/components/AuthHandler";
import { useAuth } from "@/hooks/useAuth";
import { UpgradeModal } from "@/components/UpgradeModal";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { initializeMobileFeatures } from "@/lib/mobile";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useDailyTheme, type ThemeId } from "@/hooks/useDailyTheme";
import ErrorBoundary from "@/components/ErrorBoundary";

// Lazy load pages for code-splitting
const MainApp = lazy(() => import("@/pages/MainApp"));
const SharedActivity = lazy(() => import("@/pages/SharedActivity"));
const AuthCallback = lazy(() => import("@/pages/AuthCallback"));
const Login = lazy(() => import("@/pages/Login"));
const CommunityPlansPage = lazy(() => import("@/pages/CommunityPlansPage"));
const GroupGoalsPage = lazy(() => import("@/pages/GroupGoalsPage"));
const SubscriptionSuccess = lazy(() => import("@/pages/SubscriptionSuccess"));
const SubscriptionCanceled = lazy(() => import("@/pages/SubscriptionCanceled"));
const Updates = lazy(() => import("@/pages/Updates"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
const Support = lazy(() => import("@/pages/Support"));
const LandingPageWrapper = lazy(() => import("@/pages/LandingPageWrapper"));
const ChatGPTPlanTracker = lazy(() => import("@/pages/ChatGPTPlanTracker"));
const PerplexityPlans = lazy(() => import("@/pages/PerplexityPlans"));
const WeekendPlans = lazy(() => import("@/pages/WeekendPlans"));
const ImportPlan = lazy(() => import("@/pages/ImportPlan"));
const MobileAuthCallback = lazy(() => import("@/pages/MobileAuthCallback"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

function AppContent() {
  // Get authenticated user
  const { user } = useAuth();
  
  // Get current location for error boundary reset
  const [location] = useLocation();

  // Daily theme state - persisted to backend API
  const { currentThemeId, setTheme, clearTheme, isSettingTheme } = useDailyTheme();
  const selectedTheme = currentThemeId || '';
  const handleThemeSelect = (themeId: string) => {
    if (themeId) {
      setTheme(themeId as ThemeId);
    }
  };
  const handleThemeClear = () => {
    clearTheme();
  };

  // Shared state for sidebar and main app communication
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showLocationDatePlanner, setShowLocationDatePlanner] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [showLifestylePlanner, setShowLifestylePlanner] = useState(false);
  const [showRecentGoals, setShowRecentGoals] = useState(false);
  const [showProgressReport, setShowProgressReport] = useState(false);
  const [showEndOfDayReview, setShowEndOfDayReview] = useState(false);
  
  // Track current tab to sync between AppSidebar and MainApp
  const mainAppTabRef = useRef<(tab: string) => void>(() => {});

  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeTrigger, setUpgradeTrigger] = useState<'planLimit' | 'favorites' | 'export' | 'insights'>('planLimit');

  // Custom sidebar width for better content display
  const style = {
    "--sidebar-width": "20rem",       // 320px for better content
    "--sidebar-width-icon": "4rem",   // default icon width
  };

  return (
    <TooltipProvider>
      <AuthHandler />
      <ErrorBoundary resetOnPropsChange={location}>
        <Suspense fallback={<PageLoader />}>
          <Switch>
          {/* Auth Callback Page (no sidebar) */}
          <Route path="/auth/callback" component={AuthCallback} />

          {/* Mobile OAuth Callback Page (handles deep link redirect) */}
          <Route path="/auth/mobile-callback" component={MobileAuthCallback} />

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

          {/* Product Updates & News Page (no sidebar) */}
          <Route path="/updates" component={Updates} />

          {/* Footer Pages (no sidebar) */}
          <Route path="/privacy" component={Privacy} />
          <Route path="/terms" component={Terms} />
          <Route path="/support" component={Support} />

          {/* Marketing Pages (no sidebar) */}
          <Route path="/chatgpt-plan-tracker" component={ChatGPTPlanTracker} />
          <Route path="/perplexity-plans" component={PerplexityPlans} />
          <Route path="/weekend-plans" component={WeekendPlans} />

          {/* Import Plan Page (publicly accessible with sign-in wall) */}
          <Route path="/import-plan" component={ImportPlan} />

          {/* Main App Route - Protected with Sidebar */}
          <Route path="/app">
            <ProtectedRoute>
              <SidebarProvider defaultOpen={window.innerWidth >= 1024} style={style as React.CSSProperties}>
                <div className="flex h-screen w-full overflow-auto">
                  <AppSidebar
                    selectedTheme={selectedTheme}
                    onThemeSelect={handleThemeSelect}
                    onShowThemeSelector={() => setShowThemeSelector(true)}
                    isSettingTheme={isSettingTheme}
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
                      onThemeSelect={handleThemeSelect}
                      onThemeClear={handleThemeClear}
                      isSettingTheme={isSettingTheme}
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
            </ProtectedRoute>
          </Route>

          {/* Root Route - Always show landing page wrapper for consistent auth handling */}
          <Route>
            <LandingPageWrapper />
          </Route>
          </Switch>
        </Suspense>
      </ErrorBoundary>
      {user?.id && <NotificationService userId={user.id} />}
      <Toaster />
      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
      
      {/* Global Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        trigger={upgradeTrigger}
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
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App;