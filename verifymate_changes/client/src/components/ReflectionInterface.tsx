import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  BookOpen, 
  MessageSquare, 
  Upload, 
  Sparkles, 
  Calendar,
  Heart,
  Target,
  Brain,
  Lightbulb,
  TrendingUp
} from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ChatImport {
  id: string;
  userId: string;
  source: string;
  title: string;
  processedAt: string;
  extractedGoals: string[];
  summary: string;
}

interface ReflectionEntry {
  id: string;
  content: string;
  mood: string;
  date: string;
  tags: string[];
  goals?: string[];
}

interface ReflectionInterfaceProps {
  onGoalsExtracted?: (goals: string[]) => void;
}

export default function ReflectionInterface({ onGoalsExtracted }: ReflectionInterfaceProps) {
  const { toast } = useToast();
  
  // Reflection states
  const [reflectionText, setReflectionText] = useState('');
  const [currentMood, setCurrentMood] = useState('');
  const [reflectionTags, setReflectionTags] = useState('');
  
  // Chat import states  
  const [chatText, setChatText] = useState('');
  const [chatSource, setChatSource] = useState('chatgpt');
  const [chatTitle, setChatTitle] = useState('');

  // Fetch existing chat imports
  const { data: chatImports = [], isLoading: chatImportsLoading, refetch: refetchChatImports } = useQuery<ChatImport[]>({
    queryKey: ['/api/chat/imports'],
    staleTime: 30000,
  });

  // Process reflection mutation
  const processReflectionMutation = useMutation({
    mutationFn: async (data: { content: string; mood: string; tags: string[] }) => {
      const response = await apiRequest('POST', '/api/reflections/process', data);
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/progress'] });
      
      if (data.extractedGoals && data.extractedGoals.length > 0) {
        onGoalsExtracted?.(data.extractedGoals);
        toast({
          title: "Reflection Processed!",
          description: `I found ${data.extractedGoals.length} insights and goals from your reflection.`,
        });
      } else {
        toast({
          title: "Reflection Saved!",
          description: "Your reflection has been saved to your journal.",
        });
      }
      
      // Clear form
      setReflectionText('');
      setCurrentMood('');
      setReflectionTags('');
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Process Reflection",
        description: error?.response?.error || "Please try again.",
        variant: "destructive",
      });
    }
  });

  // Import chat mutation
  const importChatMutation = useMutation({
    mutationFn: async (data: { source: string; title: string; content: string }) => {
      const response = await apiRequest('POST', '/api/chat/import', data);
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/imports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/progress'] });
      
      if (data.extractedGoals && data.extractedGoals.length > 0) {
        onGoalsExtracted?.(data.extractedGoals);
      }
      
      toast({
        title: "Chat Imported Successfully!",
        description: `Extracted ${data.extractedGoals?.length || 0} goals and created ${data.tasks?.length || 0} tasks.`,
      });
      
      // Clear form
      setChatText('');
      setChatTitle('');
      refetchChatImports();
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error?.response?.error || "Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleReflectionSubmit = () => {
    if (!reflectionText.trim()) {
      toast({
        title: "Empty Reflection",
        description: "Please write something in your reflection.",
        variant: "destructive",
      });
      return;
    }

    const tags = reflectionTags.split(',').map(tag => tag.trim()).filter(Boolean);
    
    processReflectionMutation.mutate({
      content: reflectionText,
      mood: currentMood,
      tags
    });
  };

  const handleChatImport = () => {
    if (!chatText.trim()) {
      toast({
        title: "Empty Chat",
        description: "Please paste your chat conversation.",
        variant: "destructive",
      });
      return;
    }

    importChatMutation.mutate({
      source: chatSource,
      title: chatTitle || `${chatSource.charAt(0).toUpperCase() + chatSource.slice(1)} Import`,
      content: chatText
    });
  };

  const moodOptions = [
    { value: 'excited', label: '🚀 Excited', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
    { value: 'motivated', label: '💪 Motivated', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    { value: 'peaceful', label: '😌 Peaceful', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    { value: 'grateful', label: '🙏 Grateful', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
    { value: 'contemplative', label: '🤔 Contemplative', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
    { value: 'overwhelmed', label: '😅 Overwhelmed', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
    { value: 'uncertain', label: '🤷 Uncertain', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
          <BookOpen className="w-6 h-6" />
          Reflection & Journal
        </h2>
        <p className="text-muted-foreground">
          Process your thoughts, import conversations, and transform insights into actionable goals
        </p>
      </div>

      <Tabs defaultValue="reflection" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="reflection" className="flex items-center gap-2" data-testid="tab-reflection">
            <Heart className="w-4 h-4" />
            Daily Reflection
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2" data-testid="tab-chat-import">
            <MessageSquare className="w-4 h-4" />
            Chat Import
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reflection" className="flex-1 flex flex-col space-y-4">
          <Card className="p-6 flex-1 flex flex-col">
            <div className="space-y-4 flex-1">
              <div>
                <label className="text-sm font-medium mb-2 block">How are you feeling today?</label>
                <Select value={currentMood} onValueChange={setCurrentMood}>
                  <SelectTrigger data-testid="select-mood">
                    <SelectValue placeholder="Select your current mood..." />
                  </SelectTrigger>
                  <SelectContent>
                    {moodOptions.map((mood) => (
                      <SelectItem key={mood.value} value={mood.value}>
                        {mood.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {currentMood && (
                  <Badge className={moodOptions.find(m => m.value === currentMood)?.color + ' mt-2'}>
                    {moodOptions.find(m => m.value === currentMood)?.label}
                  </Badge>
                )}
              </div>

              <div className="flex-1 flex flex-col">
                <label className="text-sm font-medium mb-2 block">What's on your mind?</label>
                <Textarea
                  value={reflectionText}
                  onChange={(e) => setReflectionText(e.target.value)}
                  placeholder="Write about your day, goals, challenges, wins, or anything that's on your mind. The AI will help extract actionable insights and goals from your reflection..."
                  className="flex-1 min-h-[200px] resize-none"
                  data-testid="textarea-reflection"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Tags (optional)</label>
                <Input
                  value={reflectionTags}
                  onChange={(e) => setReflectionTags(e.target.value)}
                  placeholder="work, health, relationships, goals (comma-separated)"
                  data-testid="input-reflection-tags"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t">
              <Button
                onClick={handleReflectionSubmit}
                disabled={processReflectionMutation.isPending || !reflectionText.trim()}
                className="w-full"
                data-testid="button-process-reflection"
              >
                {processReflectionMutation.isPending ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    Processing Reflection...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Process Reflection & Extract Goals
                  </>
                )}
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="flex-1 flex flex-col space-y-4">
          <Card className="p-6 flex-1 flex flex-col">
            <div className="space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Source</label>
                  <Select value={chatSource} onValueChange={setChatSource}>
                    <SelectTrigger data-testid="select-chat-source">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chatgpt">ChatGPT</SelectItem>
                      <SelectItem value="claude">Claude</SelectItem>
                      <SelectItem value="other">Other AI Chat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Title (optional)</label>
                  <Input
                    value={chatTitle}
                    onChange={(e) => setChatTitle(e.target.value)}
                    placeholder="Conversation title..."
                    data-testid="input-chat-title"
                  />
                </div>
              </div>

              <div className="flex-1 flex flex-col">
                <label className="text-sm font-medium mb-2 block">Chat Conversation</label>
                <Textarea
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder="Paste your full conversation here. Include both your messages and the AI's responses. I'll analyze it and extract actionable goals and tasks..."
                  className="flex-1 min-h-[200px] resize-none"
                  data-testid="textarea-chat-import"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t">
              <Button
                onClick={handleChatImport}
                disabled={importChatMutation.isPending || !chatText.trim()}
                className="w-full"
                data-testid="button-import-chat"
              >
                {importChatMutation.isPending ? (
                  <>
                    <Upload className="w-4 h-4 mr-2 animate-spin" />
                    Importing & Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import & Extract Goals
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Recent Imports */}
          {chatImports.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Recent Imports
              </h3>
              <div className="space-y-2">
                {chatImports.slice(0, 3).map((chatImport) => (
                  <div key={chatImport.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{chatImport.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {chatImport.extractedGoals.length} goals • {new Date(chatImport.processedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {chatImport.source}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}