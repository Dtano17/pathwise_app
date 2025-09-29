import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiGoogle, SiFacebook, SiApple, SiInstagram } from "react-icons/si";
import { Sparkles, Mail, ArrowLeft } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";

interface SocialLoginProps {
  title?: string;
  description?: string;
  showReplitAuth?: boolean;
}

interface LoginFormData {
  email: string;
  password: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
}

export function SocialLogin({ 
  title = "Sign in to your account",
  description = "Choose your preferred sign-in method",
  showReplitAuth = true
}: SocialLoginProps) {
  
  const { signInWithFacebook, signInWithGoogle, signInWithEmail, signUpWithEmail, isProcessing } = useSupabaseAuth();
  const { toast } = useToast();
  const [showManualAuth, setShowManualAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    username: ''
  });
  
  const handleSocialLogin = async (provider: string) => {
    try {
      if (provider === 'facebook') {
        await signInWithFacebook();
      } else if (provider === 'google') {
        await signInWithGoogle();
      } else {
        // Fallback for other providers that aren't yet implemented in Supabase
        window.location.href = `/api/auth/${provider}`;
      }
    } catch (error) {
      // Error handling is done in the useSupabaseAuth hook
      console.error(`${provider} login error:`, error);
    }
  };

  const handleReplitLogin = () => {
    window.location.href = '/api/login';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signInWithEmail(formData.email, formData.password);
      // Success handled by useSupabaseAuth hook
      setShowManualAuth(false); // Close the manual auth form
    } catch (error) {
      // Error handling is done in the useSupabaseAuth hook
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const metadata = {
        username: formData.username || formData.email.split('@')[0],
        firstName: formData.firstName,
        lastName: formData.lastName,
        full_name: `${formData.firstName || ''} ${formData.lastName || ''}`.trim()
      };

      await signUpWithEmail(formData.email, formData.password, metadata);
      // Success handled by useSupabaseAuth hook
      setShowManualAuth(false); // Close the manual auth form
    } catch (error) {
      // Error handling is done in the useSupabaseAuth hook
    } finally {
      setIsLoading(false);
    }
  };

  if (showManualAuth) {
    return (
      <Card className="w-full max-w-md mx-auto" data-testid="card-manual-auth">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {isSignUp ? "Create Account" : "Sign In"}
          </CardTitle>
          <CardDescription>
            {isSignUp ? "Create your account to get started" : "Enter your credentials to sign in"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={isSignUp ? handleManualSignup : handleManualLogin} className="space-y-4">
            {isSignUp && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Doe"
                  />
                </div>
              </div>
            )}
            
            {isSignUp && (
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="johndoe"
                />
              </div>
            )}
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="you@example.com"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                required
              />
            </div>
            
            {isSignUp && (
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  required
                />
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
              data-testid={isSignUp ? "button-signup" : "button-login"}
            >
              {isLoading ? "Please wait..." : (isSignUp ? "Create Account" : "Sign In")}
            </Button>
          </form>
          
          <div className="text-center space-y-2">
            <Button
              variant="ghost"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm"
            >
              {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </Button>
            
            <Button
              variant="ghost"
              onClick={() => setShowManualAuth(false)}
              className="w-full text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to social login
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

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

        {/* Manual Login Option */}
        <Button
          variant="outline"
          onClick={() => setShowManualAuth(true)}
          className="w-full h-11 text-base justify-start"
          data-testid="button-manual-login"
        >
          <Mail className="w-5 h-5" />
          Sign in with Email
        </Button>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

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