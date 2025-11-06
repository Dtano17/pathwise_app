import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Loader2, Copy, Check, Lock, Globe, Target, Calendar, MapPin, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import type { Activity } from '@shared/schema';

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupCreated?: () => void;
}

export default function CreateGroupDialog({ open, onOpenChange, onGroupCreated }: CreateGroupDialogProps) {
  const { toast } = useToast();
  
  // Step state: 'details' -> 'activity' -> 'success'
  const [createStep, setCreateStep] = useState<'details' | 'activity' | 'success'>('details');
  
  // Form state
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<{ name: string; inviteCode: string } | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  
  // Activity selection state
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  // Fetch personal activities
  const { data: personalActivitiesData } = useQuery<{ activities: Activity[] }>({
    queryKey: ['/api/activities'],
    enabled: open && createStep === 'activity',
  });
  const personalActivities = personalActivitiesData?.activities || [];

  const handleNext = () => {
    if (!groupName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your group.",
        variant: "destructive"
      });
      return;
    }
    setCreateStep('activity');
  };

  const handleBack = () => {
    setCreateStep('details');
    setSelectedActivityId(null);
  };

  const handleSkipActivity = async () => {
    await createGroup(null);
  };

  const handleCreateGroup = async () => {
    if (!selectedActivityId) {
      toast({
        title: "No activity selected",
        description: "Please select an activity or click Skip.",
        variant: "destructive"
      });
      return;
    }
    await createGroup(selectedActivityId);
  };

  const createGroup = async (activityId: string | null) => {
    try {
      setIsCreating(true);

      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: groupName.trim(),
          description: description.trim() || undefined,
          isPrivate,
          activityId: activityId || undefined,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403 && data.message) {
          toast({
            title: "Subscription Required",
            description: data.message,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Failed to create group",
            description: data.error || "Please try again.",
            variant: "destructive"
          });
        }
        return;
      }

      setCreatedGroup({
        name: data.group.name,
        inviteCode: data.group.inviteCode
      });

      setCreateStep('success');

      toast({
        title: "Group created!",
        description: `"${data.group.name}" is ready to go. Share the invite code to add members.`,
      });

      if (onGroupCreated) {
        onGroupCreated();
      }

    } catch (error: any) {
      console.error('Create group error:', error);
      toast({
        title: "Failed to create group",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyCode = async () => {
    if (createdGroup?.inviteCode) {
      await navigator.clipboard.writeText(createdGroup.inviteCode);
      setCodeCopied(true);
      toast({
        title: "Invite code copied!",
        description: "Share this code with people you want to invite.",
      });
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleClose = () => {
    // Reset all state
    setGroupName('');
    setDescription('');
    setIsPrivate(true);
    setCreatedGroup(null);
    setCodeCopied(false);
    setCreateStep('details');
    setSelectedActivityId(null);
    onOpenChange(false);
  };

  const getActivityIcon = (category?: string) => {
    switch (category) {
      case 'Travel': return <MapPin className="w-4 h-4" />;
      case 'Events': return <Calendar className="w-4 h-4" />;
      case 'Goals': return <Target className="w-4 h-4" />;
      default: return <TrendingUp className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]" data-testid="dialog-create-group">
        {createStep === 'details' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Create New Group
              </DialogTitle>
              <DialogDescription>
                Create a group to plan activities and collaborate with others.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">Group Name *</Label>
                <Input
                  id="group-name"
                  placeholder="e.g., Girls Trip to Miami"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  maxLength={100}
                  data-testid="input-group-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="group-description">Description (optional)</Label>
                <Textarea
                  id="group-description"
                  placeholder="What's this group about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={500}
                  data-testid="input-group-description"
                />
              </div>

              <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    {isPrivate ? (
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Globe className="w-4 h-4 text-muted-foreground" />
                    )}
                    <Label htmlFor="privacy-toggle" className="text-sm font-medium cursor-pointer">
                      {isPrivate ? 'Private Group' : 'Public Group'}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isPrivate
                      ? 'Only people with the invite code can join'
                      : 'Anyone can discover and join this group'}
                  </p>
                </div>
                <Switch
                  id="privacy-toggle"
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                  data-testid="switch-group-privacy"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} data-testid="button-cancel-create">
                Cancel
              </Button>
              <Button onClick={handleNext} disabled={!groupName.trim()} data-testid="button-next-create">
                Next: Add Activity
              </Button>
            </DialogFooter>
          </>
        )}

        {createStep === 'activity' && (
          <>
            <DialogHeader>
              <DialogTitle>Link an Activity (Optional)</DialogTitle>
              <DialogDescription>
                Choose an activity to share with your group, or skip to create an empty group
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="h-[350px] pr-4">
              {personalActivities && personalActivities.length > 0 ? (
                <div className="space-y-2">
                  {personalActivities.map((activity) => (
                    <Card
                      key={activity.id}
                      className={`cursor-pointer transition-all ${
                        selectedActivityId === activity.id
                          ? 'ring-2 ring-primary'
                          : 'hover-elevate'
                      }`}
                      onClick={() => setSelectedActivityId(activity.id)}
                      data-testid={`card-activity-${activity.id}`}
                    >
                      <CardHeader className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                              {getActivityIcon(activity.category)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-sm truncate">{activity.title}</CardTitle>
                              {activity.description && (
                                <CardDescription className="text-xs line-clamp-2 mt-1">
                                  {activity.description}
                                </CardDescription>
                              )}
                            </div>
                          </div>
                          {selectedActivityId === activity.id && (
                            <Check className="w-5 h-5 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {activity.category && (
                            <Badge variant="secondary" className="text-xs">
                              {activity.category}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No personal activities yet. Create one from the Activities tab!</p>
                </div>
              )}
            </ScrollArea>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleBack} data-testid="button-back-create">
                Back
              </Button>
              <div className="flex gap-2 flex-1 sm:flex-initial">
                <Button
                  variant="ghost"
                  onClick={handleSkipActivity}
                  disabled={isCreating}
                  data-testid="button-skip-activity"
                >
                  Skip
                </Button>
                <Button
                  onClick={handleCreateGroup}
                  disabled={!selectedActivityId || isCreating}
                  data-testid="button-submit-create"
                >
                  {isCreating ? "Creating..." : "Create Group"}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}

        {createStep === 'success' && createdGroup && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                Group Created Successfully!
              </DialogTitle>
              <DialogDescription>
                Share this invite code with people you want to add to "{createdGroup.name}"
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Invite Code</Label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center justify-center bg-muted rounded-lg p-4 border-2 border-dashed">
                    <span className="text-2xl font-mono font-bold tracking-wider">
                      {createdGroup.inviteCode}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyCode}
                    className="h-auto"
                    data-testid="button-copy-code"
                  >
                    {codeCopied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Members can use this code to join your group from the "Join Group" button.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Next Steps:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Share the invite code with your group members</li>
                  <li>• They can join by clicking "Join Group" and entering the code</li>
                  <li>• Start planning activities together!</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full" data-testid="button-done">
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
