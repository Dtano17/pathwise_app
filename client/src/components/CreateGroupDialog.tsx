import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Users, Loader2, Copy, Check, Lock, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupCreated?: () => void;
}

export default function CreateGroupDialog({ open, onOpenChange, onGroupCreated }: CreateGroupDialogProps) {
  const { toast } = useToast();
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<{ name: string; inviteCode: string } | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your group.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsCreating(true);

      const response = await apiRequest('POST', '/api/groups', {
        name: groupName.trim(),
        description: description.trim() || undefined,
        isPrivate
      });

      const data = await response.json();

      setCreatedGroup({
        name: data.group.name,
        inviteCode: data.group.inviteCode
      });

      toast({
        title: "Group created!",
        description: `"${data.group.name}" is ready to go. Share the invite code to add members.`,
      });

      if (onGroupCreated) {
        onGroupCreated();
      }

    } catch (error) {
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
    // Reset form
    setGroupName('');
    setDescription('');
    setIsPrivate(true);
    setCreatedGroup(null);
    setCodeCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        {!createdGroup ? (
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
              {/* Group Name */}
              <div className="space-y-2">
                <Label htmlFor="groupName">Group Name *</Label>
                <Input
                  id="groupName"
                  placeholder="e.g., Girls Trip to Miami"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  maxLength={100}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="What's this group about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
              </div>

              {/* Privacy Toggle */}
              <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    {isPrivate ? (
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Globe className="w-4 h-4 text-muted-foreground" />
                    )}
                    <Label htmlFor="privacy" className="text-sm font-medium cursor-pointer">
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
                  id="privacy"
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isCreating}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isCreating || !groupName.trim()}>
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 mr-2" />
                    Create Group
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
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
              {/* Invite Code Display */}
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

              {/* Quick Actions */}
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
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
