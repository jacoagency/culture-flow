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
      // Usar datos reales del usuario directamente
      const userProgress: UserProgress = {
        totalCompleted: user.content_completed || 0,
        totalTimeSpent: user.total_time_spent || 0,
        averageScore: 85, // Default por ahora
        currentStreak: user.current_streak || 0,
        bestStreak: user.best_streak || 0,
        level: user.level || 1,
        points: user.points || 0,
        completedToday: 0, // Se calculará con queries específicas después
        weeklyGoal: (user.learning_goal || 15) * 7,
        weeklyProgress: 0,
      };

        // Generate weekly stats basados en el usuario actual
        const weeklyStatsData: WeeklyStats[] = [];
        const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        
        for (let i = 0; i < 7; i++) {
          // Crear datos semi-realistas basados en el progreso del usuario
          const baseActivity = Math.max(0, userProgress.level - 1);
          const dayActivity = Math.floor(Math.random() * (baseActivity + 2));
          
          weeklyStatsData.push({
            day: daysOfWeek[i],
            completed: dayActivity,
            timeSpent: dayActivity * (5 + Math.floor(Math.random() * 15)), // 5-20 min por item
            points: dayActivity * (10 + Math.floor(Math.random() * 20)), // 10-30 puntos por item
          });
        }

        // Calculate weekly progress
        const weeklyTimeSpent = weeklyStatsData.reduce((sum, day) => sum + day.timeSpent, 0);
        userProgress.weeklyProgress = Math.min((weeklyTimeSpent / userProgress.weeklyGoal) * 100, 100);

      setProgress(userProgress);
      setWeeklyStats(weeklyStatsData);

      // Generate category progress basado en el nivel del usuario
      const categories = ['arte', 'historia', 'musica', 'literatura', 'gastronomia'];
      const categoryProgressData: CategoryProgress[] = categories.map(category => {
        const userInterest = user.preferred_categories?.includes(category) ? 2 : 1;
        const completed = Math.floor((userProgress.level * userInterest) + Math.random() * 5);
        
        return {
          category,
          completed: Math.max(0, completed),
          totalTime: completed * (8 + Math.floor(Math.random() * 12)), // 8-20 min por item
          averageScore: Math.floor(Math.random() * 20) + 75, // 75-95%
          lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        };
      });

      setCategoryProgress(categoryProgressData);

        // Generate achievements (mock data)
        const mockAchievements: Achievement[] = [
          {
            id: '1',
            type: 'streak',
            name: 'Estudiante Constante',
            description: 'Completa contenido 3 días seguidos',
            icon: '🔥',
            points: 50,
            unlockedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            isNew: false,
          },
          {
            id: '2',
            type: 'category',
            name: 'Amante del Arte',
            description: 'Completa 10 contenidos de arte',
            icon: '🎨',
            points: 100,
            unlockedAt: new Date().toISOString(),
            isNew: true,
          },
          {
            id: '3',
            type: 'points',
            name: 'Coleccionista',
            description: 'Acumula 500 puntos',
            icon: '💎',
            points: 150,
            unlockedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            isNew: false,
          },
        ];

      // Generate achievements basado en el progreso real
      const dynamicAchievements: Achievement[] = [];
      
      if (userProgress.currentStreak >= 3) {
        dynamicAchievements.push({
          id: '1',
          type: 'streak',
          name: 'Estudiante Constante',
          description: `Racha de ${userProgress.currentStreak} días`,
          icon: '🔥',
          points: 50,
          unlockedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          isNew: false,
        });
      }
      
      if (userProgress.points >= 100) {
        dynamicAchievements.push({
          id: '2',
          type: 'points',
          name: 'Coleccionista',
          description: `${userProgress.points} puntos acumulados`,
          icon: '💎',
          points: 150,
          unlockedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          isNew: userProgress.points >= 500,
        });
      }
      
      if (userProgress.level >= 2) {
        dynamicAchievements.push({
          id: '3',
          type: 'level',
          name: 'Subiendo de Nivel',
          description: `Nivel ${userProgress.level} alcanzado`,
          icon: '⭐',
          points: 100,
          unlockedAt: new Date().toISOString(),
          isNew: true,
        });
      }
      
      setAchievements(dynamicAchievements);

      // Load recent content - simplificado por ahora
      try {
        const trendingResponse = await contentService.getTrendingContent('24h');
        if (trendingResponse.success && trendingResponse.data) {
          setRecentContent(trendingResponse.data.slice(0, 5));
        }
      } catch (err) {
        console.warn('Could not load recent content:', err);
        setRecentContent([]);
      }

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

// Hook for tracking daily progress
export const useDailyProgress = () => {
  const { user } = useAuth();
  const [dailyGoal] = useState(15); // 15 minutes daily goal
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

  const progressPercentage = Math.min((progress.timeSpent / dailyGoal) * 100, 100);

  return {
    dailyGoal,
    progress,
    progressPercentage,
    updateDailyProgress,
    isGoalReached: progress.timeSpent >= dailyGoal,
  };
};