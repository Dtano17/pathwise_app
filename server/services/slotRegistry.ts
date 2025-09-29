/**
 * Slot Registry System - Defines required and optional fields for each activity type
 * This ensures comprehensive information gathering before plan creation
 */

export interface SlotDefinition {
  key: string;
  label: string;
  description: string;
  validationRules?: {
    required?: boolean;
    allowedValues?: string[];
    dependencies?: string[]; // Other slots that must be filled first
  };
}

export interface ActivityRequirements {
  required: SlotDefinition[];
  optional: SlotDefinition[];
  minOptionalRequired: number; // Minimum optional slots needed for Smart Plan
}

/**
 * Comprehensive slot registry defining requirements for each activity type
 */
export const SLOT_REGISTRY: Record<string, ActivityRequirements> = {
  travel: {
    required: [
      {
        key: 'activityType',
        label: 'Activity',
        description: 'Type of travel (business, leisure, etc.)'
      },
      {
        key: 'location.destination',
        label: 'Destination',
        description: 'Where you are traveling to'
      },
      {
        key: 'timing.date',
        label: 'Date',
        description: 'Travel dates or departure time'
      },
      {
        key: 'timing.duration',
        label: 'Duration',
        description: 'How long you will be traveling'
      },
      {
        key: 'budget.range',
        label: 'Budget',
        description: 'Budget range for the entire trip',
        validationRules: {
          allowedValues: ['low', 'medium', 'high', '$0-500', '$500-2000', '$2000+']
        }
      },
      {
        key: 'transportation',
        label: 'Transportation',
        description: 'How you will get there',
        validationRules: {
          allowedValues: ['flying', 'driving', 'train', 'bus']
        }
      }
    ],
    optional: [
      {
        key: 'purpose',
        label: 'Purpose',
        description: 'Business, leisure, family visit, etc.'
      },
      {
        key: 'companions.count',
        label: 'Travel Group',
        description: 'How many people are traveling'
      },
      {
        key: 'accommodation',
        label: 'Accommodation',
        description: 'Hotel preferences, location, amenities'
      },
      {
        key: 'mustDoActivities',
        label: 'Must-Do Activities',
        description: 'Specific experiences or activities you want'
      },
      {
        key: 'vibe',
        label: 'Travel Style',
        description: 'Adventure, relaxation, cultural, business, etc.'
      }
    ],
    minOptionalRequired: 2
  },

  date: {
    required: [
      {
        key: 'activityType',
        label: 'Activity',
        description: 'Date night activity'
      },
      {
        key: 'timing.departureTime',
        label: 'Time',
        description: 'What time you want to go'
      },
      {
        key: 'budget.range',
        label: 'Budget',
        description: 'How much you want to spend',
        validationRules: {
          allowedValues: ['low', 'medium', 'high', '$0-30', '$30-100', '$100+']
        }
      },
      {
        key: 'location.destination',
        label: 'Location',
        description: 'Where you want to go or stay in'
      },
      {
        key: 'vibe',
        label: 'Mood',
        description: 'Romantic, fun, relaxed, adventurous'
      }
    ],
    optional: [
      {
        key: 'transportation',
        label: 'Transportation',
        description: 'How you will get around'
      },
      {
        key: 'diningPreferences',
        label: 'Food Preferences',
        description: 'Cuisine type, dietary restrictions'
      },
      {
        key: 'additionalActivities',
        label: 'Other Activities',
        description: 'Drinks, entertainment, shows after dinner'
      }
    ],
    minOptionalRequired: 1
  },

  dining: {
    required: [
      {
        key: 'activityType',
        label: 'Activity',
        description: 'Dining activity'
      },
      {
        key: 'budget.range',
        label: 'Budget',
        description: 'Price range per person',
        validationRules: {
          allowedValues: ['low', 'medium', 'high', '$15-30', '$30-60', '$60+']
        }
      },
      {
        key: 'companions.count',
        label: 'Group Size',
        description: 'Number of people dining'
      },
      {
        key: 'timing.departureTime',
        label: 'Time',
        description: 'Preferred dining time'
      },
      {
        key: 'location.destination',
        label: 'Area',
        description: 'Preferred neighborhood or specific location'
      }
    ],
    optional: [
      {
        key: 'cuisine',
        label: 'Cuisine',
        description: 'Type of food preferred'
      },
      {
        key: 'occasion',
        label: 'Occasion',
        description: 'Special celebration, casual meal, business'
      },
      {
        key: 'ambiance',
        label: 'Ambiance',
        description: 'Romantic, lively, quiet, trendy'
      },
      {
        key: 'dietaryRestrictions',
        label: 'Dietary Needs',
        description: 'Allergies, vegetarian, etc.'
      }
    ],
    minOptionalRequired: 2
  },

  social: {
    required: [
      {
        key: 'activityType',
        label: 'Activity',
        description: 'Type of social gathering'
      },
      {
        key: 'companions.count',
        label: 'Group Size',
        description: 'Number of people expected'
      },
      {
        key: 'budget.range',
        label: 'Budget Per Person',
        description: 'What each person should expect to spend'
      },
      {
        key: 'timing.date',
        label: 'Date & Time',
        description: 'When the event will happen'
      },
      {
        key: 'location.type',
        label: 'Venue Type',
        description: 'Home, restaurant, park, venue, etc.',
        validationRules: {
          allowedValues: ['home', 'restaurant', 'park', 'venue', 'outdoors', 'activity_center']
        }
      }
    ],
    optional: [
      {
        key: 'occasion',
        label: 'Occasion',
        description: 'Birthday, celebration, casual hangout'
      },
      {
        key: 'vibe',
        label: 'Atmosphere',
        description: 'Low-key, party, formal, casual'
      },
      {
        key: 'activities',
        label: 'Planned Activities',
        description: 'Games, music, specific entertainment'
      }
    ],
    minOptionalRequired: 2
  },

  entertainment: {
    required: [
      {
        key: 'activityType',
        label: 'Activity',
        description: 'Type of entertainment'
      },
      {
        key: 'timing.date',
        label: 'Date & Time',
        description: 'When you want to go'
      },
      {
        key: 'budget.range',
        label: 'Budget',
        description: 'How much you want to spend'
      },
      {
        key: 'location.destination',
        label: 'Location',
        description: 'Where or what area'
      }
    ],
    optional: [
      {
        key: 'companions.count',
        label: 'Group Size',
        description: 'Going alone or with others'
      },
      {
        key: 'entertainmentType',
        label: 'Specific Type',
        description: 'Movies, concerts, sports, shows, etc.'
      },
      {
        key: 'preferences',
        label: 'Preferences',
        description: 'Genre, artist, team preferences'
      }
    ],
    minOptionalRequired: 1
  },

  // Default fallback for unknown activities
  general: {
    required: [
      {
        key: 'activityType',
        label: 'Activity',
        description: 'What you want to do'
      },
      {
        key: 'timing.date',
        label: 'When',
        description: 'Date or time preference'
      },
      {
        key: 'location.destination',
        label: 'Where',
        description: 'Location or area'
      },
      {
        key: 'budget.range',
        label: 'Budget',
        description: 'Budget considerations'
      }
    ],
    optional: [
      {
        key: 'companions.count',
        label: 'Group Size',
        description: 'Number of people involved'
      },
      {
        key: 'transportation',
        label: 'Transportation',
        description: 'How you will get there'
      },
      {
        key: 'vibe',
        label: 'Style',
        description: 'Mood or atmosphere preference'
      }
    ],
    minOptionalRequired: 1
  }
};

/**
 * Slot Completeness Engine - Determines what information is missing
 */
export class SlotCompletenessEngine {
  
  /**
   * Get requirements for a specific activity type
   */
  static getActivityRequirements(activityType: string): ActivityRequirements {
    const normalizedType = activityType?.toLowerCase() || '';
    
    // Map variations to standard types
    const typeMapping: Record<string, string> = {
      'date_night': 'date',
      'date night': 'date',
      'dinner': 'dining',
      'restaurant': 'dining',
      'trip': 'travel',
      'vacation': 'travel',
      'party': 'social',
      'hangout': 'social',
      'get-together': 'social',
      'movie': 'entertainment',
      'show': 'entertainment',
      'concert': 'entertainment'
    };

    const mappedType = typeMapping[normalizedType] || normalizedType;
    return SLOT_REGISTRY[mappedType] || SLOT_REGISTRY.general;
  }

  /**
   * Analyze slot completeness for a given session
   */
  static analyzeCompleteness(slots: any, activityType: string, mode: 'quick' | 'smart' = 'smart') {
    const requirements = this.getActivityRequirements(activityType);
    
    // Check required slots
    const missingRequired = requirements.required.filter(reqSlot => {
      return !this.isSlotFilled(slots, reqSlot.key);
    });

    // Check optional slots
    const filledOptional = requirements.optional.filter(optSlot => {
      return this.isSlotFilled(slots, optSlot.key);
    });

    const minOptionalNeeded = mode === 'smart' ? requirements.minOptionalRequired : 0;
    const missingOptionalCount = Math.max(0, minOptionalNeeded - filledOptional.length);

    // Determine next priority slot to ask for
    let nextPrioritySlot = null;
    if (missingRequired.length > 0) {
      nextPrioritySlot = missingRequired[0];
    } else if (missingOptionalCount > 0) {
      const unfilledOptional = requirements.optional.filter(optSlot => 
        !this.isSlotFilled(slots, optSlot.key)
      );
      nextPrioritySlot = unfilledOptional[0];
    }

    // Calculate completion percentage
    const totalRequired = requirements.required.length;
    const totalOptionalNeeded = mode === 'smart' ? requirements.minOptionalRequired : 0;
    const totalNeeded = totalRequired + totalOptionalNeeded;
    
    const filledRequired = totalRequired - missingRequired.length;
    const filledOptionalCount = filledOptional.length;
    const totalFilled = filledRequired + Math.min(filledOptionalCount, totalOptionalNeeded);
    
    const completionPercentage = totalNeeded > 0 ? Math.round((totalFilled / totalNeeded) * 100) : 100;

    // Determine readiness
    const isReady = missingRequired.length === 0 && missingOptionalCount === 0;

    return {
      isReady,
      completionPercentage,
      missingRequired,
      missingOptionalCount,
      filledOptional: filledOptional.length,
      nextPrioritySlot,
      requirements,
      totalNeeded,
      totalFilled
    };
  }

  /**
   * Check if a slot is properly filled (handles nested paths like 'location.destination')
   */
  private static isSlotFilled(slots: any, slotKey: string): boolean {
    if (!slots || !slotKey) return false;
    
    const keys = slotKey.split('.');
    let current = slots;
    
    for (const key of keys) {
      if (!current || current[key] === undefined || current[key] === null) {
        return false;
      }
      current = current[key];
    }
    
    // Check for meaningful values (not empty strings, "TBD", etc.)
    if (typeof current === 'string') {
      const normalized = current.toLowerCase().trim();
      if (normalized === '' || normalized.includes('tbd') || normalized === 'unknown') {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Generate context chips with proper required/optional categorization
   */
  static generateContextChips(slots: any, activityType: string): Array<{
    label: string;
    value: string;
    category: 'required' | 'optional';
    filled: boolean;
  }> {
    const requirements = this.getActivityRequirements(activityType);
    const chips = [];

    // Add required slots
    for (const reqSlot of requirements.required) {
      const filled = this.isSlotFilled(slots, reqSlot.key);
      chips.push({
        label: reqSlot.label,
        value: filled ? this.getSlotDisplayValue(slots, reqSlot.key) : reqSlot.description,
        category: 'required' as const,
        filled
      });
    }

    // Add filled optional slots
    for (const optSlot of requirements.optional) {
      if (this.isSlotFilled(slots, optSlot.key)) {
        chips.push({
          label: optSlot.label,
          value: this.getSlotDisplayValue(slots, optSlot.key),
          category: 'optional' as const,
          filled: true
        });
      }
    }

    return chips;
  }

  /**
   * Get display value for a slot (handles nested paths)
   */
  private static getSlotDisplayValue(slots: any, slotKey: string): string {
    const keys = slotKey.split('.');
    let current = slots;
    
    for (const key of keys) {
      if (!current || current[key] === undefined) return 'Not set';
      current = current[key];
    }
    
    return String(current);
  }
}