import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mic, MicOff, Send, Sparkles, Copy, Plus, Upload, Image, MessageCircle, Bot, User, ChevronUp, ChevronDown, Minimize2, Maximize2, Zap, Brain } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import journalMateIcon from "@assets/journalmate-icon.png";

// TypeScript declarations for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface VoiceInputProps {
  onSubmit: (text: string) => void;
  isGenerating?: boolean;
  placeholder?: string;
}

// Enhanced message formatter component
const FormattedMessage: React.FC<{ content: string }> = ({ content }) => {
  const formatContent = (text: string) => {
    const lines = text.split('\n');
    const formatted: React.ReactNode[] = [];
    let currentList: React.ReactNode[] = [];
    let listType: 'numbered' | 'bulleted' | null = null;
    
    lines.forEach((line, index) => {
      // Skip empty lines but preserve spacing
      if (line.trim() === '') {
        if (currentList.length > 0) {
          formatted.push(
            <div key={`list-${index}`} className="my-4">
              {listType === 'numbered' ? (
                <ol className="space-y-3 ml-4">{currentList}</ol>
              ) : (
                <ul className="space-y-3 ml-4">{currentList}</ul>
              )}
            </div>
          );
          currentList = [];
          listType = null;
        }
        formatted.push(<div key={`space-${index}`} className="h-3" />);
        return;
      }
      
      // Check for numbered list items (1. 2. etc.)
      const numberedMatch = line.match(/^(\d+)\.\s*\*\*(.*?)\*\*:?\s*(.*)/);
      if (numberedMatch) {
        const [, number, title, description] = numberedMatch;
        if (listType !== 'numbered') {
          if (currentList.length > 0) {
            formatted.push(
              <div key={`prev-list-${index}`} className="my-4">
                {listType === 'bulleted' ? (
                  <ul className="space-y-3 ml-4">{currentList}</ul>
                ) : null}
              </div>
            );
          }
          currentList = [];
          listType = 'numbered';
        }
        
        currentList.push(
          <li key={`item-${index}`} className="flex gap-3 items-start">
            <div className="bg-gradient-to-br from-purple-500 to-emerald-500 text-white text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
              {number}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground mb-1 leading-snug">{title.trim()}</h4>
              {description.trim() && (
                <p className="text-muted-foreground leading-relaxed text-sm">{description.trim()}</p>
              )}
            </div>
          </li>
        );
        return;
      }
      
      // Check for bulleted list items (- or •)
      const bulletMatch = line.match(/^[-•]\s*\*\*(.*?)\*\*:?\s*(.*)/);
      if (bulletMatch) {
        const [, title, description] = bulletMatch;
        if (listType !== 'bulleted') {
          if (currentList.length > 0) {
            formatted.push(
              <div key={`prev-list-${index}`} className="my-4">
                {listType === 'numbered' ? (
                  <ol className="space-y-3 ml-4">{currentList}</ol>
                ) : (
                  <ul className="space-y-3 ml-4">{currentList}</ul>
                )}
              </div>
            );
          }
          currentList = [];
          listType = 'bulleted';
        }
        
        currentList.push(
          <li key={`item-${index}`} className="flex gap-3 items-start">
            <div className="bg-emerald-500 w-2 h-2 rounded-full flex-shrink-0 mt-2"></div>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground mb-1 leading-snug">{title.trim()}</h4>
              {description.trim() && (
                <p className="text-muted-foreground leading-relaxed text-sm">{description.trim()}</p>
              )}
            </div>
          </li>
        );
        return;
      }
      
      // Check for headers (##, ###)
      if (line.startsWith('##')) {
        if (currentList.length > 0) {
          formatted.push(
            <div key={`list-${index}`} className="my-4">
              {listType === 'numbered' ? (
                <ol className="space-y-3 ml-4">{currentList}</ol>
              ) : (
                <ul className="space-y-3 ml-4">{currentList}</ul>
              )}
            </div>
          );
          currentList = [];
          listType = null;
        }
        
        const headerText = line.replace(/^#+\s*/, '');
        const level = line.match(/^#+/)?.[0].length || 2;
        
        if (level === 2) {
          formatted.push(
            <h2 key={`header-${index}`} className="text-lg font-bold text-foreground mt-6 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              {headerText}
            </h2>
          );
        } else {
          formatted.push(
            <h3 key={`header-${index}`} className="text-base font-semibold text-foreground mt-4 mb-2">
              {headerText}
            </h3>
          );
        }
        return;
      }
      
      // Regular text - process bold formatting
      if (currentList.length > 0) {
        formatted.push(
          <div key={`list-${index}`} className="my-4">
            {listType === 'numbered' ? (
              <ol className="space-y-3 ml-4">{currentList}</ol>
            ) : (
              <ul className="space-y-3 ml-4">{currentList}</ul>
            )}
          </div>
        );
        currentList = [];
        listType = null;
      }
      
      // Process text with bold formatting
      const processedText = line.split(/(\*\*.*?\*\*)/).map((part, partIndex) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={`bold-${index}-${partIndex}`} className="font-semibold text-foreground">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });
      
      formatted.push(
        <p key={`text-${index}`} className="text-muted-foreground leading-relaxed mb-3">
          {processedText}
        </p>
      );
    });
    
    // Handle any remaining list items
    if (currentList.length > 0) {
      formatted.push(
        <div key="final-list" className="my-4">
          {listType === 'numbered' ? (
            <ol className="space-y-3 ml-4">{currentList}</ol>
          ) : (
            <ul className="space-y-3 ml-4">{currentList}</ul>
          )}
        </div>
      );
    }
    
    return formatted;
  };

  return (
    <div className="prose prose-sm max-w-none">
      <div className="space-y-2">
        {formatContent(content)}
      </div>
    </div>
  );
};

export default function VoiceInput({ onSubmit, isGenerating = false, placeholder = "Share your goals and intentions..." }: VoiceInputProps) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [currentChatMessage, setCurrentChatMessage] = useState('');
  const [isChatDocked, setIsChatDocked] = useState(false);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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
        conversationHistory
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
      setCurrentChatMessage("");
    },
    onSuccess: (data) => {
      // Add AI response
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiMessage]);
      
      // Show celebratory toast for goal detection
      if (data.extractedGoals || data.message.includes("action plan")) {
        toast({
          title: "Goals Detected!",
          description: "I can help you create an action plan for these goals. What would you like to explore further?",
        });
      }
      
      // Auto-scroll to show new message
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    },
    onError: (error: any) => {
      toast({
        title: "Chat Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = () => {
    if (text.trim() && !isGenerating) {
      let submissionText = text.trim();
      if (uploadedImages.length > 0) {
        submissionText += `\n\n[Note: ${uploadedImages.length} image(s) uploaded: ${uploadedImages.map(img => img.name).join(', ')}]`;
      }
      onSubmit(submissionText);
      setText('');
      setUploadedImages([]);
    }
  };

  const handleChatSubmit = () => {
    if (currentChatMessage.trim() && !chatMutation.isPending) {
      chatMutation.mutate(currentChatMessage.trim());
    }
  };

  const startConversation = () => {
    setShowChat(true);
    if (chatMessages.length === 0) {
      // Add initial AI message
      const welcomeMessage: ChatMessage = {
        role: 'assistant',
        content: "Hi! I'm here to help you turn your intentions into actionable plans. Feel free to ask me questions, share your goals, or tell me about any challenges you're facing. What's on your mind?",
        timestamp: new Date()
      };
      setChatMessages([welcomeMessage]);
    }
  };

  const startConversationWithMode = (mode: 'quick' | 'smart') => {
    // Show toast notification about the mode
    toast({
      title: mode === 'quick' ? "Quick Plan Mode" : "Smart Plan Mode", 
      description: mode === 'quick' 
        ? "I'll ask a few key questions and generate your plan quickly."
        : "I'll ask intuitive questions based on your activity and profile, then confirm before creating the perfect plan.",
    });
    
    // For now, start the basic conversation and indicate the mode
    // In a future update, this could integrate with ConversationalPlanner
    setShowChat(true);
    if (chatMessages.length === 0) {
      const welcomeMessage: ChatMessage = {
        role: 'assistant',
        content: mode === 'quick' 
          ? "🚀 Quick Plan Mode activated! Tell me what you want to accomplish and I'll help you create a plan quickly."
          : "🧠 Smart Plan Mode activated! I'll ask you personalized questions based on what you want to do. What would you like to plan?",
        timestamp: new Date()
      };
      setChatMessages([welcomeMessage]);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        setUploadedImages(prev => [...prev, ...imageFiles]);
        toast({
          title: "Images Uploaded",
          description: `Added ${imageFiles.length} image(s) to your goal submission.`,
        });
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please upload only image files.",
          variant: "destructive",
        });
      }
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-2 xs:p-3 sm:p-6">
      <motion.div 
        className="bg-card border border-card-border rounded-lg p-3 xs:p-4 sm:p-6 space-y-3 sm:space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-1 sm:mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <h3 className="font-semibold text-card-foreground text-sm xs:text-base sm:text-lg">Share Your Intentions</h3>
          </div>
          
          {/* Feature indicators */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Badge variant="outline" className="text-xs gap-1 hidden sm:flex">
              <Copy className="w-3 h-3" />
              Copy & Paste
            </Badge>
            <Button
              size="icon"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              title="Upload images"
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-upload-images"
            >
              <Upload className="w-3 h-3 xs:w-4 xs:h-4" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>
        </div>

                {/* Uploaded Images Preview */}
                {uploadedImages.length > 0 && (
                  <div className="border rounded-md p-2 xs:p-3 bg-muted/30">
                    <div className="flex items-center gap-2 mb-1 xs:mb-2">
                      <Image className="w-3 h-3 xs:w-4 xs:h-4 text-muted-foreground" />
                      <span className="text-xs xs:text-sm font-medium">Uploaded Images ({uploadedImages.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {uploadedImages.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 bg-background rounded px-2 py-1 text-xs">
                          <span className="truncate max-w-24">{file.name}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-4 w-4 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeImage(index)}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Main Text Input Area */}
                <div className="relative">
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="min-h-[80px] xs:min-h-[100px] sm:min-h-[120px] pr-10 xs:pr-12 sm:pr-16 resize-none text-sm sm:text-base"
                    data-testid="input-goal"
                    disabled={isGenerating}
                  />
                  
                  <div className="absolute bottom-1 right-1 xs:bottom-2 xs:right-2 sm:bottom-3 sm:right-3 flex gap-1 sm:gap-2">
                    <AnimatePresence>
                      {isRecording ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="flex items-center gap-1 xs:gap-2"
                        >
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 1 }}
                            className="w-1.5 h-1.5 xs:w-2 xs:h-2 bg-red-500 rounded-full"
                          />
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={stopRecording}
                            data-testid="button-stop-recording"
                          >
                            <MicOff className="w-3 h-3 xs:w-4 xs:h-4" />
                          </Button>
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <Button
                            size="icon"
                            variant="secondary"
                            onClick={startRecording}
                            data-testid="button-start-recording"
                            disabled={isGenerating}
                          >
                            <Mic className="w-3 h-3 xs:w-4 xs:h-4" />
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <div className="text-xs xs:text-sm text-muted-foreground">
                      {isListening && "Listening..."}
                    </div>
                    <div className="flex gap-1 xs:gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startConversationWithMode('quick')}
                        className="gap-1 xs:gap-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950"
                        data-testid="button-quick-plan"
                      >
                        <Zap className="w-3 h-3" />
                        <span className="text-xs xs:text-sm">Quick Plan</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startConversationWithMode('smart')}
                        className="gap-1 xs:gap-2 text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-950"
                        data-testid="button-smart-plan"
                      >
                        <Brain className="w-3 h-3" />
                        <span className="hidden sm:inline text-xs xs:text-sm">Smart Create Action Plan</span>
                        <span className="sm:hidden text-xs xs:text-sm">Smart Plan</span>
                      </Button>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleSubmit}
                    disabled={!text.trim() || isGenerating}
                    className="gap-1 xs:gap-2 w-full sm:w-auto"
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
                        <span className="hidden sm:inline">Create Action Plan</span>
                        <span className="sm:hidden">Create Plan</span>
                      </>
                    )}
                  </Button>
                </div>
                
                {/* Conversational Chat Section */}
                <AnimatePresence>
                  {showChat && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-border pt-4 mt-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <img src={journalMateIcon} className="w-5 h-5 rounded-full" alt="JournalMate" />
                          <h4 className="font-medium text-sm">JournalMate</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            Dialogue Mode
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            title={isChatDocked ? "Expand chat" : "Collapse chat"}
                            onClick={() => setIsChatDocked(!isChatDocked)}
                            data-testid="button-chat-dock-toggle"
                          >
                            {isChatDocked ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                          </Button>
                        </div>
                      </div>
                      
                      {/* Dockable Chat Content */}
                      <AnimatePresence>
                        {!isChatDocked && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            {/* Chat Messages */}
                            <div className="bg-gradient-to-br from-muted/20 to-muted/40 rounded-xl p-4 max-h-80 overflow-y-auto mb-4 space-y-4 backdrop-blur-sm border border-border/30">
                        {chatMessages.map((message, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            data-testid={`chat-message-${index}`}
                          >
                    {message.role === 'assistant' && (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-3 h-3 text-white" />
                      </div>
                    )}
                    
                    <div className={`max-w-[85%] rounded-lg ${
                      message.role === 'user' 
                        ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-sm p-3' 
                        : 'bg-background border border-border/50 shadow-sm overflow-hidden'
                    }`}>
                      {message.role === 'user' ? (
                        <div className="prose prose-sm max-w-none">
                          <p className="whitespace-pre-wrap leading-relaxed m-0">{message.content}</p>
                        </div>
                      ) : (
                        <div className="p-4">
                          <FormattedMessage content={message.content} />
                        </div>
                      )}
                      <div className={`flex items-center justify-between pt-2 border-t border-current/10 ${
                        message.role === 'user' ? 'mt-2' : 'mx-4 pb-3'
                      }`}>
                        <div className="text-xs opacity-70">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {message.role === 'assistant' && (
                          <div className="flex items-center gap-1 text-xs opacity-70">
                            <Bot className="w-3 h-3" />
                            AI Assistant
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {message.role === 'user' && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <User className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </motion.div>
                ))}
                
                {chatMutation.isPending && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-2 justify-start"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-emerald-500 flex items-center justify-center">
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                    <div className="bg-gradient-to-br from-background to-background/80 border border-border/50 rounded-xl p-3 shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-sm text-muted-foreground font-medium">AI is analyzing your profile and context...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                <div ref={chatEndRef} />
              </div>
              
              {/* Chat Input */}
              <div className="flex gap-2">
                <Textarea
                  value={currentChatMessage}
                  onChange={(e) => setCurrentChatMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleChatSubmit();
                    }
                  }}
                  placeholder="Ask questions, share concerns, or discuss your goals..."
                  className="min-h-[40px] resize-none text-sm"
                  disabled={chatMutation.isPending}
                  data-testid="input-chat"
                />
                <Button
                  onClick={handleChatSubmit}
                  disabled={!currentChatMessage.trim() || chatMutation.isPending}
                  size="sm"
                  className="gap-1"
                  data-testid="button-chat-send"
                >
                  <Send className="w-3 h-3" />
                  Ask
                </Button>
              </div>
              
                            <div className="text-xs text-muted-foreground mt-1 text-center">
                              I can help clarify your goals, suggest contingencies, and create personalized action plans
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>
      </motion.div>
    </div>
  );
}