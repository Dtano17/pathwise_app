import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Users } from 'lucide-react';

interface GroupCardProps {
  group: {
    id: string;
    name: string;
    description: string | null;
    isPrivate: boolean;
    memberCount: number;
    role: string;
    createdAt: string;
    tasksCompleted?: number;
    tasksTotal?: number;
  };
  onClick?: () => void;
}

export default function GroupCard({ group, onClick }: GroupCardProps) {
  const progress = group.tasksTotal && group.tasksTotal > 0
    ? Math.round((group.tasksCompleted || 0) / group.tasksTotal * 100)
    : 0;

  return (
    <Card className="hover-elevate cursor-pointer" data-testid={`card-group-${group.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <CardTitle className="text-lg">{group.name}</CardTitle>
          <Badge variant="secondary" className="text-xs shrink-0">
            {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
          </Badge>
        </div>
        {group.description && (
          <CardDescription className="text-sm line-clamp-2">
            {group.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {group.tasksTotal && group.tasksTotal > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {group.tasksCompleted || 0}/{group.tasksTotal} tasks completed
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground mb-3">
              No activities yet
            </p>
          </div>
        )}
        <Button 
          className="w-full" 
          variant="secondary" 
          size="sm" 
          data-testid={`button-view-group-${group.id}`}
          onClick={onClick}
        >
          View Group
        </Button>
      </CardContent>
    </Card>
  );
}
