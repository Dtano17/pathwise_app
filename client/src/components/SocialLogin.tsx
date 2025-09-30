import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SiGoogle, SiFacebook, SiApple, SiGithub } from "react-icons/si";
import { Mail } from "lucide-react";
import { FaXTwitter } from "react-icons/fa6";

interface SocialLoginProps {
  title?: string;
  description?: string;
}

export function SocialLogin({ 
  title = "Sign in to continue",
  description = "Access your goals, tasks, and personalized features"
}: SocialLoginProps) {
  
  const handleSocialLogin = () => {
    // All buttons redirect to Replit authentication
    // Replit will handle the specific provider selection
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
      <CardContent className="space-y-3">
        {/* Email Sign In */}
        <Button
          variant="outline"
          onClick={handleSocialLogin}
          className="w-full h-11 text-base justify-start"
          data-testid="button-login-email"
        >
          <Mail className="w-5 h-5 mr-2" />
          Sign in with Email
        </Button>

        {/* Google Sign In */}
        <Button
          variant="outline"
          onClick={handleSocialLogin}
          className="w-full h-11 text-base justify-start"
          data-testid="button-login-google"
        >
          <SiGoogle className="w-5 h-5 mr-2 text-[#4285F4]" />
          Sign in with Google
        </Button>

        {/* GitHub Sign In */}
        <Button
          variant="outline"
          onClick={handleSocialLogin}
          className="w-full h-11 text-base justify-start"
          data-testid="button-login-github"
        >
          <SiGithub className="w-5 h-5 mr-2" />
          Sign in with GitHub
        </Button>

        {/* X (Twitter) Sign In */}
        <Button
          variant="outline"
          onClick={handleSocialLogin}
          className="w-full h-11 text-base justify-start"
          data-testid="button-login-x"
        >
          <FaXTwitter className="w-5 h-5 mr-2" />
          Sign in with X
        </Button>

        {/* Apple Sign In */}
        <Button
          variant="outline"
          onClick={handleSocialLogin}
          className="w-full h-11 text-base justify-start"
          data-testid="button-login-apple"
        >
          <SiApple className="w-5 h-5 mr-2" />
          Sign in with Apple
        </Button>

        {/* Facebook Sign In */}
        <Button
          variant="outline"
          onClick={handleSocialLogin}
          className="w-full h-11 text-base justify-start"
          data-testid="button-login-facebook"
        >
          <SiFacebook className="w-5 h-5 mr-2 text-[#1877F2]" />
          Sign in with Facebook
        </Button>

        {/* Terms and Privacy */}
        <p className="text-xs text-muted-foreground text-center leading-5 pt-2" data-testid="text-terms">
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