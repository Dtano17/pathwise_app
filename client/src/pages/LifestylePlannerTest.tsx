import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Send, Sparkles, Clock, MapPin, Car, Shirt } from 'lucide-react';

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

export default function LifestylePlannerTest() {
  const [currentSession, setCurrentSession] = useState<PlannerSession | null>(null);
  const [message, setMessage] = useState('');
  const [contextChips, setContextChips] = useState<ContextChip[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.conversationHistory]);

  // Start new session
  const startSessionMutation = useMutation({
    mutationFn: () => apiRequest('/api/planner/session', { method: 'POST' }),
    onSuccess: (data) => {
      setCurrentSession(data.session);
      setContextChips([]);
    },
    onError: (error) => {
      console.error('Failed to start session:', error);
    }
  });

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: (messageData: { sessionId: string; message: string }) =>
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
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: (error) => {
      console.error('Failed to generate plan:', error);
      setIsGenerating(false);
    }
  });

  const handleSendMessage = () => {
    if (!message.trim() || !currentSession) return;
    
    sendMessageMutation.mutate({
      sessionId: currentSession.id,
      message: message.trim()
    });
  };

  const handleGeneratePlan = () => {
    if (!currentSession) return;
    setIsGenerating(true);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              <Sparkles className="inline h-8 w-8 mr-2" />
              Conversational Lifestyle Planner
            </CardTitle>
            <p className="text-slate-600 dark:text-slate-400">
              Chat with Claude to plan your perfect day, outfit, and activities
            </p>
          </CardHeader>
        </Card>

        {/* Context Chips */}
        {contextChips.length > 0 && (
          <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">Planning Context</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {contextChips.map((chip, index) => (
                  <Badge
                    key={index}
                    variant={chip.filled ? "default" : "outline"}
                    className={`flex items-center gap-2 px-3 py-2 ${
                      chip.category === 'required' 
                        ? chip.filled 
                          ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-100' 
                          : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-100'
                        : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-100'
                    }`}
                    data-testid={`chip-${chip.label.toLowerCase()}`}
                  >
                    {getChipIcon(chip.label)}
                    <span className="font-medium">{chip.label}:</span>
                    <span>{chip.value}</span>
                  </Badge>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Required context: {requiredSlotsFilled}/{totalRequiredSlots} completed
                </p>
                {canGeneratePlan && (
                  <Button
                    onClick={handleGeneratePlan}
                    disabled={isGenerating}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                    data-testid="button-generate-plan"
                  >
                    {isGenerating ? 'Generating...' : 'Generate Plan'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chat Interface */}
        <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur">
          <CardContent className="p-0">
            {/* Messages */}
            <ScrollArea className="h-96 p-6">
              {!currentSession ? (
                <div className="text-center py-12">
                  <Sparkles className="h-16 w-16 mx-auto text-blue-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Ready to Plan Something Amazing?</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    Start a conversation and I'll help you plan the perfect experience with outfit suggestions, timing, and more!
                  </p>
                  <Button
                    onClick={() => startSessionMutation.mutate()}
                    disabled={startSessionMutation.isPending}
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                    data-testid="button-start-session"
                  >
                    {startSessionMutation.isPending ? 'Starting...' : 'Start Planning'}
                  </Button>
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
                        className={`max-w-[70%] p-4 rounded-xl ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
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
                          <span className="text-sm text-slate-600 dark:text-slate-400">Thinking...</span>
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
              <div className="border-t p-4">
                <div className="flex gap-3">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    disabled={sendMessageMutation.isPending}
                    className="flex-1"
                    data-testid="input-message"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!message.trim() || sendMessageMutation.isPending}
                    size="icon"
                    data-testid="button-send-message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Status */}
        {currentSession && (
          <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`h-3 w-3 rounded-full ${
                    currentSession.sessionState === 'completed' ? 'bg-green-500' :
                    currentSession.sessionState === 'planning' ? 'bg-blue-500' :
                    currentSession.sessionState === 'confirming' ? 'bg-yellow-500' :
                    'bg-slate-400'
                  }`} />
                  <span className="text-sm font-medium">
                    Status: {currentSession.sessionState === 'completed' ? 'Plan Complete!' : `${currentSession.sessionState}`}
                  </span>
                </div>
                {currentSession.isComplete && (
                  <Button
                    onClick={() => startSessionMutation.mutate()}
                    variant="outline"
                    size="sm"
                    data-testid="button-new-session"
                  >
                    Start New Session
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}