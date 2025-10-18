import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, User, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface EmailAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmailAuthDialog({ open, onOpenChange }: EmailAuthDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup state
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupFirstName, setSignupFirstName] = useState('');
  const [signupLastName, setSignupLastName] = useState('');
  
  // Validation state
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [passwordValid, setPasswordValid] = useState(false);

  // Debounced username availability check
  useEffect(() => {
    if (!signupUsername || signupUsername.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    // Check if username matches required pattern
    if (!/^[a-zA-Z0-9_-]+$/.test(signupUsername)) {
      setUsernameStatus('invalid');
      return;
    }

    setUsernameStatus('checking');
    
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`/api/auth/username-availability?username=${encodeURIComponent(signupUsername)}`);
        const data = await response.json();
        
        if (data.available) {
          setUsernameStatus('available');
        } else if (data.reason === 'taken') {
          setUsernameStatus('taken');
        } else if (data.reason === 'invalid_format') {
          setUsernameStatus('invalid');
        } else {
          setUsernameStatus('idle');
        }
      } catch (error) {
        console.error('Username availability check failed:', error);
        setUsernameStatus('idle');
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [signupUsername]);

  // Password validation
  useEffect(() => {
    const hasMinLength = signupPassword.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(signupPassword);
    const hasNumber = /[0-9]/.test(signupPassword);
    const hasSpecial = /[^a-zA-Z0-9]/.test(signupPassword);
    
    setPasswordValid(hasMinLength && hasLetter && hasNumber && hasSpecial);
  }, [signupPassword]);

  // Reset form state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Clear all form fields
      setLoginEmail('');
      setLoginPassword('');
      setSignupUsername('');
      setSignupEmail('');
      setSignupPassword('');
      setSignupFirstName('');
      setSignupLastName('');
      setIsLoading(false);
    }
    onOpenChange(newOpen);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "Login Failed",
          description: data.error || "Invalid email or password",
          variant: "destructive"
        });
        return;
      }

      if (data.success) {
        toast({
          title: "Welcome back!",
          description: "You've successfully signed in."
        });
        handleOpenChange(false);
        // Refresh the page to load user data
        window.location.reload();
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: signupUsername,
          email: signupEmail,
          password: signupPassword,
          firstName: signupFirstName || undefined,
          lastName: signupLastName || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "Signup Failed",
          description: data.error || "Failed to create account",
          variant: "destructive"
        });
        return;
      }

      if (data.success) {
        toast({
          title: "Welcome to JournalMate!",
          description: "Your account has been created successfully."
        });
        handleOpenChange(false);
        // Refresh the page to load user data
        window.location.reload();
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: "Signup Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Email Authentication</DialogTitle>
          <DialogDescription>
            Sign in to your existing account or create a new one
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="signup" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signup" data-testid="tab-signup">Sign Up</TabsTrigger>
            <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4 mt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="pl-9"
                    required
                    data-testid="input-login-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="pl-9"
                    required
                    data-testid="input-login-password"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                data-testid="button-submit-login"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4 mt-4">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-username">Username *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-username"
                    type="text"
                    placeholder="username"
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                    className="pl-9 pr-10"
                    required
                    minLength={3}
                    maxLength={30}
                    pattern="[a-zA-Z0-9_-]+"
                    data-testid="input-signup-username"
                  />
                  {signupUsername.length >= 3 && (
                    <div className="absolute right-3 top-3">
                      {usernameStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      {usernameStatus === 'available' && <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />}
                      {usernameStatus === 'taken' && <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />}
                      {usernameStatus === 'invalid' && <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {usernameStatus === 'invalid' 
                    ? 'Only letters, numbers, underscores, and hyphens allowed'
                    : usernameStatus === 'taken'
                    ? 'This username is already taken'
                    : '3-30 characters, letters, numbers, underscores, and hyphens only'
                  }
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="pl-9"
                    required
                    data-testid="input-signup-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="pl-9"
                    required
                    minLength={8}
                    data-testid="input-signup-password"
                  />
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Password must contain:</p>
                  <ul className="list-disc list-inside space-y-0.5 ml-1">
                    <li className={signupPassword.length >= 8 ? 'text-green-600 dark:text-green-400' : ''}>At least 8 characters</li>
                    <li className={/[a-zA-Z]/.test(signupPassword) ? 'text-green-600 dark:text-green-400' : ''}>At least one letter</li>
                    <li className={/[0-9]/.test(signupPassword) ? 'text-green-600 dark:text-green-400' : ''}>At least one number</li>
                    <li className={/[^a-zA-Z0-9]/.test(signupPassword) ? 'text-green-600 dark:text-green-400' : ''}>At least one special character (!@#$%^&*)</li>
                  </ul>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-firstname">First Name</Label>
                  <Input
                    id="signup-firstname"
                    type="text"
                    placeholder="John"
                    value={signupFirstName}
                    onChange={(e) => setSignupFirstName(e.target.value)}
                    data-testid="input-signup-firstname"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-lastname">Last Name</Label>
                  <Input
                    id="signup-lastname"
                    type="text"
                    placeholder="Doe"
                    value={signupLastName}
                    onChange={(e) => setSignupLastName(e.target.value)}
                    data-testid="input-signup-lastname"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !passwordValid || usernameStatus !== 'available'}
                data-testid="button-submit-signup"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
