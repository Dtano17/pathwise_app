import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Home, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import DiscoverPlansView from "@/components/discover/DiscoverPlansView";

export default function CommunityPlansPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Navigation Buttons */}
        <div className="flex gap-2 mb-6">
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-home">
              <Home className="w-4 h-4" />
              Home
            </Button>
          </Link>
        </div>

        {/* Community Guidelines Card */}
        <Card className="mb-8 border-2 border-blue-200 dark:border-blue-900">
          <CardContent className="pt-6">
            <div className="flex gap-4 mb-4">
              <AlertCircle className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h2 className="text-lg font-bold mb-3">Community Plan Guidelines</h2>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm"><strong>Use Common Sense:</strong> Validate plans based on the original social media reference and apply critical thinking to all content</p>
                  </div>
                  <div className="flex gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm"><strong>Check the Source:</strong> For imported plans, verify the original social media, AI platform, or reference for accuracy and context</p>
                  </div>
                  <div className="flex gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm"><strong>Adapt to Your Situation:</strong> Don't follow plans blindly—customize them based on your goals, capabilities, and circumstances</p>
                  </div>
                  <div className="flex gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm"><strong>Remix Responsibly:</strong> When combining multiple plans, review and edit the merged result to ensure it makes sense for you</p>
                  </div>
                  <div className="flex gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm"><strong>Consult Professionals:</strong> For specialized advice (medical, legal, financial), consult qualified professionals—don't rely solely on plans</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-xs text-muted-foreground flex-1">
                JournalMate provides tools to discover, remix, and share plans from the community. However, you are responsible for validating and making appropriate use of any plan you adopt or share.
              </p>
              <Link href="/terms">
                <Button variant="ghost" size="sm" className="gap-2 ml-4 flex-shrink-0" data-testid="button-learn-more-guidelines">
                  Learn More
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Discover Plans View */}
        <DiscoverPlansView />
      </div>
    </div>
  );
}
