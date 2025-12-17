import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SiGoogle } from "react-icons/si";
import { Mail } from "lucide-react";
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
