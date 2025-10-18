import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { SocialLogin } from '@/components/SocialLogin';
import { useAuth } from '@/hooks/useAuth';
import journalMateLogo from '@assets/Export_JournalMate_2_1760772138217.png';

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
                  window.location.href = `/?activity=${data.activity.id}&tab=tasks`;
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-emerald-50 to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center mb-3 sm:mb-4">
            <img 
              src={journalMateLogo} 
              alt="JournalMate" 
              className="w-16 h-16 sm:w-20 sm:h-20"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-emerald-600 bg-clip-text text-transparent mb-2">
            JournalMate
          </h1>
          <p className="text-muted-foreground text-sm">
            Your AI-powered life planning companion
          </p>
        </div>

        {/* Social Login Component */}
        <SocialLogin 
          title="Welcome back"
          description="Sign in to continue your journey"
        />
      </div>
    </div>
  );
}
