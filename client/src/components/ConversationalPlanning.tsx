import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Mic, 
  MicOff, 
  Send, 
  Sparkles, 
  Bot,
  User,
  MessageCircle,
  CheckCircle,
  Target,
  Lightbulb
} from "lucide-react";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actionPlan?: any;
  extractedGoals?: string[];
  tasks?: any[];
}

interface ConversationalPlanningProps {
  onPlanGenerated?: (result: any) => void;
  isGenerating?: boolean;
  setIsGenerating?: (generating: boolean) => void;
}

export function ConversationalPlanning({ 
  onPlanGenerated, 
  isGenerating = false, 
  setIsGenerating 
}: ConversationalPlanningProps) {
  const [currentMessage, setCurrentMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your AI planning assistant. 👋 I'm here to help you turn your intentions into actionable plans. What goals or aspirations are you thinking about today?",
      timestamp: new Date()
    }
  ]);
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const { toast } = useToast();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        
        setCurrentMessage(transcript);
      };

      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => {
        setIsListening(false);
        setIsRecording(false);
      };
    }
  }, []);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const conversationHistory = chatHistory
        .filter(msg => msg.role !== 'assistant' || !msg.content.includes("Would you like me to help you create a structured action plan"))
        .map(msg => ({ role: msg.role, content: msg.content }));
      
      const response = await apiRequest('POST', '/api/chat/conversation', {
        message,
        conversationHistory
      });
      return response.json();
    },
    onMutate: () => {
      if (setIsGenerating) setIsGenerating(true);
      
      // Add user message immediately
      const userMessage: ChatMessage = {
        role: 'user',
        content: currentMessage,
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, userMessage]);
      setCurrentMessage("");
    },
    onSuccess: (data) => {
      if (setIsGenerating) setIsGenerating(false);
      
      // Add AI response
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        actionPlan: data.actionPlan,
        extractedGoals: data.extractedGoals,
        tasks: data.tasks
      };
      
      setChatHistory(prev => [...prev, aiMessage]);
      
      // If the AI detected goals and suggests action plan, show the option
      if (data.extractedGoals || data.message.includes("action plan")) {
        // Auto-scroll to show the suggestion
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    },
    onError: (error: any) => {
      if (setIsGenerating) setIsGenerating(false);
      
      toast({
        title: "Chat Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSendMessage = () => {
    if (!currentMessage.trim() || isGenerating) return;
    chatMutation.mutate(currentMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startRecording = () => {
    if (recognitionRef.current) {
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const createActionPlan = async () => {
    if (!chatHistory.length) return;
    
    // Extract the conversation context for goal processing
    const conversationText = chatHistory
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .join(' ');
    
    if (onPlanGenerated) {
      // Use the existing goal processing mutation 
      try {
        if (setIsGenerating) setIsGenerating(true);
        
        const response = await apiRequest('POST', '/api/goals', {
          text: conversationText,
          category: 'planning',
          priority: 'medium'
        });
        const result = await response.json();
        
        onPlanGenerated(result);
        
        // Add a success message to chat
        const successMessage: ChatMessage = {
          role: 'assistant',
          content: `🎉 Perfect! I've created your action plan with ${result.tasks?.length || 0} specific tasks. You can see them in the Tasks tab. Each task includes context and time estimates to help you stay on track!`,
          timestamp: new Date()
        };
        setChatHistory(prev => [...prev, successMessage]);
        
      } catch (error) {
        console.error('Action plan creation error:', error);
        toast({
          title: "Planning Error",
          description: "Failed to create action plan. Please try again.",
          variant: "destructive",
        });
      } finally {
        if (setIsGenerating) setIsGenerating(false);
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto h-full flex flex-col">
      {/* Chat Header */}
      <div className="bg-card border border-card-border rounded-t-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-emerald-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-card-foreground flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              AI Planning Assistant
            </h3>
            <p className="text-xs text-muted-foreground">Let's turn your intentions into actionable plans</p>
          </div>
          <div className="ml-auto">
            <Badge variant="outline" className="text-xs gap-1">
              <Sparkles className="w-3 h-3" />
              Conversational
            </Badge>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 bg-card border-x border-card-border p-4 overflow-y-auto max-h-96 min-h-[300px]">
        <div className="space-y-4">
          {chatHistory.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              
              <div className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user' 
                  ? 'bg-primary text-primary-foreground ml-auto' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {/* Show action plan suggestion */}
                {message.role === 'assistant' && (message.extractedGoals || message.content.includes("action plan")) && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <Button 
                      onClick={createActionPlan}
                      size="sm" 
                      className="gap-2"
                      disabled={isGenerating}
                    >
                      <Target className="w-3 h-3" />
                      Create Action Plan
                    </Button>
                  </div>
                )}
                
                <div className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </motion.div>
          ))}
          
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 justify-start"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-emerald-500 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-muted-foreground">Thinking...</span>
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-card border border-card-border rounded-b-lg p-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Textarea
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Share your goals, ask questions, or describe what you want to achieve..."
              className="min-h-[60px] pr-12 resize-none"
              disabled={isGenerating}
            />
            
            <div className="absolute bottom-2 right-2">
              <AnimatePresence>
                {isRecording ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="flex items-center gap-2"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="w-2 h-2 bg-red-500 rounded-full"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={stopRecording}
                      className="h-8 w-8"
                    >
                      <MicOff className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ) : (
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={startRecording}
                    className="h-8 w-8"
                    disabled={isGenerating}
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={!currentMessage.trim() || isGenerating}
            className="gap-2 h-auto"
          >
            {isGenerating ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full"
                />
                Thinking...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send
              </>
            )}
          </Button>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <div className="text-sm text-muted-foreground">
            {isListening && "🎤 Listening..."}
          </div>
          <div className="text-xs text-muted-foreground">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
}