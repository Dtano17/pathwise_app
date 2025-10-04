import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Clock, Lightbulb, Target, CheckCircle2 } from 'lucide-react';
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

export default function ChatHistory() {
  const { data: sessions = [], isLoading } = useQuery<ConversationSession[]>({
    queryKey: ['/api/conversations']
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="w-6 h-6" />
          <h1 className="text-2xl font-bold" data-testid="text-chat-history-title">Conversation History</h1>
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

  if (sessions.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="w-6 h-6" />
          <h1 className="text-2xl font-bold" data-testid="text-chat-history-title">Conversation History</h1>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
            <p className="text-muted-foreground mb-4">
              Start creating plans and refining them with additional context.
            </p>
            <p className="text-sm text-muted-foreground">
              Your conversation sessions will be saved here for future reference.
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
        <h1 className="text-2xl font-bold" data-testid="text-chat-history-title">Conversation History</h1>
        <Badge variant="secondary" className="ml-2">
          {sessions.length} sessions
        </Badge>
      </div>

      <div className="space-y-4">
        {sessions.map((session) => {
          const firstMessage = session.conversationHistory[0]?.content || 'No messages';
          const planTitle = session.generatedPlan?.title || 'Untitled Plan';
          const taskCount = session.generatedPlan?.tasks?.length || 0;
          
          return (
            <Card key={session.id} className="hover-elevate" data-testid={`card-conversation-${session.id}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Lightbulb className="w-5 h-5 text-primary" />
                    <span data-testid={`text-plan-title-${session.id}`}>
                      {planTitle}
                    </span>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {session.conversationHistory.length} exchanges
                    </Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span data-testid={`text-session-time-${session.id}`}>
                        {formatDistanceToNow(new Date(session.lastInteractionAt || session.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Initial Goal */}
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground mb-2">Initial Goal:</p>
                    <p className="text-sm text-foreground">
                      {firstMessage.length > 150 
                        ? `${firstMessage.substring(0, 150)}...` 
                        : firstMessage}
                    </p>
                  </div>

                  {/* Conversation Exchanges */}
                  {session.conversationHistory.length > 1 && (
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-sm text-muted-foreground mb-2">
                        Additional Context ({session.conversationHistory.length - 1} refinements):
                      </p>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {session.conversationHistory.slice(1).map((message, idx) => (
                          <div key={idx} className="text-sm">
                            <span className="font-medium text-foreground">
                              Refinement {idx + 1}:
                            </span>
                            <span className="ml-2 text-muted-foreground">
                              {message.content.length > 100 
                                ? `${message.content.substring(0, 100)}...` 
                                : message.content}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Generated Plan Summary */}
                  {session.generatedPlan && (
                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium flex items-center gap-1">
                          <Target className="w-4 h-4" />
                          Generated Plan
                        </p>
                        {taskCount > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {taskCount} tasks
                          </Badge>
                        )}
                      </div>
                      {session.generatedPlan.summary && (
                        <p className="text-sm text-muted-foreground">
                          {session.generatedPlan.summary.length > 120
                            ? `${session.generatedPlan.summary.substring(0, 120)}...`
                            : session.generatedPlan.summary}
                        </p>
                      )}
                      {session.generatedPlan.estimatedTimeframe && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Timeframe: {session.generatedPlan.estimatedTimeframe}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-xs text-muted-foreground">
                      {session.sessionState === 'completed' ? 'Completed' : 'In Progress'}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      data-testid={`button-view-session-${session.id}`}
                      onClick={() => {
                        // TODO: Load and resume this conversation session
                        console.log('Load session:', session.id);
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
