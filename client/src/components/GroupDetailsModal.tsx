import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Users, Crown, Copy, Check, Settings, UserMinus, Trash2,
  Lock, Globe, Calendar, Share2, Loader2, AlertTriangle, UserPlus, Download
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import AddMembersDialog from '@/components/AddMembersDialog';
import { MemberProgressDialog } from '@/components/MemberProgressDialog';
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
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [selectedActivityToCopy, setSelectedActivityToCopy] = useState<GroupActivity | null>(null);
  const [shareProgress, setShareProgress] = useState(true);

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

  const handleCopyActivity = async (activity: GroupActivity, joinGroup: boolean, shareProgress: boolean) => {
    if (!groupId) return;

    try {
      setIsCopying(true);
      setCopyingActivityId(activity.id);

      const response = await apiRequest('POST', `/api/groups/${groupId}/activities/${activity.id}/copy`, {
        joinGroup,
        shareProgress
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
          : shareProgress 
            ? "Activity copied! Your progress will be shared with the group."
            : "Activity copied to your personal plans.",
      });

      // Reload group details to show updated membership if user joined
      if (joinGroup) {
        loadGroupDetails();
      }

      // Close the copy dialog
      setCopyDialogOpen(false);
      setSelectedActivityToCopy(null);

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
    // Show dialog to choose whether to share progress
    setSelectedActivityToCopy(activity);
    setShareProgress(true); // Default to sharing enabled
    setCopyDialogOpen(true);
  };

  const handleConfirmCopy = () => {
    if (!selectedActivityToCopy) return;
    handleCopyActivity(selectedActivityToCopy, false, shareProgress);
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
        <DialogContent className="max-w-sm sm:max-w-md md:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-3 sm:p-6">
          <DialogHeader className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg sm:text-xl flex flex-wrap items-center gap-2 break-words">
                  {groupDetails.name}
                  {isAdmin && (
                    <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-xs sm:text-sm">
                      <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                      Admin
                    </Badge>
                  )}
                </DialogTitle>
                {groupDetails.description && (
                  <DialogDescription className="mt-1 text-xs sm:text-sm line-clamp-2">
                    {groupDetails.description}
                  </DialogDescription>
                )}
              </div>
            </div>

            {/* Group Stats - Responsive Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-3 md:flex md:items-center md:gap-4 gap-2 pt-2 text-xs sm:text-sm text-muted-foreground">
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5 items-start gap-1">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="truncate">{groupDetails.members?.length || 0} members</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5 items-start gap-1">
                {groupDetails.isPrivate ? (
                  <>
                    <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span>Private</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span>Public</span>
                  </>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5 items-start gap-1">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="truncate">{groupDetails.createdAt ? format(new Date(groupDetails.createdAt), 'MMM d, yy') : 'Recent'}</span>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="members" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="w-full grid grid-cols-3 h-auto p-1">
              <TabsTrigger value="members" className="text-xs sm:text-sm py-2">Members</TabsTrigger>
              <TabsTrigger value="activities" className="text-xs sm:text-sm py-2">Activities</TabsTrigger>
              <TabsTrigger value="settings" className="text-xs sm:text-sm py-2">Settings</TabsTrigger>
            </TabsList>

            {/* Members Tab */}
            <TabsContent value="members" className="flex-1 overflow-y-auto mt-3 sm:mt-4 space-y-2 sm:space-y-3 px-0.5">
              {isAdmin && (
                <Button
                  onClick={() => setShowInviteDialog(true)}
                  className="w-full mb-2 sm:mb-4 text-xs sm:text-sm h-auto py-2 sm:py-2.5"
                  variant="outline"
                >
                  <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 shrink-0" />
                  <span className="hidden xs:inline">Invite Members via Phone/Email</span>
                  <span className="xs:hidden">Invite Members</span>
                </Button>
              )}

              {groupDetails.members?.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <Avatar className="w-8 h-8 sm:w-10 sm:h-10 shrink-0">
                      <AvatarFallback className="text-xs sm:text-sm">{getInitials(member.username)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base flex flex-wrap items-center gap-1 sm:gap-2 truncate">
                        <span className="truncate">{member.username || 'Unknown User'}</span>
                        {member.role === 'admin' && (
                          <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-xs flex-shrink-0">
                            <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                            Admin
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined {member.joinedAt ? format(new Date(member.joinedAt), 'MMM d, yy') : 'Unknown'}
                      </p>
                    </div>
                  </div>

                  {isAdmin && member.role !== 'admin' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRemoveMemberId(member.id)}
                      className="w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-9"
                    >
                      <UserMinus className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">Remove</span>
                    </Button>
                  )}
                </div>
              ))}
            </TabsContent>

            {/* Activities Tab */}
            <TabsContent value="activities" className="flex-1 overflow-y-auto mt-3 sm:mt-4 space-y-2 sm:space-y-3 px-0.5">
              {activities.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-muted-foreground">
                  <Share2 className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 opacity-50" />
                  <p className="text-sm sm:text-base font-medium">No activities shared yet</p>
                  <p className="text-xs sm:text-sm">Share activities to plan together with your group</p>
                </div>
              ) : (
                activities.map((activity) => <ActivityCard key={activity.id} activity={activity} groupId={groupId!} onCopy={handleCopyButtonClick} isCopying={isCopying && copyingActivityId === activity.id} />)
              )}
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="flex-1 overflow-y-auto mt-3 sm:mt-4 space-y-3 sm:space-y-4 px-0.5">
              {/* Invite Code */}
              <div className="space-y-2">
                <h4 className="text-xs sm:text-sm font-medium">Invite Code</h4>
                <div className="flex gap-1.5 sm:gap-2">
                  <div className="flex-1 flex items-center justify-center bg-muted rounded-lg p-2 sm:p-3 border">
                    <span className="text-base sm:text-xl font-mono font-bold tracking-wider text-center">
                      {groupDetails.inviteCode}
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleCopyCode}
                    className="h-9 sm:h-auto px-2 sm:px-3"
                  >
                    {codeCopied ? (
                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this code to invite people
                </p>
              </div>

              <Separator />

              {/* Danger Zone */}
              <div className="space-y-2 sm:space-y-3">
                <h4 className="text-xs sm:text-sm font-medium text-destructive">Danger Zone</h4>

                {!isAdmin && (
                  <Button
                    variant="outline"
                    className="w-full justify-start text-destructive hover:text-destructive text-xs sm:text-sm h-8 sm:h-auto py-2 sm:py-2.5"
                    onClick={() => setLeaveDialogOpen(true)}
                  >
                    <UserMinus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 shrink-0" />
                    Leave Group
                  </Button>
                )}

                {isAdmin && (
                  <Button
                    variant="outline"
                    className="w-full justify-start text-destructive hover:text-destructive text-xs sm:text-sm h-8 sm:h-auto py-2 sm:py-2.5"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 shrink-0" />
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

      {/* Copy Activity Confirmation with Progress Sharing Option */}
      <AlertDialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Copy Activity</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedActivityToCopy && (
                <span className="block mb-4">
                  Copy <strong>{selectedActivityToCopy.title}</strong> to your personal plans?
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="flex items-start space-x-3 p-4 rounded-lg bg-muted/50 border">
            <Checkbox
              id="share-progress"
              checked={shareProgress}
              onCheckedChange={(checked) => setShareProgress(checked as boolean)}
              data-testid="checkbox-share-progress"
            />
            <div className="space-y-1 flex-1">
              <label
                htmlFor="share-progress"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                Share my progress with the group
              </label>
              <p className="text-xs text-muted-foreground">
                When enabled, group members will see when you complete tasks from this activity. You can change this later.
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCopying} data-testid="button-cancel-copy">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCopy}
              disabled={isCopying}
              data-testid="button-confirm-copy"
            >
              {isCopying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Copying...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Copy Activity
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Activity Card Component with Member Progress
interface ActivityCardProps {
  activity: GroupActivity;
  groupId: string;
  onCopy: (activity: GroupActivity) => void;
  isCopying: boolean;
}

function ActivityCard({ activity, groupId, onCopy, isCopying }: ActivityCardProps) {
  const [showProgressDialog, setShowProgressDialog] = useState(false);

  const { data: memberProgress, isLoading } = useQuery({
    queryKey: [`/api/groups/${groupId}/activities/${activity.id}/member-progress`],
    enabled: !!groupId && !!activity.id,
  });

  const progressPercentage = activity.totalTasks > 0
    ? Math.round((activity.completedTasks / activity.totalTasks) * 100)
    : 0;

  // API returns { memberProgress: [...] } where memberProgress is the array
  const members = (memberProgress as any)?.memberProgress || [];
  const hasSharingMembers = members.length > 0;

  return (
    <div className="p-2.5 sm:p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm sm:text-base truncate">{activity.title}</h4>
          {activity.description && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">{activity.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap sm:flex-nowrap">
          {activity.category && (
            <Badge variant="secondary" className="text-xs">
              {activity.category}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCopy(activity)}
            disabled={isCopying}
            data-testid={`button-copy-activity-${activity.id}`}
            className="text-xs sm:text-sm h-7 sm:h-9 px-2 sm:px-3"
          >
            {isCopying ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Download className="w-3 h-3 sm:mr-1.5 mr-1" />
            )}
            <span className="hidden sm:inline">Copy</span>
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs sm:text-sm">
          <span className="text-muted-foreground">Group Progress</span>
          <span className="font-medium text-xs sm:text-sm">
            {activity.completedTasks}/{activity.totalTasks}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5 sm:h-2">
          <div 
            className="bg-primary h-1.5 sm:h-2 rounded-full transition-all duration-300" 
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Member Progress Section */}
      {hasSharingMembers && (
        <div className="mt-3 pt-3 border-t space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Members Sharing Progress</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowProgressDialog(true)}
              className="h-6 text-xs px-2 hover:bg-primary/10"
            >
              <Users className="w-3 h-3 mr-1" />
              View Details
            </Button>
          </div>
          {members.slice(0, 3).map((member: any) => {
            const memberPercentage = member.totalTasks > 0
              ? Math.round((member.completedTasks / member.totalTasks) * 100)
              : 0;

            return (
              <div key={member.userId} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium truncate">{member.username}</span>
                  <span className="text-muted-foreground shrink-0">
                    {member.completedTasks}/{member.totalTasks}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-1">
                  <div
                    className="bg-emerald-500 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${memberPercentage}%` }}
                  />
                </div>
              </div>
            );
          })}
          {members.length > 3 && (
            <p className="text-xs text-muted-foreground">
              +{members.length - 3} more member{members.length - 3 > 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground gap-1">
        <span className="truncate">by {activity.sharedBy || '?'}</span>
        <span className="shrink-0">{activity.sharedAt ? format(new Date(activity.sharedAt), 'MMM d, yy') : 'Recent'}</span>
      </div>

      {/* Member Progress Dialog */}
      <MemberProgressDialog
        open={showProgressDialog}
        onOpenChange={setShowProgressDialog}
        groupId={groupId}
        groupActivityId={activity.id}
        activityTitle={activity.title}
      />
    </div>
  );
}
