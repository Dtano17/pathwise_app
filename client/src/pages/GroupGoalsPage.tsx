import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, CheckCircle2, Plus, Sparkles, ArrowRight, Circle, Share2, ArrowLeft, Home, RefreshCw, LogOut } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";

interface Group {
  id: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  memberCount: number;
  role: string;
  createdAt: string;
  tasksCompleted?: number;
  tasksTotal?: number;
}

interface GroupProgress {
  groupActivityId: string;
  activityTitle: string;
  totalTasks: number;
  completedTasks: number;
}

interface GroupActivityFeedItem {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  actionType: 'task_completed' | 'task_added' | 'activity_shared' | 'member_joined' | 'member_left';
  targetName: string;
  description: string | null;
  timestamp: string;
}

interface GroupActivity {
  id: string;
  userId: string;
  userName: string;
  activityType: string; // 'task_completed' | 'task_added' | 'activity_shared' | etc.
  taskTitle: string | null;
  activityTitle: string | null;
  timestamp: string;
  groupName: string;
}

interface Activity {
  id: string;
  title: string;
  description: string | null;
  category: string;
}

export default function GroupGoalsPage() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createStep, setCreateStep] = useState<'details' | 'activity'>('details');
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedGroupForShare, setSelectedGroupForShare] = useState<string | null>(null);

  // Fetch user's groups with auto-refresh every 10 seconds
  const { data: groupsData, isLoading: groupsLoading, refetch: refetchGroups } = useQuery<{ groups: Group[] }>({
    queryKey: ["/api/groups"],
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });
  const groups = groupsData?.groups || [];

  // Fetch recent group activity with auto-refresh every 10 seconds
  const { data: activities, isLoading: activitiesLoading, refetch: refetchActivities } = useQuery<GroupActivity[]>({
    queryKey: ["/api/groups/activity"],
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  // Manual refresh function for mobile users
  const handleRefresh = async () => {
    await Promise.all([refetchGroups(), refetchActivities()]);
    toast({
      title: "Refreshed",
      description: "Groups and activity updated!",
    });
  };

  // Fetch user activities (only when dialog is open)
  const { data: userActivities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
    enabled: createDialogOpen && createStep === 'activity',
  });

  // Fetch user activities for share dialog
  const { data: shareActivities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
    enabled: shareDialogOpen,
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; isPrivate: boolean }) => {
      const response = await apiRequest("POST", "/api/groups", data);
      return response.json();
    },
    onSuccess: async (data: { group: { id: string } }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      
      // If an activity was selected, share it to the group
      if (selectedActivityId) {
        try {
          await apiRequest("POST", `/api/activities/${selectedActivityId}/share`, {
            groupId: data.group.id
          });
          
          toast({
            title: "Group created",
            description: "Your group has been created and activity added successfully!",
          });
        } catch (error) {
          toast({
            title: "Group created",
            description: "Group created, but failed to add activity. You can add it later.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Group created",
          description: "Your group has been created successfully.",
        });
      }
      
      // Reset form
      setCreateDialogOpen(false);
      setCreateStep('details');
      setGroupName("");
      setGroupDescription("");
      setIsPrivate(false);
      setSelectedActivityId(null);
      
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/activity"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create group",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/groups/join", { inviteCode: code });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setJoinDialogOpen(false);
      setInviteCode("");
      toast({
        title: "Joined group",
        description: "You've successfully joined the group.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to join group",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Share activity mutation
  const shareActivityMutation = useMutation({
    mutationFn: async ({ activityId, groupId }: { activityId: string; groupId: string }) => {
      const response = await apiRequest("POST", `/api/activities/${activityId}/share`, { groupId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/activity"] });
      setShareDialogOpen(false);
      setSelectedActivityId(null);
      setSelectedGroupForShare(null);
      toast({
        title: "Activity shared",
        description: "Activity has been added to your group successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to share activity",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (!groupName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a group name.",
        variant: "destructive",
      });
      return;
    }
    setCreateStep('activity');
  };

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a group name.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedActivityId) {
      toast({
        title: "Activity required",
        description: "Please select an activity to create the group.",
        variant: "destructive",
      });
      return;
    }
    createGroupMutation.mutate({
      name: groupName,
      description: groupDescription,
      isPrivate,
    });
  };

  const handleBack = () => {
    setCreateStep('details');
    setSelectedActivityId(null);
  };

  const handleShareActivity = () => {
    if (selectedActivityId && selectedGroupForShare) {
      shareActivityMutation.mutate({
        activityId: selectedActivityId,
        groupId: selectedGroupForShare,
      });
    }
  };

  const openShareDialog = (groupId: string) => {
    setSelectedGroupForShare(groupId);
    setSelectedActivityId(null);
    setShareDialogOpen(true);
  };

  const handleJoinGroup = () => {
    if (!inviteCode.trim()) {
      toast({
        title: "Code required",
        description: "Please enter an invite code.",
        variant: "destructive",
      });
      return;
    }
    joinGroupMutation.mutate(inviteCode);
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case "task_completed":
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case "task_added":
        return <Circle className="w-5 h-5 text-blue-400" />;
      case "activity_shared":
        return <Share2 className="w-5 h-5 text-purple-400" />;
      case "member_joined":
        return <UserPlus className="w-5 h-5 text-primary" />;
      case "member_left":
        return <LogOut className="w-5 h-5 text-orange-400" />;
      default:
        return <Users className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getActivityBackground = (activityType: string) => {
    switch (activityType) {
      case "task_completed":
        return "bg-emerald-500/10 border-emerald-500/20";
      case "task_added":
        return "bg-blue-500/10 border-blue-500/20";
      case "activity_shared":
        return "bg-purple-500/10 border-purple-500/20";
      case "member_joined":
        return "bg-primary/10 border-primary/20";
      case "member_left":
        return "bg-orange-500/10 border-orange-500/20";
      default:
        return "bg-background/40 border-border/50";
    }
  };

  const getActivityText = (activity: GroupActivity) => {
    const taskName = activity.taskTitle || "a task";
    const activityName = activity.activityTitle || "an activity";
    const userName = activity.userName || "Someone";

    switch (activity.activityType) {
      case "task_completed":
        return (
          <>
            <span className="font-medium">{userName}</span> completed <span className="font-medium">"{taskName}"</span>
          </>
        );
      case "task_added":
        return (
          <>
            <span className="font-medium">{userName}</span> added new task <span className="font-medium">"{taskName}"</span>
          </>
        );
      case "activity_shared":
        return (
          <>
            <span className="font-medium">{userName}</span> shared <span className="font-medium">{activityName}</span>
          </>
        );
      case "member_joined":
        return (
          <>
            <span className="font-medium">{userName}</span> joined the group
          </>
        );
      case "member_left":
        return (
          <>
            <span className="font-medium">{userName}</span> left the group
          </>
        );
      default:
        return <span className="font-medium">{userName}</span>;
    }
  };

  return (
    <div className="h-screen overflow-auto bg-background p-6 space-y-8">
      {/* Navigation Buttons */}
      <div className="max-w-6xl mx-auto">
        <div className="flex gap-2 mb-6">
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-home">
              <Home className="w-4 h-4" />
              Home
            </Button>
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Group Goals & Shared Accountability</h1>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              Preview Mode
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleRefresh}
            data-testid="button-refresh-groups"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
        <p className="text-muted-foreground">
          Create groups, share goals, and celebrate progress together!
        </p>
      </div>

      {/* Create and Join Group Cards */}
      <div className="max-w-6xl mx-auto">
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          {/* Create New Group */}
          <Card className="hover-elevate cursor-pointer" onClick={() => setCreateDialogOpen(true)} data-testid="card-create-group">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <CardTitle>Create New Group</CardTitle>
              <CardDescription>
                Start a new group for shared goals and accountability
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button className="w-full" data-testid="button-create-group">
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            </CardContent>
          </Card>

          {/* Join Group */}
          <Card className="hover-elevate cursor-pointer" onClick={() => setJoinDialogOpen(true)} data-testid="card-join-group">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <UserPlus className="w-8 h-8 text-primary" />
              </div>
              <CardTitle>Join Group</CardTitle>
              <CardDescription>
                Enter an invite code to join an existing group
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Enter invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                data-testid="input-invite-code"
              />
              <Button
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  handleJoinGroup();
                }}
                disabled={joinGroupMutation.isPending}
                data-testid="button-join-group"
              >
                Join Group
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-sm text-muted-foreground text-center">
          <strong>Phase 1:</strong> Basic group creation is now available. <strong>Phase 2:</strong> Coming soon!
        </p>
      </div>

      {/* My Groups */}
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">My Groups</h2>
        
        {groupsLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-full mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : groups && groups.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {groups.map((group) => {
              const progress = group.tasksTotal && group.tasksTotal > 0
                ? Math.round((group.tasksCompleted || 0) / group.tasksTotal * 100)
                : 0;

              return (
                <Card key={group.id} className="hover-elevate cursor-pointer" data-testid={`card-group-${group.id}`}>
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
                    <Button className="w-full" variant="secondary" size="sm" data-testid={`button-view-group-${group.id}`}>
                      View Group
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                You haven't joined any groups yet. Create or join a group to get started!
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Group Activity */}
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Recent Group Activity</h2>
        
        {activitiesLoading ? (
          <Card className="bg-card/50">
            <CardContent className="py-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg animate-pulse">
                  <div className="w-5 h-5 bg-muted rounded-full mt-0.5" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : activities && activities.length > 0 ? (
          <Card className="bg-card/50">
            <CardContent className="py-6 space-y-2">
              {activities.map((activity) => (
                <div 
                  key={activity.id} 
                  className={`flex items-start gap-3 p-3 rounded-lg border ${getActivityBackground(activity.activityType)}`}
                  data-testid={`activity-${activity.id}`}
                >
                  <div className="mt-0.5">
                    {getActivityIcon(activity.activityType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      {getActivityText(activity)}
                    </p>
                    {activity.groupName && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activity.groupName}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card/50">
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No recent activity. Group activities will appear here when members complete tasks or make changes.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Community Plans Section */}
      <div className="max-w-6xl mx-auto">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <CardTitle className="text-primary">Community Powered</CardTitle>
            </div>
            <CardTitle className="text-2xl">Discover & Use Community Plans</CardTitle>
            <CardDescription>
              Browse plans created by others, get inspired, and use them for your own goals. Join thousands planning together!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/community-plans">
              <Button size="lg" className="w-full sm:w-auto" data-testid="button-discover-plans">
                Browse Community Plans
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Create Group Dialog - Multi-step */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) {
          setCreateStep('details');
          setSelectedActivityId(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh]" data-testid="dialog-create-group">
          {createStep === 'details' ? (
            <>
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
                <DialogDescription>
                  Create a group to plan activities and collaborate with others.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="group-name">Group Name</Label>
                  <Input
                    id="group-name"
                    placeholder="e.g., Family Trip to Miami"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    data-testid="input-group-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="group-description">Description (Optional)</Label>
                  <Textarea
                    id="group-description"
                    placeholder="Planning our perfect weekend getaway with the family"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    rows={3}
                    data-testid="input-group-description"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="private-group">Private Group</Label>
                    <p className="text-xs text-muted-foreground">
                      Only invited members can join
                    </p>
                  </div>
                  <Switch
                    id="private-group"
                    checked={isPrivate}
                    onCheckedChange={setIsPrivate}
                    data-testid="switch-private-group"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)} data-testid="button-cancel-create">
                  Cancel
                </Button>
                <Button onClick={handleNext} data-testid="button-next-create">
                  Next: Add Activity
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Link an Activity</DialogTitle>
                <DialogDescription>
                  Choose an activity to share with your group. The tasks will be the progress tracker based on completion.
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="h-[300px] pr-4">
                {userActivities && userActivities.length > 0 ? (
                  <div className="space-y-2">
                    {userActivities.map((activity) => (
                      <Card
                        key={activity.id}
                        className={`cursor-pointer transition-all ${
                          selectedActivityId === activity.id
                            ? 'ring-2 ring-primary'
                            : 'hover-elevate'
                        }`}
                        onClick={() => {
                          setSelectedActivityId(activity.id);
                        }}
                        data-testid={`activity-card-${activity.id}`}
                      >
                        <CardHeader className="p-4">
                          <CardTitle className="text-base">{activity.title}</CardTitle>
                          {activity.description && (
                            <CardDescription className="line-clamp-2 text-sm">
                              {activity.description}
                            </CardDescription>
                          )}
                          <Badge variant="secondary" className="w-fit text-xs mt-2">
                            {activity.category}
                          </Badge>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No personal activities yet.</p>
                    <p className="text-sm mt-1">Create an activity first to add it to a group.</p>
                  </div>
                )}
              </ScrollArea>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={handleBack} data-testid="button-back-create">
                  Back
                </Button>
                <Button
                  onClick={handleCreateGroup}
                  disabled={!selectedActivityId || createGroupMutation.isPending}
                  data-testid="button-submit-create"
                >
                  {createGroupMutation.isPending ? "Creating..." : "Create Group"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Join Group Dialog */}
      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent data-testid="dialog-join-group">
          <DialogHeader>
            <DialogTitle>Join Group</DialogTitle>
            <DialogDescription>
              Enter an invite code to join an existing group
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="join-invite-code">Invite Code</Label>
              <Input
                id="join-invite-code"
                placeholder="Enter invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                data-testid="input-join-invite-code"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinDialogOpen(false)} data-testid="button-cancel-join">
              Cancel
            </Button>
            <Button
              onClick={handleJoinGroup}
              disabled={joinGroupMutation.isPending}
              data-testid="button-submit-join"
            >
              {joinGroupMutation.isPending ? "Joining..." : "Join Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Activity Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={(open) => {
        setShareDialogOpen(open);
        if (!open) {
          setSelectedActivityId(null);
          setSelectedGroupForShare(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh]" data-testid="dialog-share-activity">
          <DialogHeader>
            <DialogTitle>Share Activity to Group</DialogTitle>
            <DialogDescription>
              Choose an activity to share with your group
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[350px] pr-4">
            {shareActivities && shareActivities.length > 0 ? (
              <div className="space-y-2">
                {shareActivities.map((activity) => (
                  <Card
                    key={activity.id}
                    className={`cursor-pointer transition-all ${
                      selectedActivityId === activity.id
                        ? 'ring-2 ring-primary'
                        : 'hover-elevate'
                    }`}
                    onClick={() => {
                      setSelectedActivityId(activity.id);
                    }}
                    data-testid={`share-activity-card-${activity.id}`}
                  >
                    <CardHeader className="p-4">
                      <CardTitle className="text-base">{activity.title}</CardTitle>
                      {activity.description && (
                        <CardDescription className="line-clamp-2 text-sm">
                          {activity.description}
                        </CardDescription>
                      )}
                      <Badge variant="secondary" className="w-fit text-xs mt-2">
                        {activity.category}
                      </Badge>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No personal activities yet.</p>
                <p className="text-sm mt-1">Create an activity first to share it.</p>
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialogOpen(false)} data-testid="button-cancel-share">
              Cancel
            </Button>
            <Button
              onClick={handleShareActivity}
              disabled={!selectedActivityId || shareActivityMutation.isPending}
              data-testid="button-submit-share"
            >
              {shareActivityMutation.isPending ? "Sharing..." : "Share Activity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
