/**
 * useDailyTheme Hook
 *
 * Manages the user's daily focus theme with API persistence.
 * Theme only applies to today's plans.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Theme definitions (shared with ThemeSelector)
export const themes = [
  {
    id: 'work',
    name: 'Work Focus',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    description: 'Productivity, meetings, and professional goals',
  },
  {
    id: 'investment',
    name: 'Investment',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    description: 'Trading, portfolio analysis, and financial planning',
  },
  {
    id: 'spiritual',
    name: 'Spiritual',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    description: 'Devotion, meditation, and personal growth',
  },
  {
    id: 'romance',
    name: 'Romance',
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    description: 'Date planning, relationship building, and connection',
  },
  {
    id: 'adventure',
    name: 'Adventure',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    description: 'Exploration, outdoor activities, and new experiences',
  },
  {
    id: 'wellness',
    name: 'Health & Wellness',
    color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
    description: 'Fitness, nutrition, and self-care',
  },
] as const;

export type ThemeId = typeof themes[number]['id'];
export type Theme = typeof themes[number];

interface DailyThemeResponse {
  dailyTheme: {
    activityId: string;
    activityTitle: string;
    date: string;
    tasks?: { title: string; completed: boolean }[];
    themeMetadata?: {
      id: string;
      icon: string;
      color: string;
    };
  } | null;
}

export function useDailyTheme() {
  const queryClient = useQueryClient();

  // Fetch today's theme
  const { data, isLoading, error } = useQuery<DailyThemeResponse>({
    queryKey: ['/api/user/daily-theme'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Set theme mutation with optimistic update
  const setThemeMutation = useMutation({
    mutationFn: async (themeId: ThemeId) => {
      const theme = themes.find(t => t.id === themeId);
      if (!theme) throw new Error(`Theme ${themeId} not found`);

      const response = await apiRequest('POST', '/api/user/daily-theme', {
        activityId: `theme-${themeId}-${Date.now()}`,
        activityTitle: theme.name,
        tasks: [],
      });
      return response.json();
    },
    onMutate: async (themeId: ThemeId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/user/daily-theme'] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<DailyThemeResponse>(['/api/user/daily-theme']);

      // Optimistically update to the new value
      const theme = themes.find(t => t.id === themeId);
      if (theme) {
        queryClient.setQueryData<DailyThemeResponse>(['/api/user/daily-theme'], {
          dailyTheme: {
            activityId: `theme-${themeId}-${Date.now()}`,
            activityTitle: theme.name,
            date: new Date().toISOString().split('T')[0],
            tasks: [],
          },
        });
      }

      return { previousData };
    },
    onError: (_err, _themeId, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['/api/user/daily-theme'], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/daily-theme'] });
    },
  });

  // Clear theme mutation with optimistic update
  const clearThemeMutation = useMutation({
    mutationFn: async () => {
      // To clear, we set a theme with a past date
      const response = await apiRequest('POST', '/api/user/daily-theme', {
        activityId: 'cleared',
        activityTitle: '',
        date: '1970-01-01', // Past date so it won't be returned
        tasks: [],
      });
      return response.json();
    },
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/user/daily-theme'] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<DailyThemeResponse>(['/api/user/daily-theme']);

      // Optimistically clear the theme
      queryClient.setQueryData<DailyThemeResponse>(['/api/user/daily-theme'], {
        dailyTheme: null,
      });

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['/api/user/daily-theme'], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/daily-theme'] });
    },
  });

  // Derive current theme from API response
  const currentThemeId = data?.dailyTheme?.activityTitle
    ? themes.find(t => t.name === data.dailyTheme?.activityTitle)?.id || null
    : null;

  const currentTheme = currentThemeId
    ? themes.find(t => t.id === currentThemeId) || null
    : null;

  return {
    // Current theme state
    currentThemeId,
    currentTheme,
    isLoading,
    error,

    // Actions
    setTheme: (themeId: ThemeId) => setThemeMutation.mutate(themeId),
    clearTheme: () => clearThemeMutation.mutate(),

    // Mutation states
    isSettingTheme: setThemeMutation.isPending,
    isClearingTheme: clearThemeMutation.isPending,

    // Theme definitions for UI
    themes,
  };
}

export default useDailyTheme;
