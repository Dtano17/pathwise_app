import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Clock, Lightbulb } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ConversationSession {
  id: string;
  userId: string;
  sessionState: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    type?: string;
  }>;
  generatedPlan?: {
    title?: string;
    summary?: string;
    tasks?: Array<any>;
    estimatedTimeframe?: string;
    motivationalNote?: string;
  };
  createdAt: string;
  updatedAt: string;
  lastInteractionAt: string;
}

interface ChatHistoryProps {
  onLoadSession?: (sessionId: string) => void;
}

export default function ChatHistory({ onLoadSession }: ChatHistoryProps) {
  const { data: sessions = [], isLoading } = useQuery<ConversationSession[]>({
    queryKey: ['/api/conversations']
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="w-5 h-5 md:w-6 md:h-6" />
          <h1 className="text-xl md:text-2xl font-bold" data-testid="text-chat-history-title">Conversation History</h1>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent className="pb-3">
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

  if (sessions.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="w-5 h-5 md:w-6 md:h-6" />
          <h1 className="text-xl md:text-2xl font-bold" data-testid="text-chat-history-title">Conversation History</h1>
        </div>
        <Card>
          <CardContent className="p-6 md:p-8 text-center">
            <MessageSquare className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 text-muted-foreground" />
            <h3 className="text-base md:text-lg font-medium mb-2">No conversations yet</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Start creating plans and refining them with AI.
            </p>
            <p className="text-xs text-muted-foreground">
              Your conversation sessions will be saved here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 md:w-6 md:h-6" />
        <h1 className="text-xl md:text-2xl font-bold" data-testid="text-chat-history-title">Conversation History</h1>
        <Badge variant="secondary" className="ml-2 text-xs">
          {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
        </Badge>
      </div>

      <div className="space-y-3">
        {sessions.map((session) => {
          const firstMessage = session.conversationHistory[0]?.content || 'No messages';
          const planTitle = session.generatedPlan?.title || 'Untitled Plan';
          const exchangeCount = session.conversationHistory.length;
          
          return (
            <Card key={session.id} className="hover-elevate" data-testid={`card-conversation-${session.id}`}>
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base md:text-lg flex-1">
                      <Lightbulb className="w-4 h-4 text-primary shrink-0" />
                      <span data-testid={`text-plan-title-${session.id}`} className="line-clamp-1">
                        {planTitle}
                      </span>
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-xs">
                      {exchangeCount} exchanges
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span data-testid={`text-session-time-${session.id}`}>
                        {formatDistanceToNow(new Date(session.lastInteractionAt || session.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-3 space-y-3">
                {/* Initial Goal - Clean and Simple */}
                <div className="bg-muted/30 rounded-md p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Initial Goal:</p>
                  <p className="text-sm text-foreground line-clamp-2">
                    {firstMessage}
                  </p>
                </div>

                {/* Progress indicator if there are multiple exchanges */}
                {exchangeCount > 1 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex-1 h-px bg-border"></div>
                    <span>{exchangeCount - 1} refinement{exchangeCount > 2 ? 's' : ''}</span>
                    <div className="flex-1 h-px bg-border"></div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-xs text-muted-foreground">
                    {session.sessionState === 'completed' ? (
                      <Badge variant="outline" className="text-xs">Completed</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800">
                        In Progress
                      </Badge>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-7 text-xs"
                    data-testid={`button-view-session-${session.id}`}
                    onClick={() => {
                      if (onLoadSession) {
                        onLoadSession(session.id);
                      }
                    }}
                  >
                    Resume Conversation
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
