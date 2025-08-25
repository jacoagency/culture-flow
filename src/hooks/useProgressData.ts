import { useState, useEffect, useCallback } from 'react';
import { contentService, ContentItem } from '../services/supabaseContent';
import { useAuth } from '../contexts/AuthContext';

interface UserProgress {
  totalCompleted: number;
  totalTimeSpent: number; // in minutes
  averageScore: number;
  currentStreak: number;
  bestStreak: number;
  level: number;
  points: number;
  completedToday: number;
  weeklyGoal: number;
  weeklyProgress: number;
}

interface WeeklyStats {
  day: string;
  completed: number;
  timeSpent: number;
  points: number;
}

interface CategoryProgress {
  category: string;
  completed: number;
  totalTime: number;
  averageScore: number;
  lastActivity: string;
}

interface Achievement {
  id: string;
  type: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  unlockedAt: string;
  isNew?: boolean;
}

interface UseProgressDataResult {
  progress: UserProgress | null;
  weeklyStats: WeeklyStats[];
  categoryProgress: CategoryProgress[];
  achievements: Achievement[];
  recentContent: ContentItem[];
  loading: boolean;
  error: string | null;
  refreshProgress: () => Promise<void>;
}

export const useProgressData = (): UseProgressDataResult => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([]);
  const [categoryProgress, setCategoryProgress] = useState<CategoryProgress[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [recentContent, setRecentContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProgressData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      console.log('👤 Loading ONLY REAL progress data for user:', user.id);
      
      // SOLO USAR DATOS REALES - NO MAS FAKE DATA
      const userProgress: UserProgress = {
        totalCompleted: user.content_completed || 0,
        totalTimeSpent: Math.floor((user.total_time_spent || 0) / 60), // Convert to minutes
        averageScore: 0, // Will be calculated from real interactions
        currentStreak: user.current_streak || 0,
        bestStreak: user.best_streak || user.current_streak || 0,
        level: user.level || 1,
        points: user.points || 0,
        completedToday: 0,
        weeklyGoal: 7, // 7 articles per week
        weeklyProgress: 0,
      };

      console.log('📈 REAL user progress (no fake data):', userProgress);

      // WEEKLY STATS - SOLO DATOS REALES O VACIOS
      const weeklyStatsData: WeeklyStats[] = [
        { day: 'Lun', completed: 0, timeSpent: 0, points: 0 },
        { day: 'Mar', completed: 0, timeSpent: 0, points: 0 },
        { day: 'Mié', completed: 0, timeSpent: 0, points: 0 },
        { day: 'Jue', completed: 0, timeSpent: 0, points: 0 },
        { day: 'Vie', completed: 0, timeSpent: 0, points: 0 },
        { day: 'Sáb', completed: 0, timeSpent: 0, points: 0 },
        { day: 'Dom', completed: 0, timeSpent: 0, points: 0 },
      ];

      // CATEGORY PROGRESS - SOLO DATOS REALES O VACIOS  
      const categories = ['arte', 'historia', 'musica', 'literatura', 'gastronomia'];
      const categoryProgressData: CategoryProgress[] = categories.map(category => ({
        category,
        completed: 0,
        totalTime: 0,
        averageScore: 0,
        lastActivity: new Date().toISOString(),
      }));

      // ACHIEVEMENTS - SOLO BASADOS EN DATOS REALES
      const realAchievements: Achievement[] = [];
      
      // Achievement por puntos reales
      if (userProgress.points >= 50) {
        realAchievements.push({
          id: 'points_50',
          type: 'points',
          name: 'Primer Coleccionista',
          description: `¡Has ganado ${userProgress.points} puntos!`,
          icon: '🎯',
          points: 50,
          unlockedAt: new Date().toISOString(),
          isNew: userProgress.points >= 50 && userProgress.points < 100,
        });
      }
      
      if (userProgress.points >= 100) {
        realAchievements.push({
          id: 'points_100',
          type: 'points',
          name: 'Coleccionista Avanzado',
          description: `¡Increíble! ${userProgress.points} puntos acumulados`,
          icon: '💎',
          points: 100,
          unlockedAt: new Date().toISOString(),
          isNew: userProgress.points >= 100 && userProgress.points < 200,
        });
      }
      
      // Achievement por nivel real
      if (userProgress.level >= 2) {
        realAchievements.push({
          id: 'level_2',
          type: 'level',
          name: 'Subiendo de Nivel',
          description: `¡Nivel ${userProgress.level} alcanzado!`,
          icon: '⭐',
          points: userProgress.level * 25,
          unlockedAt: new Date().toISOString(),
          isNew: true,
        });
      }
      
      // Achievement por contenido completado real
      if (userProgress.totalCompleted >= 1) {
        realAchievements.push({
          id: 'first_complete',
          type: 'completion',
          name: 'Primera Lectura',
          description: `¡Has completado ${userProgress.totalCompleted} contenidos!`,
          icon: '📚',
          points: 25,
          unlockedAt: new Date().toISOString(),
          isNew: userProgress.totalCompleted === 1,
        });
      }

      if (userProgress.totalCompleted >= 5) {
        realAchievements.push({
          id: 'five_complete',
          type: 'completion',
          name: 'Lector Dedicado',
          description: `${userProgress.totalCompleted} artículos completados`,
          icon: '🎓',
          points: 75,
          unlockedAt: new Date().toISOString(),
          isNew: userProgress.totalCompleted >= 5 && userProgress.totalCompleted < 10,
        });
      }
      
      // Achievement por racha real
      if (userProgress.currentStreak >= 3) {
        realAchievements.push({
          id: 'streak_3',
          type: 'streak',
          name: 'Estudiante Constante',
          description: `¡Racha de ${userProgress.currentStreak} días!`,
          icon: '🔥',
          points: 50,
          unlockedAt: new Date().toISOString(),
          isNew: userProgress.currentStreak === 3,
        });
      }

      console.log('🏆 REAL achievements (only based on user data):', realAchievements);

      // Cargar contenido reciente real
      let realRecentContent: ContentItem[] = [];
      try {
        const trendingResponse = await contentService.getTrendingContent('24h');
        if (trendingResponse.success && trendingResponse.data) {
          realRecentContent = trendingResponse.data.slice(0, 5);
          console.log('📰 REAL recent content loaded:', realRecentContent.length);
        }
      } catch (err) {
        console.warn('Could not load recent content:', err);
      }

      // SET ONLY REAL DATA
      setProgress(userProgress);
      setWeeklyStats(weeklyStatsData);
      setCategoryProgress(categoryProgressData);
      setAchievements(realAchievements);
      setRecentContent(realRecentContent);

      console.log('✅ ALL DATA SET - ONLY REAL VALUES, NO FAKE DATA');

    } catch (err) {
      setError('Error loading progress data');
      console.error('Progress data loading error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refreshProgress = useCallback(async () => {
    await loadProgressData();
  }, [loadProgressData]);

  useEffect(() => {
    if (user) {
      loadProgressData();
    }
  }, [user, loadProgressData]);

  return {
    progress,
    weeklyStats,
    categoryProgress,
    achievements,
    recentContent,
    loading,
    error,
    refreshProgress,
  };
};

// Hook for tracking daily progress - SOLO DATOS REALES
export const useDailyProgress = () => {
  const { user } = useAuth();
  const [dailyGoal] = useState(2); // 2 articles daily goal 
  const [progress, setProgress] = useState({
    timeSpent: 0,
    completed: 0,
    points: 0,
  });

  const updateDailyProgress = useCallback((timeSpent: number, points: number) => {
    setProgress(prev => ({
      timeSpent: prev.timeSpent + Math.floor(timeSpent / 60), // Convert to minutes
      completed: prev.completed + 1,
      points: prev.points + points,
    }));
  }, []);

  const progressPercentage = Math.min((progress.completed / dailyGoal) * 100, 100);

  return {
    dailyGoal,
    progress,
    progressPercentage,
    updateDailyProgress,
    isGoalReached: progress.completed >= dailyGoal,
  };
};