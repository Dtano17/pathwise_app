import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface QueueItem {
  id: string;
  payload: string;
  payloadType: 'url' | 'text';
  sourceHint?: string;
  createdAt: string;
  retries: number;
}

const STORAGE_KEY = 'journalmate-import-queue';
const MAX_RETRIES = 3;

const SUPPORTED_URL_PATTERN = /^https?:\/\/(www\.)?(instagram\.com|tiktok\.com|youtu\.be|youtube\.com|twitter\.com|x\.com|facebook\.com|fb\.watch|reddit\.com|t\.co|vm\.tiktok\.com|chat\.openai\.com|claude\.ai|gemini\.google\.com)/i;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function detectPayloadType(payload: string): { type: 'url' | 'text'; sourceHint?: string; isSupported: boolean } {
  const trimmed = payload.trim();
  
  if (/^https?:\/\//i.test(trimmed)) {
    let sourceHint: string | undefined;
    
    if (/instagram\.com/i.test(trimmed)) sourceHint = 'instagram';
    else if (/tiktok\.com|vm\.tiktok\.com/i.test(trimmed)) sourceHint = 'tiktok';
    else if (/youtube\.com|youtu\.be/i.test(trimmed)) sourceHint = 'youtube';
    else if (/twitter\.com|x\.com|t\.co/i.test(trimmed)) sourceHint = 'twitter';
    else if (/facebook\.com|fb\.watch/i.test(trimmed)) sourceHint = 'facebook';
    else if (/reddit\.com/i.test(trimmed)) sourceHint = 'reddit';
    else if (/chat\.openai\.com/i.test(trimmed)) sourceHint = 'chatgpt';
    else if (/claude\.ai/i.test(trimmed)) sourceHint = 'claude';
    else if (/gemini\.google\.com/i.test(trimmed)) sourceHint = 'gemini';
    
    const isSupported = SUPPORTED_URL_PATTERN.test(trimmed);
    return { type: 'url', sourceHint, isSupported };
  }
  
  return { type: 'text', isSupported: true };
}

function loadQueue(): QueueItem[] {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueueItem[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('[ImportQueue] Failed to save queue:', e);
  }
}

export function useImportQueue() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [queue, setQueue] = useState<QueueItem[]>(() => loadQueue());
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  
  const processingRef = useRef(false);

  useEffect(() => {
    saveQueue(queue);
  }, [queue]);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsProcessing(false);
      setCurrentItemId(null);
      processingRef.current = false;
    }
  }, [isAuthenticated]);

  const enqueue = useCallback((payload: string): boolean => {
    if (!payload || payload.trim().length < 5) {
      toast({
        title: 'Invalid content',
        description: 'Please paste a URL or meaningful text content.',
        variant: 'destructive'
      });
      return false;
    }

    const trimmed = payload.trim();
    const { type, sourceHint, isSupported } = detectPayloadType(trimmed);
    
    if (type === 'url' && !isSupported) {
      toast({
        title: 'Unsupported source',
        description: 'Please paste a URL from Instagram, TikTok, YouTube, Twitter/X, Facebook, Reddit, ChatGPT, Claude, or Gemini.',
        variant: 'destructive'
      });
      return false;
    }
    
    if (type === 'text' && trimmed.length < 20) {
      toast({
        title: 'Content too short',
        description: 'Please paste a URL or longer text content (at least 20 characters).',
        variant: 'destructive'
      });
      return false;
    }

    const newItem: QueueItem = {
      id: generateId(),
      payload: trimmed,
      payloadType: type,
      sourceHint,
      createdAt: new Date().toISOString(),
      retries: 0
    };

    setQueue(prev => [...prev, newItem]);

    if (isAuthenticated) {
      toast({
        title: 'Content queued',
        description: 'Your content is ready to be processed.',
      });
    } else {
      toast({
        title: 'Sign in to continue',
        description: 'Your content is saved. Sign in to create your action plan.',
      });
    }

    return true;
  }, [isAuthenticated, toast]);

  const getNextItem = useCallback((): QueueItem | null => {
    const validItems = queue.filter(item => item.retries < MAX_RETRIES);
    return validItems.length > 0 ? validItems[0] : null;
  }, [queue]);

  const markItemProcessed = useCallback((itemId: string, success: boolean) => {
    if (success) {
      setQueue(prev => prev.filter(item => item.id !== itemId));
    } else {
      setQueue(prev => {
        const updated = prev.map(item => {
          if (item.id === itemId) {
            const newRetries = item.retries + 1;
            if (newRetries >= MAX_RETRIES) {
              toast({
                title: 'Import failed',
                description: 'Could not process this content after multiple attempts. It has been removed from the queue.',
                variant: 'destructive'
              });
            }
            return { ...item, retries: newRetries };
          }
          return item;
        });
        return updated.filter(item => item.retries < MAX_RETRIES);
      });
    }
    
    setIsProcessing(false);
    setCurrentItemId(null);
    processingRef.current = false;
  }, [toast]);

  const startProcessing = useCallback((itemId: string) => {
    if (processingRef.current) return false;
    
    processingRef.current = true;
    setIsProcessing(true);
    setCurrentItemId(itemId);
    return true;
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setIsProcessing(false);
    setCurrentItemId(null);
    processingRef.current = false;
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  const clearFailedItems = useCallback(() => {
    setQueue(prev => prev.filter(item => item.retries < MAX_RETRIES));
  }, []);

  const activeQueue = queue.filter(item => item.retries < MAX_RETRIES);

  return {
    queue: activeQueue,
    isProcessing,
    currentItemId,
    pendingCount: activeQueue.length,
    hasItems: activeQueue.length > 0,
    enqueue,
    getNextItem,
    markItemProcessed,
    startProcessing,
    clearQueue,
    clearFailedItems,
    isAuthenticated
  };
}
