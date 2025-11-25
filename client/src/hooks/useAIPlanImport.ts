import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { onIncomingShare, consumePendingShareData, hasPendingShareData, type IncomingShareData } from '@/lib/shareSheet';
import { useLocation } from 'wouter';

export interface ParsedTask {
  title: string;
  description?: string;
  category?: string;
  priority?: 'high' | 'medium' | 'low';
  dueDate?: string;
  timeEstimate?: string;
  order: number;
}

export interface ParsedPlan {
  title: string;
  description?: string;
  tasks: ParsedTask[];
  confidence: number;
  source: string;
}

export interface ImportState {
  status: 'idle' | 'loading' | 'parsed' | 'saving' | 'success' | 'error';
  rawText?: string;
  parsedPlan?: ParsedPlan;
  error?: string;
  source?: string;
}

export interface ImportLimits {
  used: number;
  limit: number | null;
  remaining: number | null;
  tier: string;
}

export function useAIPlanImport() {
  const [, setLocation] = useLocation();
  const [state, setState] = useState<ImportState>({ status: 'idle' });
  const [limits, setLimits] = useState<ImportLimits | null>(null);

  const parsePlanMutation = useMutation({
    mutationFn: async ({ text, source }: { text: string; source: string }) => {
      const response = await apiRequest('POST', '/api/extensions/import-plan', {
        rawText: text,
        source,
        sourceDevice: 'mobile_share'
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.parsed) {
        setState(prev => ({
          ...prev,
          status: 'parsed',
          parsedPlan: {
            title: data.parsed.title,
            description: data.parsed.description,
            tasks: data.parsed.tasks.map((t: any, i: number) => ({
              ...t,
              order: i
            })),
            confidence: data.parsed.confidence,
            source: data.import?.source || prev.source || 'share'
          }
        }));
        if (data.limits) {
          setLimits({
            used: data.limits.used,
            limit: data.limits.limit,
            remaining: data.limits.remaining,
            tier: data.limits.tier || 'free'
          });
        }
      }
    },
    onError: (error: Error) => {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error.message || 'Failed to parse plan'
      }));
    }
  });

  const confirmImportMutation = useMutation({
    mutationFn: async (plan: ParsedPlan) => {
      const response = await apiRequest('POST', '/api/activities', {
        title: plan.title,
        description: plan.description,
        status: 'planning',
        source: `ai_import_${plan.source}`,
        category: 'general'
      });
      const activity = await response.json();
      
      for (const task of plan.tasks) {
        await apiRequest('POST', '/api/tasks', {
          title: task.title,
          description: task.description,
          category: task.category || 'general',
          priority: task.priority || 'medium',
          activityId: activity.id,
          timeEstimate: task.timeEstimate
        });
      }
      
      return activity;
    },
    onSuccess: (activity) => {
      setState({ status: 'success' });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      
      setTimeout(() => {
        setLocation(`/activities/${activity.id}`);
      }, 1500);
    },
    onError: (error: Error) => {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error.message || 'Failed to save plan'
      }));
    }
  });

  const startImport = useCallback((text: string, source: string = 'share') => {
    if (!text || text.trim().length < 20) {
      setState({
        status: 'error',
        error: 'Text is too short to parse as a plan'
      });
      return;
    }

    setState({
      status: 'loading',
      rawText: text,
      source
    });

    parsePlanMutation.mutate({ text: text.trim(), source });
  }, [parsePlanMutation]);

  const updateParsedPlan = useCallback((updates: Partial<ParsedPlan>) => {
    setState(prev => {
      if (!prev.parsedPlan) return prev;
      return {
        ...prev,
        parsedPlan: {
          ...prev.parsedPlan,
          ...updates
        }
      };
    });
  }, []);

  const updateTask = useCallback((index: number, updates: Partial<ParsedTask>) => {
    setState(prev => {
      if (!prev.parsedPlan) return prev;
      const newTasks = [...prev.parsedPlan.tasks];
      newTasks[index] = { ...newTasks[index], ...updates };
      return {
        ...prev,
        parsedPlan: {
          ...prev.parsedPlan,
          tasks: newTasks
        }
      };
    });
  }, []);

  const removeTask = useCallback((index: number) => {
    setState(prev => {
      if (!prev.parsedPlan) return prev;
      const newTasks = prev.parsedPlan.tasks.filter((_, i) => i !== index);
      return {
        ...prev,
        parsedPlan: {
          ...prev.parsedPlan,
          tasks: newTasks
        }
      };
    });
  }, []);

  const addTask = useCallback((task: Omit<ParsedTask, 'order'>) => {
    setState(prev => {
      if (!prev.parsedPlan) return prev;
      const newTask = {
        ...task,
        order: prev.parsedPlan.tasks.length
      };
      return {
        ...prev,
        parsedPlan: {
          ...prev.parsedPlan,
          tasks: [...prev.parsedPlan.tasks, newTask]
        }
      };
    });
  }, []);

  const confirmImport = useCallback(() => {
    if (!state.parsedPlan) return;
    
    setState(prev => ({ ...prev, status: 'saving' }));
    confirmImportMutation.mutate(state.parsedPlan);
  }, [state.parsedPlan, confirmImportMutation]);

  const cancel = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  useEffect(() => {
    if (hasPendingShareData()) {
      const shareData = consumePendingShareData();
      if (shareData?.text) {
        startImport(shareData.text, 'mobile_share');
        setLocation('/import-plan');
      }
    }

    const cleanup = onIncomingShare((data: IncomingShareData) => {
      if (data.text) {
        startImport(data.text, 'mobile_share');
        setLocation('/import-plan');
      }
    });

    return cleanup;
  }, [startImport, setLocation]);

  return {
    state,
    limits,
    startImport,
    updateParsedPlan,
    updateTask,
    removeTask,
    addTask,
    confirmImport,
    cancel,
    reset,
    isLoading: state.status === 'loading' || state.status === 'saving',
    isParsed: state.status === 'parsed',
    isSuccess: state.status === 'success',
    isError: state.status === 'error'
  };
}

export function useClipboardImport() {
  const { startImport } = useAIPlanImport();
  const [, setLocation] = useLocation();

  const importFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim().length > 20) {
        startImport(text.trim(), 'clipboard');
        setLocation('/import-plan');
        return { success: true };
      }
      return { success: false, error: 'Clipboard is empty or text is too short' };
    } catch (error) {
      return { success: false, error: 'Failed to read clipboard' };
    }
  }, [startImport, setLocation]);

  return { importFromClipboard };
}
