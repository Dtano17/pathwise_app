import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Loader2, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface JoinGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupJoined?: () => void;
}

export default function JoinGroupDialog({ open, onOpenChange, onGroupJoined }: JoinGroupDialogProps) {
  const { toast } = useToast();
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinedGroup, setJoinedGroup] = useState<{ name: string } | null>(null);

  const formatInviteCode = (value: string) => {
    // Remove non-alphanumeric characters
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Split into groups of 3
    const parts = [];
    for (let i = 0; i < cleaned.length && i < 9; i += 3) {
      parts.push(cleaned.substring(i, i + 3));
    }

    return parts.join('-');
  };

  const handleInviteCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatInviteCode(e.target.value);
    setInviteCode(formatted);
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      toast({
        title: "Invite code required",
        description: "Please enter a valid invite code.",
        variant: "destructive"
      });
      return;
    }

    // Validate format (should have dashes)
    if (inviteCode.replace(/-/g, '').length !== 9) {
      toast({
        title: "Invalid invite code",
        description: "Invite codes must be 9 characters (ABC-123-XYZ format).",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsJoining(true);

      // Send with dashes (database stores with dashes)
      const response = await apiRequest('POST', '/api/groups/join', {
        inviteCode: inviteCode
      });

      const data = await response.json();

      setJoinedGroup({
        name: data.group.name
      });

      toast({
        title: "Successfully joined!",
        description: `You're now a member of "${data.group.name}".`,
      });

      if (onGroupJoined) {
        onGroupJoined();
      }

    } catch (error: any) {
      console.error('Join group error:', error);

      // Try to extract error message from response
      let errorMessage = '';
      try {
        if (error.response) {
          const errorData = await error.response.json();
          errorMessage = errorData.error || errorData.message || '';
        }
      } catch {
        errorMessage = error.message || '';
      }

      if (errorMessage.toLowerCase().includes('already a member')) {
        toast({
          title: "Already a member",
          description: "You're already part of this group.",
          variant: "destructive"
        });
      } else if (errorMessage.toLowerCase().includes('invalid invite code') || errorMessage.toLowerCase().includes('not found')) {
        toast({
          title: "Invalid invite code",
          description: "This invite code doesn't exist or has expired.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Failed to join group",
          description: errorMessage || "Please check the invite code and try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setInviteCode('');
    setJoinedGroup(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        {!joinedGroup ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Join a Group
              </DialogTitle>
              <DialogDescription>
                Enter the invite code shared by a group admin to join.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Invite Code Input */}
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Invite Code</Label>
                <Input
                  id="inviteCode"
                  placeholder="ABC-123-XYZ"
                  value={inviteCode}
                  onChange={handleInviteCodeChange}
                  maxLength={11} // 9 chars + 2 dashes
                  className="font-mono text-lg tracking-wider text-center"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  Ask a group member for the invite code
                </p>
              </div>

              {/* Help Text */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">How to join:</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Get an invite code from a group admin</li>
                  <li>Enter the code in the format ABC-123-XYZ</li>
                  <li>Click "Join Group" to become a member</li>
                </ol>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isJoining}>
                Cancel
              </Button>
              <Button onClick={handleJoin} disabled={isJoining || !inviteCode || inviteCode.replace(/-/g, '').length !== 9}>
                {isJoining ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Join Group
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
                Welcome to the Group!
              </DialogTitle>
              <DialogDescription>
                You've successfully joined "{joinedGroup.name}"
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Success Message */}
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">What's next?</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• View shared activities and plans</li>
                  <li>• Collaborate with other group members</li>
                  <li>• Share your own activities with the group</li>
                  <li>• Track progress together!</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Start Planning
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
