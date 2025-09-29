import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Mic, MicOff, Send, Sparkles, Copy, Plus, Upload, Image, MessageCircle, NotebookPen, User, Zap, Brain, ArrowLeft } from 'lucide-react';
// Using simple avatar placeholder instead of imported icon

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

type ConversationMode = 'quick' | 'smart' | null;

interface VoiceInputProps {
  onSubmit: (data: any) => void;
  isGenerating?: boolean;
  placeholder?: string;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onSubmit, isGenerating = false, placeholder = "Tell me what you'd like to accomplish..." }) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [inputKey, setInputKey] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMode, setCurrentMode] = useState<ConversationMode>(null);
  const [showCreatePlanButton, setShowCreatePlanButton] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Auto scroll to bottom when new messages arrive and user is near bottom
  useEffect(() => {
    if (isNearBottom && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isNearBottom]);

  // Track scroll position to determine if user is near bottom
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = chatContainer;
      const threshold = 100;
      const nearBottom = scrollTop + clientHeight >= scrollHeight - threshold;
      setIsNearBottom(nearBottom);
    };

    chatContainer.addEventListener('scroll', handleScroll);
    const { scrollTop, scrollHeight, clientHeight } = chatContainer;
    const threshold = 100;
    const nearBottom = scrollTop + clientHeight >= scrollHeight - threshold;
    setIsNearBottom(nearBottom);
    return () => chatContainer.removeEventListener('scroll', handleScroll);
  }, [currentMode, chatMessages.length]);

  // Voice recording functionality
  const startRecording = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onstart = () => {
        setIsRecording(true);
        setIsListening(true);
      };
      
      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setText(prev => prev + finalTranscript);
        }
      };
      
      recognitionRef.current.onerror = () => {
        setIsRecording(false);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsRecording(false);
        setIsListening(false);
      };
      
      recognitionRef.current.start();
    } else {
      // Fallback for demo
      setIsRecording(true);
      setIsListening(true);
      setTimeout(() => {
        setText("I want to work out more, take my vitamins daily, and get some sunlight this weekend");
        setIsRecording(false);
        setIsListening(false);
      }, 2000);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setIsListening(false);
  };

  // Chat mutation for dialogue-based interaction
  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const conversationHistory = chatMessages.map(msg => ({ role: msg.role, content: msg.content }));
      const response = await apiRequest('POST', '/api/chat/conversation', {
        message,
        conversationHistory,
        mode: currentMode
      });
      return response.json();
    },
    onMutate: (message: string) => {
      // Add user message immediately
      const userMessage: ChatMessage = {
        role: 'user',
        content: message,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, userMessage]);
    },
    onSuccess: (data) => {
      // Add AI response
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiMessage]);
      
      // Handle Smart Plan specific responses
      if (data.showCreatePlanButton) {
        setShowCreatePlanButton(true);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Create plan mutation
  const createPlanMutation = useMutation({
    mutationFn: async () => {
      const conversationHistory = chatMessages.map(msg => ({ role: msg.role, content: msg.content }));
      const response = await apiRequest('POST', '/api/chat/conversation', {
        message: "Yes, create the plan!",
        conversationHistory,
        mode: currentMode
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Handle successful plan creation
      if (data.activityId) {
        toast({
          title: "Success!",
          description: "Your action plan has been created!",
        });
        // Reset conversation and redirect or refresh
        setChatMessages([]);
        setCurrentMode(null);
        setShowCreatePlanButton(false);
        queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create plan. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleCreatePlan = () => {
    createPlanMutation.mutate();
  };

  const startConversationWithMode = (mode: 'quick' | 'smart') => {
    setCurrentMode(mode);
    // Don't immediately switch to chat mode - let user type first
    setShowCreatePlanButton(false);
  };

  const handleSubmit = () => {
    if (!text.trim()) return;
    
    // If in conversation mode, start the chat dialogue
    if (currentMode) {
      const welcomeMessage: ChatMessage = {
        role: 'assistant',
        content: currentMode === 'quick' 
          ? "Quick Plan Mode activated! Tell me what you want to accomplish and I'll help you create a plan quickly."
          : "Smart Plan Mode activated! I'll ask you detailed questions to create a comprehensive action plan. What would you like to achieve?",
        timestamp: new Date()
      };
      setChatMessages([welcomeMessage]);
      // Then send the user's initial message
      chatMutation.mutate(text.trim());
      setText('');
      return;
    }
    
    // Normal plan creation mode
    onSubmit(text.trim());
    setText('');
    setUploadedImages([]);
    setInputKey(prev => prev + 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (currentMode && chatMessages.length === 0) {
        // Start conversation with welcome message (same as submit button)
        handleSubmit();
      } else if (currentMode) {
        if (text.trim() && !chatMutation.isPending) {
          chatMutation.mutate(text.trim());
          setText('');
        }
      } else if (!isGenerating) {
        handleSubmit();
      }
    }
  };

  // If in conversation mode, show full-screen chat interface
  if (currentMode && chatMessages.length > 0) {
    return (
      <div className="flex flex-col min-h-[100dvh] w-full bg-background">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-[999]">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setChatMessages([]);
                setCurrentMode(null);
                setShowCreatePlanButton(false);
              }}
              className="h-8 w-8"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <NotebookPen className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-semibold text-sm">JournalMate</h2>
                <Badge variant="secondary" className={`text-xs flex items-center gap-1 ${currentMode === 'quick' 
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' 
                  : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'}`}>
                  {currentMode === 'quick' ? (
                    <>
                      <Zap className="w-3 h-3" />
                      Quick Plan
                    </>
                  ) : (
                    <>
                      <Brain className="w-3 h-3" />
                      Smart Plan
                    </>
                  )}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto" ref={chatContainerRef}>
          <div className="max-w-4xl mx-auto p-4 space-y-6">
            {chatMessages.map((message, index) => (
              <div key={index} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="flex-shrink-0">
                  {message.role === 'assistant' ? (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <NotebookPen className="w-3 h-3 sm:w-4 sm:h-4" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs sm:text-sm font-medium">
                      U
                    </div>
                  )}
                </div>
                <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 ${
                  message.role === 'user' 
                    ? currentMode === 'quick' 
                      ? 'bg-emerald-500 text-white'
                      : 'bg-purple-500 text-white'
                    : 'bg-muted text-foreground'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                  <div className={`text-xs mt-2 opacity-70 ${
                    message.role === 'user' ? 'text-white/70' : 'text-muted-foreground'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Chat Input */}
        <div className="border-t border-border p-4 bg-background/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  className="min-h-[50px] max-h-[120px] resize-none pr-12 rounded-2xl border-border text-sm"
                  rows={1}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (text.trim() && !chatMutation.isPending) {
                      chatMutation.mutate(text.trim());
                      setText('');
                    }
                  }}
                  disabled={!text.trim() || chatMutation.isPending}
                  className="absolute right-2 bottom-2 h-8 w-8 rounded-full"
                  data-testid="button-send-message"
                >
                  {chatMutation.isPending ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                    />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Create Plan Button */}
            {showCreatePlanButton && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex justify-center"
              >
                <Button
                  onClick={handleCreatePlan}
                  disabled={createPlanMutation.isPending}
                  className={`gap-2 ${
                    currentMode === 'quick'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                  size="lg"
                  data-testid="button-create-plan"
                >
                  {createPlanMutation.isPending ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      />
                      Creating Plan...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Create My Action Plan
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Normal goal input interface
  return (
    <div className="w-full max-w-2xl mx-auto p-2 sm:p-3 lg:p-6">
      <motion.div 
        key={inputKey}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col space-y-2 sm:space-y-4 lg:space-y-6"
      >
        {/* Voice Input Card */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="space-y-2 sm:space-y-4">
              {/* Main content container */}
              <div className="flex flex-col space-y-2 sm:space-y-4">
                {/* Goal input section */}
                <div className="space-y-2 sm:space-y-3">
                  <div className="relative">
                    <Textarea
                      ref={textareaRef}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={placeholder}
                      className="min-h-[80px] sm:min-h-[100px] lg:min-h-[120px] resize-none pr-20 text-sm sm:text-base"
                      rows={3}
                      data-testid="textarea-goal-input"
                    />
                    {/* Integrated controls inside textarea */}
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 opacity-60 hover:opacity-100 transition-opacity"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isGenerating}
                        data-testid="button-upload"
                      >
                        <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        variant={isRecording ? "default" : "ghost"}
                        size="icon"
                        className={`h-7 w-7 sm:h-8 sm:w-8 transition-opacity ${
                          isRecording ? '' : 'opacity-60 hover:opacity-100'
                        }`}
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isGenerating}
                        data-testid="button-voice-record"
                      >
                        {isRecording ? (
                          <MicOff className="h-3 w-3 sm:h-4 sm:w-4" />
                        ) : (
                          <Mic className="h-3 w-3 sm:h-4 sm:w-4" />
                        )}
                      </Button>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setUploadedImages(prev => [...prev, ...files]);
                      }}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />
                  </div>

                  {/* Compact recording status */}
                  <AnimatePresence>
                    {isRecording && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-1"
                      >
                        <div className="flex gap-0.5">
                          <div className="w-0.5 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                          <div className="w-0.5 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                          <div className="w-0.5 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-xs">{isListening ? "Listening..." : "Processing..."}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Action buttons row */}
                <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Conversational Mode Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant={currentMode === 'quick' ? 'default' : 'outline'}
                      size="default"
                      onClick={() => startConversationWithMode('quick')}
                      className={`flex-1 sm:flex-none gap-1 sm:gap-2 ${
                        currentMode === 'quick'
                          ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 toggle-elevated'
                          : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950'
                      }`}
                      data-testid="button-quick-plan"
                    >
                      <Zap className="w-3 h-3" />
                      <span className="text-xs sm:text-sm">Quick Plan</span>
                    </Button>
                    <Button
                      variant={currentMode === 'smart' ? 'default' : 'outline'}
                      size="default"
                      onClick={() => startConversationWithMode('smart')}
                      className={`flex-1 sm:flex-none gap-1 sm:gap-2 ${
                        currentMode === 'smart'
                          ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700 toggle-elevated'
                          : 'text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-950'
                      }`}
                      data-testid="button-smart-plan"
                    >
                      <Brain className="w-3 h-3" />
                      <span className="hidden sm:inline text-xs sm:text-sm">Smart Plan</span>
                      <span className="sm:hidden text-xs sm:text-sm">Smart</span>
                    </Button>
                  </div>
                  
                  <Button
                    onClick={handleSubmit}
                    disabled={!text.trim() || isGenerating}
                    className="gap-1 sm:gap-2 w-full sm:w-auto"
                    data-testid="button-submit"
                  >
                    {isGenerating ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1 }}
                          className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full"
                        />
                        <span className="hidden sm:inline">Generating Plan...</span>
                        <span className="sm:hidden">Generating...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        {currentMode ? (
                          <>
                            <span className="hidden sm:inline">
                              Start {currentMode === 'quick' ? 'Quick Plan' : 'Smart Plan'}
                            </span>
                            <span className="sm:hidden">
                              Start {currentMode === 'quick' ? 'Quick' : 'Smart'}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="hidden sm:inline">Create Action Plan</span>
                            <span className="sm:hidden">Create Plan</span>
                          </>
                        )}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default VoiceInput;