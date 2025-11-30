import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Mic, MicOff, Send, Sparkles, Copy, Plus, Upload, Image, MessageCircle, NotebookPen, User, Zap, Brain, ArrowLeft, CheckCircle, Target, ListTodo, Clock, BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

// Simple markdown formatter for Claude-style responses
const FormattedMessage: React.FC<{ content: string }> = ({ content }) => {
  const formatText = (text: string) => {
    const parts: JSX.Element[] = [];
    const lines = text.split('\n');
    
    lines.forEach((line, lineIndex) => {
      // Check for bullet points and numbered lists first, then strip markers
      const bulletMatch = line.trim().match(/^[•\-\*]\s(.+)/);
      const numberMatch = line.trim().match(/^(\d+)\.\s(.+)/);
      
      // Get the text content without the marker
      let textContent = line;
      if (bulletMatch) {
        textContent = bulletMatch[1];
      } else if (numberMatch) {
        textContent = numberMatch[2];
      }
      
      // Handle bold text (**text**) on the cleaned content
      const boldRegex = /\*\*(.*?)\*\*/g;
      const segments: (string | JSX.Element)[] = [];
      let lastIndex = 0;
      let match;
      
      while ((match = boldRegex.exec(textContent)) !== null) {
        if (match.index > lastIndex) {
          segments.push(textContent.substring(lastIndex, match.index));
        }
        segments.push(<strong key={`bold-${lineIndex}-${match.index}`} className="font-semibold">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      if (lastIndex < textContent.length) {
        segments.push(textContent.substring(lastIndex));
      }
      
      // Render with appropriate formatting
      if (bulletMatch) {
        parts.push(
          <div key={lineIndex} className="flex gap-2 my-1 pl-2">
            <span className="text-primary">•</span>
            <span className="flex-1">{segments}</span>
          </div>
        );
      } else if (numberMatch) {
        parts.push(
          <div key={lineIndex} className="flex gap-2 my-1 pl-2">
            <span className="text-primary font-medium">{numberMatch[1]}.</span>
            <span className="flex-1">{segments}</span>
          </div>
        );
      } else if (line.trim()) {
        parts.push(<div key={lineIndex} className="my-1">{segments}</div>);
      } else {
        parts.push(<div key={lineIndex} className="h-2" />);
      }
    });
    
    return parts;
  };
  
  return <div className="text-sm leading-relaxed">{formatText(content)}</div>;
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  createdActivity?: { id: string; title: string };
}

type ConversationMode = 'quick' | 'smart' | null;

interface VoiceInputProps {
  onSubmit: (data: any) => void;
  isGenerating?: boolean;
  placeholder?: string;
  onOpenJournalMode?: () => void;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onSubmit, isGenerating = false, placeholder = "Describe your goals and/or journal your life...", onOpenJournalMode }) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [inputKey, setInputKey] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMode, setCurrentMode] = useState<ConversationMode>(null);
  const [showCreatePlanButton, setShowCreatePlanButton] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [isParsingPaste, setIsParsingPaste] = useState(false);
  const [showParsedContent, setShowParsedContent] = useState(false);
  const [parsedLLMContent, setParsedLLMContent] = useState<any>(null);
  const [modificationText, setModificationText] = useState('');
  const [conversationProgress, setConversationProgress] = useState<{ progress: number; phase: string; domain: string } | null>(null);
  const [createdActivityId, setCreatedActivityId] = useState<string | null>(null);
  
  // URL detection and curated questions state - now conversational flow (no popup dialog)
  const [isLoadingCuratedQuestions, setIsLoadingCuratedQuestions] = useState(false);
  const [curatedQuestions, setCuratedQuestions] = useState<Array<{ id: string; question: string; type: 'text' | 'choice'; choices?: string[] }>>([]);
  const [curatedQuestionsContent, setCuratedQuestionsContent] = useState<string>('');
  const [curatedAnswers, setCuratedAnswers] = useState<Record<string, string>>({});
  const [curatedQuestionsMode, setCuratedQuestionsMode] = useState<'quick' | 'smart'>('quick');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [isInCuratedFlow, setIsInCuratedFlow] = useState(false);

  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const modeButtonsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Auto scroll to bottom when new messages arrive and user is near bottom
  useEffect(() => {
    if (isNearBottom && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isNearBottom]);

  // Click outside to deselect mode (but not when clicking textarea or when in chat view)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const clickedElement = event.target as Node;
      const isClickInsideButtons = modeButtonsRef.current?.contains(clickedElement);
      const isClickInsideTextarea = textareaRef.current?.contains(clickedElement);
      
      // Only deselect if clicking outside both buttons and textarea, AND not in chat view
      if (currentMode && chatMessages.length === 0 && !isClickInsideButtons && !isClickInsideTextarea) {
        setCurrentMode(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [currentMode, chatMessages.length]);

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
    mutationFn: async ({ message, mode }: { message: string; mode: ConversationMode }) => {
      const conversationHistory = chatMessages.map(msg => ({ role: msg.role, content: msg.content }));
      const response = await apiRequest('POST', '/api/chat/conversation', {
        message,
        conversationHistory,
        mode
      });
      return response.json();
    },
    onMutate: ({ message }: { message: string; mode: ConversationMode }) => {
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
        timestamp: new Date(),
        createdActivity: data.createdActivity // Include activity data if present
      };
      setChatMessages(prev => [...prev, aiMessage]);
      
      // Update progress data
      if (data.progress !== undefined) {
        setConversationProgress({
          progress: data.progress,
          phase: data.phase || 'gathering',
          domain: data.domain || 'general'
        });
      }
      
      // Handle Smart Plan specific responses
      if (data.showCreatePlanButton) {
        setShowCreatePlanButton(true);
      }
      
      // Invalidate queries if activity was created
      if (data.createdActivity) {
        queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
        queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
        queryClient.invalidateQueries({ queryKey: ['/api/progress'] });
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

  // URL Detection Helper
  const detectUrlInMessage = (inputText: string): string | null => {
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
    const match = inputText.match(urlRegex);
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
    return data.content || '';
  };

  // Process curated questions flow - now uses conversational chat format instead of popup dialog
  const processCuratedQuestionsFlow = async (content: string, mode: 'quick' | 'smart') => {
    try {
      const response = await apiRequest('POST', '/api/planner/generate-curated-questions', {
        externalContent: content,
        mode
      });
      const data = await response.json();
      
      if (data.questions && data.questions.length > 0) {
        // Store questions and content for the conversational flow
        setCuratedQuestions(data.questions);
        setCuratedQuestionsContent(content);
        setCuratedQuestionsMode(mode);
        setCuratedAnswers({});
        setCurrentQuestionIndex(0);
        setIsInCuratedFlow(true);
        
        // Add intro message with content summary and first question in chat
        const introMessage = data.contentSummary 
          ? `**I've analyzed the content!** ${data.contentSummary}\n\nLet me ask you a few questions to personalize your ${mode === 'quick' ? 'Quick' : 'Smart'} Plan:\n\n**Question 1:** ${data.questions[0].question}`
          : `**Content analyzed!** Let me ask you a few questions to personalize your ${mode === 'quick' ? 'Quick' : 'Smart'} Plan:\n\n**Question 1:** ${data.questions[0].question}`;
        
        setChatMessages(prev => [...prev.filter(m => !m.content.includes('Analyzing')), {
          role: 'assistant',
          content: introMessage,
          timestamp: new Date()
        }]);
      } else {
        toast({
          title: "No Questions Generated",
          description: "Couldn't generate questions from this content. Try a different URL.",
          variant: "destructive"
        });
        setIsInCuratedFlow(false);
      }
    } catch (error) {
      console.error('Failed to generate curated questions:', error);
      toast({
        title: "Question Generation Error",
        description: "Failed to analyze the content. Please try again.",
        variant: "destructive"
      });
      setIsInCuratedFlow(false);
    } finally {
      setIsLoadingCuratedQuestions(false);
    }
  };

  // Handle curated answer in conversational chat flow
  const handleCuratedAnswerInChat = async (answer: string) => {
    if (!isInCuratedFlow || curatedQuestions.length === 0) return;
    
    const currentQuestion = curatedQuestions[currentQuestionIndex];
    if (!currentQuestion) return;
    
    // Store the answer
    const newAnswers = { ...curatedAnswers, [currentQuestion.id]: answer };
    setCuratedAnswers(newAnswers);
    
    // Add user's answer to chat
    setChatMessages(prev => [...prev, {
      role: 'user',
      content: answer,
      timestamp: new Date()
    }]);
    
    const nextIndex = currentQuestionIndex + 1;
    
    if (nextIndex < curatedQuestions.length) {
      // More questions to ask
      setCurrentQuestionIndex(nextIndex);
      const nextQuestion = curatedQuestions[nextIndex];
      
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `**Question ${nextIndex + 1}:** ${nextQuestion.question}`,
        timestamp: new Date()
      }]);
    } else {
      // All questions answered - generate the plan
      setIsInCuratedFlow(false);
      setIsLoadingCuratedQuestions(true);
      
      // Show generating message
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `**Great!** Generating your personalized ${curatedQuestionsMode === 'quick' ? 'Quick' : 'Smart'} Plan based on your answers...`,
        timestamp: new Date()
      }]);
      
      // Build userAnswers object from questions and answers
      const userAnswers: Record<string, string> = {};
      curatedQuestions.forEach(q => {
        userAnswers[q.question] = newAnswers[q.id] || '';
      });
      
      try {
        const response = await apiRequest('POST', '/api/planner/generate-plan-from-content', {
          externalContent: curatedQuestionsContent,
          userAnswers,
          mode: curatedQuestionsMode
        });
        const data = await response.json();
        
        if (data.success && data.activity) {
          // Remove generating message and add final plan
          setChatMessages(prev => [...prev.filter(m => !m.content.includes('Generating your personalized')), {
            role: 'assistant',
            content: `**Your Personalized ${curatedQuestionsMode === 'quick' ? 'Quick' : 'Smart'} Plan Created!**\n\n**${data.activity.title}**\n\n${data.createdTasks?.map((t: any, i: number) => `${i + 1}. **${t.title}**: ${t.description || ''}`).join('\n') || 'Plan created successfully!'}`,
            timestamp: new Date(),
            createdActivity: { id: data.activity.id, title: data.activity.title }
          }]);
          
          queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
          queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
          toast({
            title: "Plan Created!",
            description: `Your personalized plan "${data.activity.title}" has been created with ${data.createdTasks?.length || 0} tasks.`
          });
        } else if (data.requiresAuth) {
          toast({
            title: "Sign In Required",
            description: data.message || "Please sign in to save your plan.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Failed to generate plan from answers:', error);
        toast({
          title: "Plan Generation Error",
          description: "Failed to create the plan. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoadingCuratedQuestions(false);
        setCuratedQuestions([]);
        setCuratedQuestionsContent('');
        setCuratedAnswers({});
        setCurrentQuestionIndex(0);
      }
    }
  };

  const startConversationWithMode = async (mode: 'quick' | 'smart') => {
    // Prevent duplicate requests on rapid clicks
    if (chatMutation.isPending || isLoadingCuratedQuestions) return;
    
    // Toggle: if clicking the same mode again, deselect it
    if (currentMode === mode) {
      setCurrentMode(null);
      setChatMessages([]);
    } else {
      setCurrentMode(mode);
      
      // Check if user already typed something - if yes, check for URL first
      if (text.trim()) {
        const userMessage = text.trim();
        const detectedUrl = detectUrlInMessage(userMessage);
        
        // If URL detected, trigger curated questions flow
        if (detectedUrl) {
          setText(''); // Clear input
          setIsLoadingCuratedQuestions(true);
          
          // Show loading message in chat
          setChatMessages([{
            role: 'assistant',
            content: `**${mode === 'quick' ? 'Quick' : 'Smart'} Plan activated!** Analyzing the URL content to generate personalized questions for you...`,
            timestamp: new Date()
          }]);
          
          try {
            const content = await fetchUrlContent(detectedUrl);
            await processCuratedQuestionsFlow(content, mode);
          } catch (error) {
            console.error('URL processing error:', error);
            toast({
              title: "URL Error",
              description: "Couldn't fetch the URL content. Try pasting the content directly.",
              variant: "destructive"
            });
            setIsLoadingCuratedQuestions(false);
            // Fall back to regular chat flow
            chatMutation.mutate({ message: userMessage, mode });
          }
        } else {
          // No URL - use regular chat flow
          setText(''); // Clear input immediately
          chatMutation.mutate({ message: userMessage, mode }); // Send user's pre-typed message with explicit mode
        }
      } else {
        // No pre-typed text - show welcome message
        const welcomeMessage = mode === 'quick' 
          ? "**Quick Plan activated!** Let's create your action plan quickly. What would you like to accomplish? You can also paste a URL to get personalized questions!"
          : "**Smart Plan activated!** I'll help you create a comprehensive action plan. What's your goal? You can also paste a URL for a personalized experience!";
        
        setChatMessages([{
          role: 'assistant',
          content: welcomeMessage,
          timestamp: new Date()
        }]);
      }
    }
    setShowCreatePlanButton(false);
  };

  // Handle URL detection and message sending
  const handleMessageWithUrlDetection = async () => {
    if (!text.trim() || !currentMode) return;
    
    const userMessage = text.trim();
    const detectedUrl = detectUrlInMessage(userMessage);
    
    // If URL detected in Quick/Smart mode, trigger curated questions flow
    if (detectedUrl) {
      setText('');
      setIsLoadingCuratedQuestions(true);
      
      // Add user message to chat
      setChatMessages(prev => [...prev, {
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      }]);
      
      // Add processing message
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Analyzing the URL content to generate personalized questions for you...',
        timestamp: new Date()
      }]);
      
      try {
        const content = await fetchUrlContent(detectedUrl);
        await processCuratedQuestionsFlow(content, currentMode);
      } catch (error) {
        console.error('URL processing error:', error);
        toast({
          title: "URL Error",
          description: "Couldn't fetch the URL content. Sending as regular message.",
          variant: "destructive"
        });
        setIsLoadingCuratedQuestions(false);
        // Fall back to regular chat
        chatMutation.mutate({ message: userMessage, mode: currentMode });
      }
    } else {
      // No URL - regular chat flow
      setText('');
      chatMutation.mutate({ message: userMessage, mode: currentMode });
    }
  };

  const handleSubmit = () => {
    if (!text.trim()) return;
    
    // If in conversation mode, use URL detection
    if (currentMode) {
      handleMessageWithUrlDetection();
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
        if (text.trim() && !chatMutation.isPending && !isLoadingCuratedQuestions) {
          handleMessageWithUrlDetection();
        }
      } else if (!isGenerating) {
        handleSubmit();
      }
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    // Check for image data first
    const items = e.clipboardData.items;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();

        const file = items[i].getAsFile();
        if (file) {
          setIsParsingPaste(true);
          try {
            const reader = new FileReader();
            reader.onload = async (event) => {
              try {
                const base64Image = event.target?.result as string;

                // Combine current input text with chat history for context
                const userTypedContext = text.trim();
                const chatContext = chatMessages
                  .slice(-3)
                  .map(msg => `${msg.role}: ${msg.content}`)
                  .join('\n');

                const precedingContext = userTypedContext
                  ? `User's context: ${userTypedContext}\n\n${chatContext}`
                  : chatContext;

                const response = await apiRequest('POST', '/api/planner/parse-llm-content', {
                  pastedContent: base64Image,
                  contentType: 'image',
                  precedingContext
                });

                const data = await response.json();
                setParsedLLMContent(data.parsed);
                setShowParsedContent(true);
                // Clear the typed text since it's now part of the context
                setText('');
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

    const numberedItems = pastedText.match(/\d+\./g);
    const looksLikeLLMContent =
      pastedText.length > 200 &&
      (pastedText.includes('Step') ||
       pastedText.includes('1.') ||
       pastedText.includes('**') ||
       pastedText.includes('###') ||
       (numberedItems && numberedItems.length >= 3));

    if (looksLikeLLMContent) {
      e.preventDefault();
      setIsParsingPaste(true);

      try {
        // Combine current input text with chat history for full context
        const userTypedContext = text.trim();
        const chatContext = chatMessages
          .slice(-3)
          .map(msg => `${msg.role}: ${msg.content}`)
          .join('\n');

        const precedingContext = userTypedContext
          ? `User's context: ${userTypedContext}\n\n${chatContext}`
          : chatContext;

        const response = await apiRequest('POST', '/api/planner/parse-llm-content', {
          pastedContent: pastedText,
          contentType: 'text',
          precedingContext
        });

        const data = await response.json();
        setParsedLLMContent(data.parsed);
        setShowParsedContent(true);
        // Clear the typed text since it's now part of the context
        setText('');
      } catch (error) {
        console.error('Failed to parse LLM content:', error);
        // Silently fall back to regular paste - no need to show error to user
        setText(prev => prev + pastedText);
      } finally {
        setIsParsingPaste(false);
      }
    }
  };

  const handleRefineParsedContent = useMutation({
    mutationFn: async (modifications: string) => {
      if (!parsedLLMContent) return;

      // Re-analyze with modifications
      const response = await apiRequest('POST', '/api/planner/parse-llm-content', {
        pastedContent: JSON.stringify(parsedLLMContent),
        contentType: 'text',
        precedingContext: `User's modifications: ${modifications}\n\nOriginal parsed content needs to be refined based on these changes.`
      });

      const data = await response.json();
      return data.parsed;
    },
    onSuccess: (refinedContent) => {
      setParsedLLMContent(refinedContent);
      setModificationText('');
      toast({
        title: "Plan Refined!",
        description: "Your modifications have been applied",
      });
    },
    onError: (error) => {
      console.error('Failed to refine content:', error);
      toast({
        title: "Refinement Error",
        description: "Failed to apply modifications",
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
      setModificationText('');
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

  // If in conversation mode, show full-screen chat interface
  if (currentMode && chatMessages.length > 0) {
    return (
      <div className="flex flex-col min-h-[100dvh] w-full bg-background">
        {/* Minimal Header - Claude Style */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 sticky top-0 z-[999] bg-background">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setChatMessages([]);
              setCurrentMode(null);
              setShowCreatePlanButton(false);
              // Scroll parent container to top when exiting conversation mode
              setTimeout(() => {
                const mainContent = document.querySelector('main');
                if (mainContent) {
                  mainContent.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }, 50);
            }}
            className="h-9 w-9"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Badge variant="secondary" className={`text-xs font-medium ${currentMode === 'quick' 
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' 
            : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'}`}>
            {currentMode === 'quick' ? 'Quick Plan' : 'Smart Plan'}
          </Badge>
          <div className="w-9" />
        </div>

        {/* Chat Messages - Claude Style */}
        <div className="flex-1 overflow-y-auto" ref={chatContainerRef}>
          <div className="max-w-3xl mx-auto px-4 py-8">
            {chatMessages.map((message, index) => (
              <div key={index} className={`mb-8 ${message.role === 'user' ? '' : ''}`}>
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                      <NotebookPen className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">JournalMate</span>
                  </div>
                )}
                {message.role === 'user' && (
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">You</span>
                  </div>
                )}
                <div className="pl-8">
                  {message.role === 'assistant' ? (
                    <>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <FormattedMessage content={message.content} />
                      </div>
                      {message.createdActivity && (
                        <div className="mt-4">
                          <Button 
                            variant="default" 
                            className="gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white"
                            data-testid="button-view-activity"
                            onClick={() => {
                              // Navigate directly to the activity
                              window.location.href = `/?activity=${message.createdActivity!.id}&tab=activities`;
                            }}
                          >
                            <Target className="w-4 h-4" />
                            View "{message.createdActivity.title}"
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                      {message.content}
                    </p>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Generate Plan Button - Shows when ready */}
        {showCreatePlanButton && (
          <div className="border-t border-border/50 px-4 py-4 bg-background">
            <div className="max-w-3xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center"
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
                  data-testid="button-generate-plan"
                >
                  {createPlanMutation.isPending ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      />
                      Generating Plan...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Plan
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          </div>
        )}

        {/* Minimal Input - Claude Style */}
        <div className="border-t border-border/50 px-4 py-4 bg-background pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Reply to JournalMate..."
                className="min-h-[52px] max-h-[200px] resize-none pr-12 rounded-lg border-border/50 focus-visible:border-border text-sm bg-background"
                rows={1}
                data-testid="input-message"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  if (text.trim() && !chatMutation.isPending && !isLoadingCuratedQuestions) {
                    if (isInCuratedFlow) {
                      // Handle curated question answer in conversational flow
                      handleCuratedAnswerInChat(text.trim());
                      setText('');
                    } else {
                      chatMutation.mutate({ message: text.trim(), mode: currentMode });
                      setText('');
                    }
                  }
                }}
                disabled={!text.trim() || chatMutation.isPending || isLoadingCuratedQuestions}
                className="absolute right-2 bottom-2 h-8 w-8 rounded-md hover-elevate"
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
                      onPaste={handlePaste}
                      placeholder={placeholder}
                      disabled={isParsingPaste}
                      className="min-h-[80px] sm:min-h-[100px] lg:min-h-[120px] resize-none pr-20 text-sm sm:text-base"
                      rows={3}
                      data-testid="textarea-goal-input"
                    />
                    {isParsingPaste && (
                      <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center rounded-md z-10">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <Sparkles className="h-4 w-4 animate-pulse" />
                          <span>Analyzing pasted content...</span>
                        </div>
                      </div>
                    )}
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
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        // Check if file is an image for traditional flow, or document for curated questions flow
                        const isImage = file.type.startsWith('image/');
                        const isDocument = [
                          'application/pdf',
                          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                          'text/plain',
                          'text/markdown',
                          'text/csv',
                          'application/json'
                        ].includes(file.type);
                        
                        if (isDocument || isImage) {
                          // Use curated questions flow for documents AND images
                          setIsLoadingCuratedQuestions(true);
                          
                          try {
                            const formData = new FormData();
                            formData.append('document', file);
                            
                            const response = await fetch('/api/upload/document', {
                              method: 'POST',
                              body: formData
                            });
                            
                            if (!response.ok) {
                              const error = await response.json();
                              throw new Error(error.error || 'Failed to upload document');
                            }
                            
                            const { content, type: docType } = await response.json();
                            
                            // Now generate curated questions based on the document content
                            const questionsResponse = await fetch('/api/planner/generate-curated-questions', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ 
                                externalContent: content, 
                                mode: 'smart'
                              })
                            });
                            
                            if (!questionsResponse.ok) {
                              throw new Error('Failed to generate questions');
                            }
                            
                            const questionsData = await questionsResponse.json();
                            
                            // Use conversational flow for document-based curated questions
                            if (questionsData.questions && questionsData.questions.length > 0) {
                              setCuratedQuestions(questionsData.questions);
                              setCuratedQuestionsContent(content);
                              setCuratedQuestionsMode('smart');
                              setCuratedAnswers({});
                              setCurrentQuestionIndex(0);
                              setIsInCuratedFlow(true);
                              setCurrentMode('smart');
                              
                              // Add intro message with first question
                              const introMessage = questionsData.contentSummary 
                                ? `**I've analyzed your ${docType === 'image' ? 'image' : 'document'}!** ${questionsData.contentSummary}\n\nLet me ask you a few questions to personalize your Smart Plan:\n\n**Question 1:** ${questionsData.questions[0].question}`
                                : `**${docType === 'image' ? 'Image' : 'Document'} analyzed!** Let me ask you a few questions to personalize your Smart Plan:\n\n**Question 1:** ${questionsData.questions[0].question}`;
                              
                              setChatMessages([{
                                role: 'assistant',
                                content: introMessage,
                                timestamp: new Date()
                              }]);
                            }
                            
                            toast({
                              title: docType === 'image' ? "Image Analyzed!" : "Document Processed!",
                              description: "Answer the questions in the chat to create your personalized plan.",
                            });
                          } catch (error) {
                            console.error('Document processing error:', error);
                            toast({
                              title: "Processing Error",
                              description: error instanceof Error ? error.message : "Failed to process document",
                              variant: "destructive"
                            });
                          } finally {
                            setIsLoadingCuratedQuestions(false);
                            // Reset file input
                            e.target.value = '';
                          }
                        }
                      }}
                      accept=".pdf,.docx,.txt,.md,.csv,.json,.jpg,.jpeg,.png,.gif,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv,application/json,image/*"
                      className="hidden"
                      data-testid="input-file-upload"
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

                {/* Action buttons row - compact layout with smaller buttons */}
                <div className="flex gap-1.5 sm:gap-2 flex-wrap items-center">
                  {/* Conversational Mode Buttons - colored theme highlights */}
                  <div ref={modeButtonsRef} className="flex gap-1 min-w-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startConversationWithMode('quick')}
                      className={`gap-1.5 px-3 py-1.5 ${
                        currentMode === 'quick'
                          ? 'bg-emerald-600/10 border-emerald-600 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-500'
                          : 'bg-emerald-600/5 border-emerald-600/40 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-900/10 dark:border-emerald-600/40'
                      }`}
                      data-testid="button-quick-plan"
                    >
                      <Zap className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="text-xs font-medium">Quick Plan</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startConversationWithMode('smart')}
                      className={`gap-1.5 px-3 py-1.5 ${
                        currentMode === 'smart'
                          ? 'bg-purple-600/10 border-purple-600 text-purple-700 dark:text-purple-400 dark:bg-purple-900/20 dark:border-purple-500'
                          : 'bg-purple-600/5 border-purple-600/40 text-purple-700 dark:text-purple-400 dark:bg-purple-900/10 dark:border-purple-600/40'
                      }`}
                      data-testid="button-smart-plan"
                    >
                      <Brain className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="text-xs font-medium">Smart Plan</span>
                    </Button>
                    {onOpenJournalMode && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onOpenJournalMode}
                        className="gap-1.5 px-3 py-1.5 bg-pink-600/5 border-pink-600/40 text-pink-700 dark:text-pink-400 dark:bg-pink-900/10 dark:border-pink-600/40"
                        data-testid="button-journal-mode"
                      >
                        <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-xs font-medium">Journal</span>
                      </Button>
                    )}
                  </div>
                  
                  <Button
                    onClick={handleSubmit}
                    disabled={!text.trim() || isGenerating}
                    size="sm"
                    className="gap-1.5 ml-auto flex-shrink-0"
                    data-testid="button-submit"
                  >
                    {isGenerating ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1 }}
                          className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full"
                        />
                        <span className="text-xs">Loading...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span className="text-xs whitespace-nowrap">
                          {currentMode ? 'Start' : 'Create Action Plan'}
                        </span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Parsed LLM Content Dialog */}
      <Dialog open={showParsedContent} onOpenChange={setShowParsedContent}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader backLabel="Back to Planning">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Plan Generated!
            </DialogTitle>
            <DialogDescription>
              We've analyzed your pasted content and created an activity with tasks. Review and confirm to add to your dashboard.
            </DialogDescription>
          </DialogHeader>

          {parsedLLMContent && (
            <div className="space-y-4 py-4">
              {/* Activity Preview */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-5 w-5 text-emerald-500" />
                        <h3 className="text-lg font-semibold">{parsedLLMContent.activity?.title || "New Activity"}</h3>
                      </div>
                      <Badge variant="outline" className="mb-3">
                        {parsedLLMContent.activity?.category || "General"}
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        {parsedLLMContent.activity?.description || "Activity description"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tasks Preview */}
              {parsedLLMContent.tasks && parsedLLMContent.tasks.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <ListTodo className="h-5 w-5 text-purple-500" />
                      <h3 className="text-lg font-semibold">Tasks ({parsedLLMContent.tasks.length})</h3>
                    </div>
                    <div className="space-y-3">
                      {parsedLLMContent.tasks.map((task: any, index: number) => (
                        <div key={index} className="flex gap-3 p-3 rounded-lg bg-muted">
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
                              <p className="text-xs text-muted-foreground">
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
                  <CardContent className="p-4 space-y-3">
                    {parsedLLMContent.summary && (
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Summary</h4>
                        <p className="text-sm text-muted-foreground">{parsedLLMContent.summary}</p>
                      </div>
                    )}
                    {parsedLLMContent.estimatedTimeframe && (
                      <div>
                        <h4 className="font-semibold text-sm mb-1 flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Estimated Time
                        </h4>
                        <p className="text-sm text-muted-foreground">{parsedLLMContent.estimatedTimeframe}</p>
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

          {/* Modification Input */}
          <div className="border-t pt-4">
            <div className="space-y-2">
              <label htmlFor="modification-input" className="text-sm font-medium">
                Want to refine this plan?
              </label>
              <Textarea
                id="modification-input"
                value={modificationText}
                onChange={(e) => setModificationText(e.target.value)}
                placeholder='e.g., "make it for next week instead" or "add more detail to the documentation task"'
                className="min-h-[60px]"
                disabled={handleRefineParsedContent.isPending}
              />
              {modificationText.trim() && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleRefineParsedContent.mutate(modificationText)}
                  disabled={handleRefineParsedContent.isPending}
                  className="w-full"
                >
                  {handleRefineParsedContent.isPending ? "Refining..." : "✨ Refine Plan"}
                </Button>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowParsedContent(false);
                setParsedLLMContent(null);
                setModificationText('');
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
};

export default VoiceInput;