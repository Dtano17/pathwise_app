import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Send, Sparkles, Clock, MapPin, Car, Shirt, Zap, MessageCircle, CheckCircle, ArrowRight, Brain, ArrowLeft, RefreshCcw, Target, ListTodo, Eye, FileText, Camera, Upload, Image as ImageIcon, BookOpen, Tag, Lightbulb, Calendar, ExternalLink, Check, Loader2, Link } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useKeywordDetection, getCategoryColor } from '@/hooks/useKeywordDetection';
import { useLocation } from 'wouter';
import TemplateSelector from './TemplateSelector';
import JournalTimeline from './JournalTimeline';
import JournalOnboarding from './JournalOnboarding';
import { invalidateActivitiesCache, invalidateJournalCache } from '@/lib/cacheInvalidation';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ContextChip {
  label: string;
  value: string;
  category: 'required' | 'optional';
  filled: boolean;
}

interface PlannerSession {
  id: string;
  sessionState: 'intake' | 'gathering' | 'confirming' | 'planning' | 'completed';
  conversationHistory: ConversationMessage[];
  slots: any;
  isComplete: boolean;
  generatedPlan?: {
    activity: {
      title: string;
      description: string;
      category: string;
    };
    tasks: Array<{
      title: string;
      description: string;
      priority: string;
    }>;
    summary?: string;
    estimatedTimeframe?: string;
    motivationalNote?: string;
  };
}

type PlanningMode = 'quick' | 'smart' | 'chat' | 'direct' | 'journal' | null;

interface ConversationalPlannerProps {
  onClose?: () => void;
  initialMode?: PlanningMode;
  activityId?: string;
  activityTitle?: string;
  user?: any;
  onSignInRequired?: () => void;
}

export default function ConversationalPlanner({ onClose, initialMode, activityId, activityTitle, user, onSignInRequired }: ConversationalPlannerProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currentSession, setCurrentSession] = useState<PlannerSession | null>(null);
  const [message, setMessage] = useState('');
  const [contextChips, setContextChips] = useState<ContextChip[]>([]);
  const [planningMode, setPlanningMode] = useState<PlanningMode>(initialMode || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAgreementPrompt, setShowAgreementPrompt] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<any>(null);
  const [showPlanConfirmation, setShowPlanConfirmation] = useState(false);
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  const [showParsedContent, setShowParsedContent] = useState(false);
  const [parsedLLMContent, setParsedLLMContent] = useState<any>(null);
  const [isParsingPaste, setIsParsingPaste] = useState(false);
  const [createdActivityId, setCreatedActivityId] = useState<string | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);
  const [messageActivities, setMessageActivities] = useState<Map<number, { activityId: string; activityTitle: string }>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Journal Mode State
  const [journalText, setJournalText] = useState('');
  const [journalMedia, setJournalMedia] = useState<File[]>([]);
  const [isUploadingJournal, setIsUploadingJournal] = useState(false);
  const [detectedCategory, setDetectedCategory] = useState<string>('');
  const [isSavingJournal, setIsSavingJournal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const journalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAutoSavedTextRef = useRef<string>('');
  
  // External Content & Curated Questions State
  const [externalContent, setExternalContent] = useState<string | null>(null);
  const [externalSourceUrl, setExternalSourceUrl] = useState<string | null>(null);
  const [curatedQuestions, setCuratedQuestions] = useState<Array<{
    id: string;
    question: string;
    type: 'text' | 'select' | 'multiselect';
    options?: string[];
    placeholder?: string;
    required: boolean;
  }>>([]);
  const [curatedQuestionsAnswers, setCuratedQuestionsAnswers] = useState<Record<string, string | string[]>>({});
  const [contentSummary, setContentSummary] = useState<string>('');
  const [suggestedPlanTitle, setSuggestedPlanTitle] = useState<string>('');
  const [showCuratedQuestionsDialog, setShowCuratedQuestionsDialog] = useState(false);
  const [isLoadingCuratedQuestions, setIsLoadingCuratedQuestions] = useState(false);
  const [isGeneratingFromContent, setIsGeneratingFromContent] = useState(false);
  const plannerFileInputRef = useRef<HTMLInputElement>(null);
  
  // URL Action Choice State (for "Save to Journal" vs "Create Plan" option)
  const [showUrlActionDialog, setShowUrlActionDialog] = useState(false);
  const [pendingUrlData, setPendingUrlData] = useState<{ content: string; url: string; isVideoContent?: boolean; platform?: string } | null>(null);
  
  // Autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteSearch, setAutocompleteSearch] = useState('');
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });

  // Template selector state
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // Journal timeline state
  const [showJournalTimeline, setShowJournalTimeline] = useState(false);

  // Onboarding and help state
  const [showKeywordHelp, setShowKeywordHelp] = useState(false);
  const [showJournalOnboarding, setShowJournalOnboarding] = useState(() => {
    if (planningMode !== 'journal') return false;
    const completed = localStorage.getItem('journalmate_journal_onboarding_completed');
    return !completed;
  });
  const [showOnboardingTooltip, setShowOnboardingTooltip] = useState(() => {
    if (planningMode !== 'journal') return false;
    const dismissed = localStorage.getItem('journalmate_onboarding_dismissed');
    return !dismissed;
  });
  
  // Available tags for autocomplete
  const availableTags = [
    '@restaurants', '@restaurant', '@food', '@dining',
    '@travel', '@places', '@place',
    '@activities', '@activity', '@events', '@event',
    '@music', '@concerts', '@concert',
    '@movies', '@movie', '@shows', '@show', '@tv',
    '@shopping', '@purchases', '@purchase',
    '@books', '@book', '@learning',
    '@fitness', '@health', '@workout',
    '@fashion', '@style', '@outfit',
    '@vacation', '@trip', '@holiday',
    '@datenight', '@nightout', '@weekend',
    '@selfcare', '@wellness',
    '@creative', '@entertainment'
  ];

  // Clear any stale localStorage on mount to ensure fresh sessions
  useEffect(() => {
    localStorage.removeItem('planner_session');
    localStorage.removeItem('planner_mode');
    localStorage.removeItem('planner_chips');
  }, []);

  // Pre-fill journal when activity context is provided
  useEffect(() => {
    if (planningMode === 'journal' && activityId && activityTitle && !journalText) {
      const prefilledText = `✅ Completed: ${activityTitle}\n\n💭 How did it go? Share your thoughts and reflections...`;
      setJournalText(prefilledText);

      // Auto-focus the textarea and move cursor to the end
      setTimeout(() => {
        if (journalTextareaRef.current) {
          journalTextareaRef.current.focus();
          journalTextareaRef.current.setSelectionRange(prefilledText.length, prefilledText.length);
        }
      }, 100);
    }
  }, [planningMode, activityId, activityTitle, journalText]);

  // Note: localStorage save/restore disabled to prevent stale conversation issues
  // Sessions are now ephemeral per page load for better UX

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.conversationHistory]);

  // Fetch journal entries - TanStack Query will handle caching
  const { data: journalEntriesData, refetch: refetchJournalEntries } = useQuery<{ entries: any[] }>({
    queryKey: ['/api/journal/entries'],
    enabled: planningMode === 'journal',
  });

  const journalEntries = journalEntriesData?.entries || [];

  // Fetch activity details when activityId is provided (for journal progress display)
  const { data: activityDetails } = useQuery<{ 
    id: string; 
    title: string; 
    description: string; 
    status: string; 
    userLiked?: boolean;
    tasks: Array<{ id: string; title: string; completed: boolean; priority: string }>;
  }>({
    queryKey: ['/api/activities', activityId],
    enabled: planningMode === 'journal' && !!activityId,
  });

  // Calculate activity progress for journal display
  const activityProgress = activityDetails && activityDetails.tasks ? {
    totalTasks: activityDetails.tasks.length,
    completedTasks: activityDetails.tasks.filter((t: any) => t.completed).length,
    incompleteTasks: activityDetails.tasks.filter((t: any) => !t.completed),
    completedTasksList: activityDetails.tasks.filter((t: any) => t.completed),
    isLiked: activityDetails.userLiked || false,
    status: activityDetails.status || 'active'
  } : null;


  // Calculate plan generation readiness (must be before useEffect that uses it)
  const requiredSlotsFilled = contextChips.filter(chip => chip.category === 'required' && chip.filled).length;
  const totalRequiredSlots = contextChips.filter(chip => chip.category === 'required').length;
  const canGeneratePlan = totalRequiredSlots > 0 && requiredSlotsFilled >= Math.max(3, totalRequiredSlots - 1);

  // Check for agreement in chat mode
  useEffect(() => {
    if (planningMode === 'chat' && currentSession?.conversationHistory) {
      const lastUserMessage = currentSession.conversationHistory
        .filter(msg => msg.role === 'user')
        .pop()?.content.toLowerCase();
      
      if (lastUserMessage) {
        const agreementWords = ['yes', 'sounds good', 'perfect', 'great', 'looks good', 'that works', 'agree', 'confirmed', 'correct'];
        const hasAgreement = agreementWords.some(word => lastUserMessage.includes(word));
        
        if (hasAgreement && canGeneratePlan && !currentSession.isComplete) {
          setShowAgreementPrompt(true);
        }
      }
    }
  }, [currentSession?.conversationHistory, planningMode, canGeneratePlan]);

  // Start new session
  const startSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/planner/session');
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentSession(data.session);
      setContextChips([]);
      setShowAgreementPrompt(false);
    },
    onError: (error) => {
      console.error('Failed to start session:', error);
    }
  });

  const [streamingMessageContent, setStreamingMessageContent] = useState("");

  // Send message with streaming - using simple conversational planner
  const handleStreamingMessage = async (messageData: { message: string; mode: 'quick' | 'smart'; conversationHistory: any[] }) => {
    setIsGenerating(true);
    setStreamingMessageContent("");
    
    // Add user message to conversation immediately
    const newMessage: ConversationMessage = {
      role: 'user',
      content: messageData.message,
      timestamp: new Date().toISOString()
    };
    
    // Add placeholder for streaming assistant response
    const streamingPlaceholder: ConversationMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    };
    
    const updatedHistory = [
      ...messageData.conversationHistory,
      newMessage,
      streamingPlaceholder
    ];
    
    setCurrentSession(prev => ({
      ...prev!,
      conversationHistory: updatedHistory
    }));

    try {
      const response = await fetch('/api/chat/conversation/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageData.message,
          conversationHistory: messageData.conversationHistory,
          mode: messageData.mode
        })
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedMessage = '';
      let finalData: any = null;
      const streamingIndex = updatedHistory.length - 1;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('event: token')) {
            const dataMatch = line.match(/data: (.+)/);
            if (dataMatch) {
              const tokenData = JSON.parse(dataMatch[1]);
              accumulatedMessage += tokenData.token;
              setStreamingMessageContent(accumulatedMessage);
              
              // Update streaming message in real-time
              setCurrentSession(prev => {
                if (!prev) return prev;
                const updated = [...prev.conversationHistory];
                updated[streamingIndex] = {
                  ...updated[streamingIndex],
                  content: accumulatedMessage
                };
                return {
                  ...prev,
                  conversationHistory: updated
                };
              });
            }
          } else if (line.startsWith('event: complete')) {
            const dataMatch = line.match(/data: (.+)/);
            if (dataMatch) {
              finalData = JSON.parse(dataMatch[1]);
            }
          }
        }
      }

      // Update with final complete data
      if (finalData) {
        const assistantMessage: ConversationMessage = {
          role: 'assistant',
          content: finalData.message || accumulatedMessage,
          timestamp: new Date().toISOString()
        };
        
        const finalHistory = [
          ...messageData.conversationHistory,
          newMessage,
          assistantMessage
        ];
        
        setCurrentSession(prev => ({
          ...finalData.session,
          conversationHistory: finalHistory
        }));
        
        setMessage('');
        
        // If plan is ready, show it for confirmation
        if (finalData.readyToGenerate && finalData.plan) {
          setPendingPlan(finalData.plan);
          setShowPlanConfirmation(true);
        }
        
        // Handle completed plan creation
        if (finalData.activityCreated && finalData.createdTasks) {
          queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
          queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
          queryClient.invalidateQueries({ queryKey: ['/api/progress'] });
          
          // Store activity metadata for this message
          if (finalData.activity?.id && finalData.activity?.title) {
            const messageIndex = finalHistory.length - 1; // Assistant message index
            setMessageActivities(prev => {
              const updated = new Map(prev);
              updated.set(messageIndex, {
                activityId: finalData.activity.id,
                activityTitle: finalData.activity.title
              });
              return updated;
            });
            
            // Show toast with navigation option
            toast({
              title: "Activity Created! 🎉",
              description: `"${finalData.activity.title}" is ready with ${finalData.createdTasks.length} tasks`,
              action: (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setLocation(`/?tab=activities&activity=${finalData.activity.id}`)}
                  data-testid="toast-view-activity"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  View
                </Button>
              )
            });
          }
        }
      }

    } catch (error) {
      console.error('Streaming error:', error);
      toast({
        title: "Error",
        description: "Failed to process message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setStreamingMessageContent("");
    }
  };

  const sendMessageMutation = useMutation({
    mutationFn: handleStreamingMessage
  });

  // Get plan preview before generation
  const previewPlanMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest('POST', '/api/planner/preview', { sessionId });
      return response.json();
    },
    onSuccess: (data) => {
      setPendingPlan(data.planPreview);
      setShowPlanConfirmation(true);
      setIsGenerating(false);
    },
    onError: (error) => {
      console.error('Failed to preview plan:', error);
      setIsGenerating(false);
      toast({
        title: "Preview Error",
        description: error instanceof Error ? error.message : "Failed to preview plan",
        variant: "destructive"
      });
    }
  });

  // Generate plan (after confirmation)
  const generatePlanMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest('POST', '/api/planner/generate', { sessionId });
      return response.json();
    },
    onSuccess: (data) => {
      // Store the generated plan data but mark session as complete
      setCurrentSession(data.session);
      setGeneratedPlan(data.plan);
      setIsGenerating(false);
      setShowAgreementPrompt(false);
      setShowPlanConfirmation(false);
      setShowPlanDetails(true);
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/progress'] });
      toast({
        title: "Plan Created!",
        description: "Your activity and tasks have been added to your dashboard",
      });
    },
    onError: (error) => {
      console.error('Failed to generate plan:', error);
      setIsGenerating(false);
      toast({
        title: "Generation Error",
        description: error instanceof Error ? error.message : "Failed to generate plan",
        variant: "destructive"
      });
    }
  });

  const handleModeSelect = (mode: PlanningMode) => {
    // ✅ CRITICAL FIX: Always clear session when selecting mode to ensure fresh start
    // This prevents old conversation history from persisting across mode selections
    localStorage.removeItem('planner_session');
    localStorage.removeItem('planner_mode');
    localStorage.removeItem('planner_chips');
    
    setPlanningMode(mode);
    setContextChips([]); // Clear any old context chips
    
    // Simple planner doesn't need upfront session creation
    // Session will be created on first message with empty conversationHistory
    setCurrentSession({
      id: 'temp-' + Date.now(),
      sessionState: 'gathering',
      conversationHistory: [], // Always start with empty history for fresh conversations
      slots: {},
      isComplete: false
    } as PlannerSession);
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;
    if (!planningMode || (planningMode !== 'quick' && planningMode !== 'smart')) return;
    
    // ✅ CRITICAL FIX: Compute conversation history BEFORE clearing session
    // If session is complete, send empty history to trigger fresh session creation on backend
    const conversationHistory = currentSession?.isComplete ? [] : (currentSession?.conversationHistory || []);
    
    if (currentSession?.isComplete) {
      console.log('[PLANNER] Detected completed session, sending empty history for fresh start');
    }
    
    sendMessageMutation.mutate({
      message: message.trim(),
      mode: planningMode,
      conversationHistory
    });
  };

  const handleQuickGenerate = () => {
    if (!currentSession) return;
    setIsGenerating(true);
    previewPlanMutation.mutate(currentSession.id);
  };

  const handleChatGenerate = () => {
    if (!currentSession) return;
    setIsGenerating(true);
    setShowAgreementPrompt(false);
    previewPlanMutation.mutate(currentSession.id);
  };

  const handleConfirmPlan = () => {
    if (!currentSession) return;
    
    // Check authentication before creating plan
    const isAuthenticated = user && user.id !== 'demo-user';
    if (!isAuthenticated && onSignInRequired) {
      onSignInRequired();
      return;
    }
    
    setIsGenerating(true);
    generatePlanMutation.mutate(currentSession.id);
  };

  const handleModifyPlan = () => {
    setShowPlanConfirmation(false);
    setPendingPlan(null);
    toast({
      title: "Plan Cancelled",
      description: "Please provide the changes you'd like to make",
    });
  };

  // Direct plan generation (Create Action Plan mode)
  const directPlanMutation = useMutation({
    mutationFn: async (data: { userInput: string; contentType: 'text' | 'image'; isModification: boolean }) => {
      const response = await apiRequest('POST', '/api/planner/direct-plan', {
        userInput: data.userInput,
        contentType: data.contentType,
        sessionId: currentSession?.id,
        isModification: data.isModification
      });
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentSession(data.session);
      setGeneratedPlan(data.plan);
      setMessage('');
      toast({
        title: data.message,
        description: "Review your plan and create activity when ready",
      });
    },
    onError: (error) => {
      console.error('Failed to generate plan:', error);
      toast({
        title: "Generation Error",
        description: error instanceof Error ? error.message : "Failed to generate plan",
        variant: "destructive"
      });
    }
  });

  // Create activity from direct plan
  const createActivityFromPlan = useMutation({
    mutationFn: async (plan: any) => {
      // Create activity
      const activityResponse = await apiRequest('POST', '/api/activities', {
        title: plan.activity.title,
        description: plan.activity.description,
        category: plan.activity.category,
        status: 'planning',
        tags: [plan.activity.category]
      });
      const activity = await activityResponse.json();

      // Create tasks and link them to the activity
      const createdTasks = [];
      for (let i = 0; i < plan.tasks.length; i++) {
        const taskData = plan.tasks[i];

        const taskResponse = await apiRequest('POST', '/api/tasks', {
          title: taskData.title,
          description: taskData.description,
          category: taskData.category,
          priority: taskData.priority || 'medium',
        });
        const task = await taskResponse.json();

        await apiRequest('POST', `/api/activities/${activity.id}/tasks`, {
          taskId: task.id,
          order: i
        });

        createdTasks.push(task);
      }

      return { activity, tasks: createdTasks };
    },
    onSuccess: (data) => {
      setGeneratedPlan(null);
      setShowPlanDetails(true);
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      toast({
        title: "Plan Created!",
        description: `Created ${data.activity.title} with ${data.tasks.length} tasks`,
      });
    },
    onError: (error) => {
      console.error('Failed to create activity:', error);
      toast({
        title: "Creation Error",
        description: "Failed to create activity from plan",
        variant: "destructive"
      });
    }
  });

  const handleConfirmParsedContent = useMutation({
    mutationFn: async () => {
      if (!parsedLLMContent) return;

      let activityId = createdActivityId;
      let activity;

      if (activityId) {
        // Update existing activity
        const activityResponse = await apiRequest('PUT', `/api/activities/${activityId}`, {
          title: parsedLLMContent.activity.title,
          description: parsedLLMContent.activity.description,
        });
        activity = await activityResponse.json();
      } else {
        // Create new activity with summary
        const activityResponse = await apiRequest('POST', '/api/activities', {
          ...parsedLLMContent.activity,
          status: 'planning',
          tags: [parsedLLMContent.activity.category]
        });
        activity = await activityResponse.json();
        activityId = activity.id;
      }

      // Create tasks and link them to the activity
      const createdTasks = [];
      for (let i = 0; i < parsedLLMContent.tasks.length; i++) {
        const taskData = parsedLLMContent.tasks[i];

        // Create the task
        const taskResponse = await apiRequest('POST', '/api/tasks', {
          title: taskData.title,
          description: taskData.description,
          category: taskData.category || parsedLLMContent.activity.category,
          priority: taskData.priority || 'medium',
          timeEstimate: taskData.timeEstimate
        });
        const task = await taskResponse.json();

        // Link task to activity
        await apiRequest('POST', `/api/activities/${activityId}/tasks`, {
          taskId: task.id,
          order: i
        });

        createdTasks.push(task);
      }

      return { activity, tasks: createdTasks, activityId };
    },
    onSuccess: (data) => {
      if (data) {
        setCreatedActivityId(data.activityId);
      }
      setShowParsedContent(false);
      setParsedLLMContent(null);
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      toast({
        title: "Content Imported!",
        description: data?.activityId && createdActivityId
          ? "Your existing plan has been updated with new tasks"
          : "Your LLM content has been converted into an activity with tasks",
      });
    },
    onError: (error) => {
      console.error('Failed to create activity from parsed content:', error);
      toast({
        title: "Import Error",
        description: "Failed to create activity from parsed content",
        variant: "destructive"
      });
    }
  });

  // URL Detection Helper
  const detectUrlInMessage = (text: string): string | null => {
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
    const match = text.match(urlRegex);
    return match ? match[0] : null;
  };

  // Fetch URL content
  const fetchUrlContent = async (url: string): Promise<string> => {
    const response = await fetch('/api/parse-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch URL');
    
    // Handle video content responses with helpful guidance
    if (data.isVideoContent) {
      toast({
        title: `${data.platform} Video Detected`,
        description: "Video content can't be extracted directly. Please describe what's in the video to create a plan.",
        duration: 8000
      });
    }
    
    return data.content || '';
  };

  // Handle file upload for document parsing
  const handleDocumentUpload = async (file: File) => {
    if (!file) return;
    
    setIsLoadingCuratedQuestions(true);
    try {
      const formData = new FormData();
      formData.append('document', file);
      
      const response = await fetch('/api/upload/document', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.suggestion || data.error || 'Failed to upload document');
      }
      
      if (data.content) {
        await processCuratedQuestionsFlow(data.content);
      }
    } catch (error: any) {
      console.error('Document upload error:', error);
      toast({
        title: "Upload Error",
        description: error.message || "Failed to process the uploaded document. Try pasting the text directly.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingCuratedQuestions(false);
      // Reset file input
      if (plannerFileInputRef.current) {
        plannerFileInputRef.current.value = '';
      }
    }
  };

  // Process curated questions flow for Smart/Quick Plan modes
  const processCuratedQuestionsFlow = async (content: string) => {
    setExternalContent(content);
    setIsLoadingCuratedQuestions(true);
    
    try {
      const response = await fetch('/api/planner/generate-curated-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          externalContent: content,
          mode: planningMode === 'quick' ? 'quick' : 'smart'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate questions');
      }
      
      const data = await response.json();
      setCuratedQuestions(data.questions || []);
      setContentSummary(data.contentSummary || '');
      setSuggestedPlanTitle(data.suggestedPlanTitle || '');
      setCuratedQuestionsAnswers({});
      setShowCuratedQuestionsDialog(true);
    } catch (error) {
      console.error('Curated questions error:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to analyze content. Try again or paste the content directly.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingCuratedQuestions(false);
    }
  };

  // Generate plan from curated questions answers
  const generatePlanFromCuratedAnswers = useMutation({
    mutationFn: async () => {
      if (!externalContent) throw new Error('No external content');
      
      const response = await fetch('/api/planner/generate-plan-from-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          externalContent,
          userAnswers: curatedQuestionsAnswers,
          mode: planningMode === 'quick' ? 'quick' : 'smart',
          sourceUrl: externalSourceUrl
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate plan');
      }
      
      return response.json();
    },
    onSuccess: async (data) => {
      setShowCuratedQuestionsDialog(false);
      setCuratedQuestions([]);
      setCuratedQuestionsAnswers({});
      setExternalContent(null);
      setExternalSourceUrl(null);

      // CRITICAL: Invalidate activities cache (activities, tasks, progress)
      await invalidateActivitiesCache();

      // If venues were also journaled, invalidate journal cache too
      if (data.journalEntryId || data.savedVenuesCount > 0) {
        await invalidateJournalCache();
      }

      const hasJournal = data.journalEntryId || data.savedVenuesCount > 0;
      toast({
        title: hasJournal ? "Plan Created & Journaled!" : "Plan Created!",
        description: data.savedVenuesCount
          ? `Created ${data.activity?.title} with ${data.createdTasks?.length} tasks + ${data.savedVenuesCount} venues journaled`
          : data.message || `Created ${data.activity?.title} with ${data.createdTasks?.length} tasks`,
        action: data.activity?.id ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setLocation(`/?tab=activities&activity=${data.activity.id}`)}
            data-testid="toast-view-activity"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            View
          </Button>
        ) : undefined
      });
    },
    onError: (error: any) => {
      console.error('Plan generation error:', error);
      toast({
        title: "Generation Error",
        description: error.message || "Failed to create plan from your answers",
        variant: "destructive"
      });
    }
  });

  // Save to Journal Only mutation (no planning)
  const saveToJournalOnlyMutation = useMutation({
    mutationFn: async () => {
      if (!pendingUrlData) throw new Error('No URL data to save');
      
      const response = await apiRequest('POST', '/api/user/saved-content', {
        sourceUrl: pendingUrlData.url,
        extractedContent: pendingUrlData.content,
        autoJournal: true,
        userNotes: message || undefined
      });
      return response.json();
    },
    onSuccess: async (data) => {
      setShowUrlActionDialog(false);
      setPendingUrlData(null);
      setExternalSourceUrl(null);
      setMessage('');

      // Use centralized invalidation (entries, stats, preferences)
      await invalidateJournalCache();

      const venueCount = data.venuesAddedCount || 0;
      toast({
        title: "Saved to Journal!",
        description: venueCount > 0
          ? `${venueCount} venue${venueCount > 1 ? 's' : ''} added to your journal`
          : "Content saved to your journal",
        action: (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setLocation('/journal')}
            data-testid="toast-view-journal"
          >
            <BookOpen className="w-3 h-3 mr-1" />
            View
          </Button>
        )
      });
    },
    onError: (error: any) => {
      console.error('Journal save error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save to journal",
        variant: "destructive"
      });
    }
  });

  // Handle URL detection when sending message in Quick/Smart Plan modes
  const handleMessageWithUrlDetection = async () => {
    const detectedUrl = detectUrlInMessage(message);
    
    if (detectedUrl && (planningMode === 'quick' || planningMode === 'smart')) {
      setIsLoadingCuratedQuestions(true);
      
      // Store the URL for auto-journaling if it's a social media URL
      const isSocialMediaUrl = /instagram\.com|tiktok\.com|youtube\.com|youtu\.be/i.test(detectedUrl);
      if (isSocialMediaUrl) {
        setExternalSourceUrl(detectedUrl);
      }
      
      try {
        const response = await fetch('/api/parse-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: detectedUrl })
        });
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch URL');
        }
        
        // Handle video content - show guidance and don't proceed to curated questions
        if (data.isVideoContent) {
          toast({
            title: `${data.platform} Video Detected`,
            description: "Video content can't be extracted directly. Please describe what's in the video to create a plan.",
            duration: 10000
          });
          // Add guidance as a system message
          const guidanceMessage: ConversationMessage = {
            role: 'assistant',
            content: data.guidance || `This appears to be a ${data.platform} video. Please describe what the video shows and what kind of plan you'd like to create from it.`,
            timestamp: new Date().toISOString()
          };
          setCurrentSession(prev => prev ? {
            ...prev,
            conversationHistory: [...prev.conversationHistory, guidanceMessage]
          } : null);
          setMessage('');
          setIsLoadingCuratedQuestions(false);
          // Store URL data for potential journal save even for video content
          setPendingUrlData({
            content: data.guidance || `${data.platform} video content from ${detectedUrl}`,
            url: detectedUrl,
            isVideoContent: true,
            platform: data.platform
          });
          setShowUrlActionDialog(true);
          return;
        }
        
        // Normal content - check if social media to show action choice
        if (data.content) {
          if (isSocialMediaUrl) {
            // Social media URL - show action choice dialog (Save to Journal vs Create Plan)
            setPendingUrlData({
              content: data.content,
              url: detectedUrl,
              isVideoContent: false,
              platform: data.platform
            });
            setShowUrlActionDialog(true);
            setIsLoadingCuratedQuestions(false);
          } else {
            // Non-social URL (articles, blogs, etc.) - proceed directly to curated questions (old behavior)
            await processCuratedQuestionsFlow(data.content);
          }
          setMessage('');
          return;
        }
      } catch (error) {
        console.error('URL processing error:', error);
        toast({
          title: "URL Error",
          description: "Couldn't fetch the URL content. Try pasting the content directly.",
          variant: "destructive"
        });
        setIsLoadingCuratedQuestions(false);
        setExternalSourceUrl(null);
      }
    } else {
      // Regular message flow
      handleSendMessage();
    }
  };

  // Journal Mode submitJournalEntry mutation
  const submitJournalEntry = useMutation({
    mutationFn: async () => {
      // Cancel any pending auto-save to prevent duplicate submission
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
      
      // Mark this text as already saved to block any late auto-save
      lastAutoSavedTextRef.current = journalText.trim();
      
      // Duplicate detection - check if same text was submitted in last 5 minutes
      const now = Date.now();
      const recentEntries = journalEntriesData?.entries || [];
      const fiveMinutesAgo = now - (5 * 60 * 1000);
      
      const isDuplicate = recentEntries.some((entry: any) => {
        const entryTime = new Date(entry.timestamp).getTime();
        return entry.text.trim() === journalText.trim() && entryTime > fiveMinutesAgo;
      });
      
      if (isDuplicate) {
        throw new Error('This exact text was already submitted recently. Please modify your entry or wait a few minutes before resubmitting.');
      }
      
      setIsUploadingJournal(true);
      
      // Upload media first if any
      let uploadedMedia = [];
      if (journalMedia.length > 0) {
        const formData = new FormData();
        journalMedia.forEach(file => {
          formData.append('media', file);
        });
        
        const uploadResponse = await apiRequest('POST', '/api/journal/upload', formData);
        const uploadData = await uploadResponse.json();
        uploadedMedia = uploadData.media;
      }
      
      // Submit journal entry with AI categorization
      const response = await apiRequest('POST', '/api/journal/smart-entry', {
        text: journalText,
        media: uploadedMedia,
        activityId: activityId,
        linkedActivityTitle: activityTitle
      });
      return response.json();
    },
    onSuccess: async (data) => {
      // Handle both new grouped categories response and old single category response
      const categoryDisplay = data.categories && data.categories.length > 0
        ? data.categories.join(', ') 
        : (data.category || 'your journal');
      
      toast({
        title: "Journal entry saved!",
        description: data.isGroupedExperience 
          ? `Added to multiple categories: ${categoryDisplay}`
          : `Added to ${categoryDisplay}`,
      });
      setJournalText('');
      setJournalMedia([]);
      lastAutoSavedTextRef.current = ''; // Clear auto-save tracking
      setDetectedCategory(
        data.categories && data.categories.length > 0 
          ? data.categories[0] 
          : data.category
      );
      setIsUploadingJournal(false);
      
      // Refresh journal data immediately to ensure duplicate detection has fresh data
      await queryClient.invalidateQueries({ queryKey: ['/api/user-preferences'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/journal/entries'] });
      await refetchJournalEntries();
    },
    onError: (error) => {
      console.error('Failed to save journal entry:', error);
      toast({
        title: "Error",
        description: "Failed to save journal entry",
        variant: "destructive"
      });
      setIsUploadingJournal(false);
    }
  });

  // Handlers for direct plan mode
  const handleDirectPlan = () => {
    if (!message.trim()) return;

    directPlanMutation.mutate({
      userInput: message.trim(),
      contentType: 'text',
      isModification: !!generatedPlan
    });
  };

  const handleBackToInput = () => {
    setGeneratedPlan(null);
    setCurrentSession(null);
    setMessage('');
    toast({
      title: "Session Reset",
      description: "Start fresh with a new plan",
    });
  };

  const handleStartOver = () => {
    localStorage.removeItem('planner_session');
    localStorage.removeItem('planner_mode');
    localStorage.removeItem('planner_chips');
    setCurrentSession(null);
    setPlanningMode(null);
    setContextChips([]);
    setPendingPlan(null);
    setGeneratedPlan(null);
    setShowPlanConfirmation(false);
    setShowPlanDetails(false);
    setShowAgreementPrompt(false);
    toast({
      title: "Session Cleared",
      description: "Starting fresh!",
    });
  };

  const handleBackToHome = () => {
    handleStartOver();
    if (onClose) onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Use URL detection for Quick/Smart Plan modes
      if (planningMode === 'quick' || planningMode === 'smart') {
        handleMessageWithUrlDetection();
      } else {
        handleSendMessage();
      }
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    // Check for image data first
    const items = e.clipboardData.items;
    let hasImage = false;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        hasImage = true;
        e.preventDefault();

        const file = items[i].getAsFile();
        if (file) {
          setIsParsingPaste(true);
          try {
            // Convert image to base64
            const reader = new FileReader();
            reader.onload = async (event) => {
              try {
                const base64Image = event.target?.result as string;

                // Combine current input text with conversation history for context
                const userTypedContext = message.trim();
                const chatContext = currentSession?.conversationHistory
                  .slice(-3)
                  .map(msg => `${msg.role}: ${msg.content}`)
                  .join('\n');

                const precedingContext = userTypedContext
                  ? `User's context: ${userTypedContext}\n\n${chatContext}`
                  : chatContext;

                // Call the parsing API with image
                const response = await apiRequest('POST', '/api/planner/parse-llm-content', {
                  pastedContent: base64Image,
                  contentType: 'image',
                  precedingContext
                });
                const data = await response.json();

                setMessage(''); // Clear typed text since it's now part of context

                setParsedLLMContent(data.parsed);
                setShowParsedContent(true);
              } catch (error) {
                console.error('Failed to parse image:', error);
                toast({
                  title: "Image Parse Error",
                  description: "Couldn't analyze the pasted image. Please try again.",
                  variant: "destructive"
                });
              } finally {
                setIsParsingPaste(false);
              }
            };
            reader.readAsDataURL(file);
          } catch (error) {
            console.error('Failed to read image:', error);
            toast({
              title: "Image Read Error",
              description: "Couldn't read the pasted image.",
              variant: "destructive"
            });
            setIsParsingPaste(false);
          }
        }
        return;
      }
    }

    // Handle text paste
    const pastedText = e.clipboardData.getData('text');
    if (!pastedText) return;

    // Check if this looks like LLM-generated content (heuristics)
    const looksLikeLLMContent =
      pastedText.length > 200 && // Substantial content
      (pastedText.includes('Step') ||
       pastedText.includes('1.') ||
       pastedText.includes('**') ||
       pastedText.includes('###') ||
       (pastedText.match(/\d+\./g)?.length ?? 0) >= 3); // Multiple numbered items

    if (looksLikeLLMContent) {
      e.preventDefault(); // Prevent default paste
      setIsParsingPaste(true);

      try {
        // Combine current input text with conversation history for full context
        const userTypedContext = message.trim();
        const chatContext = currentSession?.conversationHistory
          .slice(-3) // Last 3 messages
          .map(msg => `${msg.role}: ${msg.content}`)
          .join('\n');

        const precedingContext = userTypedContext
          ? `User's context: ${userTypedContext}\n\n${chatContext}`
          : chatContext;

        // Call the parsing API
        const response = await apiRequest('POST', '/api/planner/parse-llm-content', {
          pastedContent: pastedText,
          contentType: 'text',
          precedingContext
        });
        const data = await response.json();

        setParsedLLMContent(data.parsed);
        setShowParsedContent(true);
        setMessage(''); // Clear typed text since it's now part of context
      } catch (error) {
        console.error('Failed to parse LLM content:', error);
        // Silently fall back to regular paste - no need to show error to user
        setMessage(prev => prev + pastedText);
      } finally {
        setIsParsingPaste(false);
      }
    }
  };

  const getChipIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case 'time': return <Clock className="h-3 w-3" />;
      case 'location': return <MapPin className="h-3 w-3" />;
      case 'transport': return <Car className="h-3 w-3" />;
      case 'outfit': return <Shirt className="h-3 w-3" />;
      default: return <Sparkles className="h-3 w-3" />;
    }
  };

  // Journal Mode helpers - with auto-save
  const handleJournalTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const cursorPosition = e.target.selectionStart;
    setJournalText(text);

    // Check if @ was just typed for autocomplete
    const textUpToCursor = text.slice(0, cursorPosition);
    const lastAtIndex = textUpToCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const searchTerm = textUpToCursor.slice(lastAtIndex);
      // Check if we're still typing a tag (no space after @)
      if (!searchTerm.includes(' ') && searchTerm.length > 0) {
        setAutocompleteSearch(searchTerm);
        setShowAutocomplete(true);
        
        // Calculate position for dropdown
        const textarea = journalTextareaRef.current;
        if (textarea) {
          const rect = textarea.getBoundingClientRect();
          setAutocompletePosition({
            top: rect.bottom + window.scrollY + 5,
            left: rect.left + window.scrollX + 10
          });
        }
      } else {
        setShowAutocomplete(false);
      }
    } else {
      setShowAutocomplete(false);
    }

    // Auto-save functionality (debounced)
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Only auto-save if there's meaningful text (at least 10 characters) AND it's different from last auto-save
    if (text.trim().length >= 10 && text.trim() !== lastAutoSavedTextRef.current) {
      setIsSavingJournal(true);
      autoSaveTimeoutRef.current = setTimeout(async () => {
        try {
          // Double-check text hasn't changed to what was last saved (race condition protection)
          if (text.trim() === lastAutoSavedTextRef.current) {
            setIsSavingJournal(false);
            return;
          }
          
          // Auto-save journal entry
          const response = await apiRequest('POST', '/api/journal/smart-entry', {
            text: text.trim(),
            media: [],
            activityId: activityId,
            linkedActivityTitle: activityTitle
          });
          const data = await response.json();
          
          if (data.success) {
            setIsSavingJournal(false);
            
            // Track what was auto-saved to prevent duplicates
            lastAutoSavedTextRef.current = text.trim();
            
            // Force cache invalidation and refetch
            queryClient.invalidateQueries({ queryKey: ['/api/user-preferences'] });
            queryClient.invalidateQueries({ queryKey: ['/api/journal/entries'] });
            await refetchJournalEntries();
            
            // Show subtle success indicator without clearing text
            toast({
              title: "Auto-saved",
              description: `Saved to ${data.categories?.[0] || 'your journal'}`,
              duration: 2000,
            });
          }
        } catch (error) {
          console.error('Auto-save failed:', error);
          setIsSavingJournal(false);
        }
      }, 2000); // Wait 2 seconds after user stops typing
    } else {
      setIsSavingJournal(false);
    }
  };

  const insertTagAtCursor = (tag: string) => {
    const textarea = journalTextareaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const textBefore = journalText.slice(0, cursorPosition);
    const textAfter = journalText.slice(cursorPosition);
    
    // Find the @ symbol before cursor
    const lastAtIndex = textBefore.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      // Replace from @ to cursor with the selected tag
      const newText = textBefore.slice(0, lastAtIndex) + tag + ' ' + textAfter;
      setJournalText(newText);
      
      // Set cursor after inserted tag
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = lastAtIndex + tag.length + 1;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    } else {
      // Just append if no @ found
      setJournalText(journalText + tag + ' ');
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(journalText.length + tag.length + 1, journalText.length + tag.length + 1);
      }, 0);
    }
    
    setShowAutocomplete(false);
  };

  const filteredTags = availableTags.filter(tag => 
    tag.toLowerCase().includes(autocompleteSearch.toLowerCase())
  );

  // Journal Mode UI - Completely Redesigned
  if (planningMode === 'journal') {
    // Real-time keyword detection
    const keywordDetection = useKeywordDetection(journalText);

    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-purple-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {/* Header */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-emerald-500 flex items-center justify-center shadow-lg">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg bg-gradient-to-r from-purple-600 to-emerald-600 dark:from-purple-400 dark:to-emerald-400 bg-clip-text text-transparent">
                  JournalMate
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">Your smart adaptive journal</p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                onClick={() => {
                  localStorage.removeItem('planner_session');
                  localStorage.removeItem('planner_mode');
                  localStorage.removeItem('planner_chips');
                  setJournalText('');
                  setJournalMedia([]);
                  lastAutoSavedTextRef.current = ''; // Clear auto-save tracking
                  if (onClose) {
                    onClose();
                  }
                }}
                variant="ghost"
                size="sm"
                className="gap-2"
                data-testid="button-exit-journal"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <Button
                onClick={() => setShowJournalTimeline(true)}
                variant="ghost"
                size="sm"
                className="gap-2"
                data-testid="button-view-timeline"
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Timeline</span>
              </Button>
              <Button
                onClick={() => setShowTemplateSelector(true)}
                variant="ghost"
                size="sm"
                className="gap-2"
                data-testid="button-use-template"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Templates</span>
              </Button>
              <Button
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['/api/journal/entries'] });
                  refetchJournalEntries();
                  toast({
                    title: "Refreshed",
                    description: "Journal entries reloaded",
                    duration: 2000,
                  });
                }}
                variant="ghost"
                size="sm"
                title="Refresh entries"
                data-testid="button-refresh-journal"
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setShowKeywordHelp(true)}
                variant="ghost"
                size="sm"
                title="Learn about @keywords"
                data-testid="button-keyword-help"
              >
                <Lightbulb className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto p-4 space-y-4">
            {/* Entry Form Card */}
            <Card className="border-none shadow-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-2">
                    <CardTitle className="text-base">Quick Capture</CardTitle>
                    {activityTitle && (
                      <Badge variant="outline" className="w-fit text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                        <BookOpen className="h-3 w-3 mr-1" />
                        Journaling about: {activityTitle}
                      </Badge>
                    )}
                  </div>
                  {/* Activity Progress Summary */}
                  {activityProgress && activityProgress.totalTasks > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                        <Check className="h-3 w-3 mr-1" />
                        {activityProgress.completedTasks}/{activityProgress.totalTasks} done
                      </Badge>
                      {activityProgress.isLiked && (
                        <Badge variant="secondary" className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                          ❤️ Liked
                        </Badge>
                      )}
                    </div>
                  )}
                  {isSavingJournal && (
                    <Badge variant="secondary" className="text-xs animate-pulse">
                      <RefreshCcw className="h-3 w-3 mr-1 animate-spin" />
                      Auto-saving...
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs">
                  {activityTitle
                    ? "Capture your thoughts and experiences about this activity"
                    : "Type freely. Use @keywords like @restaurants, @travel, @music for smart categorization"}
                </CardDescription>
                
                {/* Activity Task Breakdown for Journal */}
                {activityProgress && activityProgress.totalTasks > 0 && (
                  <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-2">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Activity Summary</p>
                    
                    {/* Completed Tasks */}
                    {activityProgress.completedTasksList.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                          <Check className="h-3 w-3" /> Completed ({activityProgress.completedTasksList.length})
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {activityProgress.completedTasksList.slice(0, 5).map((task: any) => (
                            <Badge key={task.id} variant="secondary" className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                              {task.title.length > 25 ? task.title.substring(0, 25) + '...' : task.title}
                            </Badge>
                          ))}
                          {activityProgress.completedTasksList.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{activityProgress.completedTasksList.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Incomplete Tasks */}
                    {activityProgress.incompleteTasks.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Still to do ({activityProgress.incompleteTasks.length})
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {activityProgress.incompleteTasks.slice(0, 3).map((task: any) => (
                            <Badge key={task.id} variant="outline" className="text-xs text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                              {task.title.length > 25 ? task.title.substring(0, 25) + '...' : task.title}
                            </Badge>
                          ))}
                          {activityProgress.incompleteTasks.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{activityProgress.incompleteTasks.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                      Reflect on what you completed and what you might do differently next time!
                    </p>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
            <div className="space-y-2 relative">
              <textarea
                ref={journalTextareaRef}
                value={journalText}
                onChange={handleJournalTextChange}
                placeholder="What's on your mind? Use @keywords for quick categorization...&#10;Example: @restaurants had amazing ramen today!"
                className="w-full min-h-32 p-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-pink-500"
                data-testid="input-journal-text"
              />
              
              {/* Autocomplete dropdown */}
              {showAutocomplete && filteredTags.length > 0 && (
                <div 
                  className="absolute z-50 mt-1 w-64 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                  style={{ top: '100%', left: 0 }}
                >
                  {filteredTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => insertTagAtCursor(tag)}
                      className="w-full text-left px-3 py-2 hover:bg-pink-50 dark:hover:bg-pink-900/20 text-sm transition-colors"
                      data-testid={`autocomplete-${tag}`}
                    >
                      <span className="font-medium text-pink-600 dark:text-pink-400">{tag}</span>
                    </button>
                  ))}
                </div>
              )}
              
              <div className="flex flex-wrap gap-2">
                <Badge 
                  variant="outline" 
                  className="text-xs cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => insertTagAtCursor('@restaurants')}
                  data-testid="badge-restaurants"
                >
                  @restaurants
                </Badge>
                <Badge 
                  variant="outline" 
                  className="text-xs cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => insertTagAtCursor('@travel')}
                  data-testid="badge-travel"
                >
                  @travel
                </Badge>
                <Badge 
                  variant="outline" 
                  className="text-xs cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => insertTagAtCursor('@music')}
                  data-testid="badge-music"
                >
                  @music
                </Badge>
                <Badge 
                  variant="outline" 
                  className="text-xs cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => insertTagAtCursor('@movies')}
                  data-testid="badge-movies"
                >
                  @movies
                </Badge>
                <Badge 
                  variant="outline" 
                  className="text-xs cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => insertTagAtCursor('@books')}
                  data-testid="badge-books"
                >
                  @books
                </Badge>
              </div>

              {/* Real-time category detection display */}
              {keywordDetection.suggestedCategories.length > 0 && (
                <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start gap-2">
                    <Tag className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-purple-900 dark:text-purple-100 mb-1.5">
                        {keywordDetection.isGroupedExperience ? '✨ Grouped Experience Detected' : '📝 Will save to:'}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {keywordDetection.suggestedCategories.map((category) => (
                          <Badge
                            key={category}
                            className={`text-xs bg-gradient-to-r ${getCategoryColor(category)} text-white border-0 shadow-sm`}
                          >
                            {category}
                          </Badge>
                        ))}
                      </div>
                      {keywordDetection.isGroupedExperience && (
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-1.5">
                          Your entry will be saved to multiple categories for a complete memory
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,audio/*,.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mov,.avi,.mp3,.wav,.m4a,.aac,.ogg"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    setJournalMedia(Array.from(e.target.files));
                  }
                }}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
                data-testid="button-upload-media"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Photos/Videos/Audio ({journalMedia.length} selected)
              </Button>
              
              {journalMedia.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {journalMedia.map((file, idx) => (
                    <div key={idx} className="relative">
                      <Badge variant="secondary" className="pr-6">
                        {file.type.startsWith('video/') ? '🎥' : file.type.startsWith('audio/') ? '🎵' : '📷'} {file.name.slice(0, 15)}...
                      </Badge>
                      <button
                        onClick={() => setJournalMedia(journalMedia.filter((_, i) => i !== idx))}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {detectedCategory && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                <p className="text-sm text-green-700 dark:text-green-300">
                  ✓ Last entry saved to: <strong>{detectedCategory}</strong>
                </p>
              </div>
            )}

                <Button
                  onClick={() => submitJournalEntry.mutate()}
                  disabled={!journalText.trim() || isUploadingJournal}
                  className="w-full bg-gradient-to-r from-purple-500 to-emerald-500 hover:from-purple-600 hover:to-emerald-600 text-white shadow-lg"
                  data-testid="button-save-journal"
                >
                  {isUploadingJournal ? (
                    <>
                      <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Save Entry
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Journal Entries Feed */}
            {journalEntries.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent" />
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Your Journal ({journalEntries.length})
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent" />
                </div>

                {journalEntries.map((entry: any) => (
                  <Card 
                    key={entry.id} 
                    className="border-none shadow-md bg-white/90 dark:bg-slate-900/90 backdrop-blur hover-elevate transition-all"
                    data-testid={`journal-entry-${entry.id}`}
                  >
                    <CardContent className="p-4 space-y-3">
                      {/* Entry Header */}
                      <div className="flex items-center justify-between">
                        <Badge 
                          variant="secondary" 
                          className="bg-gradient-to-r from-purple-100 to-emerald-100 dark:from-purple-900/30 dark:to-emerald-900/30 text-purple-700 dark:text-purple-300 border-none"
                        >
                          {entry.category}
                        </Badge>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(entry.timestamp).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      {/* Entry Text */}
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {entry.text}
                      </p>

                      {/* Keywords */}
                      {entry.keywords && entry.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {entry.keywords.map((keyword: string, idx: number) => (
                            <Badge 
                              key={idx} 
                              variant="outline" 
                              className="text-xs text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800"
                            >
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Media Gallery */}
                      {entry.media && entry.media.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {entry.media.map((mediaItem: any, idx: number) => (
                            <div 
                              key={idx} 
                              className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800"
                            >
                              {mediaItem.type === 'image' ? (
                                <img 
                                  src={mediaItem.url} 
                                  alt="Journal media"
                                  className="w-full h-full object-cover hover:scale-105 transition-transform"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="h-8 w-8 text-slate-400" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Empty State */}
            {journalEntries.length === 0 && (
              <Card className="border-none shadow-md bg-white/60 dark:bg-slate-900/60 backdrop-blur">
                <CardContent className="p-8 text-center">
                  <BookOpen className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Loading your journal...
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* Template Selector */}
        <TemplateSelector
          open={showTemplateSelector}
          onOpenChange={setShowTemplateSelector}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/journal/entries'] });
            refetchJournalEntries();
          }}
        />

        {/* Journal Timeline */}
        <Dialog open={showJournalTimeline} onOpenChange={setShowJournalTimeline}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-[95vw] sm:max-w-4xl h-[95vh] sm:h-[90vh] p-0 overflow-hidden">
            <JournalTimeline onClose={() => setShowJournalTimeline(false)} />
          </DialogContent>
        </Dialog>

        {/* Keyword Help Modal */}
        <Dialog open={showKeywordHelp} onOpenChange={setShowKeywordHelp}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                Using @Keywords for Smart Categorization
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Type @keywords in your journal entries to automatically categorize them. JournalMate will detect these keywords and save your entry to the right category!
              </p>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Single Category Keywords:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><code className="bg-muted px-2 py-1 rounded">@restaurants</code> → Restaurants & Food</div>
                  <div><code className="bg-muted px-2 py-1 rounded">@travel</code> → Travel & Places</div>
                  <div><code className="bg-muted px-2 py-1 rounded">@movies</code> → Movies & TV Shows</div>
                  <div><code className="bg-muted px-2 py-1 rounded">@music</code> → Music & Concerts</div>
                  <div><code className="bg-muted px-2 py-1 rounded">@books</code> → Books & Learning</div>
                  <div><code className="bg-muted px-2 py-1 rounded">@fitness</code> → Health & Fitness</div>
                  <div><code className="bg-muted px-2 py-1 rounded">@fashion</code> → Fashion & Style</div>
                  <div><code className="bg-muted px-2 py-1 rounded">@shopping</code> → Shopping & Purchases</div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Grouped Experience Keywords:</h4>
                <p className="text-xs text-muted-foreground">
                  These keywords save to multiple related categories:
                </p>
                <div className="space-y-2 text-sm">
                  <div><code className="bg-primary/10 px-2 py-1 rounded">@vacation</code> → Travel, Restaurants, Activities</div>
                  <div><code className="bg-primary/10 px-2 py-1 rounded">@datenight</code> → Restaurants, Activities, Fashion</div>
                  <div><code className="bg-primary/10 px-2 py-1 rounded">@weekend</code> → Activities, Restaurants, Travel</div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  Pro Tip
                </h4>
                <p className="text-sm text-muted-foreground">
                  Start typing <code className="bg-muted px-1.5 py-0.5 rounded">@</code> and we'll show you suggestions! You can use multiple keywords in one entry.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* First-Time Onboarding Tooltip */}
        {showOnboardingTooltip && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-in fade-in">
            <Card className="max-w-md shadow-2xl animate-in zoom-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Welcome to JournalMate!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">
                  Start journaling by typing freely in the text box. Use <code className="bg-muted px-1.5 py-0.5 rounded">@keywords</code> like <code className="bg-muted px-1.5 py-0.5 rounded">@restaurants</code> or <code className="bg-muted px-1.5 py-0.5 rounded">@travel</code> to automatically categorize your entries!
                </p>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Lightbulb className="h-4 w-4" />
                  <span>Click the lightbulb icon anytime to see all available keywords</span>
                </div>

                <Button
                  onClick={() => {
                    setShowOnboardingTooltip(false);
                    localStorage.setItem('journalmate_onboarding_dismissed', 'true');
                  }}
                  className="w-full"
                >
                  Got it!
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Journal Onboarding Tour */}
        <JournalOnboarding
          open={showJournalOnboarding}
          onOpenChange={setShowJournalOnboarding}
          onComplete={() => {
            toast({
              title: "You're all set!",
              description: "Start capturing your life's moments.",
              duration: 3000,
            });
          }}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4 p-4">
      {/* Mode Header */}
      <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                planningMode === 'quick' 
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300'
                  : 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300'
              }`}>
                {planningMode === 'quick' ? <Zap className="h-4 w-4" /> : <Brain className="h-4 w-4" />}
              </div>
              <div>
                <h3 className="font-semibold">
                  {planningMode === 'quick' ? 'Quick Plan' : 'Smart Plan'}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {planningMode === 'quick' 
                    ? 'Fast planning with smart suggestions'
                    : 'Personalized questions and detailed recommendations'
                  }
                </p>
              </div>
            </div>
            <Button
              onClick={() => {
                setPlanningMode(null);
                setCurrentSession(null);
                setContextChips([]);
              }}
              variant="outline"
              size="sm"
              data-testid="button-change-mode"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Change Mode
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Context Chips */}
      {contextChips.length > 0 && (
        <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2 mb-4">
              {contextChips.map((chip, index) => (
                <Badge
                  key={index}
                  variant={chip.filled ? "default" : "outline"}
                  className={`flex items-center gap-2 px-3 py-1 ${
                    chip.category === 'required' 
                      ? chip.filled 
                        ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-100' 
                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900 dark:text-amber-100'
                      : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-100'
                  }`}
                  data-testid={`chip-${chip.label.toLowerCase()}`}
                >
                  {getChipIcon(chip.label)}
                  <span className="font-medium">{chip.label}:</span>
                  <span className="truncate max-w-24">{chip.value}</span>
                </Badge>
              ))}
            </div>
            
            {/* Generate Button Logic */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Context gathered: {requiredSlotsFilled}/{totalRequiredSlots} required
              </p>
              
              {planningMode === 'quick' && canGeneratePlan && (
                <Button
                  onClick={handleQuickGenerate}
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
                  data-testid="button-quick-generate"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {isGenerating ? 'Generating...' : 'Quick Generate'}
                </Button>
              )}
              
              {planningMode === 'chat' && showAgreementPrompt && (
                <Button
                  onClick={handleChatGenerate}
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                  data-testid="button-chat-generate"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isGenerating ? 'Generating...' : 'Generate Plan'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Interface */}
      <Card className="flex-1 border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur flex flex-col">
        <CardContent className="p-0 flex-1 flex flex-col">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {!currentSession ? (
              <div className="text-center py-12">
                <div className={`h-16 w-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                  planningMode === 'quick' 
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300'
                    : 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300'
                }`}>
                  {planningMode === 'quick' ? <Zap className="h-8 w-8" /> : <Brain className="h-8 w-8" />}
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {planningMode === 'quick' ? 'Quick Planning Ready!' : 'Smart Planning Ready!'}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  {planningMode === 'quick'
                    ? 'I\'ll ask a few key questions and generate your plan quickly.'
                    : 'I\'ll ask intuitive questions based on your activity type and profile, then confirm before creating the perfect plan.'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentSession.conversationHistory.map((msg, index) => {
                  const activityMeta = messageActivities.get(index);
                  
                  return (
                    <div key={index} className="space-y-2">
                      <div
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        data-testid={`message-${msg.role}-${index}`}
                      >
                        <div
                          className={`max-w-[80%] p-4 rounded-xl ${
                            msg.role === 'user'
                              ? planningMode === 'quick'
                                ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white'
                                : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <p className="text-xs opacity-70 mt-2">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      
                      {/* Activity shortcut button */}
                      {msg.role === 'assistant' && activityMeta && (
                        <div className="flex justify-start pl-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/?tab=activities&activity=${activityMeta.activityId}`)}
                            className="gap-2 text-xs bg-white dark:bg-slate-800 hover-elevate"
                            data-testid={`button-view-activity-${index}`}
                          >
                            <ExternalLink className="w-3 h-3" />
                            View "{activityMeta.activityTitle}"
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {(sendMessageMutation.isPending || generatePlanMutation.isPending) && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl">
                      <div className="flex items-center space-x-2">
                        <div className="animate-pulse flex space-x-1">
                          <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></div>
                          <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {isGenerating ? 'Generating your plan...' : 'Thinking...'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          {currentSession && !currentSession.isComplete && (
            <>
              <Separator />
              <div className="p-4 space-y-2">
                {/* URL/Document hint for Quick/Smart Plan */}
                {(planningMode === 'quick' || planningMode === 'smart') && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                    <Link className="h-3 w-3" />
                    <span>Paste a URL, upload a video/audio/document, or combine multiple sources</span>
                  </div>
                )}
                
                <div className="flex gap-2">
                  {/* File Upload Button for Quick/Smart Plan */}
                  {(planningMode === 'quick' || planningMode === 'smart') && (
                    <>
                      <input
                        ref={plannerFileInputRef}
                        type="file"
                        accept=".txt,.md,.json,.html,.xml,.csv,.pdf,.docx,.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mov,.avi,.mp3,.wav,.m4a"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const maxSize = 25 * 1024 * 1024;
                            if (file.size > maxSize) {
                              toast({
                                title: "File Too Large",
                                description: `Maximum file size is 25MB. Your file is ${Math.round(file.size / 1024 / 1024)}MB.`,
                                variant: "destructive",
                                duration: 5000
                              });
                              if (plannerFileInputRef.current) {
                                plannerFileInputRef.current.value = '';
                              }
                              return;
                            }
                            if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
                              toast({
                                title: file.type.startsWith('video/') ? "Transcribing Video..." : "Transcribing Audio...",
                                description: "Extracting spoken content using AI transcription. This may take a moment.",
                                duration: 5000
                              });
                            }
                            handleDocumentUpload(file);
                          }
                        }}
                        data-testid="input-document-upload"
                      />
                      <Button
                        onClick={() => plannerFileInputRef.current?.click()}
                        disabled={isLoadingCuratedQuestions || sendMessageMutation.isPending}
                        size="icon"
                        variant="outline"
                        className="shrink-0"
                        title="Upload video, audio, image, or document"
                        data-testid="button-upload-document"
                      >
                        {isLoadingCuratedQuestions ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                      </Button>
                    </>
                  )}
                  
                  <div className="flex-1 relative">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      onPaste={handlePaste}
                      placeholder={
                        (planningMode === 'quick' || planningMode === 'smart')
                          ? "Type your goal, paste a URL, or upload a document..."
                          : "Describe your goals and/or journal your life... or paste a ChatGPT conversation/screenshot!"
                      }
                      disabled={sendMessageMutation.isPending || isParsingPaste || isLoadingCuratedQuestions}
                      className="w-full"
                      data-testid="input-message"
                    />
                    {(isParsingPaste || isLoadingCuratedQuestions) && (
                      <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center rounded-md">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <Sparkles className="h-4 w-4 animate-pulse" />
                          <span>{isLoadingCuratedQuestions ? 'Analyzing content...' : 'Analyzing pasted content...'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleMessageWithUrlDetection}
                    disabled={!message.trim() || sendMessageMutation.isPending || isLoadingCuratedQuestions}
                    size="icon"
                    className={planningMode === 'quick' 
                      ? 'bg-emerald-500 hover:bg-emerald-600' 
                      : 'bg-blue-500 hover:bg-blue-600'
                    }
                    data-testid="button-send-message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
          
          {/* Action Buttons */}
          {currentSession && (
            <>
              <Separator />
              <div className="p-4 flex gap-2">
                <Button
                  onClick={handleStartOver}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  data-testid="button-start-over"
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Start Over
                </Button>
                {currentSession.isComplete && (
                  <Button
                    onClick={handleBackToHome}
                    variant="default"
                    size="sm"
                    className="flex-1"
                    data-testid="button-back-to-home"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Back to Home
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Plan Confirmation Dialog */}
      <Dialog open={showPlanConfirmation} onOpenChange={setShowPlanConfirmation}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader backLabel="Back to Planning">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-500" />
              Review Your Plan
            </DialogTitle>
            <DialogDescription>
              Please review the proposed plan. You can accept it or request modifications.
            </DialogDescription>
          </DialogHeader>

          {pendingPlan && (
            <div className="space-y-4 py-4">
              {/* Activity Preview */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Target className="h-5 w-5 text-emerald-500" />
                        {pendingPlan.activity?.title || "Your Activity"}
                      </CardTitle>
                      <Badge variant="outline" className="mt-2">
                        {pendingPlan.activity?.category || "General"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {pendingPlan.activity?.description || "Activity description will appear here"}
                  </p>
                </CardContent>
              </Card>

              {/* Tasks Preview */}
              {pendingPlan.tasks && pendingPlan.tasks.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ListTodo className="h-5 w-5 text-purple-500" />
                      Tasks ({pendingPlan.tasks.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pendingPlan.tasks.map((task: any, index: number) => (
                        <div key={index} className="flex gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 flex items-center justify-center text-sm font-semibold">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm">{task.title}</h4>
                              <Badge variant="outline" className="text-xs">
                                {task.priority || "medium"}
                              </Badge>
                            </div>
                            {task.description && (
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Summary & Additional Info */}
              {(pendingPlan.summary || pendingPlan.estimatedTimeframe || pendingPlan.motivationalNote) && (
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    {pendingPlan.summary && (
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Summary</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{pendingPlan.summary}</p>
                      </div>
                    )}
                    {pendingPlan.estimatedTimeframe && (
                      <div>
                        <h4 className="font-semibold text-sm mb-1 flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Estimated Time
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{pendingPlan.estimatedTimeframe}</p>
                      </div>
                    )}
                    {pendingPlan.motivationalNote && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-800 dark:text-blue-200 italic">
                          💪 {pendingPlan.motivationalNote}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleModifyPlan}
              disabled={isGenerating}
            >
              No, Make Changes
            </Button>
            <Button
              onClick={handleConfirmPlan}
              disabled={isGenerating}
              className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {isGenerating ? "Creating..." : "Yes, Create This Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan Details Dialog (after generation) */}
      <Dialog open={showPlanDetails} onOpenChange={setShowPlanDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader backLabel="Back to Planning">
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              Plan Created Successfully!
            </DialogTitle>
            <DialogDescription>
              Your activity and tasks have been added to your dashboard
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="h-8 w-8 text-green-600 dark:text-green-300" />
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              You can now view and manage your plan from the Activities tab or the home page.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPlanDetails(false)}
            >
              Continue Planning
            </Button>
            <Button
              onClick={handleBackToHome}
              className="bg-gradient-to-r from-blue-500 to-indigo-500"
            >
              <Target className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Curated Questions Dialog */}
      <Dialog open={showCuratedQuestionsDialog} onOpenChange={setShowCuratedQuestionsDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-500" />
              Let's Personalize Your Plan
            </DialogTitle>
            <DialogDescription>
              {contentSummary || "We've analyzed your content. Answer a few questions to create a personalized action plan."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {suggestedPlanTitle && (
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-sm text-purple-800 dark:text-purple-200">
                  <span className="font-medium">Suggested Plan:</span> {suggestedPlanTitle}
                </p>
              </div>
            )}

            {curatedQuestions.map((q, idx) => (
              <div key={q.id} className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 text-xs font-semibold">
                    {idx + 1}
                  </span>
                  {q.question}
                  {q.required && <span className="text-red-500">*</span>}
                </label>
                
                {q.type === 'text' && (
                  <textarea
                    className="w-full min-h-[80px] p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder={q.placeholder || "Type your answer..."}
                    value={(curatedQuestionsAnswers[q.id] as string) || ''}
                    onChange={(e) => setCuratedQuestionsAnswers(prev => ({
                      ...prev,
                      [q.id]: e.target.value
                    }))}
                    data-testid={`curated-question-${q.id}`}
                  />
                )}
                
                {q.type === 'select' && q.options && (
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={`p-3 rounded-lg border text-sm text-left transition-all ${
                          curatedQuestionsAnswers[q.id] === opt
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500'
                            : 'border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600'
                        }`}
                        onClick={() => setCuratedQuestionsAnswers(prev => ({
                          ...prev,
                          [q.id]: opt
                        }))}
                        data-testid={`curated-option-${q.id}-${opt}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
                
                {q.type === 'multiselect' && q.options && (
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt) => {
                      const selectedValues = (curatedQuestionsAnswers[q.id] as string[]) || [];
                      const isSelected = selectedValues.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          className={`p-3 rounded-lg border text-sm text-left transition-all ${
                            isSelected
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500'
                              : 'border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600'
                          }`}
                          onClick={() => {
                            setCuratedQuestionsAnswers(prev => {
                              const current = (prev[q.id] as string[]) || [];
                              const updated = isSelected
                                ? current.filter(v => v !== opt)
                                : [...current, opt];
                              return { ...prev, [q.id]: updated };
                            });
                          }}
                          data-testid={`curated-multiselect-${q.id}-${opt}`}
                        >
                          <span className="flex items-center gap-2">
                            <span className={`w-4 h-4 rounded border flex items-center justify-center ${
                              isSelected ? 'bg-purple-500 border-purple-500' : 'border-slate-300 dark:border-slate-600'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </span>
                            {opt}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCuratedQuestionsDialog(false);
                setCuratedQuestions([]);
                setCuratedQuestionsAnswers({});
                setExternalContent(null);
              }}
              disabled={generatePlanFromCuratedAnswers.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => generatePlanFromCuratedAnswers.mutate()}
              disabled={generatePlanFromCuratedAnswers.isPending || curatedQuestions.some(q => 
                q.required && !curatedQuestionsAnswers[q.id]
              )}
              className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
            >
              {generatePlanFromCuratedAnswers.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Plan...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate My Plan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* URL Action Choice Dialog */}
      <Dialog open={showUrlActionDialog} onOpenChange={setShowUrlActionDialog}>
        <DialogContent className="max-w-md" data-testid="dialog-url-action-choice">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="h-5 w-5 text-blue-500" />
              URL Content Detected
            </DialogTitle>
            <DialogDescription>
              {pendingUrlData?.isVideoContent 
                ? "This appears to be a video. What would you like to do?"
                : "We found content from this URL. What would you like to do?"}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <Button
              className="w-full justify-start gap-3 h-14"
              variant="outline"
              onClick={() => {
                setShowUrlActionDialog(false);
                if (pendingUrlData && !pendingUrlData.isVideoContent) {
                  processCuratedQuestionsFlow(pendingUrlData.content);
                }
              }}
              disabled={pendingUrlData?.isVideoContent}
              data-testid="button-create-plan-from-url"
            >
              <Sparkles className="h-5 w-5 text-purple-500" />
              <div className="text-left">
                <div className="font-medium">Create a Plan</div>
                <div className="text-xs text-muted-foreground">Generate tasks and activities from this content</div>
              </div>
            </Button>
            
            <Button
              className="w-full justify-start gap-3 h-14"
              variant="outline"
              onClick={() => saveToJournalOnlyMutation.mutate()}
              disabled={saveToJournalOnlyMutation.isPending}
              data-testid="button-save-to-journal-only"
            >
              {saveToJournalOnlyMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <BookOpen className="h-5 w-5 text-green-500" />
              )}
              <div className="text-left">
                <div className="font-medium">Save to Journal Only</div>
                <div className="text-xs text-muted-foreground">Bookmark this for later without creating tasks</div>
              </div>
            </Button>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setShowUrlActionDialog(false);
                setPendingUrlData(null);
                setExternalSourceUrl(null);
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Parsed LLM Content Dialog */}
      <Dialog open={showParsedContent} onOpenChange={setShowParsedContent}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader backLabel="Back to Planning">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              LLM Content Parsed!
            </DialogTitle>
            <DialogDescription>
              We've analyzed your pasted content and created an activity with tasks. Review and confirm to add to your dashboard.
            </DialogDescription>
          </DialogHeader>

          {parsedLLMContent && (
            <div className="space-y-4 py-4">
              {/* Activity Preview */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Target className="h-5 w-5 text-emerald-500" />
                        {parsedLLMContent.activity?.title || "New Activity"}
                      </CardTitle>
                      <Badge variant="outline" className="mt-2">
                        {parsedLLMContent.activity?.category || "General"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {parsedLLMContent.activity?.description || "Activity description"}
                  </p>
                </CardContent>
              </Card>

              {/* Tasks Preview */}
              {parsedLLMContent.tasks && parsedLLMContent.tasks.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ListTodo className="h-5 w-5 text-purple-500" />
                      Tasks ({parsedLLMContent.tasks.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {parsedLLMContent.tasks.map((task: any, index: number) => (
                        <div key={index} className="flex gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 flex items-center justify-center text-sm font-semibold">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm">{task.title}</h4>
                              <Badge variant="outline" className="text-xs">
                                {task.priority || "medium"}
                              </Badge>
                            </div>
                            {task.description && (
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Summary & Additional Info */}
              {(parsedLLMContent.summary || parsedLLMContent.estimatedTimeframe || parsedLLMContent.motivationalNote) && (
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    {parsedLLMContent.summary && (
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Summary</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{parsedLLMContent.summary}</p>
                      </div>
                    )}
                    {parsedLLMContent.estimatedTimeframe && (
                      <div>
                        <h4 className="font-semibold text-sm mb-1 flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Estimated Time
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{parsedLLMContent.estimatedTimeframe}</p>
                      </div>
                    )}
                    {parsedLLMContent.motivationalNote && (
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                        <p className="text-sm text-purple-800 dark:text-purple-200 italic">
                          ✨ {parsedLLMContent.motivationalNote}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowParsedContent(false);
                setParsedLLMContent(null);
              }}
              disabled={handleConfirmParsedContent.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleConfirmParsedContent.mutate()}
              disabled={handleConfirmParsedContent.isPending}
              className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {handleConfirmParsedContent.isPending ? "Creating..." : "Create Activity & Tasks"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}