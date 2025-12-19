import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useNativeShare } from "@/hooks/useNativeShare";
import { 
  Share, 
  Copy, 
  Mail, 
  MessageSquare,
  Users,
  ExternalLink
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface SharePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  planTitle: string;
  planDescription?: string;
  goalIds?: string[];
}

interface Contact {
  id: string;
  name: string;
  emails: string[];
  phones: string[];
  status: 'on_journalmate' | 'invited' | 'not_invited';
}

export default function SharePlanModal({
  isOpen,
  onClose,
  planTitle,
  planDescription,
  goalIds = []
}: SharePlanModalProps) {
  const { toast } = useToast();
  const { share, shareViaEmail, shareViaSMS } = useNativeShare();
  const [inviteLink, setInviteLink] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

  // Get user's contacts
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
    enabled: isOpen
  });

  // Generate invite mutation
  const generateInviteMutation = useMutation({
    mutationFn: async () => {
      // Generate a simple invite link for now
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const link = `${window.location.origin}/join/${inviteCode}?plan=${encodeURIComponent(planTitle)}`;
      
      const response = await apiRequest('POST', '/api/sharing/generate-invite', {
        planTitle,
        inviteLink: link
      });
      return response.json() as Promise<{ link: string; message: string }>;
    },
    onSuccess: (data) => {
      setInviteLink(data.link || '');
      setInviteMessage(data.message || '');
      toast({
        title: "Invite Ready!",
        description: "Your sharing invitation has been generated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Generate Invite",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleGenerateInvite = () => {
    generateInviteMutation.mutate();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast({
        title: "Copied!",
        description: "Invite link copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const handleNativeShare = async () => {
    if (!inviteLink) {
      toast({
        title: "Generate Invite First",
        description: "Please generate an invite link before sharing.",
        variant: "destructive",
      });
      return;
    }

    const result = await share({
      title: `Join me on "${planTitle}"`,
      text: inviteMessage,
      url: inviteLink,
      dialogTitle: 'Share Plan',
    });

    if (result.success) {
      toast({
        title: "Shared successfully!",
        description: `Shared via ${result.method}`,
      });
    }
  };

  const handleShareViaEmail = () => {
    shareViaEmail({
      title: `Join me on "${planTitle}"`,
      text: inviteMessage,
      url: inviteLink,
    });
  };

  const handleShareViaSMS = () => {
    shareViaSMS({
      title: `Join me on "${planTitle}"`,
      text: inviteMessage,
      url: inviteLink,
    });
  };

  const handleContactToggle = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" data-testid="modal-share-plan">
        <DialogHeader backLabel="Back to Activity">
          <DialogTitle className="flex items-center gap-2">
            <Share className="w-5 h-5" />
            Share "{planTitle}"
          </DialogTitle>
          <DialogDescription>
            Share your goal with friends and family to stay accountable and get support.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Plan Details */}
          {planDescription && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2" data-testid="text-plan-title">{planTitle}</h4>
              <p className="text-sm text-muted-foreground" data-testid="text-plan-description">{planDescription}</p>
            </div>
          )}

          {/* Generate Invite Section */}
          {!inviteLink ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2" data-testid="text-generate-invite">Generate Sharing Invite</h3>
              <p className="text-muted-foreground mb-4">
                Create a personalized invite link to share with your contacts.
              </p>
              <Button 
                onClick={handleGenerateInvite} 
                disabled={generateInviteMutation.isPending}
                data-testid="button-generate-invite"
              >
                {generateInviteMutation.isPending ? 'Generating...' : 'Generate Invite Link'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Invite Link */}
              <div>
                <Label htmlFor="invite-link">Invite Link</Label>
                <div className="flex gap-2 mt-1">
                  <Input 
                    id="invite-link"
                    value={inviteLink}
                    readOnly
                    className="font-mono text-xs"
                    data-testid="input-invite-link"
                  />
                  <Button size="icon" variant="outline" onClick={handleCopyLink} data-testid="button-copy-link">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Invite Message */}
              <div>
                <Label htmlFor="invite-message">Invite Message</Label>
                <Textarea
                  id="invite-message"
                  value={inviteMessage}
                  readOnly
                  className="mt-1 min-h-20"
                  data-testid="textarea-invite-message"
                />
              </div>

              {/* Sharing Options */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Share This Plan</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleNativeShare}
                    className="justify-start"
                    data-testid="button-share-native"
                  >
                    <Share className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleShareViaEmail}
                    className="justify-start"
                    data-testid="button-share-email"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleShareViaSMS}
                    className="justify-start"
                    data-testid="button-share-sms"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    SMS
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleCopyLink}
                    className="justify-start"
                    data-testid="button-share-copy"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Contact Selection */}
          {contacts.length > 0 && (
            <div>
              <Label className="text-base font-medium">Your Contacts</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Select contacts to share with (they'll receive the invite message)
              </p>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {contacts.map((contact) => (
                  <div 
                    key={contact.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover-elevate cursor-pointer"
                    onClick={() => handleContactToggle(contact.id)}
                    data-testid={`contact-option-${contact.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(contact.id)}
                          onChange={() => handleContactToggle(contact.id)}
                          className="rounded"
                          data-testid={`checkbox-contact-${contact.id}`}
                        />
                        <span className="font-medium" data-testid={`text-contact-name-${contact.id}`}>
                          {contact.name}
                        </span>
                        <Badge variant={contact.status === 'on_journalmate' ? 'default' : 'secondary'} className="text-xs">
                          {contact.status === 'on_journalmate' ? 'On JournalMate' : 'New to JournalMate'}
                        </Badge>
                      </div>
                      {contact.emails.length > 0 && (
                        <p className="text-sm text-muted-foreground ml-6">
                          {contact.emails[0]}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} data-testid="button-close-share">
            Close
          </Button>
          {inviteLink && (
            <Button 
              onClick={() => {
                handleCopyLink();
                onClose();
              }}
              data-testid="button-copy-and-close"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy & Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}