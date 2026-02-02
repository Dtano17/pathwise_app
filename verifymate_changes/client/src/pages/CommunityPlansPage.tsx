import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
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

        {/* Discover Plans View */}
        <DiscoverPlansView />
      </div>
    </div>
  );
}
