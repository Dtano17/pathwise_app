import { useState, useEffect, lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { HelmetProvider } from "react-helmet-async";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthHandler } from "@/components/AuthHandler";
import { useAuth } from "@/hooks/useAuth";
import { UpgradeModal } from "@/components/UpgradeModal";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { initializeMobileFeatures } from "@/lib/mobile";
import { ThemeProvider } from "@/components/ThemeProvider";
import ErrorBoundary from "@/components/ErrorBoundary";

// Lazy load pages for code-splitting
const VerifyPage = lazy(() => import("@/pages/VerifyPage"));
const VerifyLandingPage = lazy(() => import("@/pages/VerifyLandingPage"));
const VerifyLogin = lazy(() => import("@/pages/VerifyLogin"));
const AuthCallback = lazy(() => import("@/pages/AuthCallback"));
const MobileAuthCallback = lazy(() => import("@/pages/MobileAuthCallback"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
const Support = lazy(() => import("@/pages/Support"));
const SubscriptionSuccess = lazy(() => import("@/pages/SubscriptionSuccess"));
const SubscriptionCanceled = lazy(() => import("@/pages/SubscriptionCanceled"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-900">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
  </div>
);

function AppContent() {
  // Get authenticated user
  const { user } = useAuth();

  // Get current location for error boundary reset
  const [location] = useLocation();

  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeTrigger, setUpgradeTrigger] = useState<'verificationLimit' | 'export'>('verificationLimit');

  // Initialize mobile features
  useEffect(() => {
    initializeMobileFeatures();
  }, []);

  return (
    <TooltipProvider>
      <AuthHandler />
      <ErrorBoundary resetOnPropsChange={location}>
        <Suspense fallback={<PageLoader />}>
          <Switch>
            {/* Auth Callback Pages */}
            <Route path="/auth/callback" component={AuthCallback} />
            <Route path="/mobile-auth-callback" component={MobileAuthCallback} />

            {/* Legal Pages */}
            <Route path="/privacy" component={Privacy} />
            <Route path="/terms" component={Terms} />
            <Route path="/support" component={Support} />

            {/* Subscription Pages */}
            <Route path="/subscription/success" component={SubscriptionSuccess} />
            <Route path="/subscription/canceled" component={SubscriptionCanceled} />

            {/* Login Page */}
            <Route path="/login" component={VerifyLogin} />

            {/* Shared Verification Result (public) */}
            <Route path="/v/:shareId">
              {(params) => <VerifyPage shareId={params.shareId} />}
            </Route>

            {/* Main Verify Page (protected) */}
            <Route path="/verify">
              <ProtectedRoute>
                <VerifyPage
                  onUpgradeNeeded={() => {
                    setUpgradeTrigger('verificationLimit');
                    setShowUpgradeModal(true);
                  }}
                />
              </ProtectedRoute>
            </Route>

            {/* Landing Page (default for logged-out users) */}
            <Route path="/">
              {user ? (
                <VerifyPage
                  onUpgradeNeeded={() => {
                    setUpgradeTrigger('verificationLimit');
                    setShowUpgradeModal(true);
                  }}
                />
              ) : (
                <VerifyLandingPage />
              )}
            </Route>
          </Switch>
        </Suspense>
      </ErrorBoundary>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        trigger={upgradeTrigger}
      />

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      <Toaster />
    </TooltipProvider>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="verifymate-theme">
          <AppContent />
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
