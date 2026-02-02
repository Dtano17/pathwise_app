import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Users, Trophy } from "lucide-react";

interface MemberProgress {
  userId: string;
  username: string;
  totalTasks: number;
  completedTasks: number;
}

interface MemberProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupActivityId: string;
  activityTitle?: string;
}

/**
 * Dialog showing individual member progress for a shared group activity
 *
 * Displays:
 * - Member avatar and name
 * - Progress bar showing completion percentage
 * - Task counts (completed/total)
 * - Leaderboard-style ordering (most completed first)
 */
export function MemberProgressDialog({
  open,
  onOpenChange,
  groupId,
  groupActivityId,
  activityTitle,
}: MemberProgressDialogProps) {
  const { data, isLoading, error } = useQuery<{ memberProgress: MemberProgress[] }>({
    queryKey: ['/api/groups', groupId, 'activities', groupActivityId, 'member-progress'],
    queryFn: async () => {
      const res = await fetch(`/api/groups/${groupId}/activities/${groupActivityId}/member-progress`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch member progress');
      return res.json();
    },
    enabled: open, // Only fetch when dialog is open
  });

  const memberProgress = data?.memberProgress || [];

  // Sort by completion percentage (highest first) for leaderboard effect
  const sortedProgress = [...memberProgress].sort((a, b) => {
    const aPercentage = a.totalTasks > 0 ? (a.completedTasks / a.totalTasks) * 100 : 0;
    const bPercentage = b.totalTasks > 0 ? (b.completedTasks / b.totalTasks) * 100 : 0;
    return bPercentage - aPercentage;
  });

  // Calculate overall group stats
  const totalCompleted = memberProgress.reduce((sum, m) => sum + m.completedTasks, 0);
  const totalTasks = memberProgress.reduce((sum, m) => sum + m.totalTasks, 0);
  const groupPercentage = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Member Progress
          </DialogTitle>
          <DialogDescription>
            {activityTitle ? `See who's making progress on "${activityTitle}"` : 'Individual member progress for this activity'}
          </DialogDescription>
        </DialogHeader>

        {/* Group Overall Stats */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Group Progress</span>
            <span className="text-muted-foreground">{groupPercentage}%</span>
          </div>
          <Progress value={groupPercentage} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{memberProgress.length} members</span>
            <span>{totalCompleted}/{totalTasks} tasks completed</span>
          </div>
        </div>

        {/* Member Progress List */}
        <div className="space-y-3">
          {isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              Loading member progress...
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-destructive">
              Failed to load member progress. Please try again.
            </div>
          )}

          {!isLoading && !error && sortedProgress.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No members have started this activity yet.
            </div>
          )}

          {sortedProgress.map((member, index) => {
            const percentage = member.totalTasks > 0
              ? Math.round((member.completedTasks / member.totalTasks) * 100)
              : 0;
            const isComplete = member.completedTasks === member.totalTasks && member.totalTasks > 0;
            const isTopPerformer = index === 0 && percentage > 0;

            return (
              <div
                key={member.userId}
                className={`rounded-lg border p-4 transition-colors ${
                  isComplete ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' :
                  isTopPerformer ? 'bg-primary/5 border-primary/20' :
                  'bg-card'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <Avatar className={`w-10 h-10 ${isTopPerformer ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                    <AvatarFallback className={isComplete ? 'bg-green-500 text-white' : ''}>
                      {member.username?.slice(0, 2).toUpperCase() || 'UN'}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name and Stats */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">
                        {member.username || 'Unknown User'}
                      </p>
                      {isTopPerformer && percentage === 100 && (
                        <Trophy className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                      )}
                      {isComplete && (
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      )}
                      {isTopPerformer && percentage < 100 && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                          Leading
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <Progress value={percentage} className="h-2" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{member.completedTasks}/{member.totalTasks} tasks</span>
                        <span className="font-medium">{percentage}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Tip */}
        {sortedProgress.length > 0 && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            Members are sorted by completion percentage. Keep going!
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
