import { useState, useEffect, useCallback } from "react";

export interface DiscoverFilters {
  search: string;
  category: string;
  budget: string;
  sortBy: string;
  locationEnabled: boolean;
  userCoords: { lat: number; lon: number } | null;
  radius: number;
}

export function useDiscoverFilters() {
  // Initialize filters from URL params or defaults
  const getInitialFilters = (): DiscoverFilters => {
    const params = new URLSearchParams(window.location.search);
    return {
      search: params.get("search") || "",
      category: params.get("category") || "all",
      budget: params.get("budget") || "all",
      sortBy: params.get("sortBy") || "trending",
      locationEnabled: false,
      userCoords: null,
      radius: 50, // Default 50km radius
    };
  };

  const [filters, setFilters] = useState<DiscoverFilters>(getInitialFilters);

  // Sync filters to URL whenever they change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Update URL params based on current filters
    if (filters.search) {
      params.set("search", filters.search);
    } else {
      params.delete("search");
    }
    
    if (filters.category && filters.category !== "all") {
      params.set("category", filters.category);
    } else {
      params.delete("category");
    }
    
    if (filters.budget && filters.budget !== "all") {
      params.set("budget", filters.budget);
    } else {
      params.delete("budget");
    }
    
    if (filters.sortBy && filters.sortBy !== "trending") {
      params.set("sortBy", filters.sortBy);
    } else {
      params.delete("sortBy");
    }
    
    // Update URL without triggering page reload
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, "", newUrl);
  }, [filters]);

  // Update a single filter
  const updateFilter = useCallback((key: keyof DiscoverFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Set location data
  const setLocationData = useCallback((coords: { lat: number; lon: number } | null) => {
    setFilters((prev) => ({ 
      ...prev, 
      userCoords: coords,
      locationEnabled: coords !== null 
    }));
  }, []);

  // Toggle location filtering
  const toggleLocation = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      locationEnabled: !prev.locationEnabled,
      // Keep userCoords even when toggling off - we still need it for distance display
    }));
  }, []);

  // Clear all filters back to defaults
  const clearFilters = useCallback(() => {
    setFilters({
      search: "",
      category: "all",
      budget: "all",
      sortBy: "trending",
      locationEnabled: false,
      userCoords: null,
      radius: 50,
    });
  }, []);

  return {
    filters,
    updateFilter,
    setLocationData,
    toggleLocation,
    clearFilters,
  };
}
