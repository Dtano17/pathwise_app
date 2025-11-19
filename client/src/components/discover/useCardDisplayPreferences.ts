import { useState, useEffect } from "react";

export interface CardDisplayPreferences {
  showLikes: boolean;
  showBookmarks: boolean;
  showBudget: boolean;
  showDistance: boolean;
  showOwner: boolean;
  showVerificationBadge: boolean;
}

const DEFAULT_PREFERENCES: CardDisplayPreferences = {
  showLikes: true,
  showBookmarks: true,
  showBudget: true,
  showDistance: false,
  showOwner: true,
  showVerificationBadge: true,
};

export function useCardDisplayPreferences(userId: string | null) {
  const storageKey = `card-display-prefs-${userId || "demo"}`;
  const [hydrated, setHydrated] = useState(false);
  
  const [preferences, setPreferences] = useState<CardDisplayPreferences>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_PREFERENCES;
    }
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error("[CARD_PREFS] Failed to load preferences:", error);
    }
    return DEFAULT_PREFERENCES;
  });

  // Reload preferences when userId changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    setHydrated(false);
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(stored) });
      } else {
        setPreferences(DEFAULT_PREFERENCES);
      }
    } catch (error) {
      console.error("[CARD_PREFS] Failed to reload preferences:", error);
      setPreferences(DEFAULT_PREFERENCES);
    } finally {
      setHydrated(true);
    }
  }, [storageKey]);

  // Save preferences to localStorage (only after hydration)
  useEffect(() => {
    if (typeof window === "undefined" || !hydrated) return;
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(preferences));
    } catch (error) {
      console.error("[CARD_PREFS] Failed to save preferences:", error);
    }
  }, [preferences, storageKey, hydrated]);

  const updatePreference = (key: keyof CardDisplayPreferences, value: boolean) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
  };

  return {
    preferences,
    updatePreference,
    resetPreferences,
  };
}
