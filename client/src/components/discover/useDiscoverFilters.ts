import { useState, useEffect, useCallback } from "react";

export interface DiscoverFilters {
  search: string;
  category: string;
  budget: string;
  sortBy: string;
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
  const updateFilter = useCallback((key: keyof DiscoverFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Clear all filters back to defaults
  const clearFilters = useCallback(() => {
    setFilters({
      search: "",
      category: "all",
      budget: "all",
      sortBy: "trending",
    });
  }, []);

  return {
    filters,
    updateFilter,
    clearFilters,
  };
}
