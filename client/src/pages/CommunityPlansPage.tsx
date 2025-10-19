import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Heart, Eye, Search, Sparkles } from "lucide-react";
import type { Activity } from "@shared/schema";

// Stock image imports
import romanticParisCityscape from "@assets/stock_images/romantic_paris_citys_dfc7c798.jpg";
import fitnessWorkoutGym from "@assets/stock_images/fitness_workout_gym__2325ee98.jpg";
import elegantWeddingCeremony from "@assets/stock_images/elegant_wedding_cere_9aa2c585.jpg";
import modernTechWorkspace from "@assets/stock_images/modern_tech_workspac_ef8fa108.jpg";
import beautifulModernHome from "@assets/stock_images/beautiful_modern_hom_0f24a3e6.jpg";
import organizedProductivity from "@assets/stock_images/organized_productivi_df70e725.jpg";

const stockImageMap: Record<string, string> = {
  "romantic_paris_citys_dfc7c798.jpg": romanticParisCityscape,
  "fitness_workout_gym__2325ee98.jpg": fitnessWorkoutGym,
  "elegant_wedding_cere_9aa2c585.jpg": elegantWeddingCeremony,
  "modern_tech_workspac_ef8fa108.jpg": modernTechWorkspace,
  "beautiful_modern_hom_0f24a3e6.jpg": beautifulModernHome,
  "organized_productivi_df70e725.jpg": organizedProductivity,
};

const categories = [
  { value: "trending", label: "Trending" },
  { value: "travel", label: "Travel" },
  { value: "fitness", label: "Fitness" },
  { value: "events", label: "Events" },
  { value: "career", label: "Career" },
  { value: "home", label: "Home" },
];

export default function CommunityPlansPage() {
  const [selectedCategory, setSelectedCategory] = useState("trending");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSeedAttempted, setHasSeedAttempted] = useState(false);
  const { toast } = useToast();

  // Fetch community plans
  const { data: plans = [], isLoading, refetch } = useQuery<Activity[]>({
    queryKey: ["/api/community-plans", selectedCategory, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== "trending") {
        params.set("category", selectedCategory);
      }
      if (searchQuery.trim()) {
        params.set("search", searchQuery);
      }
      params.set("limit", "50");
      
      const response = await fetch(`/api/community-plans?${params}`);
      if (!response.ok) throw new Error("Failed to fetch community plans");
      return response.json();
    },
  });

  // Seed mutation
  const seedMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/seed-community-plans");
    },
    onSuccess: () => {
      console.log("[SEED] Community plans seeded successfully");
      refetch();
    },
    onError: (error) => {
      console.error("[SEED] Failed to seed community plans:", error);
    },
  });

  // Copy plan mutation
  const copyPlanMutation = useMutation({
    mutationFn: async ({ activityId, shareToken, title }: { activityId: string; shareToken: string; title: string }) => {
      // Copy the activity using the share token
      const response = await apiRequest("POST", `/api/activities/copy/${shareToken}`);
      const data = await response.json();
      
      // Increment views after successful copy (non-critical, so catch errors)
      try {
        await apiRequest("POST", `/api/activities/${activityId}/increment-views`);
      } catch (error) {
        console.warn('[COPY] Failed to increment views:', error);
      }
      
      return { ...data, originalTitle: title };
    },
    onSuccess: (data: any) => {
      const activityTitle = data?.activity?.title || data?.originalTitle;
      toast({
        title: "Plan copied!",
        description: activityTitle 
          ? `"${activityTitle}" has been added to your activities`
          : data?.message || "The plan has been added to your activities",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to copy plan",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Auto-seed on first load if needed
  useEffect(() => {
    if (!isLoading && plans.length === 0 && !hasSeedAttempted && !searchQuery) {
      console.log("[SEED] No community plans found, attempting to seed...");
      setHasSeedAttempted(true);
      seedMutation.mutate();
    }
  }, [isLoading, plans.length, hasSeedAttempted, searchQuery]);

  const handleCopyPlan = (activityId: string, shareToken: string | null, title: string) => {
    if (!shareToken) {
      toast({
        title: "Cannot copy plan",
        description: "This plan is not available for copying",
        variant: "destructive",
      });
      return;
    }
    copyPlanMutation.mutate({ activityId, shareToken, title });
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getStockImage = (backdrop: string | null) => {
    if (!backdrop) return null;
    return stockImageMap[backdrop] || null;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold" data-testid="text-page-title">
              Discover & Use Community Plans
            </h1>
            <Badge variant="secondary" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0" data-testid="badge-community-powered">
              <Sparkles className="w-3 h-3 mr-1" />
              Community Powered
            </Badge>
          </div>
          <p className="text-muted-foreground text-lg" data-testid="text-page-description">
            Browse curated plans from the community and instantly add them to your collection
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search plans..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
          <TabsList data-testid="tabs-categories">
            {categories.map((cat) => (
              <TabsTrigger
                key={cat.value}
                value={cat.value}
                data-testid={`tab-${cat.value}`}
              >
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Plans Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden" data-testid={`skeleton-card-${i}`}>
                <Skeleton className="h-48 w-full" />
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-16" data-testid="empty-state">
            <p className="text-muted-foreground text-lg">
              No plans found. Try a different category or search.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const stockImage = getStockImage(plan.backdrop);
              
              return (
                <Card
                  key={plan.id}
                  className="overflow-hidden hover-elevate transition-all"
                  data-testid={`card-plan-${plan.id}`}
                >
                  {/* Stock Image Backdrop */}
                  {stockImage ? (
                    <div className="relative h-48 w-full overflow-hidden">
                      <img
                        src={stockImage}
                        alt={plan.title || "Plan backdrop"}
                        className="w-full h-full object-cover"
                        data-testid={`img-backdrop-${plan.id}`}
                      />
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                      
                      {/* Like Count Badge */}
                      <div className="absolute top-3 right-3">
                        <Badge
                          variant="secondary"
                          className="bg-white/90 backdrop-blur-sm text-foreground gap-1"
                          data-testid={`badge-likes-${plan.id}`}
                        >
                          <Heart className="w-3 h-3 fill-red-500 text-red-500" />
                          {plan.likeCount || 0}
                        </Badge>
                      </div>

                      {/* Title on Image - positioned higher to avoid overlap */}
                      <div className="absolute bottom-12 right-3 left-3">
                        <h3 className="text-white font-bold text-xl line-clamp-2 drop-shadow-lg" data-testid={`text-title-${plan.id}`}>
                          {plan.title}
                        </h3>
                      </div>

                      {/* View Count - below title */}
                      <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white text-sm drop-shadow-md">
                        <Eye className="w-4 h-4" />
                        <span data-testid={`text-views-${plan.id}`}>{plan.viewCount || 0} views</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 w-full bg-gradient-to-br from-purple-500 to-pink-500 relative">
                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="text-white font-bold text-xl line-clamp-2" data-testid={`text-title-${plan.id}`}>
                          {plan.title}
                        </h3>
                      </div>
                    </div>
                  )}

                  <CardContent className="pt-4">
                    {/* Description */}
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3" data-testid={`text-description-${plan.id}`}>
                      {plan.description || plan.planSummary}
                    </p>

                    {/* Creator Info */}
                    <div className="flex items-center gap-2 mb-3">
                      <Avatar className="w-6 h-6" data-testid={`avatar-${plan.id}`}>
                        {plan.creatorAvatar && <AvatarImage src={plan.creatorAvatar} />}
                        <AvatarFallback className="text-xs">
                          {getInitials(plan.creatorName || "Unknown")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground" data-testid={`text-creator-${plan.id}`}>
                        by {plan.creatorName || "Anonymous"}
                      </span>
                    </div>

                    {/* Category Badge */}
                    {plan.category && (
                      <Badge variant="outline" className="capitalize" data-testid={`badge-category-${plan.id}`}>
                        {plan.category}
                      </Badge>
                    )}
                  </CardContent>

                  <CardFooter>
                    <Button
                      className="w-full"
                      onClick={() => handleCopyPlan(plan.id, plan.shareToken, plan.title || "")}
                      disabled={copyPlanMutation.isPending}
                      data-testid={`button-use-plan-${plan.id}`}
                    >
                      {copyPlanMutation.isPending ? "Copying..." : "Use This Plan"}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
