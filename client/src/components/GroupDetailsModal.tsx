import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Users, Crown, Copy, Check, Settings, UserMinus, Trash2,
  Lock, Globe, Calendar, Share2, Loader2, AlertTriangle, UserPlus, Download
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import AddMembersDialog from '@/components/AddMembersDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GroupMember {
  id: string;
  userId: string;
  username: string | null;
  role: string;
  joinedAt: string;
}

interface GroupActivity {
  id: string;
  activityId: string;
  title: string;
  description: string | null;
  category: string;
  sharedAt: string;
  sharedBy: string;
  totalTasks: number;
  completedTasks: number;
}

interface GroupDetails {
  id: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  inviteCode: string;
  createdBy: string;
  createdAt: string;
  members: GroupMember[];
  currentUserRole: string;
}

interface GroupDetailsModalProps {
  groupId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupUpdated?: () => void;
}

export default function GroupDetailsModal({ groupId, open, onOpenChange, onGroupUpdated }: GroupDetailsModalProps) {
  const { toast } = useToast();
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [activities, setActivities] = useState<GroupActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [copyingActivityId, setCopyingActivityId] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);

  useEffect(() => {
    if (open && groupId) {
      loadGroupDetails();
    }
  }, [open, groupId]);

  const loadGroupDetails = async () => {
    if (!groupId) return;

    try {
      setIsLoading(true);

      // Load group details
      const detailsResponse = await apiRequest('GET', `/api/groups/${groupId}`);
      const detailsData = await detailsResponse.json();
      setGroupDetails(detailsData.group);

      // Load group activities
      const activitiesResponse = await apiRequest('GET', `/api/groups/${groupId}/activities`);
      const activitiesData = await activitiesResponse.json();
      setActivities(activitiesData.activities || []);

    } catch (error) {
      console.error('Load group details error:', error);
      toast({
        title: "Failed to load group details",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (groupDetails?.inviteCode) {
      await navigator.clipboard.writeText(groupDetails.inviteCode);
      setCodeCopied(true);
      toast({
        title: "Invite code copied!",
        description: "Share this code to invite new members.",
      });
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!groupId) return;

    try {
      await apiRequest('DELETE', `/api/groups/${groupId}/members/${memberId}`);

      toast({
        title: "Member removed",
        description: "The member has been removed from the group.",
      });

      setRemoveMemberId(null);
      loadGroupDetails();

      if (onGroupUpdated) {
        onGroupUpdated();
      }

    } catch (error) {
      console.error('Remove member error:', error);
      toast({
        title: "Failed to remove member",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleLeaveGroup = async () => {
    if (!groupId || !groupDetails) return;

    try {
      const currentMember = groupDetails.members.find(m => m.role === groupDetails.currentUserRole);
      if (!currentMember) return;

      await apiRequest('DELETE', `/api/groups/${groupId}/members/${currentMember.id}`);

      toast({
        title: "Left group",
        description: `You've left "${groupDetails.name}".`,
      });

      setLeaveDialogOpen(false);
      onOpenChange(false);

      if (onGroupUpdated) {
        onGroupUpdated();
      }

    } catch (error) {
      console.error('Leave group error:', error);
      toast({
        title: "Failed to leave group",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupId) return;

    try {
      await apiRequest('DELETE', `/api/groups/${groupId}`);

      toast({
        title: "Group deleted",
        description: "The group has been permanently deleted.",
      });

      setDeleteDialogOpen(false);
      onOpenChange(false);

      if (onGroupUpdated) {
        onGroupUpdated();
      }

    } catch (error) {
      console.error('Delete group error:', error);
      toast({
        title: "Failed to delete group",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCopyActivity = async (activity: GroupActivity, joinGroup: boolean) => {
    if (!groupId) return;

    try {
      setIsCopying(true);
      setCopyingActivityId(activity.id);

      const response = await apiRequest('POST', `/api/groups/${groupId}/activities/${activity.id}/copy`, {
        joinGroup
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to copy activity');
      }

      const data = await response.json();

      // Invalidate activities cache to show the newly copied activity
      queryClient.invalidateQueries({ queryKey: ['/api/activities/recent'] });

      toast({
        title: joinGroup ? "Joined group and copied activity!" : "Activity copied!",
        description: joinGroup 
          ? `You're now a member of "${groupDetails?.name}". Activity has been added to your plans.`
          : "Activity has been added to your personal plans.",
      });

      // Reload group details to show updated membership if user joined
      if (joinGroup) {
        loadGroupDetails();
      }

    } catch (error: any) {
      console.error('Copy activity error:', error);
      toast({
        title: "Failed to copy activity",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCopying(false);
      setCopyingActivityId(null);
    }
  };

  const handleCopyButtonClick = (activity: GroupActivity) => {
    // Only members can access this modal, so just copy the activity
    // Non-members should use share links to copy group activities
    handleCopyActivity(activity, false);
  };

  const getInitials = (username: string | null) => {
    if (!username) return '?';
    return username.substring(0, 2).toUpperCase();
  };

  const isAdmin = groupDetails?.currentUserRole === 'admin';

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!groupDetails) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-xl flex items-center gap-2">
                  {groupDetails.name}
                  {isAdmin && (
                    <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                      <Crown className="w-3 h-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                </DialogTitle>
                {groupDetails.description && (
                  <DialogDescription className="mt-1">
                    {groupDetails.description}
                  </DialogDescription>
                )}
              </div>
            </div>

            {/* Group Stats */}
            <div className="flex items-center gap-4 pt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>{groupDetails.members?.length || 0} members</span>
              </div>
              <div className="flex items-center gap-1.5">
                {groupDetails.isPrivate ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Private</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4" />
                    <span>Public</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>Created {groupDetails.createdAt ? format(new Date(groupDetails.createdAt), 'MMM d, yyyy') : 'Recently'}</span>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="members" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="w-full">
              <TabsTrigger value="members" className="flex-1">Members</TabsTrigger>
              <TabsTrigger value="activities" className="flex-1">Activities</TabsTrigger>
              <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
            </TabsList>

            {/* Members Tab */}
            <TabsContent value="members" className="flex-1 overflow-y-auto mt-4 space-y-3">
              {isAdmin && (
                <Button
                  onClick={() => setShowInviteDialog(true)}
                  className="w-full mb-4"
                  variant="outline"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Members via Phone/Email
                </Button>
              )}

              {groupDetails.members?.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{getInitials(member.username)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {member.username || 'Unknown User'}
                        {member.role === 'admin' && (
                          <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                            <Crown className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined {member.joinedAt ? format(new Date(member.joinedAt), 'MMM d, yyyy') : 'Unknown'}
                      </p>
                    </div>
                  </div>

                  {isAdmin && member.role !== 'admin' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRemoveMemberId(member.id)}
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </TabsContent>

            {/* Activities Tab */}
            <TabsContent value="activities" className="flex-1 overflow-y-auto mt-4 space-y-3">
              {activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Share2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No activities shared yet</p>
                  <p className="text-sm">Share activities to plan together with your group</p>
                </div>
              ) : (
                activities.map((activity) => {
                  const progressPercentage = activity.totalTasks > 0 
                    ? Math.round((activity.completedTasks / activity.totalTasks) * 100) 
                    : 0;
                  
                  return (
                    <div
                      key={activity.id}
                      className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{activity.title}</h4>
                          {activity.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{activity.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {activity.category && (
                            <Badge variant="secondary" className="text-xs">
                              {activity.category}
                            </Badge>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyButtonClick(activity)}
                            disabled={isCopying && copyingActivityId === activity.id}
                            data-testid={`button-copy-activity-${activity.id}`}
                          >
                            {isCopying && copyingActivityId === activity.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Download className="w-3 h-3 mr-1.5" />
                            )}
                            Copy
                          </Button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-2 mt-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">
                            {activity.completedTasks}/{activity.totalTasks} tasks
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                        <span>Shared by {activity.sharedBy || 'Unknown'}</span>
                        <span>{activity.sharedAt ? format(new Date(activity.sharedAt), 'MMM d, yyyy') : 'Recently'}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="flex-1 overflow-y-auto mt-4 space-y-4">
              {/* Invite Code */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Invite Code</h4>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center justify-center bg-muted rounded-lg p-3 border">
                    <span className="text-xl font-mono font-bold tracking-wider">
                      {groupDetails.inviteCode}
                    </span>
                  </div>
                  <Button variant="outline" size="icon" onClick={handleCopyCode}>
                    {codeCopied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this code with people you want to invite
                </p>
              </div>

              <Separator />

              {/* Danger Zone */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-destructive">Danger Zone</h4>

                {!isAdmin && (
                  <Button
                    variant="outline"
                    className="w-full justify-start text-destructive hover:text-destructive"
                    onClick={() => setLeaveDialogOpen(true)}
                  >
                    <UserMinus className="w-4 h-4 mr-2" />
                    Leave Group
                  </Button>
                )}

                {isAdmin && (
                  <Button
                    variant="outline"
                    className="w-full justify-start text-destructive hover:text-destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Group
                  </Button>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!removeMemberId} onOpenChange={() => setRemoveMemberId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member?</AlertDialogTitle>
            <AlertDialogDescription>
              This member will be removed from the group and will need a new invite code to rejoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeMemberId && handleRemoveMember(removeMemberId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Group Confirmation */}
      <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Group?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll no longer have access to this group's activities and plans. You'll need an invite code to rejoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveGroup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Leave Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Group Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Group Permanently?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All group data, shared activities, and member associations will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite Members Dialog */}
      {groupDetails && (
        <AddMembersDialog
          groupId={groupDetails.id}
          groupName={groupDetails.name}
          open={showInviteDialog}
          onOpenChange={setShowInviteDialog}
          onInvitesSent={() => {
            setShowInviteDialog(false);
            toast({
              title: "Invitations sent!",
              description: "Your invitations have been sent successfully.",
            });
          }}
        />
      )}
    </>
  );
}
