import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

interface SocialLoginProps {
  title?: string;
  description?: string;
}

export function SocialLogin({ 
  title = "Sign in to continue",
  description = "Access your goals, tasks, and personalized features"
}: SocialLoginProps) {
  
  const handleSocialLogin = () => {
    window.location.href = '/api/login';
  };

  return (
    <Card className="w-full max-w-md mx-auto" data-testid="card-social-login">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold" data-testid="text-login-title">
          {title}
        </CardTitle>
        <CardDescription data-testid="text-login-description">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Social Media Sign In via Replit */}
        <Button 
          onClick={handleSocialLogin}
          className="w-full h-12 text-base"
          data-testid="button-login-social"
        >
          <Users className="w-5 h-5 mr-2" />
          Sign in with your social media
        </Button>

        {/* Terms and Privacy */}
        <p className="text-xs text-muted-foreground text-center leading-5" data-testid="text-terms">
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
    </Card>
  );
}