import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, Sparkles } from "lucide-react";
import Confetti from "react-confetti";

function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}

export default function SubscriptionSuccess() {
  const [, setLocation] = useLocation();
  const [showConfetti, setShowConfetti] = useState(true);
  const { width, height } = useWindowSize();

  // Get session_id from URL query params
  const searchParams = new URLSearchParams(window.location.search);
  const sessionId = searchParams.get('session_id');

  // Fetch updated user data to confirm subscription
  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/user'],
    refetchInterval: false,
  });

  useEffect(() => {
    // Stop confetti after 5 seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const getTierName = (tier: string) => {
    if (tier === 'pro') return 'Pro';
    if (tier === 'family') return 'Family & Friends';
    return 'Free';
  };

  const getTierFeatures = (tier: string) => {
    if (tier === 'pro') {
      return [
        'Unlimited AI plans',
        'Smart favorites & collections',
        'Journal insights & analytics',
        'Export your data anytime',
        'Priority support'
      ];
    }
    if (tier === 'family') {
      return [
        'Everything in Pro',
        'Up to 5 users',
        'Collaborative planning',
        'Shared family calendar',
        'Group insights & analytics'
      ];
    }
    return [];
  };

  const tier = user?.subscriptionTier || 'free';
  const features = getTierFeatures(tier);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-background to-emerald-50 dark:from-purple-950/20 dark:via-background dark:to-emerald-950/20 p-4">
      {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={500} />}
      
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="flex justify-center">
            <div className="relative">
              <CheckCircle className="h-20 w-20 text-emerald-500" />
              <Sparkles className="h-8 w-8 text-purple-500 absolute -top-2 -right-2 animate-pulse" />
            </div>
          </div>
          
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-emerald-600 bg-clip-text text-transparent">
              Welcome to {getTierName(tier)}! 🎉
            </CardTitle>
            <CardDescription className="text-lg">
              Your subscription is now active with a 7-day free trial
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Trial Information */}
          <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
              Your 7-Day Free Trial Has Started
            </h3>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              You won't be charged until your trial ends. Cancel anytime before then at no cost.
            </p>
          </div>

          {/* Features List */}
          {features.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">What You Get:</h3>
              <ul className="space-y-2">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Session ID (for debugging) */}
          {sessionId && (
            <div className="text-xs text-muted-foreground pt-4 border-t">
              <p>Session ID: {sessionId}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={() => setLocation('/')}
              className="flex-1"
              size="lg"
              data-testid="button-start-planning"
            >
              Start Planning
            </Button>
            <Button
              onClick={() => setLocation('/')}
              variant="outline"
              className="flex-1"
              size="lg"
              data-testid="button-go-home"
            >
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
