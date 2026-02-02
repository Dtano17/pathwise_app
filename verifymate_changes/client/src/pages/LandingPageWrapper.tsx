import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import LandingPage from './LandingPage';

export default function LandingPageWrapper() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect authenticated users to /app
    if (!isLoading && isAuthenticated) {
      setLocation('/app');
    }
  }, [isAuthenticated, isLoading, setLocation]);

  // Always render the landing page, even while loading
  // The useEffect will handle redirects once auth state is determined
  return <LandingPage />;
}
