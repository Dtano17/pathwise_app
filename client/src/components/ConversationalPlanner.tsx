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
import { Send, Sparkles, Clock, MapPin, Car, Shirt, Zap, MessageCircle, CheckCircle, ArrowRight, Brain, ArrowLeft, RefreshCcw, Target, ListTodo, Eye } from 'lucide-react';
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

type PlanningMode = 'quick' | 'chat' | null;

interface ConversationalPlannerProps {
  onClose?: () => void;
}

export default function ConversationalPlanner({ onClose }: ConversationalPlannerProps) {
  const { toast } = useToast();
  const [currentSession, setCurrentSession] = useState<PlannerSession | null>(null);
  const [message, setMessage] = useState('');
  const [contextChips, setContextChips] = useState<ContextChip[]>([]);
  const [planningMode, setPlanningMode] = useState<PlanningMode>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAgreementPrompt, setShowAgreementPrompt] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<any>(null);
  const [showPlanConfirmation, setShowPlanConfirmation] = useState(false);
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  const [showParsedContent, setShowParsedContent] = useState(false);
  const [parsedLLMContent, setParsedLLMContent] = useState<any>(null);
  const [isParsingPaste, setIsParsingPaste] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load session from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('planner_session');
    const savedMode = localStorage.getItem('planner_mode');
    const savedChips = localStorage.getItem('planner_chips');

    if (savedSession && savedMode) {
      setCurrentSession(JSON.parse(savedSession));
      setPlanningMode(savedMode as PlanningMode);
      if (savedChips) {
        setContextChips(JSON.parse(savedChips));
      }
    }
  }, []);

  // Save session to localStorage whenever it changes
  useEffect(() => {
    if (currentSession) {
      localStorage.setItem('planner_session', JSON.stringify(currentSession));
    }
    if (planningMode) {
      localStorage.setItem('planner_mode', planningMode);
    }
    if (contextChips.length > 0) {
      localStorage.setItem('planner_chips', JSON.stringify(contextChips));
    }
  }, [currentSession, planningMode, contextChips]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.conversationHistory]);

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
    mutationFn: () => apiRequest('/api/planner/session', { method: 'POST' }),
    onSuccess: (data) => {
      setCurrentSession(data.session);
      setContextChips([]);
      setShowAgreementPrompt(false);
    },
    onError: (error) => {
      console.error('Failed to start session:', error);
    }
  });

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: (messageData: { sessionId: string; message: string; mode?: string }) =>
      apiRequest('/api/planner/message', {
        method: 'POST',
        body: messageData
      }),
    onSuccess: (data) => {
      setCurrentSession(data.session);
      setContextChips(data.contextChips || []);
      setMessage('');
      
      // Handle plan creation with real task IDs
      if (data.createdTasks && data.activityCreated && data.planComplete) {
        console.log('Plan created with real tasks:', data.createdTasks);
        // Invalidate queries to refresh tasks and activities with real data
        queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
        queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
        queryClient.invalidateQueries({ queryKey: ['/api/progress'] });
        
        // Store the real task data for use in completion
        setPendingPlan({
          activity: data.activity,
          tasks: data.createdTasks,
          planComplete: true
        });
      }
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
    }
  });

  // Get plan preview before generation
  const previewPlanMutation = useMutation({
    mutationFn: (sessionId: string) =>
      apiRequest('/api/planner/preview', {
        method: 'POST',
        body: { sessionId }
      }),
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
    mutationFn: (sessionId: string) =>
      apiRequest('/api/planner/generate', {
        method: 'POST',
        body: { sessionId }
      }),
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
    setPlanningMode(mode);
    startSessionMutation.mutate();
  };

  const handleSendMessage = () => {
    if (!message.trim() || !currentSession) return;
    
    sendMessageMutation.mutate({
      sessionId: currentSession.id,
      message: message.trim(),
      mode: planningMode || undefined
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

  const handleConfirmParsedContent = useMutation({
    mutationFn: async () => {
      if (!parsedLLMContent) return;

      // Create the activity
      const activityResponse = await apiRequest('/api/activities', {
        method: 'POST',
        body: {
          ...parsedLLMContent.activity,
          status: 'planning',
          tags: [parsedLLMContent.activity.category]
        }
      });

      const activity = await activityResponse.json();

      // Create tasks with activity ID
      const tasksWithActivity = parsedLLMContent.tasks.map((task: any) => ({
        ...task,
        activityId: activity.id
      }));

      await Promise.all(
        tasksWithActivity.map((task: any) =>
          apiRequest('/api/tasks', {
            method: 'POST',
            body: task
          })
        )
      );

      return { activity, tasks: tasksWithActivity };
    },
    onSuccess: () => {
      setShowParsedContent(false);
      setParsedLLMContent(null);
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      toast({
        title: "Content Imported!",
        description: "Your LLM content has been converted into an activity with tasks",
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

  const handleStartOver = () => {
    localStorage.removeItem('planner_session');
    localStorage.removeItem('planner_mode');
    localStorage.removeItem('planner_chips');
    setCurrentSession(null);
    setPlanningMode(null);
    setContextChips([]);
    setPendingPlan(null);
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

                // Get preceding conversation context
                const precedingContext = currentSession?.conversationHistory
                  .slice(-3)
                  .map(msg => `${msg.role}: ${msg.content}`)
                  .join('\n');

                // Call the parsing API with image
                const response = await apiRequest('/api/planner/parse-llm-content', {
                  method: 'POST',
                  body: {
                    pastedContent: base64Image,
                    contentType: 'image',
                    precedingContext
                  }
                });

                setParsedLLMContent(response.parsed);
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
       pastedText.match(/\d+\./g)?.length >= 3); // Multiple numbered items

    if (looksLikeLLMContent) {
      e.preventDefault(); // Prevent default paste
      setIsParsingPaste(true);

      try {
        // Get preceding conversation context
        const precedingContext = currentSession?.conversationHistory
          .slice(-3) // Last 3 messages
          .map(msg => `${msg.role}: ${msg.content}`)
          .join('\n');

        // Call the parsing API
        const response = await apiRequest('/api/planner/parse-llm-content', {
          method: 'POST',
          body: {
            pastedContent: pastedText,
            contentType: 'text',
            precedingContext
          }
        });

        setParsedLLMContent(response.parsed);
        setShowParsedContent(true);
      } catch (error) {
        console.error('Failed to parse LLM content:', error);
        toast({
          title: "Paste Error",
          description: "Couldn't parse the pasted content. It will be added as regular text.",
          variant: "destructive"
        });
        // Fall back to regular paste
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

  const requiredSlotsFilled = contextChips.filter(chip => chip.category === 'required' && chip.filled).length;
  const totalRequiredSlots = contextChips.filter(chip => chip.category === 'required').length;
  const canGeneratePlan = totalRequiredSlots > 0 && requiredSlotsFilled >= Math.max(3, totalRequiredSlots - 1);

  // Mode selection screen
  if (!planningMode) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              How would you like to plan?
            </CardTitle>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Choose your planning style - quick and efficient, or smart and personalized
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => handleModeSelect('quick')}
              className="w-full h-20 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white border-none shadow-lg hover:shadow-xl transition-all"
              data-testid="button-quick-plan"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <Zap className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-lg">Quick Plan</div>
                    <div className="text-sm opacity-90">Fast planning with minimal questions</div>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 opacity-70" />
              </div>
            </Button>

            <Button
              onClick={() => handleModeSelect('chat')}
              className="w-full h-20 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white border-none shadow-lg hover:shadow-xl transition-all"
              data-testid="button-smart-plan"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <Brain className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-lg">Smart Plan</div>
                    <div className="text-sm opacity-90">Intuitive questions based on your profile</div>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 opacity-70" />
              </div>
            </Button>

            {onClose && (
              <Button
                onClick={onClose}
                variant="outline"
                className="w-full mt-6"
                data-testid="button-close-planner"
              >
                Close Planner
              </Button>
            )}
          </CardContent>
        </Card>
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
                      placeholder={planningMode === 'quick' ? "Tell me what you're planning... or paste a ChatGPT conversation/screenshot!" : "Chat about your plans... or paste a ChatGPT conversation/screenshot!"}
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
          <DialogHeader>
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
          <DialogHeader>
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
          <DialogHeader>
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