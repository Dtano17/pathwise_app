import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Phone, 
  Mail, 
  UserPlus, 
  Share,
  Contact,
  CheckCircle,
  Clock,
  UserX,
  Smartphone
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { isNative } from "@/lib/platform";
import { getContacts, syncContactsWithServer, type SimpleContact } from "@/lib/contacts";

interface Contact {
  id: string;
  name: string;
  emails: string[];
  phones: string[];
  source: 'phone' | 'manual';
  status: 'on_journalmate' | 'invited' | 'not_invited';
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
  };
}

interface PhoneContact {
  name: string;
  emails?: string[];
  tel?: string[];
}

export default function Contacts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: ''
  });

  // Get user's contacts
  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  // Debug: Log contacts data when it changes
  console.log('[CONTACTS PAGE] Contacts data:', contacts.length, 'contacts loaded');

  // Sync phone contacts mutation
  const syncContactsMutation = useMutation({
    mutationFn: async (phoneContacts: PhoneContact[]) => {
      const response = await apiRequest('POST', '/api/contacts/sync', { contacts: phoneContacts });
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      toast({
        title: "Contacts Synced!",
        description: `Successfully synced ${data.syncedCount || 0} contacts from your phone.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync contacts. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Add manual contact mutation
  const addContactMutation = useMutation({
    mutationFn: async (contactData: typeof newContact) => {
      const response = await apiRequest('POST', '/api/contacts', contactData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      setNewContact({ name: '', email: '', phone: '' });
      setIsAddContactOpen(false);
      toast({
        title: "Contact Added!",
        description: "Contact has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Contact",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle phone contact picker
  const handleSyncPhoneContacts = async () => {
    // Check if on mobile app
    if (!isNative()) {
      toast({
        title: "Mobile Feature",
        description: "Contact import is available on our mobile app. Download from the App Store or Play Store, or add contacts manually.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Get contacts from device using Capacitor
      const phoneContacts = await getContacts();

      if (phoneContacts.length === 0) {
        toast({
          title: "No Contacts Found",
          description: "No contacts found on your device or permission was denied.",
          variant: "destructive",
        });
        return;
      }

      // Sync with server - this stores the contacts in the database
      const result = await syncContactsWithServer(phoneContacts);

      // Force refresh the contacts list to show newly synced contacts
      console.log('[CONTACTS] Sync complete, forcing refetch...');
      await queryClient.refetchQueries({ queryKey: ['/api/contacts'] });
      console.log('[CONTACTS] Refetch complete');

      toast({
        title: "Contacts Imported!",
        description: `Successfully imported ${result.syncedCount} contacts from your device.`,
      });
    } catch (error: any) {
      console.error('Contact sync error:', error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import contacts. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddContact = () => {
    if (!newContact.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a contact name.",
        variant: "destructive",
      });
      return;
    }

    addContactMutation.mutate(newContact);
  };

  const getStatusIcon = (status: Contact['status']) => {
    switch (status) {
      case 'on_journalmate':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'invited':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <UserX className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: Contact['status']) => {
    switch (status) {
      case 'on_journalmate':
        return 'On JournalMate';
      case 'invited':
        return 'Invited';
      default:
        return 'Not invited';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" data-testid="page-contacts">
      <div className="flex-1 overflow-auto p-1">
        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap mb-4">
          <Button onClick={handleSyncPhoneContacts} disabled={syncContactsMutation.isPending} size="sm" className="flex-1 sm:flex-none" data-testid="button-sync-contacts">
            <Phone className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">{syncContactsMutation.isPending ? 'Syncing...' : 'Sync Phone Contacts'}</span>
            <span className="sm:hidden">Sync Contacts</span>
          </Button>
          <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none" data-testid="button-add-contact">
                <UserPlus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Add Contact</span>
                <span className="sm:hidden">Add Manually</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md" data-testid="modal-add-contact">
              <DialogHeader backLabel="Back to Contacts">
                <DialogTitle>Add Contact</DialogTitle>
                <DialogDescription>
                  Add someone manually to share your goals and plans with them.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    placeholder="John Doe"
                    data-testid="input-contact-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    placeholder="john@example.com"
                    data-testid="input-contact-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    data-testid="input-contact-phone"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddContactOpen(false)} data-testid="button-cancel-add">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddContact}
                    disabled={addContactMutation.isPending}
                    data-testid="button-save-contact"
                  >
                    {addContactMutation.isPending ? 'Adding...' : 'Add Contact'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Contacts List */}
        {contacts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 sm:py-12 px-4">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-base sm:text-lg mb-2" data-testid="text-no-contacts">No contacts yet</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 max-w-md mx-auto">
                Sync your phone contacts or add people manually to start sharing your goals.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center max-w-sm mx-auto">
                <Button onClick={handleSyncPhoneContacts} size="sm" className="w-full sm:w-auto" data-testid="button-sync-contacts-empty">
                  <Phone className="w-4 h-4 mr-2" />
                  Sync Phone Contacts
                </Button>
                <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setIsAddContactOpen(true)} data-testid="button-add-contact-empty">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Manually
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {contacts.map((contact) => (
              <Card key={contact.id} className="hover-elevate" data-testid={`contact-card-${contact.id}`}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold text-sm sm:text-base" data-testid={`text-contact-name-${contact.id}`}>
                          {contact.name}
                        </h3>
                        {getStatusIcon(contact.status)}
                        <Badge variant={contact.status === 'on_journalmate' ? 'default' : 'secondary'} className="text-xs">
                          {getStatusText(contact.status)}
                        </Badge>
                        <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                          {contact.source === 'phone' ? 'Phone Contact' : 'Added Manually'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                        {contact.emails.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3 shrink-0" />
                            <span className="truncate" data-testid={`text-contact-email-${contact.id}`}>{contact.emails[0]}</span>
                          </div>
                        )}
                        {contact.phones.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3 shrink-0" />
                            <span data-testid={`text-contact-phone-${contact.id}`}>{contact.phones[0]}</span>
                          </div>
                        )}
                      </div>

                      {contact.user && (
                        <div className="mt-2 text-xs sm:text-sm text-green-600">
                          <CheckCircle className="w-3 h-3 inline mr-1" />
                          Connected as {contact.user.firstName} {contact.user.lastName}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 sm:shrink-0">
                      {contact.status === 'not_invited' && (
                        <Button size="sm" variant="outline" className="flex-1 sm:flex-none" data-testid={`button-invite-${contact.id}`}>
                          <Share className="w-3 h-3 mr-1" />
                          Invite
                        </Button>
                      )}
                      {contact.status === 'on_journalmate' && (
                        <Button size="sm" className="flex-1 sm:flex-none" data-testid={`button-share-${contact.id}`}>
                          <Share className="w-3 h-3 mr-1" />
                          Share Plan
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}