/**
 * Domain Question Registry
 * Defines prioritized questions for each planning domain
 * 
 * Priority Levels:
 * - Priority 1 (Critical): Must ask first, required for basic plan
 * - Priority 2 (Important): Should ask for quality plan
 * - Priority 3 (Helpful): Nice to have for comprehensive plan
 * 
 * Quick Mode: Only asks Priority 1 questions (3 critical)
 * Smart Mode: Asks Priority 1 + 2 + 3 questions (7-10 comprehensive)
 */

export interface DomainQuestion {
  field: string;
  alternateFields?: string[]; // Alternative field names to check
  question: string;
  priority: 1 | 2 | 3;
  examples?: string;
}

export interface DomainQuestionSet {
  domain: string;
  questions: DomainQuestion[];
}

export const DOMAIN_QUESTIONS: Record<string, DomainQuestion[]> = {
  travel: [
    // Priority 1: Critical (Quick Mode asks these)
    {
      field: 'specificDestination',
      alternateFields: ['city', 'cities', 'region', 'regions'],
      question: 'Which specific cities or regions in {destination} are you planning to visit?',
      priority: 1,
      examples: 'e.g., Barcelona and Madrid, Costa del Sol, Andalusia region'
    },
    {
      field: 'dates',
      alternateFields: ['startDate', 'endDate', 'timeframe'],
      question: 'What are your exact travel dates? (start and end dates)',
      priority: 1,
      examples: 'e.g., November 10-24, 2025'
    },
    {
      field: 'duration',
      alternateFields: ['lengthOfStay', 'tripLength'],
      question: 'How long will you be traveling? (number of days or weeks)',
      priority: 1,
      examples: 'e.g., 2 weeks, 10 days'
    },
    
    // Priority 2: Important (Smart Mode adds these)
    {
      field: 'budget',
      alternateFields: ['totalBudget', 'spending'],
      question: 'What\'s your total budget for this trip?',
      priority: 2,
      examples: 'e.g., $5000 USD, €3000'
    },
    {
      field: 'travelers',
      alternateFields: ['groupSize', 'travelParty', 'companions'],
      question: 'Who will be traveling? (solo, couple, family, group size)',
      priority: 2,
      examples: 'e.g., solo, traveling with partner, family of 4'
    },
    {
      field: 'purpose',
      alternateFields: ['tripPurpose', 'reason'],
      question: 'Is this trip for business or leisure? (or both)',
      priority: 2,
      examples: 'e.g., business conference, leisure vacation, mix of both'
    },
    {
      field: 'interests',
      alternateFields: ['activities', 'preferences'],
      question: 'What kinds of activities or experiences interest you?',
      priority: 2,
      examples: 'e.g., beaches, culture, adventure, food, nightlife'
    },
    
    // Priority 3: Helpful (Smart Mode includes for comprehensive planning)
    {
      field: 'specialNeeds',
      alternateFields: ['requirements', 'constraints'],
      question: 'Any special requirements? (pets, dietary restrictions, accessibility needs)',
      priority: 3,
      examples: 'e.g., traveling with pet, vegetarian, wheelchair accessible'
    },
    {
      field: 'accommodationType',
      alternateFields: ['lodging', 'hotelPreference'],
      question: 'What type of accommodation do you prefer?',
      priority: 3,
      examples: 'e.g., hotels, Airbnb, hostels, luxury resorts'
    },
    {
      field: 'pace',
      alternateFields: ['travelStyle', 'intensity'],
      question: 'Do you prefer a relaxed pace or packed itinerary?',
      priority: 3,
      examples: 'e.g., relaxed with downtime, action-packed, balanced'
    }
  ],

  event: [
    // Priority 1: Critical
    {
      field: 'eventType',
      alternateFields: ['occasion', 'eventCategory'],
      question: 'What type of event are you planning?',
      priority: 1,
      examples: 'e.g., birthday party, wedding, conference, graduation'
    },
    {
      field: 'date',
      alternateFields: ['eventDate', 'when'],
      question: 'What\'s the exact date of the event?',
      priority: 1,
      examples: 'e.g., December 15, 2025'
    },
    {
      field: 'guestCount',
      alternateFields: ['attendees', 'headcount', 'numberOfGuests'],
      question: 'How many people are you expecting?',
      priority: 1,
      examples: 'e.g., 50 people, around 30-40, intimate gathering of 15'
    },
    
    // Priority 2: Important
    {
      field: 'budget',
      alternateFields: ['totalBudget', 'spending'],
      question: 'What\'s your total budget for this event?',
      priority: 2,
      examples: 'e.g., $2000, $500-1000'
    },
    {
      field: 'venue',
      alternateFields: ['location', 'eventLocation'],
      question: 'Where will the event take place? (or do you need venue suggestions)',
      priority: 2,
      examples: 'e.g., backyard, rented hall, restaurant, need suggestions'
    },
    {
      field: 'theme',
      alternateFields: ['vibe', 'style', 'aesthetic'],
      question: 'What theme or vibe are you going for?',
      priority: 2,
      examples: 'e.g., elegant, casual, tropical, vintage'
    },
    {
      field: 'honoree',
      alternateFields: ['celebrant', 'guestOfHonor'],
      question: 'Who is the event for? (age, interests, relationship)',
      priority: 2,
      examples: 'e.g., my mom turning 60, my 5-year-old daughter'
    },
    
    // Priority 3: Helpful
    {
      field: 'catering',
      alternateFields: ['food', 'menu', 'dining'],
      question: 'What are your catering plans? (homemade, catered, restaurant)',
      priority: 3,
      examples: 'e.g., buffet style, plated dinner, appetizers only'
    },
    {
      field: 'activities',
      alternateFields: ['entertainment', 'program'],
      question: 'What activities or entertainment do you have in mind?',
      priority: 3,
      examples: 'e.g., DJ, games, speeches, dancing'
    },
    {
      field: 'specialRequirements',
      alternateFields: ['dietary', 'accessibility'],
      question: 'Any dietary restrictions or special needs to accommodate?',
      priority: 3,
      examples: 'e.g., vegetarian options, nut allergies, wheelchair access'
    }
  ],

  dining: [
    // Priority 1: Critical
    {
      field: 'cuisineType',
      alternateFields: ['cuisine', 'restaurantType', 'foodType'],
      question: 'What type of cuisine or restaurant are you looking for?',
      priority: 1,
      examples: 'e.g., Italian, sushi, steakhouse, fine dining'
    },
    {
      field: 'date',
      alternateFields: ['when', 'diningDate'],
      question: 'When are you planning to dine?',
      priority: 1,
      examples: 'e.g., tonight, this Saturday, December 20th'
    },
    {
      field: 'groupSize',
      alternateFields: ['diners', 'partySize', 'numberOfPeople'],
      question: 'How many people will be dining?',
      priority: 1,
      examples: 'e.g., 2 people, party of 6, just me'
    },
    
    // Priority 2: Important
    {
      field: 'budget',
      alternateFields: ['priceRange', 'spending'],
      question: 'What\'s your budget per person?',
      priority: 2,
      examples: 'e.g., $50 per person, under $30, fine dining budget'
    },
    {
      field: 'location',
      alternateFields: ['area', 'neighborhood'],
      question: 'Which area or neighborhood do you prefer?',
      priority: 2,
      examples: 'e.g., downtown, near Times Square, within 5 miles'
    },
    {
      field: 'occasion',
      alternateFields: ['purpose', 'reason'],
      question: 'What\'s the occasion?',
      priority: 2,
      examples: 'e.g., anniversary, business dinner, casual catch-up'
    },
    
    // Priority 3: Helpful
    {
      field: 'dietary',
      alternateFields: ['dietaryRestrictions', 'allergies'],
      question: 'Any dietary restrictions or allergies?',
      priority: 3,
      examples: 'e.g., vegetarian, gluten-free, nut allergy'
    },
    {
      field: 'ambiance',
      alternateFields: ['atmosphere', 'vibe'],
      question: 'What kind of atmosphere are you looking for?',
      priority: 3,
      examples: 'e.g., romantic, lively, quiet, outdoor seating'
    },
    {
      field: 'specialRequests',
      question: 'Any special requests or preferences?',
      priority: 3,
      examples: 'e.g., live music, waterfront view, private room'
    }
  ],

  wellness: [
    // Priority 1: Critical
    {
      field: 'activityType',
      alternateFields: ['workoutType', 'wellnessActivity'],
      question: 'What type of wellness activity are you planning?',
      priority: 1,
      examples: 'e.g., gym workout, yoga, meditation, spa day'
    },
    {
      field: 'goals',
      alternateFields: ['objectives', 'targets'],
      question: 'What are your wellness goals?',
      priority: 1,
      examples: 'e.g., lose weight, build muscle, reduce stress, flexibility'
    },
    {
      field: 'frequency',
      alternateFields: ['schedule', 'howOften'],
      question: 'How often do you want to do this?',
      priority: 1,
      examples: 'e.g., 3 times a week, daily, every other day'
    },
    
    // Priority 2: Important
    {
      field: 'currentLevel',
      alternateFields: ['experience', 'fitnessLevel'],
      question: 'What\'s your current fitness/experience level?',
      priority: 2,
      examples: 'e.g., beginner, intermediate, advanced, returning after break'
    },
    {
      field: 'timeAvailable',
      alternateFields: ['duration', 'sessionLength'],
      question: 'How much time can you dedicate per session?',
      priority: 2,
      examples: 'e.g., 30 minutes, 1 hour, 90 minutes'
    },
    {
      field: 'preferences',
      alternateFields: ['style', 'approach'],
      question: 'Do you prefer solo activities or group classes?',
      priority: 2,
      examples: 'e.g., solo workouts, group fitness, personal trainer'
    },
    
    // Priority 3: Helpful
    {
      field: 'constraints',
      alternateFields: ['limitations', 'injuries'],
      question: 'Any physical limitations or injuries to consider?',
      priority: 3,
      examples: 'e.g., knee issues, lower back pain, pregnancy'
    },
    {
      field: 'equipment',
      alternateFields: ['resources', 'access'],
      question: 'What equipment or facilities do you have access to?',
      priority: 3,
      examples: 'e.g., gym membership, home equipment, outdoor space only'
    },
    {
      field: 'timeline',
      alternateFields: ['deadline', 'targetDate'],
      question: 'Do you have a target date or timeline for your goals?',
      priority: 3,
      examples: 'e.g., 3 months, before summer, no specific deadline'
    }
  ],

  learning: [
    // Priority 1: Critical
    {
      field: 'topic',
      alternateFields: ['subject', 'skill', 'course'],
      question: 'What do you want to learn?',
      priority: 1,
      examples: 'e.g., Spanish language, web development, photography'
    },
    {
      field: 'currentLevel',
      alternateFields: ['experience', 'knowledge'],
      question: 'What\'s your current level with this topic?',
      priority: 1,
      examples: 'e.g., complete beginner, some basics, intermediate'
    },
    {
      field: 'timeline',
      alternateFields: ['deadline', 'duration', 'timeframe'],
      question: 'How long do you have to learn this? (or what\'s your deadline)',
      priority: 1,
      examples: 'e.g., 3 months, by June, ongoing long-term learning'
    },
    
    // Priority 2: Important
    {
      field: 'learningStyle',
      alternateFields: ['preference', 'method'],
      question: 'How do you prefer to learn?',
      priority: 2,
      examples: 'e.g., video courses, books, hands-on practice, instructor-led'
    },
    {
      field: 'timeCommitment',
      alternateFields: ['hoursPerWeek', 'studyTime'],
      question: 'How much time can you dedicate per week?',
      priority: 2,
      examples: 'e.g., 5 hours/week, 30 min daily, weekends only'
    },
    {
      field: 'goals',
      alternateFields: ['objectives', 'purpose'],
      question: 'Why do you want to learn this? (career, hobby, certification)',
      priority: 2,
      examples: 'e.g., career change, personal interest, certification exam'
    },
    
    // Priority 3: Helpful
    {
      field: 'budget',
      alternateFields: ['spending', 'investment'],
      question: 'What\'s your budget for learning resources?',
      priority: 3,
      examples: 'e.g., free only, $50/month, willing to invest significantly'
    },
    {
      field: 'certification',
      alternateFields: ['credential', 'certificate'],
      question: 'Do you need certification or formal credentials?',
      priority: 3,
      examples: 'e.g., yes for job, nice to have, not needed'
    },
    {
      field: 'resources',
      alternateFields: ['materials', 'tools'],
      question: 'Do you already have any resources or tools?',
      priority: 3,
      examples: 'e.g., textbooks, software, mentors, nothing yet'
    }
  ],

  social: [
    // Priority 1: Critical
    {
      field: 'activityType',
      alternateFields: ['event', 'gathering'],
      question: 'What kind of social activity are you planning?',
      priority: 1,
      examples: 'e.g., game night, outdoor adventure, movie night, club outing'
    },
    {
      field: 'date',
      alternateFields: ['when', 'timeframe'],
      question: 'When are you planning this?',
      priority: 1,
      examples: 'e.g., this Friday, next weekend, sometime in December'
    },
    {
      field: 'groupSize',
      alternateFields: ['participants', 'attendees'],
      question: 'How many people will be joining?',
      priority: 1,
      examples: 'e.g., 4 friends, 10-15 people, just 2 of us'
    },
    
    // Priority 2: Important
    {
      field: 'location',
      alternateFields: ['venue', 'where'],
      question: 'Where do you want to do this? (or need location suggestions)',
      priority: 2,
      examples: 'e.g., my place, downtown area, outdoor park, need ideas'
    },
    {
      field: 'budget',
      alternateFields: ['spending', 'priceRange'],
      question: 'What\'s the budget per person?',
      priority: 2,
      examples: 'e.g., free activity, $20-30 each, no limit'
    },
    {
      field: 'vibe',
      alternateFields: ['atmosphere', 'mood'],
      question: 'What kind of vibe are you going for?',
      priority: 2,
      examples: 'e.g., chill and relaxed, high energy, competitive fun'
    },
    
    // Priority 3: Helpful
    {
      field: 'ageGroup',
      alternateFields: ['demographic', 'crowd'],
      question: 'What\'s the age range of the group?',
      priority: 3,
      examples: 'e.g., college friends, mixed ages, all 30s'
    },
    {
      field: 'interests',
      alternateFields: ['preferences', 'likes'],
      question: 'What does the group enjoy doing?',
      priority: 3,
      examples: 'e.g., board games, sports, trying new restaurants'
    },
    {
      field: 'specialConsiderations',
      question: 'Any special considerations?',
      priority: 3,
      examples: 'e.g., indoor only, kid-friendly, no alcohol'
    }
  ],

  entertainment: [
    // Priority 1: Critical
    {
      field: 'entertainmentType',
      alternateFields: ['activityType', 'event'],
      question: 'What type of entertainment are you looking for?',
      priority: 1,
      examples: 'e.g., concert, movie, theater, comedy show, sports event'
    },
    {
      field: 'date',
      alternateFields: ['when', 'timeframe'],
      question: 'When do you want to go?',
      priority: 1,
      examples: 'e.g., tonight, this weekend, Friday December 15th'
    },
    {
      field: 'groupSize',
      alternateFields: ['attendees', 'tickets'],
      question: 'How many tickets do you need?',
      priority: 1,
      examples: 'e.g., 2 tickets, 4 people, just myself'
    },
    
    // Priority 2: Important
    {
      field: 'budget',
      alternateFields: ['priceRange', 'spending'],
      question: 'What\'s your budget per ticket?',
      priority: 2,
      examples: 'e.g., under $50, $100-200, VIP experience'
    },
    {
      field: 'preferences',
      alternateFields: ['interests', 'genre'],
      question: 'What genres or styles do you enjoy?',
      priority: 2,
      examples: 'e.g., comedy, action movies, jazz, indie bands'
    },
    {
      field: 'location',
      alternateFields: ['venue', 'area'],
      question: 'Which area or venues do you prefer?',
      priority: 2,
      examples: 'e.g., downtown theaters, Madison Square Garden, anywhere in Manhattan'
    },
    
    // Priority 3: Helpful
    {
      field: 'seating',
      alternateFields: ['seatPreference'],
      question: 'Any seating preferences?',
      priority: 3,
      examples: 'e.g., orchestra section, balcony, close to stage'
    },
    {
      field: 'accessibility',
      alternateFields: ['specialNeeds'],
      question: 'Any accessibility requirements?',
      priority: 3,
      examples: 'e.g., wheelchair accessible, assisted listening devices'
    },
    {
      field: 'beforeAfter',
      question: 'Planning dinner or drinks before/after?',
      priority: 3,
      examples: 'e.g., yes need restaurant recommendations, no just the show'
    }
  ],

  work: [
    // Priority 1: Critical
    {
      field: 'projectType',
      alternateFields: ['task', 'workType'],
      question: 'What work project or task are you planning?',
      priority: 1,
      examples: 'e.g., product launch, team offsite, quarterly planning'
    },
    {
      field: 'deadline',
      alternateFields: ['timeline', 'dueDate'],
      question: 'What\'s the deadline or timeline?',
      priority: 1,
      examples: 'e.g., end of Q1, December 31st, 6 weeks from now'
    },
    {
      field: 'goals',
      alternateFields: ['deliverables', 'objectives'],
      question: 'What are the key goals or deliverables?',
      priority: 1,
      examples: 'e.g., launch new feature, increase sales 20%, complete audit'
    },
    
    // Priority 2: Important
    {
      field: 'team',
      alternateFields: ['stakeholders', 'people'],
      question: 'Who\'s involved? (team size, stakeholders)',
      priority: 2,
      examples: 'e.g., 5-person team, cross-functional group of 15'
    },
    {
      field: 'resources',
      alternateFields: ['tools', 'budget'],
      question: 'What resources or budget do you have?',
      priority: 2,
      examples: 'e.g., $50K budget, existing tools, need to identify resources'
    },
    {
      field: 'constraints',
      alternateFields: ['challenges', 'blockers'],
      question: 'Any constraints or known challenges?',
      priority: 2,
      examples: 'e.g., limited budget, tight timeline, regulatory requirements'
    },
    
    // Priority 3: Helpful
    {
      field: 'currentStatus',
      alternateFields: ['progress', 'stage'],
      question: 'What\'s the current status or stage?',
      priority: 3,
      examples: 'e.g., just starting, 25% complete, planning phase'
    },
    {
      field: 'dependencies',
      question: 'Any dependencies on other projects or teams?',
      priority: 3,
      examples: 'e.g., waiting on legal approval, needs engineering sign-off'
    },
    {
      field: 'successMetrics',
      alternateFields: ['kpis', 'measurements'],
      question: 'How will you measure success?',
      priority: 3,
      examples: 'e.g., user adoption rate, revenue target, completion on time'
    }
  ],

  shopping: [
    // Priority 1: Critical
    {
      field: 'itemType',
      alternateFields: ['category', 'product'],
      question: 'What are you shopping for?',
      priority: 1,
      examples: 'e.g., laptop, furniture, clothes, gifts'
    },
    {
      field: 'budget',
      alternateFields: ['priceRange', 'spending'],
      question: 'What\'s your budget?',
      priority: 1,
      examples: 'e.g., under $500, $1000-2000, flexible'
    },
    {
      field: 'timeline',
      alternateFields: ['deadline', 'when'],
      question: 'When do you need this by?',
      priority: 1,
      examples: 'e.g., ASAP, before Christmas, no rush'
    },
    
    // Priority 2: Important
    {
      field: 'purpose',
      alternateFields: ['occasion', 'use'],
      question: 'What\'s the purpose or occasion?',
      priority: 2,
      examples: 'e.g., birthday gift, home office setup, wedding registry'
    },
    {
      field: 'preferences',
      alternateFields: ['requirements', 'mustHaves'],
      question: 'Any specific requirements or must-haves?',
      priority: 2,
      examples: 'e.g., eco-friendly, specific brand, certain features'
    },
    {
      field: 'recipient',
      alternateFields: ['forWho', 'user'],
      question: 'Who is this for? (if gift, tell me about them)',
      priority: 2,
      examples: 'e.g., for myself, my tech-savvy dad, 8-year-old nephew'
    },
    
    // Priority 3: Helpful
    {
      field: 'shoppingPreference',
      alternateFields: ['where', 'channel'],
      question: 'Do you prefer online or in-store shopping?',
      priority: 3,
      examples: 'e.g., online only, prefer to see in person, either works'
    },
    {
      field: 'style',
      alternateFields: ['aesthetic', 'design'],
      question: 'Any style or aesthetic preferences?',
      priority: 3,
      examples: 'e.g., minimalist, vintage, modern, colorful'
    },
    {
      field: 'alternatives',
      question: 'Open to alternative suggestions?',
      priority: 3,
      examples: 'e.g., yes show me options, no very specific in mind'
    }
  ]
};

/**
 * Get questions for a specific domain filtered by priority level
 */
export function getQuestionsForDomain(
  domain: string,
  maxPriority: 1 | 2 | 3 = 3
): DomainQuestion[] {
  const questions = DOMAIN_QUESTIONS[domain] || DOMAIN_QUESTIONS.travel;
  return questions.filter(q => q.priority <= maxPriority);
}

/**
 * Get all field names for a domain (including alternates)
 */
export function getFieldNamesForDomain(domain: string): string[] {
  const questions = DOMAIN_QUESTIONS[domain] || DOMAIN_QUESTIONS.travel;
  const fields: string[] = [];
  
  questions.forEach(q => {
    fields.push(q.field);
    if (q.alternateFields) {
      fields.push(...q.alternateFields);
    }
  });
  
  return fields;
}

/**
 * Get essential fields (Priority 1) for validation
 */
export function getEssentialFields(domain: string): string[] {
  const priority1Questions = getQuestionsForDomain(domain, 1);
  return priority1Questions.map(q => {
    const alternates = q.alternateFields || [];
    return [q.field, ...alternates].join('|');
  });
}
