import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import LandingPage from './LandingPage';

export default function LandingPageWrapper() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // In production, redirect authenticated users to /app
    const isProduction = import.meta.env.PROD;
    const forceLanding = import.meta.env.VITE_FORCE_LANDING_PAGE === 'true';

    if (!isLoading && isAuthenticated && (isProduction || forceLanding)) {
      setLocation('/app');
    }
  }, [isAuthenticated, isLoading, setLocation]);

  // Always render the landing page, even while loading
  // The useEffect will handle redirects once auth state is determined
  return <LandingPage />;
}
