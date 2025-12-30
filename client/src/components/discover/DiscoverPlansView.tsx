import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Heart, Eye, Search, Sparkles, TrendingUp, Plane, Dumbbell, ListTodo, PartyPopper, Briefcase, HomeIcon, BookOpen, DollarSign, Plus, ChevronDown, ChevronRight, Bookmark, ShieldAlert, Megaphone, Users, CheckCircle2, Pin, MapPin, Settings, Flag, Combine, X, Check, Loader2 } from "lucide-react";
import { SiLinkedin, SiInstagram, SiX } from "react-icons/si";
import type { Activity } from "@shared/schema";
import CreateGroupDialog from "@/components/CreateGroupDialog";
import { ReportDialog } from "@/components/ReportDialog";
import { useDiscoverFilters } from "./useDiscoverFilters";
import { getCurrentLocation, calculateDistance, formatDistance } from "@/lib/geolocation";
import { CardDisplaySettings } from "./CardDisplaySettings";
import { useCardDisplayPreferences } from "./useCardDisplayPreferences";
import { useAuth } from "@/hooks/useAuth";
import { apiUrl, isNativePlatform } from "@/lib/api";
import { getStoredAuthToken } from "@/lib/nativeGoogleAuth";

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
  { value: "all", label: "All", Icon: TrendingUp },
  { value: "trending", label: "Trending", Icon: TrendingUp, color: "bg-emerald-500", isTrendingFilter: true },
  { value: "travel", label: "Travel", Icon: Plane, color: "bg-blue-500" },
  { value: "fitness", label: "Fitness", Icon: Dumbbell, color: "bg-green-500" },
  { value: "career", label: "Career", Icon: Briefcase, color: "bg-indigo-500" },
  { value: "personal", label: "Personal", Icon: HomeIcon, color: "bg-amber-500" },
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

// Format budget as currency (cents to dollars)
const formatBudget = (budgetCents: number): string => {
  if (budgetCents === 0) return 'Free';
  const dollars = budgetCents / 100;
  if (dollars >= 1000) {
    return `$${(dollars / 1000).toFixed(1)}k`;
  }
  return `$${dollars.toFixed(0)}`;
};

// Precise budget formatting with two decimals for preview dialog
const formatBudgetPrecise = (budgetCents: number): string => {
  if (budgetCents === 0) return '$0.00';
  const dollars = budgetCents / 100;
  return `$${dollars.toFixed(2)}`;
};

// Plan type badge configuration (theme-aware)
const getPlanTypeBadge = (planType: string | null | undefined, trendingScore?: number | null) => {
  // Auto-detect trending based on high trending score (15000+)
  const isTrending = (trendingScore ?? 0) >= 15000;
  const type = planType ?? 'community';
  
  // Sponsored and Emergency plans have priority over trending for visual distinction
  switch (type) {
    case 'emergency':
      return { 
        type: 'emergency',
        label: 'Emergency Alert', 
        ariaLabel: 'Emergency plan from government agency',
        borderColor: 'var(--plan-emergency-border)',
        bgColor: 'rgba(255, 59, 48, 0.15)', // Red with transparency
      };
    case 'sponsored':
      return { 
        type: 'sponsored',
        label: 'SPONSORED', 
        ariaLabel: 'Sponsored content from brand partner',
        borderColor: 'var(--plan-sponsored-border)',
        bgColor: 'rgba(245, 158, 11, 0.15)', // Gold with transparency
      };
    default:
      // Show trending badge for non-sponsored, non-emergency plans
      if (isTrending) {
        return { 
          type: 'trending',
          label: 'Trending', 
          ariaLabel: 'Trending community plan with high engagement',
          borderColor: 'var(--plan-trending-border)',
          bgColor: 'rgba(52, 211, 153, 0.15)', // Green with transparency
        };
      }
      return { 
        type: 'community',
        label: 'Community', 
        ariaLabel: 'Community-created plan',
        borderColor: 'var(--plan-community-border)',
        bgColor: 'transparent',
      };
  }
};

// Verification badge helper - returns null if inputs are falsy
const getVerificationLabel = (sourceType: string | null | undefined, verificationBadge: string | null | undefined): string | null => {
  // Bail early if sourceType is missing
  if (!sourceType) return null;
  
  if (sourceType === 'official_seed') return 'Verified by JournalMate';
  if (sourceType === 'brand_partnership') return 'Verified Brand Partner';
  if (sourceType === 'community_reviewed') {
    if (verificationBadge === 'twitter') return 'Verified on X/Twitter';
    if (verificationBadge === 'instagram') return 'Verified on Instagram';
    if (verificationBadge === 'threads') return 'Verified on Threads';
    if (verificationBadge === 'linkedin') return 'Verified on LinkedIn';
    if (verificationBadge === 'multi') return 'Multi-platform Verified';
    return 'Community Verified';
  }
  return null;
};

// Get platform-specific verification icon component
const getVerificationIconComponent = (verificationBadge: string | null | undefined): typeof CheckCircle2 | typeof SiX | typeof SiInstagram | typeof SiLinkedin => {
  if (!verificationBadge) return CheckCircle2;
  
  switch (verificationBadge) {
    case 'twitter':
      return SiX;
    case 'instagram':
      return SiInstagram;
    case 'linkedin':
      return SiLinkedin;
    default:
      return CheckCircle2;
  }
};

// Verification icon component with clickable social links
function VerificationIcon({
  verificationBadge,
  sourceType,
  label,
  planId,
  plannerProfileId,
  twitterPostUrl,
  instagramPostUrl,
  threadsPostUrl,
  linkedinPostUrl,
  instagramHandle,
  twitterHandle
}: {
  verificationBadge: string | null | undefined;
  sourceType: string | null | undefined;
  label: string;
  planId: string;
  plannerProfileId?: string | null;
  twitterPostUrl?: string | null;
  instagramPostUrl?: string | null;
  threadsPostUrl?: string | null;
  linkedinPostUrl?: string | null;
  instagramHandle?: string | null;
  twitterHandle?: string | null;
}) {
  const IconComponent = getVerificationIconComponent(verificationBadge);
  const iconColor = sourceType === 'brand_partnership' ? 'text-blue-500' : 'text-green-500';

  // Get the appropriate social link based on verification badge
  // Prefer profile handle links over post URLs for user profile navigation
  const getSocialLink = (): string | null => {
    switch (verificationBadge) {
      case 'twitter':
        return twitterHandle || twitterPostUrl || null;
      case 'instagram':
        return instagramHandle || instagramPostUrl || null;
      case 'threads':
        return threadsPostUrl || null;
      case 'linkedin':
        return linkedinPostUrl || null;
      case 'multi':
        // Return first available profile link, then fallback to post URLs
        return instagramHandle || twitterHandle || instagramPostUrl || twitterPostUrl || threadsPostUrl || linkedinPostUrl || null;
      default:
        return null;
    }
  };

  const socialLink = getSocialLink();
  const isClickable = !!socialLink;

  return (
    <div className="group/verify relative inline-flex">
      {isClickable ? (
        <a
          href={socialLink}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex hover:scale-110 transition-transform ${iconColor}`}
          onClick={(e) => e.stopPropagation()}
          title={`View creator on ${label.split(' ').pop()}`}
        >
          <IconComponent
            className="w-3 h-3"
            aria-label={label}
            data-testid={`icon-verified-${planId}`}
          />
        </a>
      ) : (
        <IconComponent
          className={`w-3 h-3 cursor-help ${iconColor}`}
          aria-label={label}
          data-testid={`icon-verified-${planId}`}
        />
      )}
      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 text-xs text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded opacity-0 group-hover/verify:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
        {isClickable ? `View profile →` : label}
      </span>
    </div>
  );
}

interface DiscoverPlansViewProps {
  onSignInRequired?: () => void;
}

export default function DiscoverPlansView({ onSignInRequired }: DiscoverPlansViewProps = {}) {
  const { filters, updateFilter, setLocationData, toggleLocation } = useDiscoverFilters();
  const { user } = useAuth();
  const { preferences: displayPrefs, updatePreference, resetPreferences } = useCardDisplayPreferences(user?.id || null);
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
  const [createGroupDialogOpen, setCreateGroupDialogOpen] = useState(false);
  const [pendingGroupId, setPendingGroupId] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportingPlan, setReportingPlan] = useState<{ id: string; title: string } | null>(null);
  const [remixMode, setRemixMode] = useState(false);
  const [selectedForRemix, setSelectedForRemix] = useState<Set<string>>(new Set());
  const [remixDialogOpen, setRemixDialogOpen] = useState(false);
  const [remixPreview, setRemixPreview] = useState<any>(null);
  const [isRemixing, setIsRemixing] = useState(false);
  const { toast } = useToast();

  const toggleRemixSelection = (planId: string) => {
    const newSelection = new Set(selectedForRemix);
    if (newSelection.has(planId)) {
      newSelection.delete(planId);
    } else {
      if (newSelection.size >= 10) {
        toast({
          title: "Maximum plans selected",
          description: "You can remix up to 10 plans at once",
          variant: "destructive"
        });
        return;
      }
      newSelection.add(planId);
    }
    setSelectedForRemix(newSelection);
  };

  const handleRemixPreview = async () => {
    if (selectedForRemix.size < 2) {
      toast({
        title: "Select more plans",
        description: "Select at least 2 plans to remix",
        variant: "destructive"
      });
      return;
    }
    
    setIsRemixing(true);
    try {
      const response = await apiRequest('POST', '/api/community-plans/remix/preview', { 
        activityIds: Array.from(selectedForRemix) 
      });
      const data = await response.json();
      setRemixPreview(data.preview || data);
      setRemixDialogOpen(true);
    } catch (error) {
      console.error('Remix preview error:', error);
      toast({
        title: "Remix failed",
        description: error instanceof Error ? error.message : "Could not create remix preview",
        variant: "destructive"
      });
    } finally {
      setIsRemixing(false);
    }
  };

  const handleRemixConfirm = async () => {
    if (!remixPreview) return;
    
    setIsRemixing(true);
    try {
      const response = await apiRequest('POST', '/api/community-plans/remix/confirm', {
        activityIds: Array.from(selectedForRemix),
        mergedTitle: remixPreview.mergedTitle,
        mergedDescription: remixPreview.mergedDescription,
        mergedTasks: remixPreview.mergedTasks,
        attributions: remixPreview.attributions
      });
      
      await response.json();
      
      toast({
        title: "Remix created!",
        description: `Created "${remixPreview.mergedTitle}" with ${remixPreview.mergedTasks.length} tasks`
      });
      
      setRemixDialogOpen(false);
      setRemixMode(false);
      setSelectedForRemix(new Set());
      setRemixPreview(null);
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
    } catch (error) {
      console.error('Remix confirm error:', error);
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Could not save remix",
        variant: "destructive"
      });
    } finally {
      setIsRemixing(false);
    }
  };

  // Handle location toggle
  const handleLocationToggle = async () => {
    if (filters.locationEnabled) {
      // Disable location filtering
      setLocationData(null);
    } else {
      // Enable location filtering - request permission and get coordinates
      setIsLoadingLocation(true);
      try {
        const location = await getCurrentLocation();
        if (location) {
          setLocationData({
            lat: location.latitude,
            lon: location.longitude
          });
          toast({
            title: "Location enabled",
            description: "Showing plans near your location",
          });
        } else {
          toast({
            title: "Location permission denied",
            description: "Enable location permissions to filter by location",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Location error:', error);
        toast({
          title: "Location error",
          description: "Could not access your location",
          variant: "destructive",
        });
      } finally {
        setIsLoadingLocation(false);
      }
    }
  };

  // Fetch user's groups
  const { data: groupsData } = useQuery<{ groups: Array<{ id: string; name: string }> }>({
    queryKey: ["/api/groups"],
  });
  const groups = groupsData?.groups || [];

  // Auto-select newly created group
  useEffect(() => {
    if (pendingGroupId && groups.length > 0) {
      const newGroup = groups.find((g) => g.id === pendingGroupId);
      if (newGroup) {
        setSelectedGroupId(pendingGroupId);
        setPendingGroupId(null);
      }
    }
  }, [groups, pendingGroupId]);

  // Fetch community plans
  const { data: plans = [], isLoading, refetch } = useQuery<Array<Activity & { userHasLiked?: boolean; userHasBookmarked?: boolean }>>({
    queryKey: ["/api/community-plans", filters.category, filters.search, filters.budget, filters.locationEnabled, filters.userCoords],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.category !== "all") {
        params.set("category", filters.category);
      }
      if (filters.search.trim()) {
        params.set("search", filters.search);
      }
      if (filters.budget !== "all") {
        params.set("budgetRange", filters.budget);
      }
      
      // Add location parameters if enabled
      if (filters.locationEnabled && filters.userCoords) {
        params.set("lat", filters.userCoords.lat.toString());
        params.set("lon", filters.userCoords.lon.toString());
        params.set("radius", filters.radius.toString());
      }
      
      params.set("limit", "50");

      // Build headers - add auth token for native platforms
      const headers: HeadersInit = {};
      if (isNativePlatform()) {
        const token = await getStoredAuthToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const response = await fetch(apiUrl(`/api/community-plans?${params}`), {
        credentials: "include",
        headers,
      });
      if (!response.ok) {
        console.error('[Discovery] Failed to fetch community plans:', response.status, response.statusText);
        throw new Error("Failed to fetch community plans");
      }
      return response.json();
    },
  });

  // Fetch plan details for preview
  const { data: previewData, isLoading: isPreviewLoading } = useQuery({
    queryKey: ["/api/share/activity", selectedPlan?.shareToken],
    queryFn: async () => {
      if (!selectedPlan?.shareToken) return null;

      // Build headers - add auth token for native platforms
      const headers: HeadersInit = {};
      if (isNativePlatform()) {
        const token = await getStoredAuthToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const response = await fetch(apiUrl(`/api/share/activity/${selectedPlan.shareToken}`), {
        credentials: "include",
        headers,
      });
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
      const response = await fetch(apiUrl(`/api/activities/copy/${shareToken}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceUpdate }),
        credentials: "include",
      });
      
      const data = await response.json();
      
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
      const copyResponse = await fetch(apiUrl(`/api/activities/copy/${shareToken}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceUpdate }),
        credentials: "include",
      });

      const copyData = await copyResponse.json();

      if (copyResponse.status === 409 && copyData.requiresConfirmation) {
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

      const shareResponse = await fetch(apiUrl(`/api/groups/${groupId}/activities`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId: copiedActivityId }),
        credentials: "include",
      });
      
      const shareData = await shareResponse.json();
      
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
      if (error.alreadyShared) {
        toast({
          title: "Already in group",
          description: "This plan is already shared with the group",
        });
        setAdoptDialogOpen(false);
        return;
      }
      
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

  // Like plan mutation (idempotent - adds like)
  const likePlanMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const response = await fetch(apiUrl(`/api/activities/${activityId}/like`), {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to like plan");
      return response.json();
    },
    onMutate: async (activityId: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/community-plans"] });
      
      // Snapshot the previous value
      const previousPlans = queryClient.getQueryData(["/api/community-plans", filters.category, filters.search, filters.budget]);
      
      // Optimistically update
      queryClient.setQueryData(["/api/community-plans", filters.category, filters.search, filters.budget], (old: any) => {
        if (!old) return old;
        return old.map((plan: any) => 
          plan.id === activityId 
            ? { 
                ...plan, 
                userHasLiked: true,
                likeCount: (plan.likeCount || 0) + (plan.userHasLiked ? 0 : 1)
              }
            : plan
        );
      });
      
      return { previousPlans };
    },
    onError: (error: any, activityId, context) => {
      // Rollback on error
      if (context?.previousPlans) {
        queryClient.setQueryData(["/api/community-plans", filters.category, filters.search, filters.budget], context.previousPlans);
      }
      toast({
        title: "Failed to like plan",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community-plans"] });
    },
  });

  // Unlike plan mutation (idempotent - removes like)
  const unlikePlanMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const response = await fetch(apiUrl(`/api/activities/${activityId}/unlike`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to unlike plan");
      return response.json();
    },
    onMutate: async (activityId: string) => {
      await queryClient.cancelQueries({ queryKey: ["/api/community-plans"] });
      const previousPlans = queryClient.getQueryData(["/api/community-plans", filters.category, filters.search, filters.budget]);
      
      queryClient.setQueryData(["/api/community-plans", filters.category, filters.search, filters.budget], (old: any) => {
        if (!old) return old;
        return old.map((plan: any) => 
          plan.id === activityId 
            ? { 
                ...plan, 
                userHasLiked: false,
                likeCount: Math.max(0, (plan.likeCount || 0) - (plan.userHasLiked ? 1 : 0))
              }
            : plan
        );
      });
      
      return { previousPlans };
    },
    onError: (error: any, activityId, context) => {
      if (context?.previousPlans) {
        queryClient.setQueryData(["/api/community-plans", filters.category, filters.search, filters.budget], context.previousPlans);
      }
      toast({
        title: "Failed to unlike plan",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community-plans"] });
    },
  });

  // Bookmark plan mutation (idempotent - adds bookmark)
  const bookmarkPlanMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const response = await fetch(apiUrl(`/api/activities/${activityId}/bookmark`), {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to bookmark plan");
      return response.json();
    },
    onMutate: async (activityId: string) => {
      await queryClient.cancelQueries({ queryKey: ["/api/community-plans"] });
      const previousPlans = queryClient.getQueryData(["/api/community-plans", filters.category, filters.search, filters.budget]);
      
      queryClient.setQueryData(["/api/community-plans", filters.category, filters.search, filters.budget], (old: any) => {
        if (!old) return old;
        return old.map((plan: any) => 
          plan.id === activityId 
            ? { 
                ...plan, 
                userHasBookmarked: true,
                bookmarkCount: (plan.bookmarkCount || 0) + (plan.userHasBookmarked ? 0 : 1)
              }
            : plan
        );
      });
      
      return { previousPlans };
    },
    onError: (error: any, activityId, context) => {
      if (context?.previousPlans) {
        queryClient.setQueryData(["/api/community-plans", filters.category, filters.search, filters.budget], context.previousPlans);
      }
      toast({
        title: "Failed to bookmark plan",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community-plans"] });
    },
  });

  // Unbookmark plan mutation (idempotent - removes bookmark)
  const unbookmarkPlanMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const response = await fetch(apiUrl(`/api/activities/${activityId}/unbookmark`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to unbookmark plan");
      return response.json();
    },
    onMutate: async (activityId: string) => {
      await queryClient.cancelQueries({ queryKey: ["/api/community-plans"] });
      const previousPlans = queryClient.getQueryData(["/api/community-plans", filters.category, filters.search, filters.budget]);
      
      queryClient.setQueryData(["/api/community-plans", filters.category, filters.search, filters.budget], (old: any) => {
        if (!old) return old;
        return old.map((plan: any) => 
          plan.id === activityId 
            ? { 
                ...plan, 
                userHasBookmarked: false,
                bookmarkCount: Math.max(0, (plan.bookmarkCount || 0) - (plan.userHasBookmarked ? 1 : 0))
              }
            : plan
        );
      });
      
      return { previousPlans };
    },
    onError: (error: any, activityId, context) => {
      if (context?.previousPlans) {
        queryClient.setQueryData(["/api/community-plans", filters.category, filters.search, filters.budget], context.previousPlans);
      }
      toast({
        title: "Failed to unbookmark plan",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community-plans"] });
    },
  });

  // Pin plan mutation (toggle)
  const pinPlanMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const response = await fetch(apiUrl(`/api/activities/${activityId}/pin`), {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to pin plan");
      return response.json();
    },
    onMutate: async (activityId: string) => {
      await queryClient.cancelQueries({ queryKey: ["/api/community-plans"] });
      const previousPlans = queryClient.getQueryData(["/api/community-plans", filters.category, filters.search, filters.budget]);
      
      queryClient.setQueryData(["/api/community-plans", filters.category, filters.search, filters.budget], (old: any) => {
        if (!old) return old;
        return old.map((plan: any) => 
          plan.id === activityId 
            ? { ...plan, userHasPinned: !plan.userHasPinned }
            : plan
        );
      });
      
      return { previousPlans };
    },
    onError: (error: any, activityId, context) => {
      if (context?.previousPlans) {
        queryClient.setQueryData(["/api/community-plans", filters.category, filters.search, filters.budget], context.previousPlans);
      }
      toast({
        title: "Failed to pin plan",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community-plans"] });
    },
  });

  // Toggle helpers for UI
  const handleToggleLike = (activityId: string, currentlyLiked: boolean) => {
    if (currentlyLiked) {
      unlikePlanMutation.mutate(activityId);
    } else {
      likePlanMutation.mutate(activityId);
    }
  };

  const handleToggleBookmark = (activityId: string, currentlyBookmarked: boolean) => {
    if (currentlyBookmarked) {
      unbookmarkPlanMutation.mutate(activityId);
    } else {
      bookmarkPlanMutation.mutate(activityId);
    }
  };

  const handleTogglePin = (activityId: string) => {
    pinPlanMutation.mutate(activityId);
  };

  // Auto-seed on first load if needed
  useEffect(() => {
    if (!isLoading && plans.length === 0 && !hasSeedAttempted && !filters.search) {
      console.log("[SEED] No community plans found, attempting to seed...");
      setHasSeedAttempted(true);
      seedMutation.mutate();
    }
  }, [isLoading, plans.length, hasSeedAttempted, filters.search]);

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

  const handleReportPlan = (activityId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setReportingPlan({ id: activityId, title });
    setReportDialogOpen(true);
  };

  const handleUsePlanFromPreview = () => {
    // Check authentication - demo users cannot use plans
    const isAuthenticated = user && user.id !== 'demo-user';
    if (!isAuthenticated && onSignInRequired) {
      setPreviewDialogOpen(false);
      onSignInRequired();
      return;
    }
    
    setPreviewDialogOpen(false);
    setAdoptDialogOpen(true);
  };

  const handleUsePlan = (activityId: string, shareToken: string | null, title: string) => {
    // Check authentication - demo users cannot use plans
    const isAuthenticated = user && user.id !== 'demo-user';
    if (!isAuthenticated && onSignInRequired) {
      onSignInRequired();
      return;
    }
    
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
    if (backdrop.startsWith('http://') || backdrop.startsWith('https://')) {
      return backdrop;
    }
    if (backdrop.startsWith('/')) {
      return backdrop;
    }
    return stockImageMap[backdrop] || null;
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
          <h1 className="text-xl sm:text-2xl md:text-4xl font-bold" data-testid="text-page-title">
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

      {/* Filters Section - Mobile Responsive */}
      <div className="flex flex-col gap-4">
        {/* Search Bar with Icons */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search plans..."
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              className="pl-10 w-full"
              data-testid="input-search"
            />
          </div>
          
          {/* Location, Remix & Settings Icons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant={filters.locationEnabled ? "default" : "outline"}
              size="icon"
              onClick={handleLocationToggle}
              disabled={isLoadingLocation}
              data-testid="button-location-toggle"
              className="flex-shrink-0 min-h-[44px] min-w-[44px]"
            >
              <MapPin className="w-4 h-4" />
            </Button>
            <Button
              variant={remixMode ? "default" : "outline"}
              size="icon"
              onClick={() => {
                if (remixMode) {
                  setRemixMode(false);
                  setSelectedForRemix(new Set());
                } else {
                  if (!user) {
                    onSignInRequired?.();
                    return;
                  }
                  setRemixMode(true);
                }
              }}
              data-testid="button-remix-toggle"
              className={`flex-shrink-0 min-h-[44px] min-w-[44px] ${remixMode ? 'bg-gradient-to-r from-purple-500 to-violet-600 text-white' : ''}`}
              title={remixMode ? 'Cancel remix' : 'Remix multiple plans'}
            >
              <Combine className="w-4 h-4" />
            </Button>
            <CardDisplaySettings 
              preferences={displayPrefs} 
              onUpdatePreference={updatePreference} 
              onResetPreferences={resetPreferences} 
            />
          </div>
        </div>

        {/* Category Tabs - Horizontally Scrollable on Mobile */}
        <Tabs value={filters.category} onValueChange={(value) => updateFilter("category", value)} className="w-full">
          <div className="relative">
            <div className="overflow-x-auto scrollbar-hide">
              <TabsList data-testid="tabs-categories" className="inline-flex gap-1 w-max min-w-full justify-start">
                {categories.map((cat) => (
                  <TabsTrigger
                    key={cat.value}
                    value={cat.value}
                    data-testid={`tab-${cat.value}`}
                    className="flex-shrink-0"
                    aria-label={`Filter by ${cat.label}`}
                  >
                    {cat.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {/* Scroll indicator arrow for mobile */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none sm:hidden">
              <div className="flex items-center bg-gradient-to-l from-background via-background to-transparent pl-6 pr-1">
                <ChevronRight className="w-4 h-4 text-muted-foreground animate-pulse" />
              </div>
            </div>
          </div>
        </Tabs>

        {/* Budget Filter */}
        <div className="w-full sm:w-auto sm:max-w-xs">
          <div className="flex items-center gap-3">
            <DollarSign className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Select value={filters.budget} onValueChange={(value) => updateFilter("budget", value)}>
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
      </div>

      {/* Plans Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <Search className="w-12 h-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No plans found</h3>
            <p className="text-muted-foreground text-sm">
              {filters.search || filters.category !== "all" || filters.budget !== "all"
                ? "Try adjusting your filters"
                : "Check back later for new community plans"}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {plans.map((plan) => {
            const stockImage = getStockImage(plan.backdrop);
            const planTypeBadge = getPlanTypeBadge(plan.planType, plan.trendingScore);
            const verificationLabel = getVerificationLabel(plan.sourceType, plan.verificationBadge);
            
            // Calculate distance if user location is available and plan has coordinates
            let distance: string | null = null;
            if (filters.userCoords && plan.latitude && plan.longitude) {
              const distanceMeters = calculateDistance(
                filters.userCoords.lat,
                filters.userCoords.lon,
                plan.latitude,
                plan.longitude
              );
              distance = formatDistance(distanceMeters);
            }
            
            const isSelected = selectedForRemix.has(plan.id);
            
            return (
              <HoverCard key={plan.id} openDelay={300} closeDelay={200}>
                <HoverCardTrigger asChild>
                  <Card 
                    className={`flex flex-col group hover-elevate cursor-pointer relative ${
                      remixMode && isSelected ? 'ring-2 ring-purple-500 ring-offset-2' : ''
                    }`}
                    onClick={() => {
                      if (remixMode) {
                        toggleRemixSelection(plan.id);
                      } else {
                        handlePreviewPlan(plan.id, plan.shareToken, plan.title);
                      }
                    }}
                    style={{ 
                      borderColor: remixMode && isSelected ? 'var(--purple-500)' : planTypeBadge.borderColor,
                      borderWidth: '2px'
                    }}
                    data-testid={`card-plan-${plan.id}`}
                  >
                    {/* Remix mode selection overlay */}
                    {remixMode && (
                      <div className={`absolute top-3 right-3 z-20 w-6 h-6 rounded-full flex items-center justify-center ${
                        isSelected 
                          ? 'bg-purple-500 text-white' 
                          : 'bg-white/80 backdrop-blur-sm border-2 border-purple-300'
                      }`}>
                        {isSelected && <Check className="w-4 h-4" />}
                      </div>
                    )}
                {stockImage && (
                  <div className="relative h-56 sm:h-64 overflow-hidden rounded-t-md">
                    <img
                      src={stockImage}
                      alt={plan.title}
                      className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                      data-testid={`img-plan-backdrop-${plan.id}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    {plan.category && (
                      <Badge 
                        className={`absolute top-3 left-3 ${getCategoryColor(plan.category)} text-white border-0`}
                        data-testid={`badge-category-${plan.id}`}
                      >
                        {plan.category}
                      </Badge>
                    )}
                    {/* Plan Type Badge */}
                    <div 
                      className={`absolute ${plan.category ? 'top-12' : 'top-3'} left-3 px-2 py-1 rounded-md text-xs font-medium text-white border flex items-center gap-1`}
                      style={{ backgroundColor: planTypeBadge.bgColor, borderColor: planTypeBadge.borderColor }}
                      data-testid={`badge-plan-type-${plan.id}`}
                      aria-label={planTypeBadge.ariaLabel}
                    >
                      {planTypeBadge.type === 'emergency' && <ShieldAlert className="w-3 h-3" />}
                      {planTypeBadge.type === 'sponsored' && <Megaphone className="w-3 h-3" />}
                      {planTypeBadge.type === 'trending' && <TrendingUp className="w-3 h-3" />}
                      {planTypeBadge.type === 'community' && <Users className="w-3 h-3" />}
                      {planTypeBadge.label}
                    </div>
                    {/* Budget and Distance Badges */}
                    <div className="absolute bottom-3 left-3 flex gap-2">
                      {displayPrefs.showBudget && plan.budget !== null && plan.budget !== undefined && (
                        <div 
                          className="px-2 py-1 rounded-md text-xs font-semibold text-white bg-black/60 backdrop-blur-sm border border-white/20"
                          data-testid={`badge-budget-${plan.id}`}
                          aria-label={`Budget: ${formatBudget(plan.budget)}`}
                        >
                          {formatBudget(plan.budget)}
                        </div>
                      )}
                      {displayPrefs.showDistance && distance && (
                        <div 
                          className="px-2 py-1 rounded-md text-xs font-semibold text-white bg-black/60 backdrop-blur-sm border border-white/20 flex items-center gap-1"
                          data-testid={`badge-distance-${plan.id}`}
                          aria-label={`Distance: ${distance}`}
                        >
                          <MapPin className="w-3 h-3" />
                          {distance}
                        </div>
                      )}
                    </div>
                    <div className="absolute top-3 right-3 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleLike(plan.id, plan.userHasLiked || false);
                        }}
                        className="p-2 rounded-full bg-background/80 backdrop-blur-sm hover-elevate active-elevate-2 transition-all"
                        data-testid={`button-like-${plan.id}`}
                        aria-label={plan.userHasLiked ? "Unlike plan" : "Like plan"}
                      >
                        <Heart className={`w-4 h-4 ${plan.userHasLiked ? "fill-red-500 text-red-500" : "text-foreground"}`} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleBookmark(plan.id, plan.userHasBookmarked || false);
                        }}
                        className="p-2 rounded-full bg-background/80 backdrop-blur-sm hover-elevate active-elevate-2 transition-all"
                        data-testid={`button-bookmark-${plan.id}`}
                        aria-label={plan.userHasBookmarked ? "Remove bookmark" : "Bookmark plan"}
                      >
                        <Bookmark className={`w-4 h-4 ${plan.userHasBookmarked ? "fill-amber-500 text-amber-500" : "text-foreground"}`} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePin(plan.id);
                        }}
                        className="p-2 rounded-full bg-background/80 backdrop-blur-sm hover-elevate active-elevate-2 transition-all"
                        data-testid={`button-pin-${plan.id}`}
                        aria-label={(plan as any).userHasPinned ? "Unpin plan" : "Pin plan"}
                      >
                        <Pin className={`w-4 h-4 ${(plan as any).userHasPinned ? "fill-purple-500 text-purple-500" : "text-foreground"}`} />
                      </button>
                    </div>
                  </div>
                )}
                
                <CardHeader className="p-3 pb-2">
                  <div className="flex items-start gap-2">
                    {displayPrefs.showOwner && (
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <Avatar className="w-8 h-8 cursor-pointer" data-testid={`avatar-creator-${plan.id}`}>
                            <AvatarImage src={plan.creatorAvatar || undefined} alt={plan.creatorName || "User"} />
                            <AvatarFallback>{getInitials(plan.creatorName || "User")}</AvatarFallback>
                          </Avatar>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-64">
                          <div className="flex gap-3">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={plan.creatorAvatar || undefined} alt={plan.creatorName || "User"} />
                              <AvatarFallback>{getInitials(plan.creatorName || "User")}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm">{plan.creatorName || "Unknown User"}</h4>
                              <p className="text-xs text-muted-foreground">Plan Creator</p>
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm leading-tight mb-0.5 line-clamp-2" data-testid={`text-plan-title-${plan.id}`}>
                        {plan.title}
                      </h3>
                      {displayPrefs.showOwner && (
                        <div className="flex items-center gap-1">
                          <p className="text-xs text-muted-foreground">
                            by {plan.creatorName || "Unknown"}
                          </p>
                          {displayPrefs.showVerificationBadge && verificationLabel && (
                            <VerificationIcon
                              verificationBadge={plan.verificationBadge}
                              sourceType={plan.sourceType}
                              label={verificationLabel}
                              planId={plan.id}
                              plannerProfileId={plan.plannerProfileId}
                              twitterPostUrl={(plan as any).twitterPostUrl}
                              instagramPostUrl={(plan as any).instagramPostUrl}
                              threadsPostUrl={(plan as any).threadsPostUrl}
                              linkedinPostUrl={(plan as any).linkedinPostUrl}
                              instagramHandle={(plan as any).instagramHandle}
                              twitterHandle={(plan as any).twitterHandle}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 p-3 pt-0">
                  {plan.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2" data-testid={`text-plan-description-${plan.id}`}>
                      {plan.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {displayPrefs.showLikes && (
                      <div className="flex items-center gap-1" data-testid={`stat-likes-${plan.id}`}>
                        <Heart className="w-3 h-3" />
                        <span>{plan.likeCount || 0}</span>
                      </div>
                    )}
                    {displayPrefs.showBookmarks && (
                      <div className="flex items-center gap-1" data-testid={`stat-bookmarks-${plan.id}`}>
                        <Bookmark className="w-3 h-3" />
                        <span>{plan.bookmarkCount || 0}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1" data-testid={`stat-views-${plan.id}`}>
                      <Eye className="w-3 h-3" />
                      <span>{plan.viewCount || 0}</span>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="gap-2 p-3 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    onClick={() => handlePreviewPlan(plan.id, plan.shareToken, plan.title)}
                    data-testid={`button-preview-${plan.id}`}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    onClick={() => handleUsePlan(plan.id, plan.shareToken, plan.title)}
                    data-testid={`button-use-${plan.id}`}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Use Plan
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => handleReportPlan(plan.id, plan.title, e)}
                    title="Report plan"
                    data-testid={`button-report-${plan.id}`}
                  >
                    <Flag className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </CardFooter>
              </Card>
            </HoverCardTrigger>
            <HoverCardContent className="w-80" side="top" align="center">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm line-clamp-2">{plan.title}</h4>
                {plan.description && (
                  <p className="text-xs text-muted-foreground line-clamp-3">{plan.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs">
                  {displayPrefs.showBudget && plan.budget !== null && plan.budget !== undefined && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-muted-foreground" />
                      <span className="font-medium">{formatBudget(plan.budget)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3 text-muted-foreground" />
                    <span>{plan.viewCount || 0} views</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground italic border-t pt-2">
                  Hover to preview • Click "Preview" for full details
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
            );
          })}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-preview">
          <DialogHeader>
            <DialogTitle>{selectedPlan?.title || "Plan Preview"}</DialogTitle>
            <DialogDescription>
              Preview this plan before adding it to your collection
            </DialogDescription>
          </DialogHeader>
          {isPreviewLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : previewData ? (
            <div className="space-y-4 py-4">
              {/* Description Section */}
              {previewData.activity?.description && (
                <div>
                  <h4 className="font-semibold text-base mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{previewData.activity.description}</p>
                </div>
              )}
              
              {/* Total Budget Section */}
              {previewData.activity?.budget !== null && previewData.activity?.budget !== undefined && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-base">Total Budget</h4>
                    <span className="text-2xl font-bold text-primary" data-testid="text-preview-budget">
                      {formatBudgetPrecise(previewData.activity.budget)}
                    </span>
                  </div>
                  
                  {/* Budget Breakdown Collapsible */}
                  {previewData.activity?.budgetBreakdown && previewData.activity.budgetBreakdown.length > 0 && (
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full" data-testid="button-budget-breakdown-toggle">
                        <span>View breakdown</span>
                        <ChevronDown className="w-4 h-4" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3 space-y-2">
                        {previewData.activity.budgetBreakdown.map((item: any, index: number) => (
                          <div key={index} className="flex items-start justify-between text-sm border-l-2 border-muted pl-3 py-1.5">
                            <div className="flex-1">
                              <p className="font-medium">{item.category}</p>
                              {item.notes && (
                                <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>
                              )}
                            </div>
                            <span className="font-semibold ml-2">{formatBudgetPrecise(item.amount)}</span>
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              )}
              
              {/* Tasks Section */}
              {previewData.tasks && previewData.tasks.length > 0 && (
                <div>
                  <h4 className="font-semibold text-base mb-3">Tasks ({previewData.tasks.length})</h4>
                  <div className="space-y-2">
                    {previewData.tasks.map((task: any, index: number) => (
                      <div key={index} className="flex items-start gap-2 p-2 rounded-md bg-muted/30">
                        <div className="mt-0.5">
                          {task.status === "completed" ? (
                            <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{task.title}</p>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Likes/Views Stats Footer */}
              <div className="flex items-center gap-4 pt-2 border-t text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5" data-testid="stat-preview-likes">
                  <Heart className="w-4 h-4" />
                  <span>{previewData.activity?.likeCount?.toLocaleString() || 0} likes</span>
                </div>
                <div className="flex items-center gap-1.5" data-testid="stat-preview-views">
                  <Eye className="w-4 h-4" />
                  <span>{previewData.activity?.viewCount?.toLocaleString() || 0} views</span>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setPreviewDialogOpen(false)} className="flex-1" data-testid="button-preview-close">
                  Close
                </Button>
                <Button onClick={handleUsePlanFromPreview} className="flex-1" data-testid="button-add-plan">
                  Add This Plan
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">Failed to load plan details</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Adopt Plan Dialog */}
      <Dialog open={adoptDialogOpen} onOpenChange={setAdoptDialogOpen}>
        <DialogContent data-testid="dialog-adopt">
          <DialogHeader>
            <DialogTitle>Add Plan to Your Collection</DialogTitle>
            <DialogDescription>
              Choose where to add "{selectedPlan?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <RadioGroup value={adoptTarget} onValueChange={(value) => setAdoptTarget(value as "personal" | "group")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="personal" id="personal" data-testid="radio-personal" />
                <Label htmlFor="personal" className="flex-1 cursor-pointer">
                  Add to Personal Activities
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="group" id="group" data-testid="radio-group" />
                <Label htmlFor="group" className="flex-1 cursor-pointer">
                  Share to a Group
                </Label>
              </div>
            </RadioGroup>

            {adoptTarget === "group" && (
              <div className="space-y-2 pl-6">
                {groups.length === 0 ? (
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>You haven't created any groups yet.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCreateGroupDialogOpen(true)}
                      className="w-full gap-2"
                      data-testid="button-create-first-group"
                    >
                      <Plus className="w-4 h-4" />
                      Create New Group
                    </Button>
                  </div>
                ) : (
                  <>
                    <RadioGroup value={selectedGroupId} onValueChange={setSelectedGroupId}>
                      {groups.map((group) => (
                        <div key={group.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={group.id} id={group.id} data-testid={`radio-group-${group.id}`} />
                          <Label htmlFor={group.id} className="flex-1 cursor-pointer">
                            {group.name}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCreateGroupDialogOpen(true)}
                      className="w-full gap-2 mt-2"
                      data-testid="button-create-another-group"
                    >
                      <Plus className="w-4 h-4" />
                      Create Another Group
                    </Button>
                  </>
                )}
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

      {/* Create Group Dialog */}
      <CreateGroupDialog
        open={createGroupDialogOpen}
        onOpenChange={setCreateGroupDialogOpen}
        onGroupCreated={(group) => {
          queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
          setAdoptTarget("group");
          setPendingGroupId(group.id);
        }}
      />

      {/* Report Dialog */}
      {reportingPlan && (
        <ReportDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          activityId={reportingPlan.id}
          activityTitle={reportingPlan.title}
        />
      )}

      {/* Remix Mode Floating Action Bar - respects iOS and Android safe areas */}
      {remixMode && (
        <div 
          className="fixed left-0 right-0 p-2 sm:p-4 bg-gradient-to-t from-background via-background to-transparent z-50"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + var(--android-safe-area-bottom, 0px))' }}
        >
          <div className="max-w-2xl mx-auto">
            <Card className="p-3 sm:p-4 shadow-lg border-purple-200 dark:border-purple-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm sm:text-base">
                    {selectedForRemix.size === 0 
                      ? "Select plans to remix" 
                      : `${selectedForRemix.size} plan${selectedForRemix.size !== 1 ? 's' : ''} selected`
                    }
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {selectedForRemix.size < 2 
                      ? "Select at least 2 plans" 
                      : "Ready to create your remix"
                    }
                  </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRemixMode(false);
                      setSelectedForRemix(new Set());
                    }}
                    data-testid="button-cancel-remix"
                    className="flex-1 sm:flex-none"
                  >
                    <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="text-xs sm:text-sm">Cancel</span>
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 sm:flex-none bg-gradient-to-r from-purple-500 to-violet-600 text-white"
                    onClick={handleRemixPreview}
                    disabled={selectedForRemix.size < 2 || isRemixing}
                    data-testid="button-preview-remix"
                  >
                    {isRemixing ? (
                      <>
                        <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                        <span className="text-xs sm:text-sm">Processing...</span>
                      </>
                    ) : (
                      <>
                        <Combine className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        <span className="text-xs sm:text-sm">Remix {selectedForRemix.size}</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Remix Preview Dialog */}
      <Dialog open={remixDialogOpen} onOpenChange={setRemixDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-remix-preview">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Combine className="w-5 h-5 text-purple-500" />
              Remix Preview
            </DialogTitle>
            <DialogDescription>
              Review your remixed plan before saving
            </DialogDescription>
          </DialogHeader>
          
          {remixPreview && (
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Title</label>
                <p className="text-lg font-semibold" data-testid="text-remix-title">
                  {remixPreview.mergedTitle}
                </p>
              </div>
              
              {remixPreview.mergedDescription && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-foreground" data-testid="text-remix-description">
                    {remixPreview.mergedDescription}
                  </p>
                </div>
              )}
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Tasks ({remixPreview.mergedTasks?.length || 0})
                  </label>
                  {remixPreview.stats?.duplicatesRemoved > 0 && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                      {remixPreview.stats.duplicatesRemoved} duplicates removed
                    </Badge>
                  )}
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {remixPreview.mergedTasks?.map((task: any, index: number) => (
                    <div 
                      key={index} 
                      className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border"
                      data-testid={`task-remix-${index}`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs font-medium text-purple-600">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{task.title}</p>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="flex-shrink-0">
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {remixPreview.attributions?.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Credits
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {remixPreview.attributions.map((attr: any, index: number) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {attr.creatorName || 'Community Member'} ({attr.tasksContributed} tasks)
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setRemixDialogOpen(false)}
              className="flex-1"
              data-testid="button-cancel-save-remix"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRemixConfirm}
              disabled={isRemixing}
              className="flex-1 bg-gradient-to-r from-purple-500 to-violet-600 text-white"
              data-testid="button-save-remix"
            >
              {isRemixing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save Remix
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
