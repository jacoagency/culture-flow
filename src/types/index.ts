export interface CulturalCard {
  id: string;
  category: Category;
  title: string;
  description: string;
  content: string;
  imageUrl?: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  points: number;
  timeToRead: number; // minutes
  source?: string;
  createdAt: Date;
  liked?: boolean;
  saved?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export interface UserProgress {
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  level: number;
  cardsCompleted: number;
  categoriesUnlocked: string[];
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  progress: number;
  maxProgress: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  progress: UserProgress;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notificationsEnabled: boolean;
  dailyGoal: number;
  preferredCategories: string[];
}

export type ThemeMode = 'light' | 'dark';

export interface Theme {
  mode: ThemeMode;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    card: string;
    text: string;
    textSecondary: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    border: string;
    shadow: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    h1: TextStyle;
    h2: TextStyle;
    h3: TextStyle;
    body: TextStyle;
    caption: TextStyle;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}

export interface TextStyle {
  fontSize: number;
  fontWeight: '300' | '400' | '500' | '600' | '700' | '800';
  lineHeight: number;
}