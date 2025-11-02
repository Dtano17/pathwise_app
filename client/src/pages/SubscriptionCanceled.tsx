import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";

export default function SubscriptionCanceled() {
  const [, setLocation] = useLocation();

  const handleRetry = () => {
    // Go back to home and open settings/upgrade modal
    setLocation('/');
    // The user can manually open settings to try again
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="flex justify-center">
            <XCircle className="h-20 w-20 text-orange-500" />
          </div>
          
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold">
              Subscription Canceled
            </CardTitle>
            <CardDescription className="text-base">
              No worries! Your payment was not processed.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground">
            <p className="mb-2">
              You can still use all free tier features including:
            </p>
            <ul className="space-y-1 ml-4 list-disc">
              <li>5 AI plans per month</li>
              <li>Unlimited real-time data enrichment</li>
              <li>Personal journaling</li>
              <li>Task management</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => setLocation('/')}
              className="w-full"
              size="lg"
              data-testid="button-go-home"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Dashboard
            </Button>
            
            <Button
              onClick={handleRetry}
              variant="outline"
              className="w-full"
              size="lg"
              data-testid="button-try-again"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground pt-4 border-t">
            <p>
              Questions? Contact us at{' '}
              <a href="mailto:support@intentai.com" className="text-primary hover:underline">
                support@intentai.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
