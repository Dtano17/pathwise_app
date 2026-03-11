import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, User, Loader2, CheckCircle2, XCircle, AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';

const heroVideoUrl = 'https://storage.googleapis.com/pathwise-media/public/hero_video.mp4';

export default function EmailAuth() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'signup' | 'login'>('signup');

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        toast({ title: "Login Failed", description: data.error || "Invalid email or password", variant: "destructive" });
        return;
      }

      if (data.success) {
        toast({ title: "Welcome back!", description: "You've successfully signed in." });
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({ title: "Login Error", description: "An unexpected error occurred. Please try again.", variant: "destructive" });
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
        toast({ title: "Signup Failed", description: data.error || "Failed to create account", variant: "destructive" });
        return;
      }

      if (data.success) {
        toast({ title: "Welcome to JournalMate!", description: "Your account has been created successfully." });
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast({ title: "Signup Error", description: "An unexpected error occurred. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column' }}>
      <video autoPlay muted playsInline loop poster="/hero_poster.jpg" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(4px)', transform: 'scale(1.05)', zIndex: -2 }}>
        <source src={heroVideoUrl} type="video/mp4" />
      </video>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: -1 }} />

      {/* Back button */}
      <div className="safe-top" style={{ flexShrink: 0, padding: '12px 16px' }}>
        <Link href="/login">
          <button style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>
            <ArrowLeft style={{ width: 16, height: 16 }} />
            Back to Login
          </button>
        </Link>
      </div>

      {/* Scrollable content area */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '8px 16px 32px' }}>
        <div style={{ width: '100%', maxWidth: 448, margin: '0 auto' }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 24, padding: '20px 16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'white', margin: 0 }}>Welcome</h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 4 }}>Sign in or create a new account</p>
            </div>

            {/* Tab buttons - pure inline styles, zero CSS class conflicts */}
            <div className="grid grid-cols-2 w-full max-w-full min-h-[44px] rounded-xl border border-white/10 bg-white/10 p-1 mb-4 overflow-hidden">
              <button
                type="button"
                onClick={() => setActiveTab('signup')}
                data-testid="tab-signup"
                className={`w-full min-w-0 rounded-md text-sm font-medium transition-colors flex items-center justify-center ${
                  activeTab === 'signup' ? 'bg-white/20 text-white' : 'bg-transparent text-white/60 hover:text-white'
                }`}
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                data-testid="tab-login"
                className={`w-full min-w-0 rounded-md text-sm font-medium transition-colors flex items-center justify-center ${
                  activeTab === 'login' ? 'bg-white/20 text-white' : 'bg-transparent text-white/60 hover:text-white'
                }`}
              >
                Login
              </button>
            </div>

            {/* Login form */}
            {activeTab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-white/80">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input id="login-email" type="email" placeholder="your@email.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/40" required data-testid="input-login-email" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-white/80">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input id="login-password" type={showLoginPassword ? "text" : "password"} placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="pl-9 pr-9 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/40" required data-testid="input-login-password" />
                    <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Link href="/forgot-password">
                    <span className="text-xs text-white/50 hover:text-white/80 underline underline-offset-2 transition-colors cursor-pointer">Forgot password?</span>
                  </Link>
                </div>

                <Button type="submit" className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/20" disabled={isLoading} data-testid="button-submit-login">
                  {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</>) : ('Sign In')}
                </Button>
              </form>
            )}

            {/* Signup form */}
            {activeTab === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-username" className="text-white/80">Username *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input id="signup-username" type="text" placeholder="username" value={signupUsername} onChange={(e) => setSignupUsername(e.target.value)} className="pl-9 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/40" required minLength={3} maxLength={30} pattern="[a-zA-Z0-9_-]+" data-testid="input-signup-username" />
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
                    {usernameStatus === 'invalid' ? 'Only letters, numbers, underscores, and hyphens allowed' : usernameStatus === 'taken' ? 'This username is already taken' : '3-30 characters, letters, numbers, underscores, and hyphens only'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-white/80">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input id="signup-email" type="email" placeholder="your@email.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/40" required data-testid="input-signup-email" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-white/80">Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input id="signup-password" type={showSignupPassword ? "text" : "password"} placeholder="••••••••" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} className="pl-9 pr-9 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/40" required minLength={8} data-testid="input-signup-password" />
                    <button type="button" onClick={() => setShowSignupPassword(!showSignupPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
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
                    <Input id="signup-firstname" type="text" placeholder="John" value={signupFirstName} onChange={(e) => setSignupFirstName(e.target.value)} className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/40" data-testid="input-signup-firstname" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-lastname" className="text-white/80">Last Name</Label>
                    <Input id="signup-lastname" type="text" placeholder="Doe" value={signupLastName} onChange={(e) => setSignupLastName(e.target.value)} className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/40" data-testid="input-signup-lastname" />
                  </div>
                </div>

                <Button type="submit" className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/20" disabled={isLoading || !passwordValid || usernameStatus !== 'available'} data-testid="button-submit-signup">
                  {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account...</>) : ('Create Account')}
                </Button>
              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
