import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Upload, Infinity as InfinityIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: 'planLimit' | 'favorites' | 'export' | 'insights';
  planCount?: number;
  planLimit?: number;
}

const PRICE_IDS = {
  pro_monthly: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
  pro_annual: import.meta.env.VITE_STRIPE_PRICE_PRO_ANNUAL || 'price_pro_annual',
  family_monthly: import.meta.env.VITE_STRIPE_PRICE_FAMILY_MONTHLY || 'price_family_monthly',
  family_annual: import.meta.env.VITE_STRIPE_PRICE_FAMILY_ANNUAL || 'price_family_annual',
};

export function UpgradeModal({ open, onOpenChange, trigger, planCount, planLimit }: UpgradeModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const getTriggerMessage = () => {
    switch (trigger) {
      case 'planLimit':
        return {
          title: "Plan Limit Reached",
          description: `You've used ${planCount} of ${planLimit} AI plans this month on the free tier.`
        };
      case 'favorites':
        return {
          title: "Upgrade for Smart Favorites",
          description: "Organize, filter, and search your favorite plans with advanced features."
        };
      case 'export':
        return {
          title: "Export Requires Pro",
          description: "Export all your activities, tasks, and journal entries to CSV or JSON."
        };
      case 'insights':
        return {
          title: "Unlock Journal Insights",
          description: "Get AI-powered insights from your journal entries and track your progress over time."
        };
      default:
        return {
          title: "Upgrade to Pro",
          description: "Unlock unlimited AI plans and premium features."
        };
    }
  };

  const { title, description } = getTriggerMessage();

  const handleCheckout = async (priceId: string, tier: 'pro' | 'family') => {
    setLoading(true);
    try {
      const response = await apiRequest('POST', '/api/subscription/checkout', { priceId, tier });
      
      // Check if response is OK before parsing
      if (!response.ok) {
        let errorMessage = "Failed to start checkout";
        
        // Try to parse error message if response has JSON content
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch {
            // Failed to parse JSON, use default message
          }
        }
        
        // Check if this is an annual plan error
        const isAnnualPlanError = errorMessage.includes('price_pro_annual') || 
                                  errorMessage.includes('price_family_annual');
        
        toast({
          title: isAnnualPlanError ? "Annual Plans Coming Soon" : "Error",
          description: isAnnualPlanError 
            ? "Annual subscriptions are being configured. Please use the monthly plan for now."
            : errorMessage,
          variant: isAnnualPlanError ? "default" : "destructive"
        });
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        // No redirect URL received
        toast({
          title: "Error",
          description: "Failed to create checkout session. Please try again.",
          variant: "destructive"
        });
        setLoading(false);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto px-4 sm:px-6" data-testid="dialog-upgrade">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">{description}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Pro Plan */}
          <div className="border rounded-lg p-4 sm:p-6 space-y-3 sm:space-y-4 hover-elevate transition-all" data-testid="card-pro-plan">
            <div>
              <h3 className="font-bold text-lg sm:text-xl">Pro</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">Perfect for individuals</p>
            </div>
            
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-bold">$6.99</span>
                <span className="text-sm sm:text-base text-muted-foreground">/month</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                or $59.99/year <span className="text-green-600 font-medium">(save 30%)</span>
              </p>
            </div>

            <ul className="space-y-1.5 sm:space-y-2">
              <li className="flex items-start gap-2">
                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium">10 social media imports/month (Monthly)</span>
              </li>
              <li className="flex items-start gap-2">
                <InfinityIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-purple-700 dark:text-purple-300">Unlimited social media imports (Yearly)</span>
              </li>
              {['Unlimited AI plans', 'Task progress & analytics', 'Smart favorites organization', 'Journal insights', 'Export all your data', 'Priority support'].map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-2 pt-2">
              <Button
                className="w-full text-sm sm:text-base"
                onClick={() => handleCheckout(PRICE_IDS.pro_monthly, 'pro')}
                disabled={loading}
                data-testid="button-subscribe-pro-monthly"
              >
                Subscribe Monthly
              </Button>
              <Button
                variant="outline"
                className="w-full text-xs sm:text-sm"
                onClick={() => handleCheckout(PRICE_IDS.pro_annual, 'pro')}
                disabled={loading}
                data-testid="button-subscribe-pro-annual"
              >
                Subscribe Annually - Save 30%
              </Button>
            </div>
          </div>

          {/* Family & Friends Plan */}
          <div className="border rounded-lg p-4 sm:p-6 space-y-3 sm:space-y-4 hover-elevate transition-all relative" data-testid="card-family-plan">
            <div className="absolute -top-3 right-2 sm:right-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium">
              Best Value
            </div>
            
            <div>
              <h3 className="font-bold text-lg sm:text-xl">Family & Friends</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">5 or more family & friends</p>
            </div>
            
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-bold">$14.99</span>
                <span className="text-sm sm:text-base text-muted-foreground">/month</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                or $125.99/year <span className="text-green-600 font-medium">(save 30%)</span>
              </p>
            </div>

            <ul className="space-y-1.5 sm:space-y-2">
              <li className="flex items-start gap-2">
                <InfinityIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-500 mt-0.5 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-pink-700 dark:text-pink-300">Unlimited social media imports</span>
              </li>
              {['Everything in Pro', 'Plan & track with imported/discovered plans', 'Group progress tracking with live updates', 'Collaborative planning'].map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-2 pt-2">
              <Button
                className="w-full text-sm sm:text-base"
                onClick={() => handleCheckout(PRICE_IDS.family_monthly, 'family')}
                disabled={loading}
                data-testid="button-subscribe-family-monthly"
              >
                Subscribe Monthly
              </Button>
              <Button
                variant="outline"
                className="w-full text-xs sm:text-sm"
                onClick={() => handleCheckout(PRICE_IDS.family_annual, 'family')}
                disabled={loading}
                data-testid="button-subscribe-family-annual"
              >
                Subscribe Annually - Save 30%
              </Button>
            </div>
          </div>
        </div>

        <p className="text-[10px] sm:text-xs text-center text-muted-foreground mt-4">
          7-day free trial included with both plans. Cancel anytime.
        </p>
      </DialogContent>
    </Dialog>
  );
}
