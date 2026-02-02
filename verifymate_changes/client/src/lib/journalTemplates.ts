// Journal templates for structured entries

export interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'boolean' | 'rating' | 'media';
  placeholder?: string;
  required?: boolean;
  options?: string[]; // For rating
}

export interface JournalTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  fields: TemplateField[];
  suggestedKeywords: string[]; // Auto-populated @keywords
}

export const templates: JournalTemplate[] = [
  {
    id: 'trip-reflection',
    name: 'Trip Reflection',
    category: 'Travel & Places',
    description: 'Capture memories from your travels',
    icon: '✈️',
    fields: [
      { id: 'destination', label: 'Destination', type: 'text', placeholder: 'Where did you go?', required: true },
      { id: 'highlights', label: 'Best Moments', type: 'textarea', placeholder: 'What were the highlights?', required: true },
      { id: 'challenges', label: 'Challenges', type: 'textarea', placeholder: 'Any difficulties or surprises?' },
      { id: 'rating', label: 'Overall Experience', type: 'rating', options: ['⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐⭐'] },
      { id: 'would_return', label: 'Would you return?', type: 'boolean' },
      { id: 'photos', label: 'Photos', type: 'media' },
      { id: 'next_time', label: 'Next Time', type: 'textarea', placeholder: "What would you do differently?" }
    ],
    suggestedKeywords: ['@travel', '@vacation', '@trip']
  },
  {
    id: 'restaurant-review',
    name: 'Restaurant Review',
    category: 'Restaurants & Food',
    description: 'Document your dining experiences',
    icon: '🍽️',
    fields: [
      { id: 'restaurant', label: 'Restaurant Name', type: 'text', placeholder: 'Name and location', required: true },
      { id: 'dishes', label: 'What You Ordered', type: 'textarea', placeholder: 'Dishes and drinks', required: true },
      { id: 'standout', label: 'Standout Items', type: 'textarea', placeholder: 'What impressed you most?' },
      { id: 'atmosphere', label: 'Atmosphere', type: 'text', placeholder: 'Vibe, ambiance, service' },
      { id: 'rating', label: 'Rating', type: 'rating', options: ['⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐⭐'] },
      { id: 'photos', label: 'Food Photos', type: 'media' },
      { id: 'recommend', label: 'Would you recommend?', type: 'boolean' }
    ],
    suggestedKeywords: ['@restaurants', '@food', '@dining']
  },
  {
    id: 'daily-gratitude',
    name: 'Daily Gratitude',
    category: 'Personal Notes',
    description: 'Reflect on what you\'re thankful for',
    icon: '🙏',
    fields: [
      { id: 'grateful_1', label: 'I\'m grateful for...', type: 'textarea', placeholder: 'Something that made today special', required: true },
      { id: 'grateful_2', label: 'I appreciate...', type: 'textarea', placeholder: 'A person, moment, or thing' },
      { id: 'grateful_3', label: 'What went well today?', type: 'textarea', placeholder: 'A win or positive moment' },
      { id: 'lesson', label: 'Today I learned...', type: 'textarea', placeholder: 'New insight or realization' }
    ],
    suggestedKeywords: []
  },
  {
    id: 'workout-log',
    name: 'Workout Log',
    category: 'Health & Fitness',
    description: 'Track your fitness journey',
    icon: '💪',
    fields: [
      { id: 'activity', label: 'Activity Type', type: 'text', placeholder: 'Gym, running, yoga, etc.', required: true },
      { id: 'duration', label: 'Duration', type: 'text', placeholder: 'How long?' },
      { id: 'details', label: 'What You Did', type: 'textarea', placeholder: 'Exercises, distance, sets/reps', required: true },
      { id: 'feeling', label: 'How You Feel', type: 'textarea', placeholder: 'Energy level, soreness, mood' },
      { id: 'progress', label: 'Progress Notes', type: 'textarea', placeholder: 'PRs, improvements, goals' }
    ],
    suggestedKeywords: ['@fitness', '@workout', '@health']
  },
  {
    id: 'movie-review',
    name: 'Movie/Show Review',
    category: 'Movies & TV Shows',
    description: 'Remember what you watched and loved',
    icon: '🎬',
    fields: [
      { id: 'title', label: 'Title', type: 'text', placeholder: 'Movie or show name', required: true },
      { id: 'rating', label: 'Rating', type: 'rating', options: ['⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐⭐'] },
      { id: 'thoughts', label: 'Your Thoughts', type: 'textarea', placeholder: 'What did you think?', required: true },
      { id: 'favorite_moment', label: 'Favorite Moment', type: 'textarea', placeholder: 'Best scene or quote' },
      { id: 'recommend', label: 'Would you recommend?', type: 'boolean' }
    ],
    suggestedKeywords: ['@movies', '@shows', '@entertainment']
  },
  {
    id: 'book-reflection',
    name: 'Book Reflection',
    category: 'Books & Learning',
    description: 'Document your reading journey',
    icon: '📚',
    fields: [
      { id: 'title', label: 'Book Title', type: 'text', placeholder: 'Title and author', required: true },
      { id: 'rating', label: 'Rating', type: 'rating', options: ['⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐⭐'] },
      { id: 'summary', label: 'Key Takeaways', type: 'textarea', placeholder: 'Main ideas or lessons', required: true },
      { id: 'favorite_quote', label: 'Favorite Quote', type: 'textarea', placeholder: 'A memorable passage' },
      { id: 'impact', label: 'How It Affected You', type: 'textarea', placeholder: 'Changed perspective? Inspired action?' },
      { id: 'recommend', label: 'Would you recommend?', type: 'boolean' }
    ],
    suggestedKeywords: ['@books', '@reading', '@learning']
  },
  {
    id: 'event-memory',
    name: 'Event Memory',
    category: 'Activities & Events',
    description: 'Preserve special moments and gatherings',
    icon: '🎉',
    fields: [
      { id: 'event', label: 'Event Name', type: 'text', placeholder: 'Concert, party, gathering, etc.', required: true },
      { id: 'who', label: 'Who Was There', type: 'text', placeholder: 'People you were with' },
      { id: 'highlights', label: 'Highlights', type: 'textarea', placeholder: 'Best moments', required: true },
      { id: 'photos', label: 'Photos', type: 'media' },
      { id: 'feeling', label: 'How It Made You Feel', type: 'textarea', placeholder: 'Your emotions and reactions' }
    ],
    suggestedKeywords: ['@events', '@activities', '@entertainment']
  },
  {
    id: 'purchase-log',
    name: 'Purchase Log',
    category: 'Shopping & Purchases',
    description: 'Track meaningful purchases and finds',
    icon: '🛍️',
    fields: [
      { id: 'item', label: 'What You Bought', type: 'text', placeholder: 'Item name', required: true },
      { id: 'where', label: 'Where', type: 'text', placeholder: 'Store or website' },
      { id: 'why', label: 'Why You Got It', type: 'textarea', placeholder: 'Need, want, or special reason', required: true },
      { id: 'photos', label: 'Photos', type: 'media' },
      { id: 'worth_it', label: 'Worth the purchase?', type: 'boolean' }
    ],
    suggestedKeywords: ['@shopping', '@purchases']
  }
];

// Helper to format template data into journal text
export function formatTemplateEntry(
  template: JournalTemplate,
  values: Record<string, any>
): string {
  let text = `${template.icon} ${template.name}\n\n`;

  template.fields.forEach(field => {
    const value = values[field.id];
    if (!value) return;

    if (field.type === 'boolean') {
      text += `${field.label}: ${value ? 'Yes' : 'No'}\n`;
    } else if (field.type === 'rating') {
      text += `${field.label}: ${value}\n`;
    } else if (field.type !== 'media') {
      text += `${field.label}:\n${value}\n\n`;
    }
  });

  // Add keywords
  if (template.suggestedKeywords.length > 0) {
    text += `\n${template.suggestedKeywords.join(' ')}`;
  }

  return text.trim();
}

// Get templates for a specific category
export function getTemplatesForCategory(category: string): JournalTemplate[] {
  return templates.filter(t => t.category === category);
}

// Get all unique categories
export function getTemplateCategories(): string[] {
  return Array.from(new Set(templates.map(t => t.category)));
}
