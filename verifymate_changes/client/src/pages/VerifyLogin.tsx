import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { SocialLogin } from '@/components/SocialLogin';
import { useAuth } from '@/hooks/useAuth';
import { Shield, ShieldCheck, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/ThemeToggle';

export default function VerifyLogin() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // If already authenticated, redirect to verify page with pending verification
    if (isAuthenticated && !redirecting) {
      setRedirecting(true);

      // Check for pending verification from session storage
      const pendingVerification = sessionStorage.getItem('pendingVerification');

      if (pendingVerification) {
        try {
          const { url, text } = JSON.parse(pendingVerification);
          sessionStorage.removeItem('pendingVerification');

          // Build query params
          const params = new URLSearchParams();
          if (url) params.set('url', url);
          if (text) params.set('text', text);

          const queryString = params.toString();
          setLocation(queryString ? `/verify?${queryString}` : '/verify');
        } catch (e) {
          // Invalid JSON, just redirect to verify
          sessionStorage.removeItem('pendingVerification');
          setLocation('/verify');
        }
      } else {
        // Check URL params
        const params = new URLSearchParams(window.location.search);
        const returnTo = params.get('returnTo');

        if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
          setLocation(returnTo);
        } else {
          setLocation('/verify');
        }
      }
    }
  }, [isAuthenticated, setLocation, redirecting]);

  if (isLoading || redirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-sky-500 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">
            {redirecting ? 'Redirecting...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center mb-3 sm:mb-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-500/20 to-emerald-500/20 border border-sky-500/30">
              <Shield className="w-12 h-12 sm:w-16 sm:h-16 text-sky-500" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-sky-500 to-emerald-500 bg-clip-text text-transparent mb-2">
            VerifyMate
          </h1>
          <p className="text-muted-foreground text-sm">
            Verify before you trust
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-200 dark:border-slate-700 shadow-xl">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Sign in to continue
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Sign in to verify content and save your history
              </p>
            </div>

            {/* Social Login */}
            <SocialLogin
              redirectPath="/verify"
              onSuccess={() => {
                // The useEffect will handle redirect
              }}
            />

            {/* Features Preview */}
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-center text-slate-500 dark:text-slate-400 mb-3">
                What you get with VerifyMate
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Fact-check posts</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Detect AI content</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Verify businesses</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>5 free/month</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back to Landing */}
        <div className="text-center mt-6">
          <Button
            variant="ghost"
            onClick={() => setLocation('/')}
            className="text-sm text-slate-600 dark:text-slate-400"
          >
            ← Back to home
          </Button>
        </div>

        {/* Footer Links */}
        <div className="flex items-center justify-center gap-4 mt-6 text-xs text-slate-500">
          <a href="/privacy" className="hover:text-slate-700 dark:hover:text-slate-300">Privacy</a>
          <span>•</span>
          <a href="/terms" className="hover:text-slate-700 dark:hover:text-slate-300">Terms</a>
          <span>•</span>
          <a href="/support" className="hover:text-slate-700 dark:hover:text-slate-300">Support</a>
        </div>
      </div>
    </div>
  );
}
