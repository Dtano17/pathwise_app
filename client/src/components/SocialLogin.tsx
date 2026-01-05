import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SiGoogle } from "react-icons/si";
import { Mail, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EmailAuthDialog } from './EmailAuthDialog';
import { useAuth } from "@/hooks/useAuth";
import { isNative } from "@/lib/platform";

// Check for Android WebView via User Agent (works even when isNative() returns false)
const isAndroidWebView = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('android') && (ua.includes('wv') || ua.includes('webview'));
};

interface SocialLoginProps {
  title?: string;
  description?: string;
}

export function SocialLogin({
  title = "Sign in to continue",
  description = "Access your goals, tasks, and personalized features"
}: SocialLoginProps) {
  const { toast } = useToast();
  const { loginWithGoogle } = useAuth();
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Get returnTo parameter from URL if present (validate to prevent open redirect)
  const getReturnToParam = () => {
    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get('returnTo');

    // Validate returnTo is a safe same-origin path
    if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
      return `?returnTo=${encodeURIComponent(returnTo)}`;
    }
    return '';
  };

  const handleGoogleLogin = async () => {
    // On native platforms or Android WebView, use native/browser OAuth flow
    console.log('[SocialLogin] handleGoogleLogin called');
    console.log('[SocialLogin] isNative():', isNative());
    console.log('[SocialLogin] isAndroidWebView():', isAndroidWebView());
    console.log('[SocialLogin] document.URL:', document.URL);

    if (isNative() || isAndroidWebView()) {
      setIsGoogleLoading(true);
      try {
        console.log('[SocialLogin] Using native/WebView Google Sign-In path');
        const result = await loginWithGoogle();
        console.log('[SocialLogin] loginWithGoogle result:', result);

        // Check if sign-in failed (but not if pending browser OAuth)
        if (!result.success && !result.pending) {
          // Don't show error for user cancellation or redirect messages
          // "Redirecting to web OAuth" is normal behavior, not an error
          if (result.error && !result.error.includes('cancel') && !result.error.includes('Redirecting')) {
            toast({
              title: "Sign-in failed",
              description: result.error || "Could not sign in with Google. Please try again.",
              variant: "destructive",
            });
          }
        }
        // On success, loginWithGoogle handles refetch and navigation
      } catch (error: any) {
        console.error('[SocialLogin] Native Google Sign-In failed:', error);
        toast({
          title: "Sign-in failed",
          description: error.message || "Could not sign in with Google. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsGoogleLoading(false);
      }
    } else {
      // On web, use standard OAuth redirect
      window.location.href = `/api/auth/google${getReturnToParam()}`;
    }
  };
  

  return (
    <Card className="w-full max-w-md mx-auto glass-card" data-testid="card-social-login">
      <CardHeader className="text-center px-4 sm:px-6">
        <CardTitle className="text-xl sm:text-2xl font-bold" data-testid="text-login-title">
          {title}
        </CardTitle>
        <CardDescription className="text-sm sm:text-base" data-testid="text-login-description">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 px-4 sm:px-6">
        {/* Email Sign In */}
        <Button
          variant="outline"
          onClick={() => setShowEmailAuth(true)}
          className="w-full min-h-[44px] h-auto py-2.5 text-sm sm:text-base justify-start"
          data-testid="button-login-email"
        >
          <Mail className="w-4 h-4 sm:w-5 sm:h-5 mr-2 shrink-0" />
          <span className="truncate">Sign in with Email</span>
        </Button>

        {/* Google Sign In - Native on mobile, OAuth on web */}
        <Button
          variant="outline"
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading}
          className="w-full min-h-[44px] h-auto py-2.5 text-sm sm:text-base justify-start"
          data-testid="button-login-google"
        >
          {isGoogleLoading ? (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin shrink-0" />
          ) : (
            <SiGoogle className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-[#4285F4] shrink-0" />
          )}
          <span className="truncate">{isGoogleLoading ? "Signing in..." : "Sign in with Google"}</span>
        </Button>

        {/* Terms and Privacy */}
        <p className="text-xs text-muted-foreground text-center leading-5 pt-2 px-2" data-testid="text-terms">
          By continuing, you agree to our{" "}
          <a href="/terms#terms-of-service" className="underline underline-offset-4 hover:text-primary">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/terms#privacy-policy" className="underline underline-offset-4 hover:text-primary">
            Privacy Policy
          </a>
          .
        </p>
      </CardContent>
      
      {/* Email Authentication Dialog */}
      <EmailAuthDialog 
        open={showEmailAuth} 
        onOpenChange={setShowEmailAuth} 
      />
    </Card>
  );
}
