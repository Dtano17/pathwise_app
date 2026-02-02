/**
 * Invite Friends Button Component
 *
 * Allows users to invite friends from contacts or share app link
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, Loader2, Mail, MessageSquare } from 'lucide-react';
import {
  getContacts,
  inviteContacts,
  shareAppInvite,
  hapticsLight,
  hapticsSuccess,
  isNative,
} from '@/lib/mobile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Contact {
  id: string;
  displayName: string;
  phoneNumbers?: string[];
  emails?: string[];
}

export function InviteFriendsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleLoadContacts = async () => {
    setIsLoading(true);
    hapticsLight();

    try {
      const deviceContacts = await getContacts();
      setContacts(deviceContacts);

      if (deviceContacts.length === 0) {
        toast({
          title: 'No contacts found',
          description: 'Please check contact permissions',
        });
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
      toast({
        title: 'Failed to load contacts',
        description: 'Please check permissions and try again',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleShareLink = async () => {
    hapticsLight();
    const result = await shareAppInvite();

    if (result) {
      hapticsSuccess();
      setIsOpen(false);
      toast({
        title: 'Invitation sent!',
        description: 'Thanks for spreading the word!',
      });
    }
  };

  const handleSendInvites = async () => {
    if (selectedContacts.size === 0) {
      toast({
        title: 'No contacts selected',
        description: 'Please select at least one contact',
      });
      return;
    }

    setIsSending(true);
    hapticsLight();

    try {
      const contactsToInvite = contacts.filter((c) =>
        selectedContacts.has(c.id)
      );

      const result = await inviteContacts(contactsToInvite, {
        message: `Hey! I'm using JournalMate to plan my goals and track my journey. Join me! 🚀\n\nhttps://journalmate.ai`,
        method: 'both',
      });

      if (result.success) {
        hapticsSuccess();
        toast({
          title: `Invited ${result.invitedCount} friends!`,
          description: 'Your invitations have been sent',
        });
        setIsOpen(false);
        setSelectedContacts(new Set());
      }
    } catch (error) {
      console.error('Failed to send invites:', error);
      toast({
        title: 'Failed to send invites',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const toggleContact = (contactId: string) => {
    hapticsLight();
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const filteredContacts = contacts.filter((contact) =>
    contact.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isNative()) {
    // Web: Simple share button
    return (
      <Button variant="outline" onClick={handleShareLink}>
        <UserPlus className="w-4 h-4 mr-2" />
        Invite Friends
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Friends
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleShareLink}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Share Invite Link
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setIsOpen(true);
              if (contacts.length === 0) {
                handleLoadContacts();
              }
            }}
          >
            <Mail className="w-4 h-4 mr-2" />
            Invite from Contacts
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Friends</DialogTitle>
          <DialogDescription>
            Select contacts to invite to JournalMate
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {contacts.length > 0 && (
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-4">
                No contacts loaded yet
              </p>
              <Button onClick={handleLoadContacts}>Load Contacts</Button>
            </div>
          ) : (
            <>
              <ScrollArea className="h-72">
                <div className="space-y-2">
                  {filteredContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleContact(contact.id)}
                    >
                      <Checkbox
                        checked={selectedContacts.has(contact.id)}
                        onCheckedChange={() => toggleContact(contact.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {contact.displayName}
                        </p>
                        {(contact.phoneNumbers?.[0] || contact.emails?.[0]) && (
                          <p className="text-xs text-muted-foreground truncate">
                            {contact.phoneNumbers?.[0] || contact.emails?.[0]}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSendInvites}
                  disabled={isSending || selectedContacts.size === 0}
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send {selectedContacts.size > 0 && `(${selectedContacts.size})`}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
