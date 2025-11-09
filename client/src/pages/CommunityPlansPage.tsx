import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Heart, Eye, Search, Sparkles, ArrowLeft, Home, TrendingUp, Plane, Dumbbell, ListTodo, PartyPopper, Briefcase, HomeIcon, BookOpen, DollarSign } from "lucide-react";
import { Link } from "wouter";
import type { Activity } from "@shared/schema";

// Stock image imports
import romanticParisCityscape from "@assets/stock_images/romantic_paris_citys_dfc7c798.jpg";
import fitnessWorkoutGym from "@assets/stock_images/fitness_workout_gym__2325ee98.jpg";
import elegantWeddingCeremony from "@assets/stock_images/elegant_wedding_cere_9aa2c585.jpg";
import modernTechWorkspace from "@assets/stock_images/modern_tech_workspac_ef8fa108.jpg";
import beautifulModernHome from "@assets/stock_images/beautiful_modern_hom_0f24a3e6.jpg";
import organizedProductivity from "@assets/stock_images/organized_productivi_df70e725.jpg";
import tokyoJapanTravel from "@assets/stock_images/tokyo_japan_travel_d_8a196170.jpg";
import baliIndonesiaTropical from "@assets/stock_images/bali_indonesia_tropi_95575be5.jpg";
import newYorkCityTimes from "@assets/stock_images/new_york_city_times__e09e766b.jpg";
import parisEiffelTower from "@assets/stock_images/paris_eiffel_tower_f_fce5772c.jpg";
import icelandNorthernLights from "@assets/stock_images/iceland_northern_lig_9fbbf14d.jpg";
import runnerJoggingTrail from "@assets/stock_images/runner_jogging_on_tr_9a63ddad.jpg";
import yogaStudioPeaceful from "@assets/stock_images/yoga_studio_peaceful_84f9a366.jpg";
import cyclistRidingBike from "@assets/stock_images/cyclist_riding_bike__9ae17ca2.jpg";
import modernGymWorkout from "@assets/stock_images/modern_gym_workout_w_99dc5406.jpg";
import modernWorkspaceDesk from "@assets/stock_images/modern_workspace_des_9f6c2608.jpg";
import businessPresentation from "@assets/stock_images/business_presentatio_aee687af.jpg";
import professionalNetworking from "@assets/stock_images/professional_network_48ccc448.jpg";
import personReadingBook from "@assets/stock_images/person_reading_book__bc916131.jpg";
import birthdayPartyCelebration from "@assets/stock_images/birthday_party_celeb_414d649e.jpg";
import concertMusicFestival from "@assets/stock_images/concert_music_festiv_18316657.jpg";
import personCodingLaptop from "@assets/stock_images/person_coding_on_lap_ba381062.jpg";
import homeRenovationKitchen from "@assets/stock_images/home_renovation_kitc_0ceb0522.jpg";
import spanishLanguageLearning from "@assets/stock_images/spanish_language_lea_2d2edb39.jpg";
import modernKitchenRenovation from "@assets/stock_images/modern_kitchen_renov_a5563863.jpg";
import professionalDeveloper from "@assets/stock_images/professional_develop_960cd8cf.jpg";
import spanishLanguageLearning2 from "@assets/stock_images/spanish_language_lea_269b1aa7.jpg";
import personMeditating from "@assets/stock_images/person_meditating_pe_43f13693.jpg";

const stockImageMap: Record<string, string> = {
  "romantic_paris_citys_dfc7c798.jpg": romanticParisCityscape,
  "fitness_workout_gym__2325ee98.jpg": fitnessWorkoutGym,
  "elegant_wedding_cere_9aa2c585.jpg": elegantWeddingCeremony,
  "modern_tech_workspac_ef8fa108.jpg": modernTechWorkspace,
  "beautiful_modern_hom_0f24a3e6.jpg": beautifulModernHome,
  "organized_productivi_df70e725.jpg": organizedProductivity,
  "tokyo_japan_travel_d_8a196170.jpg": tokyoJapanTravel,
  "bali_indonesia_tropi_95575be5.jpg": baliIndonesiaTropical,
  "new_york_city_times__e09e766b.jpg": newYorkCityTimes,
  "paris_eiffel_tower_f_fce5772c.jpg": parisEiffelTower,
  "iceland_northern_lig_9fbbf14d.jpg": icelandNorthernLights,
  "runner_jogging_on_tr_9a63ddad.jpg": runnerJoggingTrail,
  "yoga_studio_peaceful_84f9a366.jpg": yogaStudioPeaceful,
  "cyclist_riding_bike__9ae17ca2.jpg": cyclistRidingBike,
  "modern_gym_workout_w_99dc5406.jpg": modernGymWorkout,
  "modern_workspace_des_9f6c2608.jpg": modernWorkspaceDesk,
  "business_presentatio_aee687af.jpg": businessPresentation,
  "professional_network_48ccc448.jpg": professionalNetworking,
  "person_reading_book__bc916131.jpg": personReadingBook,
  "birthday_party_celeb_414d649e.jpg": birthdayPartyCelebration,
  "concert_music_festiv_18316657.jpg": concertMusicFestival,
  "person_coding_on_lap_ba381062.jpg": personCodingLaptop,
  "home_renovation_kitc_0ceb0522.jpg": homeRenovationKitchen,
  "spanish_language_lea_2d2edb39.jpg": spanishLanguageLearning,
  "modern_kitchen_renov_a5563863.jpg": modernKitchenRenovation,
  "professional_develop_960cd8cf.jpg": professionalDeveloper,
  "spanish_language_lea_269b1aa7.jpg": spanishLanguageLearning2,
  "person_meditating_pe_43f13693.jpg": personMeditating,
};

const categories = [
  { value: "trending", label: "Trending", Icon: TrendingUp },
  { value: "travel", label: "Travel", Icon: Plane, color: "bg-blue-500" },
  { value: "fitness", label: "Fitness", Icon: Dumbbell, color: "bg-green-500" },
  { value: "productivity", label: "Productivity", Icon: ListTodo, color: "bg-purple-500" },
  { value: "events", label: "Events", Icon: PartyPopper, color: "bg-orange-500" },
  { value: "career", label: "Career", Icon: Briefcase, color: "bg-indigo-500" },
  { value: "home", label: "Home", Icon: HomeIcon, color: "bg-amber-500" },
  { value: "learning", label: "Learning", Icon: BookOpen, color: "bg-pink-500" },
];

const budgetRanges = [
  { value: "all", label: "All Budgets" },
  { value: "free", label: "Free", min: 0, max: 0 },
  { value: "low", label: "$1-$100", min: 1, max: 10000 },
  { value: "medium", label: "$100-$500", min: 10000, max: 50000 },
  { value: "high", label: "$500-$1000", min: 50000, max: 100000 },
  { value: "premium", label: "$1000+", min: 100000, max: Infinity },
];

const getCategoryColor = (category: string | null) => {
  if (!category) return "bg-gray-500";
  const cat = categories.find(c => c.value === category.toLowerCase());
  return cat?.color || "bg-gray-500";
};

export default function CommunityPlansPage() {
  const [selectedCategory, setSelectedCategory] = useState("trending");
  const [selectedBudgetRange, setSelectedBudgetRange] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSeedAttempted, setHasSeedAttempted] = useState(false);
  const [adoptDialogOpen, setAdoptDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ id: string; shareToken: string | null; title: string } | null>(null);
  const [adoptTarget, setAdoptTarget] = useState<"personal" | "group">("personal");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [duplicateConfirmation, setDuplicateConfirmation] = useState<{
    show: boolean;
    message: string;
    forGroup: boolean;
  } | null>(null);
  const { toast } = useToast();

  // Fetch user's groups
  const { data: groupsData } = useQuery<{ groups: Array<{ id: string; name: string }> }>({
    queryKey: ["/api/groups"],
  });
  const groups = groupsData?.groups || [];

  // Fetch community plans
  const { data: plans = [], isLoading, refetch } = useQuery<Array<Activity & { userHasLiked?: boolean }>>({
    queryKey: ["/api/community-plans", selectedCategory, searchQuery, selectedBudgetRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== "trending") {
        params.set("category", selectedCategory);
      }
      if (searchQuery.trim()) {
        params.set("search", searchQuery);
      }
      if (selectedBudgetRange !== "all") {
        params.set("budgetRange", selectedBudgetRange);
      }
      params.set("limit", "50");
      
      const response = await fetch(`/api/community-plans?${params}`);
      if (!response.ok) throw new Error("Failed to fetch community plans");
      return response.json();
    },
  });

  // Fetch plan details for preview
  const { data: previewData, isLoading: isPreviewLoading } = useQuery({
    queryKey: ["/api/activities/share", selectedPlan?.shareToken],
    queryFn: async () => {
      if (!selectedPlan?.shareToken) return null;
      const response = await fetch(`/api/activities/share/${selectedPlan.shareToken}`);
      if (!response.ok) throw new Error("Failed to fetch plan details");
      return response.json();
    },
    enabled: previewDialogOpen && !!selectedPlan?.shareToken,
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

  // Copy plan to personal mutation
  const copyPlanMutation = useMutation({
    mutationFn: async ({ activityId, shareToken, title, forceUpdate }: { activityId: string; shareToken: string; title: string; forceUpdate?: boolean }) => {
      // Copy the activity using the share token
      const response = await fetch(`/api/activities/copy/${shareToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceUpdate }),
        credentials: "include",
      });
      
      const data = await response.json();
      
      // Handle 409 conflict - user already has this plan
      if (response.status === 409 && data.requiresConfirmation) {
        throw {
          status: 409,
          requiresConfirmation: true,
          message: data.message,
          existingActivity: data.existingActivity,
        };
      }
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to copy activity");
      }
      
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
        title: "Plan adopted!",
        description: activityTitle 
          ? `"${activityTitle}" has been added to your personal activities`
          : data?.message || "The plan has been added to your activities",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      setAdoptDialogOpen(false);
    },
    onError: (error: any) => {
      // Handle 409 conflict specially - show confirmation dialog
      if (error.status === 409 && error.requiresConfirmation) {
        setDuplicateConfirmation({
          show: true,
          message: error.message || "You already have this plan. Update it with the latest version?",
          forGroup: false,
        });
        return;
      }
      
      toast({
        title: "Failed to adopt plan",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Share plan to group mutation
  const sharePlanToGroupMutation = useMutation({
    mutationFn: async ({ activityId, shareToken, groupId, forceUpdate }: { activityId: string; shareToken: string; groupId: string; forceUpdate?: boolean }) => {
      // First copy the activity to user's personal activities
      const copyResponse = await fetch(`/api/activities/copy/${shareToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceUpdate }),
        credentials: "include",
      });
      
      const copyData = await copyResponse.json();
      
      // Handle 409 conflict for copy
      if (copyResponse.status === 409 && copyData.requiresConfirmation) {
        // If user hasn't confirmed yet, throw to show confirmation
        if (!forceUpdate) {
          throw {
            status: 409,
            requiresConfirmation: true,
            message: copyData.message,
            existingActivity: copyData.existingActivity,
            needsCopyConfirmation: true,
          };
        }
      }
      
      const copiedActivityId = copyData.activity?.id;
      
      if (!copiedActivityId) {
        throw new Error("Failed to copy activity");
      }
      
      // Then share it to the group
      const shareResponse = await fetch(`/api/groups/${groupId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId: copiedActivityId }),
        credentials: "include",
      });
      
      const shareData = await shareResponse.json();
      
      // Handle "already shared" case with friendly message
      if (!shareResponse.ok) {
        if (shareData.error?.includes('already shared')) {
          throw {
            status: 400,
            alreadyShared: true,
            message: "This plan is already in the group",
          };
        }
        throw new Error(shareData.error || "Failed to share to group");
      }
      
      // Increment views
      try {
        await apiRequest("POST", `/api/activities/${activityId}/increment-views`);
      } catch (error) {
        console.warn('[SHARE] Failed to increment views:', error);
      }
      
      return { ...shareData, copiedActivityId };
    },
    onSuccess: () => {
      toast({
        title: "Plan shared to group!",
        description: "The plan has been added to the group",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      setAdoptDialogOpen(false);
    },
    onError: (error: any) => {
      // Handle "already shared" case with info message (not error)
      if (error.alreadyShared) {
        toast({
          title: "Already in group",
          description: "This plan is already shared with the group",
        });
        setAdoptDialogOpen(false);
        return;
      }
      
      // Handle 409 conflict for copy confirmation
      if (error.status === 409 && error.requiresConfirmation) {
        setDuplicateConfirmation({
          show: true,
          message: error.message || "You already have this plan. Update it with the latest version?",
          forGroup: true,
        });
        return;
      }
      
      toast({
        title: "Failed to share plan to group",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Like/unlike plan mutation
  const likePlanMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const response = await apiRequest("POST", `/api/activities/${activityId}/feedback`, {
        feedbackType: "like"
      });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all community plans queries (with all filter variations)
      queryClient.invalidateQueries({ queryKey: ["/api/community-plans"], exact: false });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to like plan",
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

  const handlePreviewPlan = (activityId: string, shareToken: string | null, title: string) => {
    if (!shareToken) {
      toast({
        title: "Cannot preview plan",
        description: "This plan is not available for preview",
        variant: "destructive",
      });
      return;
    }
    setSelectedPlan({ id: activityId, shareToken, title });
    setPreviewDialogOpen(true);
  };

  const handleUsePlanFromPreview = () => {
    setPreviewDialogOpen(false);
    setAdoptDialogOpen(true);
  };

  const handleUsePlan = (activityId: string, shareToken: string | null, title: string) => {
    if (!shareToken) {
      toast({
        title: "Cannot use plan",
        description: "This plan is not available for use",
        variant: "destructive",
      });
      return;
    }
    setSelectedPlan({ id: activityId, shareToken, title });
    setAdoptDialogOpen(true);
  };

  const handleAdoptPlan = (forceUpdate = false) => {
    if (!selectedPlan) return;

    // Clear any previous confirmation state
    if (!forceUpdate) {
      setDuplicateConfirmation(null);
    }

    if (adoptTarget === "personal") {
      copyPlanMutation.mutate({
        activityId: selectedPlan.id,
        shareToken: selectedPlan.shareToken!,
        title: selectedPlan.title,
        forceUpdate,
      });
    } else if (adoptTarget === "group" && selectedGroupId) {
      sharePlanToGroupMutation.mutate({
        activityId: selectedPlan.id,
        shareToken: selectedPlan.shareToken!,
        groupId: selectedGroupId,
        forceUpdate,
      });
    } else {
      toast({
        title: "Please select a group",
        description: "Choose which group to add this plan to",
        variant: "destructive",
      });
    }
  };

  const handleConfirmUpdate = () => {
    setDuplicateConfirmation(null);
    handleAdoptPlan(true);
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
    // If it's a full URL (Unsplash, etc.), return it directly
    if (backdrop.startsWith('http://') || backdrop.startsWith('https://')) {
      return backdrop;
    }
    // Otherwise, check the local stock image map
    return stockImageMap[backdrop] || null;
  };

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

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-4xl font-bold" data-testid="text-page-title">
              Discover & Use Community Plans
            </h1>
            <Badge variant="secondary" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 w-fit" data-testid="badge-community-powered">
              <Sparkles className="w-3 h-3 mr-1" />
              Community Powered
            </Badge>
          </div>
          <p className="text-muted-foreground text-base sm:text-lg" data-testid="text-page-description">
            Browse curated plans from the community and instantly add them to your collection
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative w-full sm:max-w-md">
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
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList data-testid="tabs-categories" className="w-fit">
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
          </div>
        </Tabs>

        {/* Budget Filter */}
        <div className="mb-8">
          <div className="flex items-center gap-3 w-full sm:max-w-xs">
            <DollarSign className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Select value={selectedBudgetRange} onValueChange={setSelectedBudgetRange}>
              <SelectTrigger data-testid="select-budget-range" className="w-full">
                <SelectValue placeholder="Filter by budget" />
              </SelectTrigger>
              <SelectContent>
                {budgetRanges.map((range) => (
                  <SelectItem 
                    key={range.value} 
                    value={range.value}
                    data-testid={`budget-option-${range.value}`}
                  >
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

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
                  {/* Hero Image */}
                  <div className="relative h-48 bg-gradient-to-br from-primary/20 to-primary/5">
                    {stockImage ? (
                      <img
                        src={stockImage}
                        alt={plan.title || ""}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="w-12 h-12 text-primary/30" />
                      </div>
                    )}
                    
                    {/* Dark gradient overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    
                    {/* Like Count Badge */}
                    <div className="absolute top-3 right-3">
                      <Badge
                        variant="secondary"
                        className="bg-white/90 dark:bg-black/80 backdrop-blur-sm gap-1 font-semibold"
                        data-testid={`badge-likes-${plan.id}`}
                      >
                        <Heart className="w-3 h-3 fill-red-500 text-red-500" />
                        {plan.likeCount && plan.likeCount >= 1000 ? `${(plan.likeCount / 1000).toFixed(1)}k` : plan.likeCount || 0}
                      </Badge>
                    </div>

                    {/* Category Badge */}
                    <div className="absolute top-3 left-3">
                      {plan.category && (
                        <Badge 
                          className={`${getCategoryColor(plan.category)} text-white border-0 capitalize`}
                          data-testid={`badge-category-${plan.id}`}
                        >
                          {plan.category}
                        </Badge>
                      )}
                    </div>

                    {/* Title at bottom with gradient overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-white font-bold text-xl line-clamp-2" data-testid={`text-title-${plan.id}`}>
                        {plan.title}
                      </h3>
                    </div>
                  </div>

                  <CardContent className="pt-4 pb-4">
                    {/* Description */}
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4" data-testid={`text-description-${plan.id}`}>
                      {plan.description || plan.planSummary}
                    </p>

                    {/* Creator and View Count */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-7 h-7" data-testid={`avatar-${plan.id}`}>
                          {plan.creatorAvatar && <AvatarImage src={plan.creatorAvatar} />}
                          <AvatarFallback className="text-xs">
                            {getInitials(plan.creatorName || "Unknown")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground" data-testid={`text-creator-${plan.id}`}>
                          {plan.creatorName || "Anonymous"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Eye className="w-3.5 h-3.5" />
                        <span className="text-xs">
                          {plan.viewCount && plan.viewCount >= 1000 ? `${(plan.viewCount / 1000).toFixed(1)}k` : plan.viewCount || 0}
                        </span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-0 gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => likePlanMutation.mutate(plan.id)}
                      disabled={likePlanMutation.isPending}
                      data-testid={`button-like-${plan.id}`}
                    >
                      <Heart className={`w-4 h-4 ${plan.userHasLiked ? 'fill-red-500 text-red-500' : ''}`} />
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handlePreviewPlan(plan.id, plan.shareToken, plan.title || "")}
                      data-testid={`button-preview-${plan.id}`}
                    >
                      Preview
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => handleUsePlan(plan.id, plan.shareToken, plan.title || "")}
                      disabled={copyPlanMutation.isPending || sharePlanToGroupMutation.isPending}
                      data-testid={`button-use-plan-${plan.id}`}
                    >
                      {(copyPlanMutation.isPending || sharePlanToGroupMutation.isPending) ? "Adding..." : "Add"}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {/* Share Your Plan Section */}
        {!isLoading && plans.length > 0 && (
          <div className="mt-12">
            <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
              <CardContent className="p-8 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Sparkles className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold">Share Your Plan with the Community</h2>
                </div>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                  Help others by sharing your successful plans and strategies
                </p>
                <Link href="/">
                  <Button size="lg" data-testid="button-share-my-plan">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Share My Plan
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Plan Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-plan-preview">
          <DialogHeader>
            <DialogTitle>{selectedPlan?.title || "Plan Preview"}</DialogTitle>
            <DialogDescription>
              Review the plan details before adding it to your activities
            </DialogDescription>
          </DialogHeader>

          {isPreviewLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : previewData?.activity ? (
            <div className="space-y-6 py-4">
              {/* Description */}
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-sm text-muted-foreground">
                  {previewData.activity.description || previewData.activity.planSummary || "No description available"}
                </p>
              </div>

              {/* Budget Breakdown */}
              {previewData.activity.budget && previewData.activity.budget > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Budget Breakdown</h3>
                  <div className="space-y-2">
                    {previewData.activity.budgetBreakdown?.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between items-start gap-4 text-sm">
                        <div className="flex-1">
                          <div className="font-medium">{item.category}</div>
                          {item.notes && (
                            <div className="text-xs text-muted-foreground mt-0.5">{item.notes}</div>
                          )}
                        </div>
                        <div className="font-semibold whitespace-nowrap">
                          ${(item.amount / 100).toFixed(2)}
                        </div>
                      </div>
                    ))}
                    {previewData.activity.budgetBuffer > 0 && (
                      <div className="flex justify-between items-center gap-4 text-sm border-t pt-2 mt-2">
                        <div className="font-medium">Buffer (10%)</div>
                        <div className="font-semibold">${(previewData.activity.budgetBuffer / 100).toFixed(2)}</div>
                      </div>
                    )}
                    <div className="flex justify-between items-center gap-4 text-base font-bold border-t pt-2 mt-2">
                      <div>Total Budget</div>
                      <div>${(previewData.activity.budget / 100).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tasks */}
              {previewData.tasks && previewData.tasks.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Tasks ({previewData.tasks.length})</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {previewData.tasks.map((task: any, index: number) => (
                      <div key={task.id || index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="w-5 h-5 rounded-full border-2 border-primary flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{task.title}</div>
                          {task.description && (
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {task.description}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Heart className="w-4 h-4 text-red-500" />
                  <span>{previewData.activity.likeCount || 0} likes</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <span>{previewData.activity.viewCount || 0} views</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Failed to load plan details
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)} className="flex-1" data-testid="button-close-preview">
              Close
            </Button>
            <Button
              onClick={handleUsePlanFromPreview}
              className="flex-1"
              data-testid="button-use-from-preview"
            >
              Add This Plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Adopt Plan Dialog */}
      <Dialog open={adoptDialogOpen} onOpenChange={setAdoptDialogOpen}>
        <DialogContent data-testid="dialog-adopt-plan">
          <DialogHeader>
            <DialogTitle>Use This Plan</DialogTitle>
            <DialogDescription>
              Choose how you'd like to use "{selectedPlan?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <RadioGroup value={adoptTarget} onValueChange={(value) => setAdoptTarget(value as "personal" | "group")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="personal" id="personal" data-testid="radio-personal" />
                <Label htmlFor="personal" className="flex-1 cursor-pointer">
                  <div>
                    <div className="font-medium">Personal Activity</div>
                    <div className="text-sm text-muted-foreground">Add to your personal activities</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="group" id="group" data-testid="radio-group" />
                <Label htmlFor="group" className="flex-1 cursor-pointer">
                  <div>
                    <div className="font-medium">Group Activity</div>
                    <div className="text-sm text-muted-foreground">Share with one of your groups</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            {adoptTarget === "group" && (
              <div className="space-y-2">
                <Label>Select Group</Label>
                <RadioGroup value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  {groups.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      You haven't joined any groups yet. <Link href="/groups" className="text-primary underline">Create or join a group</Link> to share plans.
                    </p>
                  ) : (
                    groups.map((group) => (
                      <div key={group.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={group.id} id={group.id} data-testid={`radio-group-${group.id}`} />
                        <Label htmlFor={group.id} className="flex-1 cursor-pointer">
                          {group.name}
                        </Label>
                      </div>
                    ))
                  )}
                </RadioGroup>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAdoptDialogOpen(false)} className="flex-1" data-testid="button-cancel-adopt">
              Cancel
            </Button>
            <Button
              onClick={() => handleAdoptPlan(false)}
              disabled={copyPlanMutation.isPending || sharePlanToGroupMutation.isPending || (adoptTarget === "group" && !selectedGroupId)}
              className="flex-1"
              data-testid="button-confirm-adopt"
            >
              {(copyPlanMutation.isPending || sharePlanToGroupMutation.isPending) ? "Processing..." : "Use Plan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate plan confirmation dialog */}
      <Dialog open={duplicateConfirmation?.show || false} onOpenChange={(open) => !open && setDuplicateConfirmation(null)}>
        <DialogContent data-testid="dialog-duplicate-confirmation">
          <DialogHeader>
            <DialogTitle>Plan Already Exists</DialogTitle>
            <DialogDescription>
              {duplicateConfirmation?.message}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setDuplicateConfirmation(null);
                setAdoptDialogOpen(false);
              }} 
              className="flex-1"
              data-testid="button-cancel-update"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmUpdate}
              disabled={copyPlanMutation.isPending || sharePlanToGroupMutation.isPending}
              className="flex-1"
              data-testid="button-confirm-update"
            >
              {(copyPlanMutation.isPending || sharePlanToGroupMutation.isPending) ? "Updating..." : "Update Plan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
