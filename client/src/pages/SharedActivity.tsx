import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckSquare, Calendar, Clock, Lock, Share2, ChevronRight, ArrowLeft, Edit, Link2, Twitter, Facebook, Linkedin, Dumbbell, HeartPulse, Briefcase, BookOpen, DollarSign, Heart, Palette, Plane, Home, Star, ClipboardList, Moon, Sun, Sparkles, type LucideIcon } from 'lucide-react';
import journalMateLogo from '@assets/Export_JournalMate_2_1760772138217.png';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest } from '@/lib/queryClient';

interface SharedActivityData {
  activity: {
    id: string;
    title: string;
    description: string;
    category: string;
    status: string;
    priority?: string;
    startDate?: string;
    endDate?: string;
    userId: string;
    planSummary?: string;
    shareTitle?: string;
    backdrop?: string;
    createdAt: string;
    updatedAt: string;
  };
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    priority: string;
    completed: boolean;
    completedAt?: string;
    dueDate?: string;
    timeEstimate?: string;
  }>;
  requiresAuth: boolean;
  sharedBy?: {
    name?: string;
    email?: string;
  };
}

const categoryThemes: Record<string, { gradient: string; Icon: LucideIcon; accentColor: string; emoji: string }> = {
  fitness: {
    gradient: 'from-orange-500/20 via-red-500/20 to-pink-500/20',
    Icon: Dumbbell,
    accentColor: 'text-orange-600 dark:text-orange-400',
    emoji: '💪'
  },
  health: {
    gradient: 'from-emerald-500/20 via-teal-500/20 to-cyan-500/20',
    Icon: HeartPulse,
    accentColor: 'text-emerald-600 dark:text-emerald-400',
    emoji: '🏥'
  },
  career: {
    gradient: 'from-blue-500/20 via-indigo-500/20 to-purple-500/20',
    Icon: Briefcase,
    accentColor: 'text-blue-600 dark:text-blue-400',
    emoji: '💼'
  },
  learning: {
    gradient: 'from-violet-500/20 via-purple-500/20 to-fuchsia-500/20',
    Icon: BookOpen,
    accentColor: 'text-violet-600 dark:text-violet-400',
    emoji: '📚'
  },
  finance: {
    gradient: 'from-green-500/20 via-emerald-500/20 to-teal-500/20',
    Icon: DollarSign,
    accentColor: 'text-green-600 dark:text-green-400',
    emoji: '💰'
  },
  relationships: {
    gradient: 'from-pink-500/20 via-rose-500/20 to-red-500/20',
    Icon: Heart,
    accentColor: 'text-pink-600 dark:text-pink-400',
    emoji: '❤️'
  },
  creativity: {
    gradient: 'from-yellow-500/20 via-amber-500/20 to-orange-500/20',
    Icon: Palette,
    accentColor: 'text-yellow-600 dark:text-yellow-400',
    emoji: '🎨'
  },
  travel: {
    gradient: 'from-sky-500/20 via-blue-500/20 to-indigo-500/20',
    Icon: Plane,
    accentColor: 'text-sky-600 dark:text-sky-400',
    emoji: '✈️'
  },
  home: {
    gradient: 'from-amber-500/20 via-orange-500/20 to-red-500/20',
    Icon: Home,
    accentColor: 'text-amber-600 dark:text-amber-400',
    emoji: '🏠'
  },
  personal: {
    gradient: 'from-purple-500/20 via-pink-500/20 to-rose-500/20',
    Icon: Star,
    accentColor: 'text-purple-600 dark:text-purple-400',
    emoji: '⭐'
  },
  other: {
    gradient: 'from-slate-500/20 via-gray-500/20 to-zinc-500/20',
    Icon: ClipboardList,
    accentColor: 'text-slate-600 dark:text-slate-400',
    emoji: '📋'
  }
};

export default function SharedActivity() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [copyingLink, setCopyingLink] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [confirmationData, setConfirmationData] = useState<any>(null);
  
  // Initialize theme from localStorage or default to dark
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'light' ? 'light' : 'dark';
  });

  const { data: user } = useQuery({
    queryKey: ['/api/user'],
  });

  useEffect(() => {
    setIsAuthenticated(!!user && typeof user === 'object' && 'id' in user && user.id !== 'demo-user');
  }, [user]);

  // Apply initial theme to document on mount
  useEffect(() => {
    document.documentElement.classList.toggle('dark', previewTheme === 'dark');
  }, []);

  // Toggle theme and sync with localStorage and document class
  const togglePreviewTheme = () => {
    const newTheme = previewTheme === 'light' ? 'dark' : 'light';
    setPreviewTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const { data, isLoading, error: queryError } = useQuery<SharedActivityData>({
    queryKey: ['/api/share', token],
    queryFn: async () => {
      const response = await fetch(`/api/share/${token}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('This shared activity link is invalid or has expired.');
        }
        if (response.status === 401) {
          throw new Error('AUTH_REQUIRED');
        }
        throw new Error('Failed to load shared activity');
      }
      return response.json();
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (data?.activity && data?.tasks) {
      const { title, description, category, backdrop, shareTitle, planSummary } = data.activity;
      const currentUrl = window.location.href;
      
      // Category emoji mapping
      const categoryEmojis: Record<string, string> = {
        fitness: '💪',
        health: '🏥',
        career: '💼',
        learning: '📚',
        finance: '💰',
        relationships: '❤️',
        creativity: '🎨',
        travel: '✈️',
        home: '🏠',
        personal: '⭐',
        other: '📋'
      };
      const emoji = categoryEmojis[category?.toLowerCase()] || '✨';
      
      // Calculate progress
      const completedTasks = data.tasks.filter(t => t.completed).length;
      const totalTasks = data.tasks.length;
      const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const progressText = totalTasks > 0 ? ` - ${progressPercent}% complete!` : '';
      
      // Create rich, emoji-enhanced title and description for social sharing
      const baseTitle = shareTitle || planSummary || title || 'Shared Activity';
      const pageTitle = `${emoji} ${baseTitle}${progressText}`;
      const taskInfo = totalTasks > 0 ? ` • ${totalTasks} tasks • ${completedTasks} completed` : '';
      const pageDescription = description 
        ? `${description}${taskInfo}` 
        : `Join this ${category} plan on JournalMate${taskInfo}`;
      
      // Use OG image endpoint for rich social media previews
      // This generates an image with the activity backdrop + details overlay
      const baseUrl = window.location.origin;
      const ogImageUrl = `${baseUrl}/api/share/${token}/og-image`;

      document.title = `${pageTitle} - JournalMate`;

      // Helper function to set or create meta tags
      const setMetaTag = (selector: string, attribute: string, content: string) => {
        let tag = document.querySelector(selector);
        if (!tag) {
          tag = document.createElement('meta');
          if (selector.includes('property')) {
            tag.setAttribute('property', selector.replace('meta[property="', '').replace('"]', ''));
          } else {
            tag.setAttribute('name', selector.replace('meta[name="', '').replace('"]', ''));
          }
          document.head.appendChild(tag);
        }
        tag.setAttribute('content', content);
      };

      // Standard meta tags
      setMetaTag('meta[name="description"]', 'content', pageDescription);

      // Open Graph tags for Facebook, LinkedIn, WhatsApp, etc.
      setMetaTag('meta[property="og:title"]', 'content', pageTitle);
      setMetaTag('meta[property="og:description"]', 'content', pageDescription);
      setMetaTag('meta[property="og:image"]', 'content', ogImageUrl);
      setMetaTag('meta[property="og:image:width"]', 'content', '1200');
      setMetaTag('meta[property="og:image:height"]', 'content', '630');
      setMetaTag('meta[property="og:image:type"]', 'content', 'image/png');
      setMetaTag('meta[property="og:url"]', 'content', currentUrl);
      setMetaTag('meta[property="og:type"]', 'content', 'website');
      setMetaTag('meta[property="og:site_name"]', 'content', 'JournalMate');

      // Twitter Card tags
      setMetaTag('meta[name="twitter:card"]', 'content', 'summary_large_image');
      setMetaTag('meta[name="twitter:title"]', 'content', pageTitle);
      setMetaTag('meta[name="twitter:description"]', 'content', pageDescription);
      setMetaTag('meta[name="twitter:image"]', 'content', ogImageUrl);
    }
  }, [data]);

  const handleSignIn = () => {
    // Use full pathname as returnTo with autoCopy parameter to trigger copy after auth
    const returnTo = encodeURIComponent(`${window.location.pathname}?autoCopy=true`);
    console.log('[SHARED ACTIVITY] Redirecting to login with returnTo and autoCopy:', window.location.pathname);
    window.location.href = `/login?returnTo=${returnTo}`;
  };

  const copyActivityMutation = useMutation({
    mutationFn: async (forceUpdate: boolean = false) => {
      if (!token) throw new Error('Share token not found');
      const response = await fetch(`/api/activities/copy/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceUpdate }),
      });
      
      // Parse JSON response
      let result;
      try {
        result = await response.json();
      } catch (e) {
        // If JSON parsing fails and response is not ok, throw generic error
        if (!response.ok) {
          throw new Error('Failed to copy activity. Please try again.');
        }
        // If response is ok but no JSON, return success
        return { success: true };
      }
      
      if (!response.ok) {
        // If authentication is required, redirect to login
        if (result.requiresAuth) {
          const returnTo = encodeURIComponent(window.location.pathname);
          console.log('[SHARED ACTIVITY] Auth required, redirecting to login');
          window.location.href = `/login?returnTo=${returnTo}`;
          throw new Error('Redirecting to login...');
        }
        
        // If confirmation is required, return the result to handle in UI
        if (result.requiresConfirmation) {
          return result;
        }
        
        throw new Error(result.error || result.message || 'Failed to copy activity');
      }
      
      return result;
    },
    onSuccess: (result) => {
      // If confirmation is required, show dialog
      if (result?.requiresConfirmation) {
        setConfirmationData(result);
        setShowUpdateDialog(true);
        return; // Don't show success toast or redirect
      }
      
      if (result?.activity?.id) {
        const message = result.message || `"${result.activity.title}" has been added to your account with ${result.tasks?.length || 0} tasks.`;
        toast({
          title: result.isUpdate ? 'Plan Updated!' : 'Plan Copied!',
          description: message,
        });
        // Redirect to the activity page after a short delay
        setTimeout(() => {
          window.location.href = `/?activity=${result.activity.id}&tab=tasks`;
        }, 1500);
      }
    },
    onError: (error: Error) => {
      // Don't show error toast if we're redirecting to login
      if (!error.message.includes('Redirecting')) {
        toast({
          title: 'Copy Failed',
          description: error.message || 'Failed to copy activity. Please try again.',
          variant: 'destructive',
        });
      }
    },
  });

  // Automatic copy when user signs in
  useEffect(() => {
    // Check if user just authenticated (auth=success OR autoCopy=true in URL)
    const urlParams = new URLSearchParams(window.location.search);
    const justAuthenticated = urlParams.get('auth') === 'success' || urlParams.get('autoCopy') === 'true';
    
    console.log('[SHARED ACTIVITY] Auto-copy check:', {
      isAuthenticated,
      justAuthenticated,
      hasActivity: !!data?.activity,
      hasUser: !!user,
      isOwner: data?.activity?.userId === (user as any)?.id,
      permissionRequested,
      urlParams: Object.fromEntries(urlParams.entries())
    });
    
    // Only auto-copy if:
    // 1. User is authenticated (not demo user)
    // 2. Activity data is loaded
    // 3. User is not the owner
    // 4. Haven't already requested permission
    // 5. Just authenticated (from OAuth callback or clicked "Get Started Free")
    if (
      isAuthenticated && 
      justAuthenticated &&
      data?.activity && 
      user && 
      typeof user === 'object' && 
      'id' in user && 
      data.activity.userId !== (user as any).id &&
      !permissionRequested
    ) {
      setPermissionRequested(true);
      console.log('[SHARED ACTIVITY] ✅ Auto-copying activity for newly authenticated user');
      console.log('[SHARED ACTIVITY] Activity:', data.activity.title);
      console.log('[SHARED ACTIVITY] User:', (user as any).username || (user as any).email);
      
      // Automatically trigger copy (forceUpdate = false for initial copy)
      copyActivityMutation.mutate(false);
      
      // Clean up URL params after triggering copy
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [isAuthenticated, data, user, permissionRequested]);

  const handleCopyLink = async () => {
    if (!data?.activity) return;
    const url = window.location.href;
    const activityTitle = data.activity.shareTitle || data.activity.planSummary || data.activity.title;
    const activityDescription = data.activity.description || '';
    const category = data.activity.category || 'other';

    // Calculate progress if tasks exist
    const progressText = totalTasks > 0 ? `${progressPercent}% complete` : 'Just started';

    // Get category emoji
    const categoryEmojis: Record<string, string> = {
      fitness: '💪',
      health: '🏥',
      career: '💼',
      learning: '📚',
      finance: '💰',
      relationships: '❤️',
      creativity: '🎨',
      travel: '✈️',
      home: '🏠',
      personal: '⭐',
      other: '📋'
    };
    const emoji = categoryEmojis[category.toLowerCase()] || '✨';

    // Get first 3 tasks to show in preview
    const topTasks = data.tasks.slice(0, 3);
    const taskList = topTasks.map((task, i) => {
      const icon = task.completed ? '✅' : '▢';
      return `${icon} ${task.title}`;
    }).join('\n');

    const moreTasksText = totalTasks > 3 ? `\n...and ${totalTasks - 3} more tasks` : '';

    // Rich WhatsApp-formatted message
    const shareText = `${emoji} *${activityTitle}* ${emoji}

${activityDescription ? `${activityDescription}\n\n` : ''}📊 *Progress:* ${progressText}
📝 *Tasks:* ${completedTasks} of ${totalTasks} completed

${topTasks.length > 0 ? `*Task Highlights:*\n${taskList}${moreTasksText}\n\n` : ''}✨ *JournalMate* - Own, Edit & Share Your Plans
Track your goals, manage tasks, and collaborate with others!

👉 View this plan and start your own:
${url}`;

    try {
      await navigator.clipboard.writeText(shareText);
      setCopyingLink(true);
      toast({
        title: 'Link Copied!',
        description: 'Share link with rich formatting copied to clipboard',
      });
      setTimeout(() => setCopyingLink(false), 2000);
    } catch (err) {
      toast({
        title: 'Failed to Copy',
        description: 'Please copy the URL manually',
        variant: 'destructive',
      });
    }
  };

  const handleShareTwitter = () => {
    if (!data?.activity) return;
    const activityTitle = data.activity.shareTitle || data.activity.planSummary || data.activity.title;
    const activityDescription = data.activity.description || `Join this ${data.activity.category} plan on JournalMate`;
    const url = window.location.href;
    
    const progressText = totalTasks > 0 ? ` - ${progressPercent}% complete!` : '';
    const categoryEmojis: Record<string, string> = {
      fitness: '💪',
      health: '🏥',
      career: '💼',
      learning: '📚',
      finance: '💰',
      relationships: '❤️',
      creativity: '🎨',
      travel: '✈️',
      home: '🏠',
      personal: '⭐',
      other: '📋'
    };
    const emoji = categoryEmojis[data.activity.category.toLowerCase()] || '✨';
    
    const text = `Check out my activity: ${emoji} ${activityTitle}${progressText}\n${activityDescription}\n\n${url}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareFacebook = () => {
    if (!data?.activity) return;
    const url = window.location.href;
    const activityTitle = data.activity.shareTitle || data.activity.planSummary || data.activity.title;
    const activityDescription = data.activity.description || `Join this ${data.activity.category} plan on JournalMate`;
    
    const progressText = totalTasks > 0 ? ` - ${progressPercent}% complete!` : '';
    const categoryEmojis: Record<string, string> = {
      fitness: '💪',
      health: '🏥',
      career: '💼',
      learning: '📚',
      finance: '💰',
      relationships: '❤️',
      creativity: '🎨',
      travel: '✈️',
      home: '🏠',
      personal: '⭐',
      other: '📋'
    };
    const emoji = categoryEmojis[data.activity.category.toLowerCase()] || '✨';
    
    const quote = `Check out my activity: ${emoji} ${activityTitle}${progressText}\n${activityDescription}\n\n${url}`;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(quote)}`, '_blank');
  };

  const handleShareLinkedIn = () => {
    if (!data?.activity) return;
    const url = window.location.href;
    const activityTitle = data.activity.shareTitle || data.activity.planSummary || data.activity.title;
    const activityDescription = data.activity.description || `Join this ${data.activity.category} plan on JournalMate`;
    
    const progressText = totalTasks > 0 ? ` - ${progressPercent}% complete!` : '';
    const categoryEmojis: Record<string, string> = {
      fitness: '💪',
      health: '🏥',
      career: '💼',
      learning: '📚',
      finance: '💰',
      relationships: '❤️',
      creativity: '🎨',
      travel: '✈️',
      home: '🏠',
      personal: '⭐',
      other: '📋'
    };
    const emoji = categoryEmojis[data.activity.category.toLowerCase()] || '✨';
    
    const titleWithEmoji = `${emoji} ${activityTitle}${progressText}`;
    const summary = `Check out my activity: ${titleWithEmoji}\n${activityDescription}\n\n${url}`;
    window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(titleWithEmoji)}&summary=${encodeURIComponent(summary)}`, '_blank');
  };

  const queryClient = useQueryClient();

  // Generate themed background image URL (must be before early returns per React Hooks rules)
  const backgroundStyle = useMemo(() => {
    if (!data?.activity) {
      return {
        backgroundImage: 'linear-gradient(135deg, rgb(88, 28, 135) 0%, rgb(5, 150, 105) 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      };
    }

    // Check if there's a custom backdrop
    if (data.activity.backdrop) {
      return {
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('${data.activity.backdrop}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      };
    }

    const title = data.activity.title.toLowerCase();
    const category = data.activity.category.toLowerCase();
    
    // Create a search term for Unsplash based on activity
    let searchTerm = category;
    
    // Extract key terms from title for better image matching
    if (title.includes('new year') && (title.includes('new york') || title.includes('nyc'))) {
      searchTerm = 'new york city new year celebration times square';
    } else if (title.includes('new york') || title.includes('nyc')) {
      searchTerm = 'new york city skyline';
    } else if (title.includes('paris')) {
      searchTerm = 'paris eiffel tower';
    } else if (title.includes('tokyo')) {
      searchTerm = 'tokyo japan cityscape';
    } else if (title.includes('london')) {
      searchTerm = 'london big ben';
    } else if (title.includes('beach') || title.includes('tropical')) {
      searchTerm = 'tropical beach paradise';
    } else if (title.includes('mountain') || title.includes('hiking')) {
      searchTerm = 'mountain landscape hiking';
    } else if (category === 'fitness') {
      searchTerm = 'fitness workout gym';
    } else if (category === 'travel') {
      searchTerm = 'travel adventure destination';
    } else if (category === 'learning') {
      searchTerm = 'books education study';
    } else if (category === 'health') {
      searchTerm = 'health wellness mindfulness';
    } else if (category === 'career') {
      searchTerm = 'business career professional';
    }
    
    // Use Unsplash API for themed images (with random seed for variety)
    const randomSeed = Math.floor(Math.random() * 1000);
    const unsplashUrl = `https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1600&h=900&fit=crop&q=80`;
    
    // Map search terms to specific high-quality Unsplash images
    const imageMap: Record<string, string> = {
      'new york city new year celebration times square': 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1600&h=900&fit=crop&q=80', // Times Square NYE
      'new york city skyline': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1600&h=900&fit=crop&q=80',
      'paris eiffel tower': 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=1600&h=900&fit=crop&q=80',
      'tokyo japan cityscape': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1600&h=900&fit=crop&q=80',
      'london big ben': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1600&h=900&fit=crop&q=80',
      'tropical beach paradise': 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1600&h=900&fit=crop&q=80',
      'mountain landscape hiking': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&h=900&fit=crop&q=80',
      'fitness workout gym': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&h=900&fit=crop&q=80',
      'travel adventure destination': 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600&h=900&fit=crop&q=80',
      'books education study': 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1600&h=900&fit=crop&q=80',
      'health wellness mindfulness': 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=1600&h=900&fit=crop&q=80',
      'business career professional': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&h=900&fit=crop&q=80',
      'personal': 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&h=900&fit=crop&q=80'
    };
    
    const finalImageUrl = imageMap[searchTerm] || imageMap['personal'];
    
    return {
      backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('${finalImageUrl}')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    };
  }, [data?.activity?.title, data?.activity?.category]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading shared activity...</p>
        </div>
      </div>
    );
  }

  if (queryError || !data) {
    const errorMessage = queryError instanceof Error ? queryError.message : 'Failed to load activity';
    
    if (errorMessage === 'AUTH_REQUIRED' || (data?.requiresAuth && !isAuthenticated)) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 sm:p-8 text-center">
            <div className="flex items-center justify-center mb-4 sm:mb-6">
              <img
                src={journalMateLogo}
                alt="JournalMate"
                className="w-14 h-14 sm:w-16 sm:h-16"
              />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-3">Own, Edit & Track This Plan</h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
              Sign in to customize this activity, track your progress, and collaborate with others on JournalMate
            </p>
            <div className="space-y-2">
              <Button onClick={handleSignIn} className="gap-2 bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-700 hover:to-emerald-700 text-white w-full sm:w-auto" data-testid="button-sign-in" size="lg">
                <Sparkles className="w-4 h-4" />
                Sign In to Own This Plan
              </Button>
              <p className="text-xs text-muted-foreground">
                Free to start • Track unlimited goals • Collaborate with friends
              </p>
            </div>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 sm:p-8 text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Share2 className="w-7 h-7 sm:w-8 sm:h-8 text-destructive" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Activity Not Found</h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
            {errorMessage === 'AUTH_REQUIRED' ? 'Please sign in to view this activity.' : errorMessage}
          </p>
          <Button onClick={() => window.location.href = '/'} className="w-full sm:w-auto" size="lg">
            Go to Home
          </Button>
        </Card>
      </div>
    );
  }

  const { activity, tasks } = data;
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasksList = tasks.filter(t => t.completed);

  const theme = categoryThemes[activity.category.toLowerCase()] || categoryThemes.other;

  return (
    <div className={`min-h-screen ${previewTheme === 'dark' ? 'dark' : ''}`}>
      <div className="min-h-screen bg-background">
        {/* Hero Section with Dynamic Themed Background Image */}
        <div 
          className="relative border-b min-h-[400px] sm:min-h-[500px] flex items-center" 
          style={backgroundStyle}
        >
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/40" />
        <div className="container mx-auto px-4 py-6 sm:py-8 md:py-12 relative w-full">
          <div className="max-w-4xl mx-auto">
            {/* JournalMate Branding */}
            <div className="text-center mb-4 sm:mb-6">
              <div className="flex items-center justify-center gap-2 mb-1">
                <img 
                  src={journalMateLogo} 
                  alt="JournalMate" 
                  className="w-8 h-8 sm:w-10 sm:h-10"
                />
                <h1 className="text-2xl sm:text-3xl font-bold" style={{
                  background: 'linear-gradient(to right, rgb(168, 85, 247), rgb(16, 185, 129))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  JournalMate
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-white/95 font-normal">Plan and Share Your Activities</p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 sm:mb-6">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => window.location.href = '/'} data-testid="button-go-home" className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-white/30 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-800">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Home
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={togglePreviewTheme}
                  data-testid="button-theme-toggle"
                  className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-white/30 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-800"
                  title={`Switch to ${previewTheme === 'light' ? 'dark' : 'light'} mode preview`}
                >
                  {previewTheme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </Button>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCopyLink}
                  data-testid="button-copy-link"
                  className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-white/30 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-800 gap-2 flex-1 sm:flex-initial"
                >
                  <Link2 className="w-4 h-4" />
                  <span className="sm:inline">{copyingLink ? 'Copied!' : 'Copy'}</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleShareTwitter}
                  data-testid="button-share-twitter"
                  className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-white/30 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-800"
                >
                  <Twitter className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleShareFacebook}
                  data-testid="button-share-facebook"
                  className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-white/30 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-800"
                >
                  <Facebook className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleShareLinkedIn}
                  data-testid="button-share-linkedin"
                  className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-white/30 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-800"
                >
                  <Linkedin className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              {/* Activity Summary with Emoji */}
              <div className="mb-4">
                <h2 className="text-3xl sm:text-5xl font-bold text-white mb-3 break-words drop-shadow-lg flex items-center justify-center gap-3 flex-wrap">
                  <span className="text-5xl sm:text-6xl">{theme.emoji}</span>
                  <span>{activity.shareTitle || activity.planSummary || activity.title}</span>
                </h2>
                {activity.description && (
                  <p className="text-lg sm:text-xl text-white/95 max-w-2xl mx-auto break-words drop-shadow-md font-medium">
                    {activity.description}
                  </p>
                )}
                
                {/* Motivational Tagline */}
                <div className="mt-4 text-white/90 text-base sm:text-lg italic">
                  "{progressPercent === 100 ? '🎉 Achievement unlocked!' : progressPercent > 50 ? '💫 You\'re making great progress!' : '🚀 Ready to start your journey?'}"
                </div>
              </div>

              {/* Activity Meta Info */}
              <div className="flex flex-col items-center gap-2 text-sm">
                {data.sharedBy?.name && (
                  <div className="flex items-center gap-2 text-white/90">
                    <Share2 className="w-4 h-4" />
                    <span>Shared by {data.sharedBy.name}</span>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Badge variant="outline" className="bg-white/90 backdrop-blur-sm border-white/50 text-gray-900">
                    <span className="capitalize">{activity.category}</span>
                  </Badge>
                  <div className="flex items-center gap-1 text-white/90">
                    <CheckSquare className="w-4 h-4" />
                    <span>{completedTasks}/{totalTasks} tasks completed</span>
                  </div>
                  {progressPercent === 100 && (
                    <Badge className="bg-emerald-500 text-white border-none">
                      Complete!
                    </Badge>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        {/* Progress Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="p-6 sm:p-8 mb-8">
            <div className="space-y-6">
              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Badge variant="outline" className="gap-1">
                  <span className="capitalize">{activity.category}</span>
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <span className="capitalize">{activity.status || 'planning'}</span>
                </Badge>
                {activity.endDate && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span className="whitespace-nowrap">Due {new Date(activity.endDate).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{totalTasks} tasks</span>
                </div>
              </div>

              {/* Progress Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-foreground">
                      {completedTasks} of {totalTasks} completed
                    </span>
                  </div>
                  <Badge variant="outline" className="text-sm font-bold text-primary">
                    {progressPercent}%
                  </Badge>
                </div>
                
                <Progress value={progressPercent} className="h-3" />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Active Tasks */}
        {activeTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mb-8"
          >
            <h3 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <span className="text-2xl">✨</span>
              <span>What's Ahead</span>
              <Badge variant="outline" className="ml-2">{activeTasks.length}</Badge>
            </h3>
            <div className="space-y-3">
              {activeTasks.map((task, index) => {
                const priorityEmoji = task.priority === 'high' ? '🔥' : task.priority === 'medium' ? '⚡' : '✅';
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
                  >
                    <Card 
                      className={`p-4 sm:p-5 hover-elevate ${isAuthenticated ? 'cursor-pointer' : ''} border-l-4 ${
                        task.priority === 'high' ? 'border-l-red-500' :
                        task.priority === 'medium' ? 'border-l-yellow-500' :
                        'border-l-green-500'
                      }`}
                      data-testid={`task-active-${task.id}`}
                      onClick={() => {
                        if (isAuthenticated) {
                          window.location.href = `/?activity=${activity.id}&tab=tasks`;
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl shrink-0">{priorityEmoji}</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-foreground mb-1 break-words text-lg">
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mb-3 break-words leading-relaxed">
                              {task.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-xs gap-1">
                              <span>{categoryThemes[task.category.toLowerCase()]?.emoji || '📋'}</span>
                              <span>{task.category}</span>
                            </Badge>
                            {task.timeEstimate && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                                <Clock className="w-3 h-3" />
                                <span className="font-medium">{task.timeEstimate}</span>
                              </div>
                            )}
                            {task.priority && (
                              <Badge 
                                variant="outline" 
                                className={`text-xs font-bold ${
                                  task.priority === 'high' ? 'bg-red-50 border-red-300 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300' :
                                  task.priority === 'medium' ? 'bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-300' :
                                  'bg-green-50 border-green-300 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-300'
                                }`}
                              >
                                {task.priority.toUpperCase()}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
            
            {/* Inspiring Call-to-Action */}
            {!isAuthenticated && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-6 text-center"
              >
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted px-4 py-2 rounded-full">
                  <span>💡</span>
                  <span>Sign in to start checking off these tasks!</span>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Completed Tasks */}
        {completedTasksList.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-green-600" />
              Completed Tasks
            </h3>
            <div className="space-y-3">
              {completedTasksList.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
                >
                  <Card className="p-4 sm:p-5 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700" data-testid={`task-completed-${task.id}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center mt-0.5 shrink-0">
                        <CheckSquare className="w-3 h-3 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-green-800 dark:text-green-200 line-through mb-1 break-words">
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-sm text-green-700 dark:text-green-300 line-through break-words">
                            {task.description}
                          </p>
                        )}
                        {task.completedAt && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            Completed {new Date(task.completedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* CTA Section */}
        {!isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="mt-6 sm:mt-8"
          >
            <Card className="p-6 sm:p-8 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <div className="flex items-center justify-center gap-2 mb-4 sm:mb-6">
                <img
                  src={journalMateLogo}
                  alt="JournalMate"
                  className="w-14 h-14 sm:w-16 sm:h-16"
                />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2">
                Make This Plan Yours
              </h3>
              <p className="text-sm text-muted-foreground mb-4 sm:mb-6">
                Sign in to customize, track progress, and share your own activities
              </p>
              <Button
                onClick={handleSignIn}
                className="gap-2 bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-700 hover:to-emerald-700 text-white w-full sm:w-auto"
                data-testid="button-sign-in-to-edit"
                size="lg"
              >
                <Sparkles className="w-4 h-4" />
                Get Started Free
              </Button>
            </Card>
          </motion.div>
        )}

        {isAuthenticated && user && typeof user === 'object' && 'id' in user && activity.userId !== (user as any).id && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="mt-6 sm:mt-8"
          >
            <Card className="p-6 sm:p-8 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <div className="flex items-center justify-center gap-2 mb-4 sm:mb-6">
                <img 
                  src={journalMateLogo} 
                  alt="JournalMate" 
                  className="w-14 h-14 sm:w-16 sm:h-16"
                />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2">Copy this activity to your account</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
                This activity will be added to your dashboard and you can edit it however you like
              </p>
              <Button 
                onClick={() => copyActivityMutation.mutate()}
                disabled={copyActivityMutation.isPending}
                className="gap-2 bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-700 hover:to-emerald-700 text-white w-full sm:w-auto"
                data-testid="button-copy-activity"
                size="lg"
              >
                {copyActivityMutation.isPending ? 'Copying...' : 'Copy to My Account'}
              </Button>
            </Card>
          </motion.div>
        )}
        
        {isAuthenticated && user && typeof user === 'object' && 'id' in user && activity.userId === (user as any).id && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="mt-6 sm:mt-8"
          >
            <Card className="p-6 sm:p-8 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <div className="flex items-center justify-center gap-2 mb-4 sm:mb-6">
                <img 
                  src={journalMateLogo} 
                  alt="JournalMate" 
                  className="w-14 h-14 sm:w-16 sm:h-16"
                />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2">This is Your Activity</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
                You can edit this activity from your dashboard
              </p>
              <Button onClick={() => window.location.href = '/'} variant="default" className="gap-2 bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-700 hover:to-emerald-700 text-white w-full sm:w-auto" size="lg">
                <Home className="w-4 h-4" />
                Go to Dashboard
              </Button>
            </Card>
          </motion.div>
        )}
      </main>
      </div>
      
      {/* Update Confirmation Dialog */}
      <AlertDialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <AlertDialogContent data-testid="dialog-update-plan">
          <AlertDialogHeader>
            <AlertDialogTitle>Plan Already Exists</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmationData?.message || 'You already have this plan. Would you like to update it with the latest version?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-update">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-update"
              onClick={() => {
                setShowUpdateDialog(false);
                copyActivityMutation.mutate(true); // forceUpdate = true
              }}
              className="bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-700 hover:to-emerald-700"
            >
              Update Plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
