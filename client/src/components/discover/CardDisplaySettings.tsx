import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import type { CardDisplayPreferences } from "./useCardDisplayPreferences";

interface CardDisplaySettingsProps {
  preferences: CardDisplayPreferences;
  onUpdatePreference: (key: keyof CardDisplayPreferences, value: boolean) => void;
  onResetPreferences: () => void;
}

export function CardDisplaySettings({ preferences, onUpdatePreference, onResetPreferences }: CardDisplaySettingsProps) {

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          data-testid="button-card-settings"
          className="flex-shrink-0"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Card Display Options</h4>
            <p className="text-xs text-muted-foreground">
              Customize what information appears on plan cards
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Engagement</p>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-likes" className="text-sm font-normal cursor-pointer">
                  Show likes count
                </Label>
                <Switch
                  id="show-likes"
                  checked={preferences.showLikes}
                  onCheckedChange={(checked) => onUpdatePreference("showLikes", checked)}
                  data-testid="switch-show-likes"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-bookmarks" className="text-sm font-normal cursor-pointer">
                  Show bookmarks
                </Label>
                <Switch
                  id="show-bookmarks"
                  checked={preferences.showBookmarks}
                  onCheckedChange={(checked) => onUpdatePreference("showBookmarks", checked)}
                  data-testid="switch-show-bookmarks"
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Plan Details</p>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-budget" className="text-sm font-normal cursor-pointer">
                  Show budget
                </Label>
                <Switch
                  id="show-budget"
                  checked={preferences.showBudget}
                  onCheckedChange={(checked) => onUpdatePreference("showBudget", checked)}
                  data-testid="switch-show-budget"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-distance" className="text-sm font-normal cursor-pointer">
                  Show distance
                </Label>
                <Switch
                  id="show-distance"
                  checked={preferences.showDistance}
                  onCheckedChange={(checked) => onUpdatePreference("showDistance", checked)}
                  data-testid="switch-show-distance"
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Creator Info</p>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-owner" className="text-sm font-normal cursor-pointer">
                  Show plan creator
                </Label>
                <Switch
                  id="show-owner"
                  checked={preferences.showOwner}
                  onCheckedChange={(checked) => onUpdatePreference("showOwner", checked)}
                  data-testid="switch-show-owner"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetPreferences}
              className="w-full"
              data-testid="button-reset-preferences"
            >
              Reset to defaults
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
