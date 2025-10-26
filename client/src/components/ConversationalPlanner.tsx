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
import { Send, Sparkles, Clock, MapPin, Car, Shirt, Zap, MessageCircle, CheckCircle, ArrowRight, Brain, ArrowLeft, RefreshCcw, Target, ListTodo, Eye, FileText, Camera, Upload, Image as ImageIcon, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

type PlanningMode = 'quick' | 'chat' | 'direct' | 'journal' | null;

interface ConversationalPlannerProps {
  onClose?: () => void;
  initialMode?: PlanningMode;
}

export default function ConversationalPlanner({ onClose, initialMode }: ConversationalPlannerProps) {
  const { toast } = useToast();
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
  
  // Autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteSearch, setAutocompleteSearch] = useState('');
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  
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

  // Send message - using simple conversational planner
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { message: string; mode: 'quick' | 'smart' }) => {
      const response = await apiRequest('POST', '/api/chat/conversation', {
        message: messageData.message,
        conversationHistory: currentSession?.conversationHistory || [],
        mode: messageData.mode
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Simple planner returns: { message, extractedInfo, readyToGenerate, plan?, domain? }
      // Update conversation history
      const newMessage: ConversationMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };
      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString()
      };
      
      const updatedHistory = [
        ...(currentSession?.conversationHistory || []),
        newMessage,
        assistantMessage
      ];
      
      // Update session state
      setCurrentSession({
        ...currentSession,
        id: currentSession?.id || 'temp-' + Date.now(),
        conversationHistory: updatedHistory,
        slots: { ...currentSession?.slots, ...data.extractedInfo },
        sessionState: data.readyToGenerate ? 'confirming' : 'gathering',
        isComplete: false
      } as PlannerSession);
      
      setMessage('');
      
      // If plan is ready, show it for confirmation
      if (data.readyToGenerate && data.plan) {
        setPendingPlan(data.plan);
        setShowPlanConfirmation(true);
      }
      
      // Handle completed plan creation
      if (data.activityCreated && data.createdTasks) {
        queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
        queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
        queryClient.invalidateQueries({ queryKey: ['/api/progress'] });
      }
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
      toast({
        title: "Error",
        description: "Failed to process message. Please try again.",
        variant: "destructive"
      });
    }
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
      setCurrentSession(data.session);
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
    // Clear any old localStorage data to ensure fresh start
    localStorage.removeItem('planner_session');
    localStorage.removeItem('planner_mode');
    localStorage.removeItem('planner_chips');
    
    setPlanningMode(mode);
    setContextChips([]); // Clear any old context chips
    
    // Simple planner doesn't need upfront session creation
    // Session will be created on first message
    setCurrentSession({
      id: 'temp-' + Date.now(),
      sessionState: 'gathering',
      conversationHistory: [],
      slots: {},
      isComplete: false
    } as PlannerSession);
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;
    if (!planningMode || (planningMode !== 'quick' && planningMode !== 'smart')) return;
    
    sendMessageMutation.mutate({
      message: message.trim(),
      mode: planningMode
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

  // Journal Mode submitJournalEntry mutation
  const submitJournalEntry = useMutation({
    mutationFn: async () => {
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
        media: uploadedMedia
      });
      return response.json();
    },
    onSuccess: (data) => {
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
      setDetectedCategory(
        data.categories && data.categories.length > 0 
          ? data.categories[0] 
          : data.category
      );
      setIsUploadingJournal(false);
      
      // Refresh journal data - PersonalJournal uses /api/user-preferences
      queryClient.invalidateQueries({ queryKey: ['/api/user-preferences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/journal/entries'] });
      refetchJournalEntries();
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
      handleSendMessage();
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

    // Only auto-save if there's meaningful text (at least 10 characters)
    if (text.trim().length >= 10) {
      setIsSavingJournal(true);
      autoSaveTimeoutRef.current = setTimeout(async () => {
        try {
          // Auto-save journal entry
          const response = await apiRequest('POST', '/api/journal/smart-entry', {
            text: text.trim(),
            media: []
          });
          const data = await response.json();
          
          if (data.success) {
            setIsSavingJournal(false);
            
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
            <div className="flex items-center gap-2">
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
                data-testid="button-refresh-journal"
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => {
                  localStorage.removeItem('planner_session');
                  localStorage.removeItem('planner_mode');
                  localStorage.removeItem('planner_chips');
                  setJournalText('');
                  setJournalMedia([]);
                  if (onClose) {
                    onClose();
                  }
                }}
                variant="ghost"
                size="sm"
                data-testid="button-exit-journal"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
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
                  <CardTitle className="text-base">Quick Capture</CardTitle>
                  {isSavingJournal && (
                    <Badge variant="secondary" className="text-xs animate-pulse">
                      <RefreshCcw className="h-3 w-3 mr-1 animate-spin" />
                      Auto-saving...
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs">
                  Type freely. Use @keywords like @restaurants, @travel, @music for smart categorization
                </CardDescription>
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
            </div>

            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
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
                Upload Photos/Videos ({journalMedia.length} selected)
              </Button>
              
              {journalMedia.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {journalMedia.map((file, idx) => (
                    <div key={idx} className="relative">
                      <Badge variant="secondary" className="pr-6">
                        {file.type.startsWith('video/') ? '🎥' : '📷'} {file.name.slice(0, 15)}...
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
                    Your journal is waiting for its first entry.
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Start typing above to capture your thoughts!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
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
                {currentSession.conversationHistory.map((msg, index) => (
                  <div
                    key={index}
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
                ))}
                
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
              <div className="p-4">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      onPaste={handlePaste}
                      placeholder={planningMode === 'quick' ? "Describe your goals and/or journal your life... or paste a ChatGPT conversation/screenshot!" : "Describe your goals and/or journal your life... or paste a ChatGPT conversation/screenshot!"}
                      disabled={sendMessageMutation.isPending || isParsingPaste}
                      className="w-full"
                      data-testid="input-message"
                    />
                    {isParsingPaste && (
                      <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center rounded-md">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <Sparkles className="h-4 w-4 animate-pulse" />
                          <span>Analyzing pasted content...</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!message.trim() || sendMessageMutation.isPending}
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