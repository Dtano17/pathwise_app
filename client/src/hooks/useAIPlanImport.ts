import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  onIncomingShare, 
  consumePendingShareData, 
  hasPendingShareData,
  initIncomingShareListener,
  type IncomingShareData 
} from '@/lib/shareSheet';
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
  importId?: string;
  error?: string;
  source?: string;
  upgradeRequired?: boolean;
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
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized) {
      initIncomingShareListener();
      setInitialized(true);
    }
  }, [initialized]);

  const parsePlanMutation = useMutation({
    mutationFn: async ({ text, source, sourceDevice }: { text: string; source: string; sourceDevice: string }) => {
      const response = await apiRequest('POST', '/api/extensions/import-plan', {
        text,
        source,
        sourceDevice
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.upgrade) {
          throw new Error('UPGRADE_REQUIRED');
        }
        throw new Error(errorData.error || 'Failed to parse plan');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.parsed) {
        setState(prev => ({
          ...prev,
          status: 'parsed',
          importId: data.import?.id,
          parsedPlan: {
            title: data.parsed.title,
            description: data.parsed.description,
            tasks: (data.parsed.tasks || []).map((t: any, i: number) => ({
              ...t,
              order: i
            })),
            confidence: data.parsed.confidence,
            source: data.import?.source || prev.source || 'share'
          }
        }));
        
        if (data.limits) {
          const limit = data.limits.limit;
          setLimits({
            used: data.limits.used,
            limit: limit,
            remaining: limit !== null ? Math.max(0, limit - data.limits.used) : null,
            tier: limit !== null ? 'free' : 'pro'
          });
        }
      }
    },
    onError: (error: Error) => {
      const isUpgradeRequired = error.message === 'UPGRADE_REQUIRED';
      setState(prev => ({
        ...prev,
        status: 'error',
        error: isUpgradeRequired 
          ? 'You\'ve reached your monthly import limit. Upgrade to Pro for unlimited imports!' 
          : (error.message || 'Failed to parse plan'),
        upgradeRequired: isUpgradeRequired
      }));
    }
  });

  const confirmImportMutation = useMutation({
    mutationFn: async ({ importId, plan }: { importId: string; plan: ParsedPlan }) => {
      const response = await apiRequest('POST', `/api/extensions/imports/${importId}/confirm`, {
        title: plan.title,
        description: plan.description,
        tasks: plan.tasks.map(t => ({
          title: t.title,
          description: t.description,
          category: t.category || 'personal',
          priority: t.priority || 'medium'
        }))
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save plan');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setState({ status: 'success' });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      
      if (data.activity?.id) {
        setTimeout(() => {
          setLocation(`/activities/${data.activity.id}`);
        }, 1500);
      }
    },
    onError: (error: Error) => {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error.message || 'Failed to save plan'
      }));
    }
  });

  const getSourceDevice = useCallback((source: string): string => {
    switch (source) {
      case 'mobile_share':
      case 'share_sheet':
        return 'mobile_share';
      case 'extension':
      case 'browser_extension':
        return 'extension';
      case 'clipboard':
        return 'clipboard';
      default:
        return 'web';
    }
  }, []);

  const startImport = useCallback((text: string, source: string = 'share') => {
    if (!text || text.trim().length < 20) {
      setState({
        status: 'error',
        error: 'Text is too short to parse as a plan. Please provide at least 20 characters.'
      });
      return;
    }

    setState({
      status: 'loading',
      rawText: text,
      source
    });

    parsePlanMutation.mutate({ 
      text: text.trim(), 
      source,
      sourceDevice: getSourceDevice(source)
    });
  }, [parsePlanMutation, getSourceDevice]);

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
    if (!state.parsedPlan || !state.importId) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'No import to confirm'
      }));
      return;
    }
    
    setState(prev => ({ ...prev, status: 'saving' }));
    confirmImportMutation.mutate({
      importId: state.importId,
      plan: state.parsedPlan
    });
  }, [state.parsedPlan, state.importId, confirmImportMutation]);

  const cancel = useCallback(() => {
    setState({ status: 'idle' });
    setLocation('/');
  }, [setLocation]);

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
