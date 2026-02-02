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
import { formatDistanceToNow } from "date-fns";

interface ConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  localChanges?: {
    title: string;
    value: string;
  }[];
  serverChanges?: {
    title: string;
    value: string;
  }[];
  serverUpdatedAt?: Date | string;
  onKeepLocal: () => void;
  onUseServer: () => void;
}

/**
 * Dialog component for handling edit conflicts when multiple users
 * modify the same activity or task concurrently.
 *
 * Shows the user their local changes vs. server changes and lets them
 * choose which version to keep.
 */
export function ConflictDialog({
  open,
  onOpenChange,
  title = "Conflict Detected",
  description,
  localChanges = [],
  serverChanges = [],
  serverUpdatedAt,
  onKeepLocal,
  onUseServer,
}: ConflictDialogProps) {
  const defaultDescription =
    "This item was modified by another user while you were editing. " +
    "Choose which version to keep:";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            {description || defaultDescription}
          </AlertDialogDescription>
          {serverUpdatedAt && (
            <p className="text-sm text-muted-foreground mt-2">
              Last modified: {formatDistanceToNow(new Date(serverUpdatedAt), { addSuffix: true })}
            </p>
          )}
        </AlertDialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {/* Your Changes Column */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-foreground">Your Changes</h3>
            <div className="rounded-md border border-border bg-muted/50 p-3 space-y-3">
              {localChanges.length > 0 ? (
                localChanges.map((change, index) => (
                  <div key={index} className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">{change.title}</p>
                    <p className="text-sm break-words">{change.value}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No local changes to display</p>
              )}
            </div>
          </div>

          {/* Server Changes Column */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-foreground">Server Version</h3>
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-3">
              {serverChanges.length > 0 ? (
                serverChanges.map((change, index) => (
                  <div key={index} className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">{change.title}</p>
                    <p className="text-sm break-words">{change.value}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No server changes to display</p>
              )}
            </div>
          </div>
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onUseServer} className="sm:order-1">
            Use Server Version
          </AlertDialogCancel>
          <AlertDialogAction onClick={onKeepLocal} className="sm:order-2">
            Keep My Changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
