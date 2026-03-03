import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
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

// Load background images from public directory
const stockImageMap: Record<string, string> = {
  "romantic_paris_citys_dfc7c798.jpg": "/community-backdrops/romantic_paris_citys_dfc7c798.jpg",
  "fitness_workout_gym__2325ee98.jpg": "/community-backdrops/fitness_workout_gym__2325ee98.jpg",
  "elegant_wedding_cere_9aa2c585.jpg": "/community-backdrops/elegant_wedding_cere_9aa2c585.jpg",
  "modern_tech_workspac_ef8fa108.jpg": "/community-backdrops/modern_tech_workspac_ef8fa108.jpg",
  "beautiful_modern_hom_0f24a3e6.jpg": "/community-backdrops/beautiful_modern_hom_0f24a3e6.jpg",
  "organized_productivi_df70e725.jpg": "/community-backdrops/organized_productivi_df70e725.jpg",
  "tokyo_japan_travel_d_8a196170.jpg": "/community-backdrops/tokyo_japan_travel_d_8a196170.jpg",
  "bali_indonesia_tropi_95575be5.jpg": "/community-backdrops/bali_indonesia_tropi_95575be5.jpg",
  "new_york_city_times__e09e766b.jpg": "/community-backdrops/new_york_city_times__e09e766b.jpg",
  "paris_eiffel_tower_f_fce5772c.jpg": "/community-backdrops/paris_eiffel_tower_f_fce5772c.jpg",
  "iceland_northern_lig_9fbbf14d.jpg": "/community-backdrops/iceland_northern_lig_9fbbf14d.jpg",
  "runner_jogging_on_tr_9a63ddad.jpg": "/community-backdrops/runner_jogging_on_tr_9a63ddad.jpg",
  "yoga_studio_peaceful_84f9a366.jpg": "/community-backdrops/yoga_studio_peaceful_84f9a366.jpg",
  "cyclist_riding_bike__9ae17ca2.jpg": "/community-backdrops/cyclist_riding_bike__9ae17ca2.jpg",
  "modern_gym_workout_w_99dc5406.jpg": "/community-backdrops/modern_gym_workout_w_99dc5406.jpg",
  "modern_workspace_des_9f6c2608.jpg": "/community-backdrops/modern_workspace_des_9f6c2608.jpg",
  "business_presentatio_aee687af.jpg": "/community-backdrops/business_presentatio_aee687af.jpg",
  "professional_network_48ccc448.jpg": "/community-backdrops/professional_network_48ccc448.jpg",
  "person_reading_book__bc916131.jpg": "/community-backdrops/person_reading_book__bc916131.jpg",
  "birthday_party_celeb_414d649e.jpg": "/community-backdrops/birthday_party_celeb_414d649e.jpg",
  "concert_music_festiv_18316657.jpg": "/community-backdrops/concert_music_festiv_18316657.jpg",
  "person_coding_on_lap_ba381062.jpg": "/community-backdrops/person_coding_on_lap_ba381062.jpg",
  "home_renovation_kitc_0ceb0522.jpg": "/community-backdrops/home_renovation_kitc_0ceb0522.jpg",
  "spanish_language_lea_2d2edb39.jpg": "/community-backdrops/spanish_language_lea_2d2edb39.jpg",
  "modern_kitchen_renov_a5563863.jpg": "/community-backdrops/modern_kitchen_renov_a5563863.jpg",
  "professional_develop_960cd8cf.jpg": "/community-backdrops/professional_develop_960cd8cf.jpg",
  "spanish_language_lea_269b1aa7.jpg": "/community-backdrops/spanish_language_lea_269b1aa7.jpg",
  "person_meditating_pe_43f13693.jpg": "/community-backdrops/person_meditating_pe_43f13693.jpg",
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
  const containerRef = useRef<HTMLDivElement>(null);
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
      console.log('[ADOPT PLAN] Starting copy mutation:', { activityId, shareToken, title, forceUpdate });

      const response = await fetch(apiUrl(`/api/activities/copy/${shareToken}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceUpdate }),
        credentials: "include",
      });

      console.log('[ADOPT PLAN] Response status:', response.status, response.statusText);

      const data = await response.json();
      console.log('[ADOPT PLAN] Response data:', data);

      if (response.status === 409 && data.requiresConfirmation) {
        console.log('[ADOPT PLAN] Duplicate detected, needs confirmation');
        throw {
          status: 409,
          requiresConfirmation: true,
          message: data.message,
          existingActivity: data.existingActivity,
        };
      }

      if (!response.ok) {
        console.error('[ADOPT PLAN] Copy failed:', { status: response.status, error: data.error, data });
        throw new Error(data.error || "Failed to copy activity");
      }

      console.log('[ADOPT PLAN] Copy successful, incrementing views');
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
      console.error('[ADOPT PLAN] Mutation error:', error);
      console.error('[ADOPT PLAN] Error details:', {
        message: error?.message,
        status: error?.status,
        name: error?.name,
        stack: error?.stack,
      });

      if (error.status === 409 && error.requiresConfirmation) {
        console.log('[ADOPT PLAN] Handling duplicate confirmation');
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

  // Staggered load animation for plan cards
  useEffect(() => {
    if (!isLoading && plans.length > 0 && containerRef.current) {
      const cards = containerRef.current.querySelectorAll('.plan-card-animate');
      if (cards.length > 0) {
        gsap.fromTo(
          cards,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            stagger: 0.1,
            ease: "back.out(1.2)",
            clearProps: "all"
          }
        );
      }
    }
  }, [isLoading, plans]);

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
    console.log('[ADOPT PLAN] handleUsePlan called:', { activityId, shareToken, title, hasShareToken: !!shareToken });

    // Check authentication - demo users cannot use plans
    const isAuthenticated = user && user.id !== 'demo-user';
    if (!isAuthenticated && onSignInRequired) {
      console.log('[ADOPT PLAN] User not authenticated, prompting sign in');
      onSignInRequired();
      return;
    }

    if (!shareToken) {
      console.error('[ADOPT PLAN] No shareToken available for plan:', { activityId, title });
      toast({
        title: "Cannot use plan",
        description: "This plan is not available for use (no share token)",
        variant: "destructive",
      });
      return;
    }
    console.log('[ADOPT PLAN] Opening adopt dialog for:', { activityId, shareToken, title });
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

  // Define seasonal banner variations
  const seasonalVibes = {
    spring: {
      tag: "Spring Reset 🌸",
      title: "Discover your next era.",
      bgGradient: "from-pink-100 via-primary/10 to-emerald-100",
      pillTags: ["#SpringCleaning", "#FreshStart", "#OutdoorWorkouts", "#MorningRoutine", "#MindfulMoments", "#ThatGirl"]
    },
    summer: {
      tag: "Summer Energy ☀️",
      title: "Chase the sunset.",
      bgGradient: "from-yellow-100 via-orange-50 to-red-100",
      pillTags: ["#HotGirlWalk", "#SummerReads", "#BeachDays", "#TravelHacks", "#FitnessJourney", "#SummerVibes"]
    },
    autumn: {
      tag: "Cozy Autumn 🍂",
      title: "Settle into your routine.",
      bgGradient: "from-orange-100 via-amber-50 to-stone-200",
      pillTags: ["#CozyVibes", "#FallRecipes", "#StudyMotivation", "#NightRoutine", "#PumpkinSpice", "#Reset"]
    },
    winter: {
      tag: "Winter Wellness ❄️",
      title: "Embrace the chill.",
      bgGradient: "from-blue-100 via-slate-50 to-indigo-100",
      pillTags: ["#WinterArc", "#SkiTrip", "#IndoorHobbies", "#MentalReset", "#CozyNightIn", "#Productivity"]
    }
  };

  // Determine active season based on current real-time month
  const currentMonth = new Date().getMonth(); // 0-11
  let activeSeasonKey = "spring";
  if (currentMonth >= 2 && currentMonth <= 4) activeSeasonKey = "spring"; // Mar-May
  else if (currentMonth >= 5 && currentMonth <= 7) activeSeasonKey = "summer"; // Jun-Aug
  else if (currentMonth >= 8 && currentMonth <= 10) activeSeasonKey = "autumn"; // Sep-Nov
  else activeSeasonKey = "winter"; // Dec-Feb

  const activeSeason = seasonalVibes[activeSeasonKey as keyof typeof seasonalVibes];

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Seasonal Discovery Header (Lemon8 / Pinterest Vibe) */}
      <div className={`relative w-full rounded-[2rem] overflow-hidden mb-8 bg-gradient-to-br ${activeSeason.bgGradient} p-8 sm:p-12 shadow-sm border border-white/50`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/20 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4"></div>

        <div className="relative z-10">
          <Badge className="bg-white/80 text-primary hover:bg-white backdrop-blur-md border-0 mb-4 shadow-sm" data-testid="badge-seasonal">
            <Sparkles className="w-3 h-3 mr-1" />
            {activeSeason.tag}
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 font-drama italic text-slate-800" data-testid="text-page-title">
            {activeSeason.title}
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mb-8" data-testid="text-page-description">
            Explore trending routines, aesthetic setups, and community plans to elevate your lifestyle right now.
          </p>

          {/* Swipeable Lifestyle Tags */}
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x">
            {activeSeason.pillTags.map(tag => (
              <Badge key={tag} variant="outline" className="snap-start flex-shrink-0 bg-white/60 hover:bg-white/90 backdrop-blur-sm border-white/40 text-slate-700 py-1.5 px-4 rounded-full cursor-pointer transition-all hover:scale-105 shadow-sm">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
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
        <Tabs value={filters.category} onValueChange={(value) => updateFilter("category", value)} className="w-full mt-2">
          <div className="relative">
            <div className="overflow-x-auto scrollbar-hide py-1.5 px-1 -mx-1">
              <TabsList data-testid="tabs-categories" className="inline-flex gap-2.5 w-max min-w-full justify-start bg-transparent p-0 h-auto">
                {categories.map((cat) => {
                  const Icon = cat.Icon;
                  return (
                    <TabsTrigger
                      key={cat.value}
                      value={cat.value}
                      data-testid={`tab-${cat.value}`}
                      className="flex-shrink-0 flex items-center gap-1.5 rounded-full px-4 py-2 font-medium bg-secondary/60 hover:bg-secondary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 hover-squish shadow-sm data-[state=active]:shadow-diffuse-primary border border-transparent data-[state=active]:border-primary/20"
                      aria-label={`Filter by ${cat.label}`}
                    >
                      {Icon && <Icon className="w-3.5 h-3.5 opacity-80" />}
                      {cat.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
            {/* Scroll indicator arrow for mobile */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none sm:hidden z-10 h-full">
              <div className="flex items-center bg-gradient-to-l from-background via-background/90 to-transparent pl-8 pr-1 h-full">
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

      {/* Plans Masonry Grid */}
      {isLoading ? (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 sm:gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="mb-6 overflow-hidden break-inside-avoid shadow-sm rounded-[2rem]">
              <Skeleton className="h-64 w-full" />
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <Card className="p-8 text-center rounded-[2rem]">
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
        <div ref={containerRef} className="columns-1 sm:columns-2 lg:columns-3 gap-3 sm:gap-4 pb-10">
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
              <div key={plan.id} className="break-inside-avoid inline-block w-full mb-4 sm:mb-6">
                <HoverCard openDelay={300} closeDelay={200}>
                  <HoverCardTrigger asChild>
                    <Card
                      className={`plan-card-animate flex flex-col group cursor-pointer relative overflow-hidden bg-card border border-border/5 rounded-2xl ${remixMode && isSelected ? 'ring-2 ring-primary ring-offset-2' : 'shadow-sm hover:shadow-lg transition-all duration-300'}`}
                      onClick={() => {
                        if (remixMode) {
                          toggleRemixSelection(plan.id);
                        } else {
                          handlePreviewPlan(plan.id, plan.shareToken, plan.title);
                        }
                      }}
                      data-testid={`card-plan-${plan.id}`}
                    >

                      {/* HERO IMAGE */}
                      {stockImage ? (
                        <div className="relative w-full bg-muted overflow-hidden">
                          <img
                            src={stockImage}
                            alt={plan.title}
                            className="w-full h-auto object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            data-testid={`img-plan-backdrop-${plan.id}`}
                          />
                          {/* Subtle top gradient for badge readability */}
                          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />

                          {/* Badges */}
                          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                            {plan.category && (
                              <Badge
                                className={`w-fit ${getCategoryColor(plan.category)} text-white border-0 shadow-md px-2 py-0.5 text-[10px] backdrop-blur-sm`}
                                data-testid={`badge-category-${plan.id}`}
                              >
                                {plan.category}
                              </Badge>
                            )}
                            {planTypeBadge.type !== 'community' && (
                              <div
                                className="w-fit px-2 py-0.5 rounded-full text-[10px] font-semibold text-white border flex items-center gap-1 shadow-md backdrop-blur-sm"
                                style={{ backgroundColor: planTypeBadge.bgColor, borderColor: planTypeBadge.borderColor }}
                                data-testid={`badge-plan-type-${plan.id}`}
                                aria-label={planTypeBadge.ariaLabel}
                              >
                                {planTypeBadge.type === 'emergency' && <ShieldAlert className="w-3 h-3" />}
                                {planTypeBadge.type === 'sponsored' && <Megaphone className="w-3 h-3" />}
                                {planTypeBadge.type === 'trending' && <TrendingUp className="w-3 h-3" />}
                                {planTypeBadge.label}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="px-4 pt-4 pb-0">
                          <div className="flex items-center gap-2">
                            {plan.category && (
                              <Badge className={`${getCategoryColor(plan.category)} text-white border-0 text-[10px]`}>{plan.category}</Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Card Content */}
                      <CardContent className="px-3.5 pt-3 pb-1.5 flex-grow flex flex-col gap-1.5">
                        <h3 className="font-semibold text-sm leading-snug line-clamp-2" data-testid={`text-plan-title-${plan.id}`}>
                          {plan.title}
                        </h3>
                        {plan.description && (
                          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2" data-testid={`text-plan-description-${plan.id}`}>
                            {plan.description}
                          </p>
                        )}

                        {/* Creator row */}
                        <div className="flex items-center gap-1.5 mt-1">
                          <Avatar className="w-5 h-5 shrink-0">
                            <AvatarImage src={plan.creatorAvatar || undefined} />
                            <AvatarFallback className="bg-primary/10 text-[8px] font-semibold text-primary">{getInitials(plan.creatorName || "User")}</AvatarFallback>
                          </Avatar>
                          <span className="text-[11px] text-muted-foreground truncate">{plan.creatorName || "Community Member"}</span>
                        </div>
                      </CardContent>

                      {/* Interaction Bar */}
                      <div className="flex items-center justify-between px-3.5 pb-3 pt-1.5">
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleLike(plan.id, plan.userHasLiked || false);
                            }}
                            className="p-1 rounded-full hover:bg-primary/10 transition-colors flex items-center gap-0.5"
                            data-testid={`button-like-${plan.id}`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${plan.userHasLiked ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                            <span className="text-[11px] text-muted-foreground">{plan.likeCount || 0}</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleBookmark(plan.id, plan.userHasBookmarked || false);
                            }}
                            className="p-1 rounded-full hover:bg-primary/10 transition-colors flex items-center gap-0.5"
                            data-testid={`button-bookmark-${plan.id}`}
                          >
                            <Bookmark className={`w-3.5 h-3.5 ${plan.userHasBookmarked ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                            <span className="text-[11px] text-muted-foreground">{plan.bookmarkCount || 0}</span>
                          </button>
                        </div>

                        {plan.budget && plan.budget > 0 && (
                          <span className="text-[11px] font-semibold text-primary">
                            {formatBudget(plan.budget)}
                          </span>
                        )}
                      </div>
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
              </div>
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
      {
        reportingPlan && (
          <ReportDialog
            open={reportDialogOpen}
            onOpenChange={setReportDialogOpen}
            activityId={reportingPlan.id}
            activityTitle={reportingPlan.title}
          />
        )
      }

      {/* Remix Mode Floating Action Bar - respects iOS and Android safe areas */}
      {
        remixMode && (
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
        )
      }

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
    </div >
  );
}
