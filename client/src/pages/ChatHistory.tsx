import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, MessageSquare, Clock, ExternalLink, Lightbulb, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChatImport {
  id: string;
  source: string;
  conversationTitle: string;
  chatHistory: Array<{role: 'user' | 'assistant', content: string}>;
  extractedGoals: string[];
  createdAt: string;
}

const getSourceIcon = (source: string) => {
  switch (source.toLowerCase()) {
    case 'chatgpt':
    case 'openai':
      return <Brain className="w-4 h-4" />;
    case 'claude':
      return <Lightbulb className="w-4 h-4" />;
    default:
      return <Sparkles className="w-4 h-4" />;
  }
};

const getSourceColor = (source: string) => {
  switch (source.toLowerCase()) {
    case 'chatgpt':
    case 'openai':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'claude':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    default:
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
  }
};

export default function ChatHistory() {
  const { data: chatImports = [], isLoading } = useQuery<ChatImport[]>({
    queryKey: ['/api/chat/imports']
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="w-6 h-6" />
          <h1 className="text-2xl font-bold" data-testid="text-chat-history-title">Chat History</h1>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-full"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (chatImports.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="w-6 h-6" />
          <h1 className="text-2xl font-bold" data-testid="text-chat-history-title">Chat History</h1>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No chat history yet</h3>
            <p className="text-muted-foreground mb-4">
              Import conversations from ChatGPT, Claude, or other LLMs to see them here.
            </p>
            <p className="text-sm text-muted-foreground">
              Go to the Chat Import tab to sync your conversations and extract actionable goals.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-6 h-6" />
        <h1 className="text-2xl font-bold" data-testid="text-chat-history-title">Chat History</h1>
        <Badge variant="secondary" className="ml-2">
          {chatImports.length} conversations
        </Badge>
      </div>

      <div className="space-y-4">
        {chatImports.map((chatImport) => (
          <Card key={chatImport.id} className="hover-elevate" data-testid={`card-chat-import-${chatImport.id}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {getSourceIcon(chatImport.source)}
                  <span data-testid={`text-conversation-title-${chatImport.id}`}>
                    {chatImport.conversationTitle}
                  </span>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className={getSourceColor(chatImport.source)}>
                    {chatImport.source}
                  </Badge>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span data-testid={`text-import-time-${chatImport.id}`}>
                      {formatDistanceToNow(new Date(chatImport.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Chat snippet */}
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground mb-2">Conversation snippet:</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {chatImport.chatHistory.slice(0, 3).map((message, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium text-foreground">
                          {message.role === 'user' ? 'You' : 'AI'}:
                        </span>
                        <span className="ml-2 text-muted-foreground">
                          {message.content.length > 100 
                            ? `${message.content.substring(0, 100)}...` 
                            : message.content}
                        </span>
                      </div>
                    ))}
                    {chatImport.chatHistory.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{chatImport.chatHistory.length - 3} more messages
                      </p>
                    )}
                  </div>
                </div>

                {/* Extracted goals */}
                {chatImport.extractedGoals && chatImport.extractedGoals.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Extracted Goals:</p>
                    <div className="flex flex-wrap gap-2">
                      {chatImport.extractedGoals.map((goal, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {goal}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-muted-foreground">
                    {chatImport.chatHistory.length} messages total
                  </div>
                  <Button variant="ghost" size="sm" data-testid={`button-view-details-${chatImport.id}`}>
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}