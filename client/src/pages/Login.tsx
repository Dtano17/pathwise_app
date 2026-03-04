import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { SocialLogin } from '@/components/SocialLogin';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
// Using transparent logo for light/dark mode compatibility
const journalMateLogo = '/journalmate-logo-transparent.png';

export default function Login() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [copyingActivity, setCopyingActivity] = useState(false);
  
  useEffect(() => {
    // If already authenticated, check for share token to copy activity
    if (isAuthenticated && !copyingActivity) {
      const params = new URLSearchParams(window.location.search);
      const shareToken = params.get('shareToken');
      const returnTo = params.get('returnTo');
      
      // If there's a share token, copy the activity first with retry logic
      if (shareToken) {
        setCopyingActivity(true);
        
        // Add a small delay to allow session to fully establish
        const attemptCopy = (retries = 3, delay = 500) => {
          const nextDelay = delay * 1.5; // Calculate next delay before setTimeout
          
          setTimeout(() => {
            fetch(`/api/activities/copy/${shareToken}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            })
              .then(res => res.json())
              .then(data => {
                if (data.activity?.id) {
                  // Success - redirect to the copied activity
                  window.location.href = `/?activity=${data.activity.id}`;
                } else if (data.requiresAuth && retries > 0) {
                  // Session not ready yet, retry with exponential backoff
                  console.log(`Session not ready, retrying in ${Math.round(nextDelay)}ms... (${retries} attempts left)`);
                  attemptCopy(retries - 1, nextDelay);
                } else {
                  // Copy failed, redirect to returnTo or home
                  console.error('Failed to copy activity:', data.error || 'Unknown error');
                  if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
                    window.location.href = returnTo;
                  } else {
                    setLocation('/');
                  }
                }
              })
              .catch(error => {
                console.error('Failed to copy activity:', error);
                if (retries > 0) {
                  // Network error, retry with exponential backoff
                  console.log(`Network error, retrying in ${Math.round(nextDelay)}ms... (${retries} attempts left)`);
                  attemptCopy(retries - 1, nextDelay);
                } else {
                  // Max retries reached, redirect to returnTo or home
                  if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
                    window.location.href = returnTo;
                  } else {
                    setLocation('/');
                  }
                }
              });
          }, delay);
        };
        
        // Start the copy attempt with retry logic
        attemptCopy();
        return;
      }
      
      // No share token, just redirect normally
      if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
        window.location.href = returnTo;
      } else {
        setLocation('/');
      }
    }
  }, [isAuthenticated, setLocation, copyingActivity]);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-gray-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200/30 dark:bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-200/30 dark:bg-emerald-900/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <Link href="/">
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute -top-12 left-0 text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
            Back to Home
          </Button>
        </Link>

        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl shadow-2xl p-8 sm:p-10">
          {/* Logo and Branding */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150" />
                <img 
                  src={journalMateLogo} 
                  alt="JournalMate" 
                  className="w-16 h-16 sm:w-20 sm:h-20 relative z-10 drop-shadow-sm"
                />
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
              JournalMate
            </h1>
            <p className="text-muted-foreground text-sm font-medium">
              Your AI-powered life planning companion
            </p>
          </div>

          {/* Social Login Component */}
          <div className="space-y-6">
            <SocialLogin 
              title="Welcome back"
              description="Sign in to continue your journey"
            />
            
            <p className="text-center text-[11px] text-muted-foreground/60 px-4 leading-relaxed">
              By continuing, you agree to our{' '}
              <Link href="/terms" className="underline hover:text-primary transition-colors">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="underline hover:text-primary transition-colors">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
