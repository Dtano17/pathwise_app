import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Send, Sparkles, Clock, MapPin, Car, Shirt, Zap, MessageCircle, CheckCircle, ArrowRight } from 'lucide-react';

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
}

type PlanningMode = 'quick' | 'chat' | null;

interface ConversationalPlannerProps {
  onClose?: () => void;
}

export default function ConversationalPlanner({ onClose }: ConversationalPlannerProps) {
  const [currentSession, setCurrentSession] = useState<PlannerSession | null>(null);
  const [message, setMessage] = useState('');
  const [contextChips, setContextChips] = useState<ContextChip[]>([]);
  const [planningMode, setPlanningMode] = useState<PlanningMode>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAgreementPrompt, setShowAgreementPrompt] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
    }
  });

  // Generate plan
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
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: (error) => {
      console.error('Failed to generate plan:', error);
      setIsGenerating(false);
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
    generatePlanMutation.mutate(currentSession.id);
  };

  const handleChatGenerate = () => {
    if (!currentSession) return;
    setIsGenerating(true);
    setShowAgreementPrompt(false);
    generatePlanMutation.mutate(currentSession.id);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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
              Choose your planning style - quick and efficient, or detailed and collaborative
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
              className="w-full h-20 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border-none shadow-lg hover:shadow-xl transition-all"
              data-testid="button-chat-plan"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <MessageCircle className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-lg">Chat Mode</div>
                    <div className="text-sm opacity-90">Detailed conversation and confirmation</div>
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
                  : 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
              }`}>
                {planningMode === 'quick' ? <Zap className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
              </div>
              <div>
                <h3 className="font-semibold">
                  {planningMode === 'quick' ? 'Quick Plan' : 'Chat Mode'}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {planningMode === 'quick' 
                    ? 'Fast planning with smart suggestions'
                    : 'Detailed conversation with confirmation'
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
                    : 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                }`}>
                  {planningMode === 'quick' ? <Zap className="h-8 w-8" /> : <MessageCircle className="h-8 w-8" />}
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {planningMode === 'quick' ? 'Quick Planning Ready!' : 'Let\'s Chat About Your Plans!'}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  {planningMode === 'quick'
                    ? 'I\'ll ask a few key questions and generate your plan quickly.'
                    : 'I\'ll ask detailed questions and wait for your confirmation before generating the plan.'
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
                            : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
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
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={planningMode === 'quick' ? "Tell me what you're planning..." : "Chat about your plans..."}
                    disabled={sendMessageMutation.isPending}
                    className="flex-1"
                    data-testid="input-message"
                  />
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
          
          {/* Completion State */}
          {currentSession?.isComplete && (
            <>
              <Separator />
              <div className="p-4">
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                  <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-3">
                    Plan Generated Successfully!
                  </p>
                  <Button
                    onClick={() => {
                      setPlanningMode(null);
                      setCurrentSession(null);
                      setContextChips([]);
                      setShowAgreementPrompt(false);
                    }}
                    variant="outline"
                    size="sm"
                    data-testid="button-new-plan"
                  >
                    Create New Plan
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}