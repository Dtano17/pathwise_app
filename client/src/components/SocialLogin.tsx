import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SiGoogle, SiFacebook, SiApple } from "react-icons/si";
import { Mail } from "lucide-react";
import { FaXTwitter } from "react-icons/fa6";
import { useToast } from "@/hooks/use-toast";
import { EmailAuthDialog } from './EmailAuthDialog';

interface SocialLoginProps {
  title?: string;
  description?: string;
}

export function SocialLogin({ 
  title = "Sign in to continue",
  description = "Access your goals, tasks, and personalized features"
}: SocialLoginProps) {
  const { toast } = useToast();
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  
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
  
  const handleGoogleLogin = () => {
    window.location.href = `/api/auth/google${getReturnToParam()}`;
  };
  
  const handleFacebookLogin = () => {
    window.location.href = `/api/auth/facebook${getReturnToParam()}`;
  };

  const handleReplitLogin = () => {
    // Replit Auth handles multiple providers (X/Twitter, Apple)
    window.location.href = `/api/login${getReturnToParam()}`;
  };

  return (
    <Card className="w-full max-w-md mx-auto" data-testid="card-social-login">
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

        {/* Google Sign In via Passport.js */}
        <Button
          variant="outline"
          onClick={handleGoogleLogin}
          className="w-full min-h-[44px] h-auto py-2.5 text-sm sm:text-base justify-start"
          data-testid="button-login-google"
        >
          <SiGoogle className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-[#4285F4] shrink-0" />
          <span className="truncate">Sign in with Google</span>
        </Button>

        {/* Facebook Sign In via Passport.js */}
        <Button
          variant="outline"
          onClick={handleFacebookLogin}
          className="w-full min-h-[44px] h-auto py-2.5 text-sm sm:text-base justify-start bg-[#1877F2]/10 border-[#1877F2]/30"
          data-testid="button-login-facebook"
        >
          <SiFacebook className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-[#1877F2] shrink-0" />
          <span className="truncate">Sign in with Facebook</span>
        </Button>

        {/* X (Twitter) Sign In via Replit Auth */}
        <Button
          variant="outline"
          onClick={handleReplitLogin}
          className="w-full min-h-[44px] h-auto py-2.5 text-sm sm:text-base justify-start"
          data-testid="button-login-x"
        >
          <FaXTwitter className="w-4 h-4 sm:w-5 sm:h-5 mr-2 shrink-0" />
          <span className="truncate">Sign in with X</span>
        </Button>

        {/* Apple Sign In via Replit Auth */}
        <Button
          variant="outline"
          onClick={handleReplitLogin}
          className="w-full min-h-[44px] h-auto py-2.5 text-sm sm:text-base justify-start"
          data-testid="button-login-apple"
        >
          <SiApple className="w-4 h-4 sm:w-5 sm:h-5 mr-2 shrink-0" />
          <span className="truncate">Sign in with Apple</span>
        </Button>

        {/* Terms and Privacy */}
        <p className="text-xs text-muted-foreground text-center leading-5 pt-2 px-2" data-testid="text-terms">
          By continuing, you agree to our{" "}
          <a href="#" className="underline underline-offset-4 hover:text-primary">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="underline underline-offset-4 hover:text-primary">
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
