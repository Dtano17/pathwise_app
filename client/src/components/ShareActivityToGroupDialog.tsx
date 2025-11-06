import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Users, Loader2, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Group {
  id: string;
  name: string;
  memberCount: number;
  role: string;
}

interface ShareActivityToGroupDialogProps {
  activityId: string;
  activityTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActivityShared?: () => void;
}

export default function ShareActivityToGroupDialog({
  activityId,
  activityTitle,
  open,
  onOpenChange,
  onActivityShared
}: ShareActivityToGroupDialogProps) {
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (open) {
      loadGroups();
    }
  }, [open]);

  const loadGroups = async () => {
    try {
      setIsLoading(true);

      const response = await apiRequest('GET', '/api/groups');
      const data = await response.json();

      const groupsList = data.groups || [];
      setGroups(groupsList);

      // Auto-select first group if only one exists
      if (groupsList.length === 1) {
        setSelectedGroupId(groupsList[0].id);
      }
    } catch (error) {
      console.error('Load groups error:', error);
      toast({
        title: "Failed to load groups",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!selectedGroupId) {
      toast({
        title: "No group selected",
        description: "Please select a group to share this activity with.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSharing(true);

      await apiRequest('POST', `/api/groups/${selectedGroupId}/activities`, {
        activityId
      });

      toast({
        title: "Activity shared!",
        description: `"${activityTitle}" has been shared with the group.`,
      });

      if (onActivityShared) {
        onActivityShared();
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error('Share activity error:', error);

      if (error.message?.includes('already shared')) {
        toast({
          title: "Already shared",
          description: "This activity is already shared with this group.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Failed to share activity",
          description: "Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleClose = () => {
    setSelectedGroupId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Share Activity with Group
          </DialogTitle>
          <DialogDescription>
            Share "{activityTitle}" with a group for collaborative planning
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground mb-4">
                You're not part of any groups yet
              </p>
              <p className="text-xs text-muted-foreground">
                Create or join a group to share activities
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Label>Select Group</Label>
              <RadioGroup value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <div className="space-y-2">
                  {groups.map((group) => (
                    <div
                      key={group.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedGroupId === group.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedGroupId(group.id)}
                    >
                      <RadioGroupItem value={group.id} id={group.id} />
                      <Label htmlFor={group.id} className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{group.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
                            </p>
                          </div>
                          {group.role === 'admin' && (
                            <Badge variant="secondary" className="text-xs">
                              Admin
                            </Badge>
                          )}
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  What happens when you share?
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Group members can view this activity and its tasks</li>
                  <li>• Members can propose changes to improve the plan</li>
                  <li>• The group will have a master copy for collaboration</li>
                  <li>• You'll see all activity updates in real-time</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSharing}>
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            disabled={isSharing || !selectedGroupId || groups.length === 0}
          >
            {isSharing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Share Activity
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
