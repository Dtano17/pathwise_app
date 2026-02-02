import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from '@/hooks/use-toast';
import { Flag, AlertTriangle } from 'lucide-react';

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityId: string;
  activityTitle: string;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or misleading content' },
  { value: 'fraud', label: 'Fraudulent or scam activity' },
  { value: 'inappropriate', label: 'Inappropriate or offensive content' },
  { value: 'copyright', label: 'Copyright violation' },
  { value: 'other', label: 'Other (please specify)' },
];

export function ReportDialog({ open, onOpenChange, activityId, activityTitle }: ReportDialogProps) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!reason) {
      toast({
        title: 'Please select a reason',
        description: 'Select why you are reporting this plan',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/activities/${activityId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason, details }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit report');
      }

      toast({
        title: 'Report Submitted',
        description: 'Thank you for helping keep our community safe. We will review this report.',
      });

      // Reset form
      setReason('');
      setDetails('');
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Report Failed',
        description: error.message || 'Could not submit report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-destructive" />
            Report Plan
          </DialogTitle>
          <DialogDescription>
            Help us keep JournalMate.ai safe by reporting plans that violate our community guidelines.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Plan Title */}
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
            <strong>Plan:</strong> {activityTitle}
          </div>

          {/* Reason Selector */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Report *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Details */}
          <div className="space-y-2">
            <Label htmlFor="details">Additional Details (Optional)</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Please provide any additional context that may help us review this report..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">{details.length}/500</p>
          </div>

          {/* Warning */}
          <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-900 dark:text-amber-100">
              False reports may result in action against your account. Please only report plans that genuinely violate our guidelines.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isSubmitting || !reason}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
