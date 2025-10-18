import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { SocialLogin } from '@/components/SocialLogin';
import { useAuth } from '@/hooks/useAuth';

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
      
      // If there's a share token, copy the activity first
      if (shareToken) {
        setCopyingActivity(true);
        
        fetch(`/api/activities/copy/${shareToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
          .then(res => res.json())
          .then(data => {
            if (data.activity?.id) {
              // Redirect to the copied activity
              window.location.href = `/?activity=${data.activity.id}&tab=tasks`;
            } else {
              // If copy failed, just redirect to returnTo or home
              if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
                window.location.href = returnTo;
              } else {
                setLocation('/');
              }
            }
          })
          .catch(error => {
            console.error('Failed to copy activity:', error);
            // On error, redirect to returnTo or home
            if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
              window.location.href = returnTo;
            } else {
              setLocation('/');
            }
          });
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <SocialLogin 
        title="Sign in to IntentAI"
        description="Access your goals, activities, and personalized features"
      />
    </div>
  );
}
