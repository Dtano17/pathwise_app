import { useState, useEffect } from 'react';

// Tag to category mappings (simplified from server config)
const TAG_CATEGORY_MAP: Record<string, string[]> = {
  // Grouped experiences
  '@vacation': ['Travel & Places', 'Restaurants & Food', 'Activities & Events'],
  '@trip': ['Travel & Places', 'Restaurants & Food', 'Activities & Events'],
  '@datenight': ['Restaurants & Food', 'Activities & Events', 'Fashion & Style'],
  '@weekend': ['Activities & Events', 'Restaurants & Food', 'Travel & Places'],
  '@selfcare': ['Health & Fitness', 'Restaurants & Food', 'Shopping & Purchases'],

  // Individual categories
  '@restaurants': ['Restaurants & Food'],
  '@restaurant': ['Restaurants & Food'],
  '@food': ['Restaurants & Food'],
  '@dining': ['Restaurants & Food'],
  '@travel': ['Travel & Places'],
  '@places': ['Travel & Places'],
  '@place': ['Travel & Places'],
  '@activities': ['Activities & Events'],
  '@activity': ['Activities & Events'],
  '@events': ['Activities & Events'],
  '@event': ['Activities & Events'],
  '@music': ['Music & Concerts'],
  '@concerts': ['Music & Concerts'],
  '@concert': ['Music & Concerts'],
  '@movies': ['Movies & TV Shows'],
  '@movie': ['Movies & TV Shows'],
  '@shows': ['Movies & TV Shows'],
  '@show': ['Movies & TV Shows'],
  '@tv': ['Movies & TV Shows'],
  '@shopping': ['Shopping & Purchases'],
  '@purchases': ['Shopping & Purchases'],
  '@books': ['Books & Learning'],
  '@book': ['Books & Learning'],
  '@learning': ['Books & Learning'],
  '@fitness': ['Health & Fitness'],
  '@health': ['Health & Fitness'],
  '@workout': ['Health & Fitness'],
  '@fashion': ['Fashion & Style'],
  '@style': ['Fashion & Style'],
  '@outfit': ['Fashion & Style'],
};

interface DetectedKeyword {
  tag: string;
  categories: string[];
  isGrouped: boolean;
}

interface KeywordDetectionResult {
  detectedKeywords: DetectedKeyword[];
  suggestedCategories: string[];
  isGroupedExperience: boolean;
  confidence: number;
}

export function useKeywordDetection(text: string): KeywordDetectionResult {
  const [result, setResult] = useState<KeywordDetectionResult>({
    detectedKeywords: [],
    suggestedCategories: [],
    isGroupedExperience: false,
    confidence: 0,
  });

  useEffect(() => {
    // Extract @keywords from text
    const tagPattern = /@[\w]+/g;
    const matches = text.match(tagPattern) || [];
    const uniqueTags = Array.from(new Set(matches.map(tag => tag.toLowerCase())));

    if (uniqueTags.length === 0) {
      setResult({
        detectedKeywords: [],
        suggestedCategories: [],
        isGroupedExperience: false,
        confidence: 0,
      });
      return;
    }

    // Map tags to categories
    const detected: DetectedKeyword[] = uniqueTags.map(tag => {
      const categories = TAG_CATEGORY_MAP[tag] || [];
      return {
        tag,
        categories,
        isGrouped: categories.length > 1,
      };
    });

    // Get all unique categories
    const allCategories = detected.flatMap(d => d.categories);
    const uniqueCategories = Array.from(new Set(allCategories));

    // Check if any tag is a grouped experience
    const isGrouped = detected.some(d => d.isGrouped);

    // Calculate confidence (100% for recognized tags, 0% for unrecognized)
    const recognizedCount = detected.filter(d => d.categories.length > 0).length;
    const confidence = uniqueTags.length > 0 ? (recognizedCount / uniqueTags.length) : 0;

    setResult({
      detectedKeywords: detected,
      suggestedCategories: uniqueCategories,
      isGroupedExperience: isGrouped,
      confidence,
    });
  }, [text]);

  return result;
}

// Helper to get category color/icon
export function getCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    'Restaurants & Food': 'from-orange-500 to-red-500',
    'Movies & TV Shows': 'from-purple-500 to-pink-500',
    'Music & Concerts': 'from-blue-500 to-cyan-500',
    'Books & Learning': 'from-green-500 to-emerald-500',
    'Activities & Events': 'from-yellow-500 to-orange-500',
    'Travel & Places': 'from-indigo-500 to-purple-500',
    'Fashion & Style': 'from-pink-500 to-rose-500',
    'Shopping & Purchases': 'from-teal-500 to-cyan-500',
    'Health & Fitness': 'from-lime-500 to-green-500',
    'Personal Notes': 'from-slate-500 to-gray-500',
  };
  return colorMap[category] || 'from-gray-500 to-slate-500';
}
