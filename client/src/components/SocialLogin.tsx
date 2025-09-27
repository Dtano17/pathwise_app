import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SiGoogle, SiFacebook, SiApple, SiInstagram } from "react-icons/si";
import { Sparkles } from "lucide-react";

interface SocialLoginProps {
  title?: string;
  description?: string;
  showReplitAuth?: boolean;
}

export function SocialLogin({ 
  title = "Sign in to your account",
  description = "Choose your preferred sign-in method",
  showReplitAuth = true
}: SocialLoginProps) {
  
  const handleSocialLogin = (provider: string) => {
    window.location.href = `/api/auth/${provider}`;
  };

  const handleReplitLogin = () => {
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
        {/* Replit Auth - Primary Option */}
        {showReplitAuth && (
          <>
            <Button 
              onClick={handleReplitLogin}
              className="w-full h-11 text-base"
              data-testid="button-login-replit"
            >
              <Sparkles className="w-5 h-5" />
              Sign in with Replit
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or sign in with
                </span>
              </div>
            </div>
          </>
        )}

        {/* Social Login Options */}
        <div className="grid grid-cols-1 gap-3">
          {/* Google */}
          <Button
            variant="outline"
            onClick={() => handleSocialLogin('google')}
            className="w-full h-11 text-base justify-start"
            data-testid="button-login-google"
          >
            <SiGoogle className="w-5 h-5 text-[#4285F4]" />
            Sign in with Google
          </Button>

          {/* Facebook */}
          <Button
            variant="outline"
            onClick={() => handleSocialLogin('facebook')}
            className="w-full h-11 text-base justify-start"
            data-testid="button-login-facebook"
          >
            <SiFacebook className="w-5 h-5 text-[#1877F2]" />
            Sign in with Facebook
          </Button>

          {/* Apple */}
          <Button
            variant="outline"
            onClick={() => handleSocialLogin('apple')}
            className="w-full h-11 text-base justify-start"
            data-testid="button-login-apple"
          >
            <SiApple className="w-5 h-5 text-foreground" />
            Sign in with Apple
          </Button>

          {/* Instagram */}
          <Button
            variant="outline"
            onClick={() => handleSocialLogin('instagram')}
            className="w-full h-11 text-base justify-start"
            data-testid="button-login-instagram"
          >
            <SiInstagram className="w-5 h-5 text-[#E4405F]" />
            Sign in with Instagram
          </Button>
        </div>

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