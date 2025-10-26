export interface User {
  id: string;
  username: string;
  email?: string;
  authentication?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  completedAt?: string;
  activityId?: string;
  priority?: string;
  estimatedMinutes?: number;
}

export interface Activity {
  id: string;
  title: string;
  description?: string;
  category?: string;
  tasks?: Task[];
  createdAt: string;
  userId: string;
}

export interface JournalEntry {
  id: string;
  category: string;
  content: string;
  mediaUrls?: string[];
  createdAt: string;
}

export interface Progress {
  completedToday: number;
  totalToday: number;
  weeklyStreak: number;
  monthlyTotal: number;
}

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Signup: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Plan: undefined;
  Journal: undefined;
  Profile: undefined;
};
