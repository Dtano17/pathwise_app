import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, User, Loader2, CheckCircle2, XCircle, AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';

interface EmailAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmailAuthDialog({ open, onOpenChange }: EmailAuthDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<'auth' | 'forgot'>('auth');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup state
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupFirstName, setSignupFirstName] = useState('');
  const [signupLastName, setSignupLastName] = useState('');

  // Password visibility state
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Validation state
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [passwordValid, setPasswordValid] = useState(false);

  // Debounced username availability check
  useEffect(() => {
    if (!signupUsername || signupUsername.length < 3) {
      setUsernameStatus('idle');
      return;
    }

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
      setLoginEmail('');
      setLoginPassword('');
      setSignupUsername('');
      setSignupEmail('');
      setSignupPassword('');
      setSignupFirstName('');
      setSignupLastName('');
      setForgotEmail('');
      setForgotSent(false);
      setView('auth');
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });

      if (response.ok) {
        setForgotSent(true);
        toast({
          title: "Check your email",
          description: "If an account exists with that email, we've sent a password reset link."
        });
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-white/10 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl [&>button]:text-white/60" overlayClassName="bg-black/30">
        {view === 'forgot' ? (
          <div>
            <button
              onClick={() => { setView('auth'); setForgotSent(false); setForgotEmail(''); }}
              className="flex items-center gap-1 text-white/70 hover:text-white text-sm mb-4 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to login
            </button>

            <h2 className="text-xl font-bold text-white mb-2">Reset Password</h2>
            <p className="text-white/60 text-sm mb-6">
              Enter your email and we'll send you a link to reset your password.
            </p>

            {forgotSent ? (
              <div className="text-center space-y-4">
                <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto" />
                <p className="text-white/80 text-sm">
                  If an account exists with <strong className="text-white">{forgotEmail}</strong>, you'll receive a password reset link shortly.
                </p>
                <p className="text-white/50 text-xs">Check your spam folder if you don't see it.</p>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email" className="text-white/80">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="your@email.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/40"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/20"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </form>
            )}
          </div>
        ) : (
          <div>
            <button
              onClick={() => handleOpenChange(false)}
              className="flex items-center gap-1 text-white/70 hover:text-white text-sm mb-4 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-white">Welcome</h2>
              <p className="text-white/60 text-sm mt-1">
                Sign in or create a new account
              </p>
            </div>

            <Tabs defaultValue="signup" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white/10 border border-white/10">
                <TabsTrigger
                  value="signup"
                  data-testid="tab-signup"
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
                >
                  Sign Up
                </TabsTrigger>
                <TabsTrigger
                  value="login"
                  data-testid="tab-login"
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
                >
                  Login
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 mt-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-white/80">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="your@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/40"
                        required
                        data-testid="input-login-email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-white/80">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      <Input
                        id="login-password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="pl-9 pr-9 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/40"
                        required
                        data-testid="input-login-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => { setView('forgot'); setForgotEmail(loginEmail); }}
                      className="text-xs text-white/50 hover:text-white/80 underline underline-offset-2 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/20"
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
                    <Label htmlFor="signup-username" className="text-white/80">Username *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      <Input
                        id="signup-username"
                        type="text"
                        placeholder="username"
                        value={signupUsername}
                        onChange={(e) => setSignupUsername(e.target.value)}
                        className="pl-9 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/40"
                        required
                        minLength={3}
                        maxLength={30}
                        pattern="[a-zA-Z0-9_-]+"
                        data-testid="input-signup-username"
                      />
                      {signupUsername.length >= 3 && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {usernameStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-white/40" />}
                          {usernameStatus === 'available' && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                          {usernameStatus === 'taken' && <XCircle className="h-4 w-4 text-red-400" />}
                          {usernameStatus === 'invalid' && <AlertCircle className="h-4 w-4 text-amber-400" />}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-white/40">
                      {usernameStatus === 'invalid'
                        ? 'Only letters, numbers, underscores, and hyphens allowed'
                        : usernameStatus === 'taken'
                        ? 'This username is already taken'
                        : '3-30 characters, letters, numbers, underscores, and hyphens only'
                      }
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-white/80">Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your@email.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/40"
                        required
                        data-testid="input-signup-email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-white/80">Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      <Input
                        id="signup-password"
                        type={showSignupPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="pl-9 pr-9 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/40"
                        required
                        minLength={8}
                        data-testid="input-signup-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                      >
                        {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="text-xs text-white/40 space-y-1">
                      <p>Password must contain:</p>
                      <ul className="list-disc list-inside space-y-0.5 ml-1">
                        <li className={signupPassword.length >= 8 ? 'text-green-400' : ''}>At least 8 characters</li>
                        <li className={/[a-zA-Z]/.test(signupPassword) ? 'text-green-400' : ''}>At least one letter</li>
                        <li className={/[0-9]/.test(signupPassword) ? 'text-green-400' : ''}>At least one number</li>
                        <li className={/[^a-zA-Z0-9]/.test(signupPassword) ? 'text-green-400' : ''}>At least one special character (!@#$%^&*)</li>
                      </ul>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-firstname" className="text-white/80">First Name</Label>
                      <Input
                        id="signup-firstname"
                        type="text"
                        placeholder="John"
                        value={signupFirstName}
                        onChange={(e) => setSignupFirstName(e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/40"
                        data-testid="input-signup-firstname"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-lastname" className="text-white/80">Last Name</Label>
                      <Input
                        id="signup-lastname"
                        type="text"
                        placeholder="Doe"
                        value={signupLastName}
                        onChange={(e) => setSignupLastName(e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/40"
                        data-testid="input-signup-lastname"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/20"
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
