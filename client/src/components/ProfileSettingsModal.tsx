import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Settings as SettingsIcon, Target } from 'lucide-react';
import UserProfile from '@/pages/UserProfile';
import Settings from '@/components/Settings';
import Priorities from '@/components/Priorities';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'profile' | 'settings' | 'priorities';
}

export default function ProfileSettingsModal({ 
  isOpen, 
  onClose, 
  defaultTab = 'profile' 
}: ProfileSettingsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" data-testid="modal-profile-settings">
        <DialogHeader backLabel="Back to Home">
          <DialogTitle className="sr-only">Profile & Settings</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center gap-2" data-testid="tab-profile">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="priorities" className="flex items-center gap-2" data-testid="tab-priorities">
              <Target className="w-4 h-4" />
              Priorities
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2" data-testid="tab-settings">
              <SettingsIcon className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="mt-6">
            <div className="max-h-[80vh] overflow-y-auto">
              <UserProfile />
            </div>
          </TabsContent>
          
          <TabsContent value="priorities" className="mt-6">
            <div className="max-h-[80vh] overflow-y-auto">
              <Priorities />
            </div>
          </TabsContent>
          
          <TabsContent value="settings" className="mt-6">
            <div className="max-h-[80vh] overflow-y-auto">
              <Settings />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}