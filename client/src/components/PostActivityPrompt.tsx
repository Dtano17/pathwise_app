import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { BookOpen, X, Clock, Sparkles } from 'lucide-react';

interface PostActivityPromptProps {
  activity: {
    id: string;
    title: string;
    category: string;
  };
  onQuickNote: (activityId: string, title: string) => void;
  onSkip: () => void;
  onRemindLater: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PostActivityPrompt({
  activity,
  onQuickNote,
  onSkip,
  onRemindLater,
  open,
  onOpenChange
}: PostActivityPromptProps) {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onOpenChange(false);
      setIsClosing(false);
    }, 200);
  };

  const handleQuickNote = () => {
    onQuickNote(activity.id, activity.title);
    handleClose();
  };

  const handleSkip = () => {
    onSkip();
    handleClose();
  };

  const handleRemindLater = () => {
    onRemindLater();
    handleClose();
  };

  return (
    <>
      {/* Desktop: Centered Modal */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="hidden md:block max-w-md">
          <Card className="border-none shadow-none">
            <CardHeader className="space-y-3 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-gradient-to-br from-purple-500 to-emerald-500">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <CardTitle className="text-xl">You did it!</CardTitle>
                </div>
              </div>
              <CardDescription className="text-base">
                <span className="font-semibold text-foreground">{activity.title}</span> is complete.
                Would you like to capture your thoughts?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={handleQuickNote}
                className="w-full bg-gradient-to-r from-purple-500 to-emerald-500 hover:from-purple-600 hover:to-emerald-600 text-white shadow-lg"
                size="lg"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Quick Note
              </Button>
              <Button
                onClick={handleRemindLater}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Clock className="h-4 w-4 mr-2" />
                Remind Me Later
              </Button>
              <Button
                onClick={handleSkip}
                variant="ghost"
                className="w-full text-muted-foreground"
              >
                <X className="h-4 w-4 mr-2" />
                Skip
              </Button>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>

      {/* Mobile: Bottom Sheet */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/50 animate-in fade-in"
          onClick={handleClose}
        >
          <div
            className={`fixed bottom-0 left-0 right-0 bg-background rounded-t-3xl shadow-2xl transition-transform duration-300 ${
              isClosing ? 'translate-y-full' : 'translate-y-0'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              {/* Drag Handle */}
              <div className="flex justify-center">
                <div className="w-12 h-1.5 rounded-full bg-muted" />
              </div>

              {/* Header */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-gradient-to-br from-purple-500 to-emerald-500">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold">You did it!</h2>
                </div>
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{activity.title}</span> is complete.
                  Would you like to capture your thoughts?
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-2 pb-2">
                <Button
                  onClick={handleQuickNote}
                  className="w-full bg-gradient-to-r from-purple-500 to-emerald-500 hover:from-purple-600 hover:to-emerald-600 text-white shadow-lg h-12"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Quick Note
                </Button>
                <Button
                  onClick={handleRemindLater}
                  variant="outline"
                  className="w-full h-12"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Remind Me Later
                </Button>
                <Button
                  onClick={handleSkip}
                  variant="ghost"
                  className="w-full text-muted-foreground h-12"
                >
                  <X className="h-4 w-4 mr-2" />
                  Skip
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
