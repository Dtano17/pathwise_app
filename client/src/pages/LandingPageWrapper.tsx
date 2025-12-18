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

  return <LandingPage />;
}
