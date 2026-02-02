import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, X, Loader2, Check, AlertCircle, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Contact {
  type: 'phone' | 'email';
  value: string;
}

interface AddMembersDialogProps {
  groupId: string;
  groupName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvitesSent?: () => void;
}

export default function AddMembersDialog({ groupId, groupName, open, onOpenChange, onInvitesSent }: AddMembersDialogProps) {
  const { toast } = useToast();
  const [inputValue, setInputValue] = useState('');
  const [message, setMessage] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendResults, setSendResults] = useState<any[] | null>(null);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidPhone = (phone: string) => {
    // Accept phone numbers with or without country code, with various formats
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  };

  const handleAddContact = () => {
    if (!inputValue.trim()) return;

    const value = inputValue.trim();
    let type: 'phone' | 'email';

    if (isValidEmail(value)) {
      type = 'email';
    } else if (isValidPhone(value)) {
      type = 'phone';
    } else {
      toast({
        title: "Invalid format",
        description: "Please enter a valid email address or phone number.",
        variant: "destructive"
      });
      return;
    }

    // Check for duplicates
    if (contacts.some(c => c.value === value)) {
      toast({
        title: "Already added",
        description: "This contact is already in the list.",
        variant: "destructive"
      });
      return;
    }

    setContacts([...contacts, { type, value }]);
    setInputValue('');
  };

  const handleRemoveContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const handleSendInvites = async () => {
    if (contacts.length === 0) {
      toast({
        title: "No contacts",
        description: "Please add at least one contact to invite.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSending(true);

      const response = await apiRequest('POST', `/api/groups/${groupId}/invite`, {
        contacts,
        message: message.trim() || undefined
      });

      const data = await response.json();
      setSendResults(data.results);

      toast({
        title: "Invites sent!",
        description: data.message,
      });

      if (onInvitesSent) {
        onInvitesSent();
      }

    } catch (error) {
      console.error('Send invites error:', error);
      toast({
        title: "Failed to send invites",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setInputValue('');
    setMessage('');
    setContacts([]);
    setSendResults(null);
    onOpenChange(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddContact();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        {!sendResults ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Invite Members
              </DialogTitle>
              <DialogDescription>
                Invite people to join "{groupName}" via phone or email
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Contact Input */}
              <div className="space-y-2">
                <Label htmlFor="contact">Phone Number or Email</Label>
                <div className="flex gap-2">
                  <Input
                    id="contact"
                    placeholder="e.g., +1234567890 or user@example.com"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <Button onClick={handleAddContact} size="sm">
                    Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Press Enter or click Add to add the contact
                </p>
              </div>

              {/* Contacts List */}
              {contacts.length > 0 && (
                <div className="space-y-2">
                  <Label>Contacts to Invite ({contacts.length})</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {contacts.map((contact, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-muted rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          {contact.type === 'email' ? (
                            <Mail className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Phone className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="text-sm">{contact.value}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveContact(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Message */}
              <div className="space-y-2">
                <Label htmlFor="message">Personal Message (optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Add a personal message to your invitation..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  maxLength={300}
                />
                <p className="text-xs text-muted-foreground">
                  {message.length}/300 characters
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">What happens next?</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• SMS/Email will be sent with the group invite code</li>
                  <li>• Recipients can join using the code</li>
                  <li>• You'll see them in the members list once they join</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isSending}>
                Cancel
              </Button>
              <Button onClick={handleSendInvites} disabled={isSending || contacts.length === 0}>
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Invites ({contacts.length})
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
                Invites Sent
              </DialogTitle>
              <DialogDescription>
                Here's the status of your invitations
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4 max-h-96 overflow-y-auto">
              {sendResults.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    result.success
                      ? 'bg-green-500/10 border-green-500/20'
                      : 'bg-red-500/10 border-red-500/20'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {result.type === 'email' ? (
                      <Mail className="w-4 h-4 shrink-0" />
                    ) : (
                      <Phone className="w-4 h-4 shrink-0" />
                    )}
                    <span className="text-sm truncate">{result.contact}</span>
                  </div>
                  {result.success ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                      <Check className="w-3 h-3 mr-1" />
                      Sent
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Failed
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            {sendResults.some(r => !r.success) && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  <strong>Note:</strong> Some invites failed to send. This may be due to misconfigured SMS/Email services or invalid contact information.
                </p>
              </div>
            )}

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
