import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { SocialLogin } from '@/components/SocialLogin';
import { useAuth } from '@/hooks/useAuth';

export default function Login() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  
  useEffect(() => {
    // If already authenticated, redirect to the return URL or home
    if (isAuthenticated) {
      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get('returnTo');
      
      // Validate returnTo is a safe same-origin path (prevent open redirect)
      if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
        window.location.href = returnTo;
      } else {
        setLocation('/');
      }
    }
  }, [isAuthenticated, setLocation]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <SocialLogin 
        title="Sign in to IntentAI"
        description="Access your goals, activities, and personalized features"
      />
    </div>
  );
}
