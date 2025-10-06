import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mic, MicOff, Send, User, Bot, Sparkles, Target, ListTodo, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface LiveChatInterfaceProps {
  onActionPlanSuggested?: (response: any) => void;
  placeholder?: string;
}

export default function LiveChatInterface({ 
  onActionPlanSuggested,
  placeholder = "Share your goals and intentions... I'm here to help you plan!" 
}: LiveChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showParsedContent, setShowParsedContent] = useState(false);
  const [parsedLLMContent, setParsedLLMContent] = useState<any>(null);
  const [isParsingPaste, setIsParsingPaste] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const chatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const conversationHistory = conversation.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await apiRequest('POST', '/api/chat/conversation', {
        message: userMessage,
        conversationHistory
      });
      return response.json();
    },
    onMutate: (userMessage: string) => {
      // Add user message immediately
      const userMsg: ChatMessage = {
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString()
      };
      setConversation(prev => [...prev, userMsg]);
      setMessage('');
    },
    onSuccess: (data: any) => {
      // Add AI response
      const aiMsg: ChatMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString()
      };
      setConversation(prev => [...prev, aiMsg]);

      // Handle action plan suggestions
      if (data.extractedGoals && data.extractedGoals.length > 0) {
        onActionPlanSuggested?.(data);
      }
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.message || "I'm having trouble responding right now. Please try again.";
      
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date().toISOString()
      };
      setConversation(prev => [...prev, errorMsg]);

      toast({
        title: "Chat Error",
        description: "There was an issue processing your message.",
        variant: "destructive",
      });
    }
  });

  const startVoiceRecording = () => {
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
          setMessage(prev => prev + finalTranscript);
        }
      };
      
      recognitionRef.current.onerror = () => {
        setIsRecording(false);
        setIsListening(false);
        toast({
          title: "Voice Recognition Error",
          description: "Could not access microphone. Please type your message instead.",
          variant: "destructive",
        });
      };
      
      recognitionRef.current.onend = () => {
        setIsRecording(false);
        setIsListening(false);
      };
      
      recognitionRef.current.start();
    } else {
      toast({
        title: "Voice Not Supported",
        description: "Voice recognition is not supported in this browser.",
        variant: "destructive",
      });
    }
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setIsListening(false);
  };

  const handleSubmit = () => {
    if (message.trim() && !chatMutation.isPending) {
      chatMutation.mutate(message.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const clearConversation = () => {
    setConversation([]);
    setMessage('');
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
                const chatContext = conversation
                  .slice(-3)
                  .map(msg => `${msg.role}: ${msg.content}`)
                  .join('\n');

                const precedingContext = userTypedContext
                  ? `User's context: ${userTypedContext}\n\n${chatContext}`
                  : chatContext;

                // Call the parsing API with image
                const response = await apiRequest('/api/planner/parse-llm-content', {
                  method: 'POST',
                  body: {
                    pastedContent: base64Image,
                    contentType: 'image',
                    precedingContext
                  }
                });

                setMessage(''); // Clear typed text since it's now part of context

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

    // Check if this looks like LLM-generated content
    const looksLikeLLMContent =
      pastedText.length > 200 &&
      (pastedText.includes('Step') ||
       pastedText.includes('1.') ||
       pastedText.includes('**') ||
       pastedText.includes('###') ||
       pastedText.match(/\d+\./g)?.length >= 3);

    if (looksLikeLLMContent) {
      e.preventDefault();
      setIsParsingPaste(true);

      try {
        // Combine current input text with conversation history for full context
        const userTypedContext = message.trim();
        const chatContext = conversation
          .slice(-3)
          .map(msg => `${msg.role}: ${msg.content}`)
          .join('\n');

        const precedingContext = userTypedContext
          ? `User's context: ${userTypedContext}\n\n${chatContext}`
          : chatContext;

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

  const handleConfirmParsedContent = useMutation({
    mutationFn: async () => {
      if (!parsedLLMContent) return;

      const activityResponse = await apiRequest('/api/activities', {
        method: 'POST',
        body: {
          ...parsedLLMContent.activity,
          status: 'planning',
          tags: [parsedLLMContent.activity.category]
        }
      });

      const activity = await activityResponse.json();

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

  return (
    <div className="w-full h-full flex flex-col" data-testid="live-chat-interface">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {conversation.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Bot className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
            <p>I'm here to help you turn your goals into actionable plans!</p>
          </div>
        ) : (
          conversation.map((msg, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
              data-testid={`message-${msg.role}-${index}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              
              <Card className={`max-w-[70%] ${
                msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-card'
              }`}>
                <CardContent className="p-3">
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <span className={`text-xs mt-2 block ${
                    msg.role === 'user' 
                      ? 'text-primary-foreground/70' 
                      : 'text-muted-foreground'
                  }`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </CardContent>
              </Card>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))
        )}
        
        {chatMutation.isPending && (
          <div className="flex items-start gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <Card className="bg-card">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t p-4 bg-background">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              onPaste={handlePaste}
              placeholder={placeholder}
              className="min-h-[60px] max-h-[120px] resize-none"
              disabled={chatMutation.isPending || isParsingPaste}
              data-testid="input-chat-message"
            />
            {isParsingPaste && (
              <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center rounded-md">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  <span>Analyzing pasted content...</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-2">
            <Button
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              variant={isRecording ? "destructive" : "outline"}
              size="icon"
              className="w-12 h-12"
              disabled={chatMutation.isPending}
              data-testid="button-voice-input"
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            
            <Button
              onClick={handleSubmit}
              disabled={!message.trim() || chatMutation.isPending}
              size="icon"
              className="w-12 h-12"
              data-testid="button-send-message"
            >
              {chatMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
        
        {conversation.length > 0 && (
          <div className="flex justify-between items-center mt-3">
            <span className="text-xs text-muted-foreground">
              Press Enter to send, Shift+Enter for new line
            </span>
            <Button
              onClick={clearConversation}
              variant="ghost"
              size="sm"
              data-testid="button-clear-conversation"
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Parsed LLM Content Dialog */}
      <Dialog open={showParsedContent} onOpenChange={setShowParsedContent}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" backLabel="Back to Chat">
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