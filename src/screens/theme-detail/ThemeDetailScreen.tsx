import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Icon, Button } from '../../components/ui';
import { supabase } from '../../config/supabase';

interface Subtopic {
  id: number;
  title: string;
  description: string;
  order_index: number;
  icon: string;
  estimated_duration: number;
  difficulty_level: string;
  points_reward: number;
  is_locked: boolean;
  progress?: {
    status: 'not_started' | 'in_progress' | 'completed';
    readings_completed: number;
    quiz_passed: boolean;
    total_readings: number;
  };
}

interface ThemeDetail {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  subtopics: Subtopic[];
  user_progress?: {
    level: number;
    experience_points: number;
    content_completed: number;
  };
}

export const ThemeDetailScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const { themeId } = route.params as { themeId: number };

  const [themeDetail, setThemeDetail] = useState<ThemeDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchThemeDetail = async () => {
    try {
      // Get theme details
      const { data: themeData } = await supabase
        .from('personal_development_themes')
        .select('*')
        .eq('id', themeId)
        .single();

      // Get subtopics
      const { data: subtopicsData } = await supabase
        .from('theme_subtopics')
        .select('*')
        .eq('theme_id', themeId)
        .order('order_index');

      // Get user progress for this theme
      const { data: userProgress } = await supabase
        .from('user_theme_progress')
        .select('*')
        .eq('user_id', user?.id || '')
        .eq('theme_id', themeId)
        .single();

      // Get user progress for each subtopic
      const { data: subtopicProgress } = await supabase
        .from('user_subtopic_progress')
        .select('*')
        .eq('user_id', user?.id || '')
        .in('subtopic_id', subtopicsData?.map(s => s.id) || []);

      // Get reading counts for each subtopic
      const readingCounts = await Promise.all(
        (subtopicsData || []).map(async (subtopic) => {
          const { count } = await supabase
            .from('learning_readings')
            .select('*', { count: 'exact' })
            .eq('subtopic_id', subtopic.id);
          return { subtopic_id: subtopic.id, count: count || 0 };
        })
      );

      const subtopicsWithProgress = subtopicsData?.map(subtopic => {
        const progress = subtopicProgress?.find(p => p.subtopic_id === subtopic.id);
        const readingCount = readingCounts.find(r => r.subtopic_id === subtopic.id)?.count || 0;
        
        return {
          ...subtopic,
          progress: progress ? {
            status: progress.status,
            readings_completed: progress.readings_completed,
            quiz_passed: progress.quiz_passed,
            total_readings: readingCount,
          } : {
            status: 'not_started' as const,
            readings_completed: 0,
            quiz_passed: false,
            total_readings: readingCount,
          }
        };
      }) || [];

      setThemeDetail({
        id: themeData.id,
        name: themeData.name,
        description: themeData.description,
        icon: themeData.icon,
        color: themeData.color,
        subtopics: subtopicsWithProgress,
        user_progress: userProgress || {
          level: 1,
          experience_points: 0,
          content_completed: 0,
        },
      });

    } catch (error) {
      console.error('Error fetching theme detail:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchThemeDetail();
  }, [themeId, user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchThemeDetail();
  };

  const handleSubtopicPress = (subtopic: Subtopic) => {
    navigation.navigate('subtopic-detail' as never, { 
      subtopicId: subtopic.id,
      themeColor: themeDetail?.color 
    } as never);
  };

  const getSubtopicStatusIcon = (status: string, quiz_passed: boolean) => {
    switch (status) {
      case 'completed':
        return quiz_passed ? 'check-circle' : 'clock';
      case 'in_progress':
        return 'play-circle';
      default:
        return 'circle';
    }
  };

  const getSubtopicStatusColor = (status: string, quiz_passed: boolean) => {
    switch (status) {
      case 'completed':
        return quiz_passed ? theme.colors.success : theme.colors.accent;
      case 'in_progress':
        return theme.colors.primary;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return '#27ae60';
      case 'intermediate': return '#f39c12';
      case 'advanced': return '#e74c3c';
      default: return theme.colors.textSecondary;
    }
  };

  if (isLoading || !themeDetail) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Cargando tema...
        </Text>
      </View>
    );
  }

  const completedSubtopics = themeDetail.subtopics.filter(s => s.progress?.status === 'completed').length;
  const totalSubtopics = themeDetail.subtopics.length;
  const progressPercentage = totalSubtopics > 0 ? (completedSubtopics / totalSubtopics) * 100 : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <Card style={styles.header}>
        <View style={styles.themeHeader}>
          <View
            style={[
              styles.themeIcon,
              { backgroundColor: themeDetail.color + '20' }
            ]}
          >
            <Icon
              name={themeDetail.icon as any}
              size={32}
              color={themeDetail.color}
            />
          </View>
          <View style={styles.themeInfo}>
            <Text style={[styles.themeName, { color: theme.colors.text }]}>
              {themeDetail.name}
            </Text>
            <Text style={[styles.themeDescription, { color: theme.colors.textSecondary }]}>
              {themeDetail.description}
            </Text>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: theme.colors.text }]}>
              Tu Progreso
            </Text>
            <Text style={[styles.progressStats, { color: theme.colors.textSecondary }]}>
              {completedSubtopics} de {totalSubtopics} completados
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { backgroundColor: theme.colors.border }
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: themeDetail.color,
                    width: `${progressPercentage}%`,
                  }
                ]}
              />
            </View>
            <Text style={[styles.progressPercent, { color: theme.colors.text }]}>
              {Math.round(progressPercentage)}%
            </Text>
          </View>
        </View>
      </Card>

      {/* Subtopics */}
      <View style={styles.subtopicsSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Subtemas ({totalSubtopics})
        </Text>
        
        {themeDetail.subtopics.map((subtopic, index) => (
          <TouchableOpacity
            key={subtopic.id}
            onPress={() => handleSubtopicPress(subtopic)}
            activeOpacity={0.7}
          >
            <Card style={styles.subtopicCard}>
              <View style={styles.subtopicHeader}>
                <View style={styles.subtopicLeft}>
                  <View style={styles.subtopicIconContainer}>
                    <Icon
                      name={getSubtopicStatusIcon(
                        subtopic.progress?.status || 'not_started',
                        subtopic.progress?.quiz_passed || false
                      ) as any}
                      size={24}
                      color={getSubtopicStatusColor(
                        subtopic.progress?.status || 'not_started',
                        subtopic.progress?.quiz_passed || false
                      )}
                    />
                  </View>
                  <View style={styles.subtopicInfo}>
                    <Text style={[styles.subtopicTitle, { color: theme.colors.text }]}>
                      {subtopic.title}
                    </Text>
                    <Text style={[styles.subtopicDescription, { color: theme.colors.textSecondary }]}>
                      {subtopic.description}
                    </Text>
                  </View>
                </View>
                <Icon name="chevron-right" size={20} color={theme.colors.textSecondary} />
              </View>

              <View style={styles.subtopicMeta}>
                <View style={styles.metaItem}>
                  <Icon name="clock" size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                    {subtopic.estimated_duration} min
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Icon name="star" size={16} color={theme.colors.accent} />
                  <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                    {subtopic.points_reward} XP
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <View
                    style={[
                      styles.difficultyBadge,
                      { backgroundColor: getDifficultyColor(subtopic.difficulty_level) + '20' }
                    ]}
                  >
                    <Text
                      style={[
                        styles.difficultyText,
                        { color: getDifficultyColor(subtopic.difficulty_level) }
                      ]}
                    >
                      {subtopic.difficulty_level === 'beginner' ? 'Básico' :
                       subtopic.difficulty_level === 'intermediate' ? 'Intermedio' : 'Avanzado'}
                    </Text>
                  </View>
                </View>
                {subtopic.progress && subtopic.progress.total_readings > 0 && (
                  <View style={styles.metaItem}>
                    <Icon name="book-open" size={16} color={theme.colors.textSecondary} />
                    <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                      {subtopic.progress.readings_completed}/{subtopic.progress.total_readings}
                    </Text>
                  </View>
                )}
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    marginBottom: 20,
    padding: 20,
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  themeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  themeInfo: {
    flex: 1,
  },
  themeName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  themeDescription: {
    fontSize: 16,
    lineHeight: 22,
  },
  progressSection: {
    gap: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  progressStats: {
    fontSize: 14,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  subtopicsSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtopicCard: {
    padding: 16,
    marginBottom: 12,
  },
  subtopicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  subtopicLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subtopicIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  subtopicInfo: {
    flex: 1,
  },
  subtopicTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtopicDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  subtopicMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});