import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Icon, Button } from '../../components/ui';
import { supabase } from '../../config/supabase';

interface Reading {
  id: number;
  title: string;
  content: string;
  order_index: number;
  reading_time: number;
  key_concepts: string[];
}

interface Quiz {
  id: number;
  title: string;
  description: string;
  questions: {
    questions: Array<{
      id: number;
      question: string;
      type: string;
      options: string[];
      correct_answer: number;
      explanation: string;
    }>;
  };
  passing_score: number;
  points_reward: number;
}

interface SubtopicDetail {
  id: number;
  title: string;
  description: string;
  estimated_duration: number;
  difficulty_level: string;
  points_reward: number;
  readings: Reading[];
  quiz: Quiz | null;
  user_progress?: {
    status: 'not_started' | 'in_progress' | 'completed';
    readings_completed: number;
    quiz_passed: boolean;
  };
}

export const SubtopicDetailScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const { subtopicId, themeColor } = route.params as { subtopicId: number; themeColor: string };

  const [subtopicDetail, setSubtopicDetail] = useState<SubtopicDetail | null>(null);
  const [currentReadingIndex, setCurrentReadingIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showQuiz, setShowQuiz] = useState(false);

  const fetchSubtopicDetail = async () => {
    try {
      // Get subtopic details
      const { data: subtopicData } = await supabase
        .from('theme_subtopics')
        .select('*')
        .eq('id', subtopicId)
        .single();

      // Get readings
      const { data: readingsData } = await supabase
        .from('learning_readings')
        .select('*')
        .eq('subtopic_id', subtopicId)
        .order('order_index');

      // Get quiz
      const { data: quizData } = await supabase
        .from('learning_quizzes')
        .select('*')
        .eq('subtopic_id', subtopicId)
        .single();

      // Get user progress
      const { data: progressData } = await supabase
        .from('user_subtopic_progress')
        .select('*')
        .eq('user_id', user?.id || '')
        .eq('subtopic_id', subtopicId)
        .single();

      setSubtopicDetail({
        id: subtopicData.id,
        title: subtopicData.title,
        description: subtopicData.description,
        estimated_duration: subtopicData.estimated_duration,
        difficulty_level: subtopicData.difficulty_level,
        points_reward: subtopicData.points_reward,
        readings: readingsData || [],
        quiz: quizData,
        user_progress: progressData || {
          status: 'not_started',
          readings_completed: 0,
          quiz_passed: false,
        },
      });

    } catch (error) {
      console.error('Error fetching subtopic detail:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubtopicDetail();
  }, [subtopicId, user]);

  const markReadingCompleted = async (readingIndex: number) => {
    if (!user || !subtopicDetail) return;

    const newReadingsCompleted = Math.max(subtopicDetail.user_progress?.readings_completed || 0, readingIndex + 1);
    
    try {
      const { error } = await supabase
        .from('user_subtopic_progress')
        .upsert({
          user_id: user.id,
          subtopic_id: subtopicId,
          readings_completed: newReadingsCompleted,
          status: newReadingsCompleted >= subtopicDetail.readings.length ? 'in_progress' : 'in_progress',
        });

      if (error) throw error;

      // Update local state
      setSubtopicDetail(prev => prev ? {
        ...prev,
        user_progress: {
          ...prev.user_progress!,
          readings_completed: newReadingsCompleted,
          status: 'in_progress',
        }
      } : null);

    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleNextReading = () => {
    if (!subtopicDetail) return;
    
    // Mark current reading as completed
    markReadingCompleted(currentReadingIndex);

    if (currentReadingIndex < subtopicDetail.readings.length - 1) {
      setCurrentReadingIndex(currentReadingIndex + 1);
    } else {
      // All readings completed, show quiz if available
      if (subtopicDetail.quiz) {
        setShowQuiz(true);
      } else {
        completeSubtopic();
      }
    }
  };

  const handlePreviousReading = () => {
    if (currentReadingIndex > 0) {
      setCurrentReadingIndex(currentReadingIndex - 1);
    }
  };

  const completeSubtopic = async () => {
    if (!user) return;

    try {
      // Mark subtopic as completed
      const { error } = await supabase
        .from('user_subtopic_progress')
        .upsert({
          user_id: user.id,
          subtopic_id: subtopicId,
          status: 'completed',
          readings_completed: subtopicDetail?.readings.length || 0,
          quiz_passed: true,
          completed_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Award points to user
      const { error: pointsError } = await supabase
        .from('user_profiles')
        .update({
          points: supabase.raw('points + ?', [subtopicDetail?.points_reward || 0]),
          content_completed: supabase.raw('content_completed + 1'),
        })
        .eq('id', user.id);

      Alert.alert(
        '¡Felicitaciones! 🎉',
        `Has completado "${subtopicDetail?.title}". ¡Ganaste ${subtopicDetail?.points_reward} XP!`,
        [
          {
            text: 'Continuar',
            onPress: () => navigation.goBack(),
          },
        ]
      );

    } catch (error) {
      console.error('Error completing subtopic:', error);
    }
  };

  const startQuiz = () => {
    setShowQuiz(true);
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return '#27ae60';
      case 'intermediate': return '#f39c12';
      case 'advanced': return '#e74c3c';
      default: return theme.colors.textSecondary;
    }
  };

  if (isLoading || !subtopicDetail) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Cargando contenido...
        </Text>
      </View>
    );
  }

  if (showQuiz && subtopicDetail.quiz) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.quizTitle, { color: theme.colors.text }]}>
          Quiz: {subtopicDetail.quiz.title}
        </Text>
        <Text style={[styles.quizDescription, { color: theme.colors.textSecondary }]}>
          {subtopicDetail.quiz.description}
        </Text>
        {/* Aquí iría el componente del quiz */}
        <Button
          onPress={completeSubtopic}
          style={styles.completeButton}
        >
          Completar Quiz
        </Button>
      </View>
    );
  }

  const currentReading = subtopicDetail.readings[currentReadingIndex];
  const progress = ((currentReadingIndex + 1) / subtopicDetail.readings.length) * 100;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {subtopicDetail.title}
          </Text>
          <View style={styles.headerRight}>
            <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(subtopicDetail.difficulty_level) + '20' }]}>
              <Text style={[styles.difficultyText, { color: getDifficultyColor(subtopicDetail.difficulty_level) }]}>
                {subtopicDetail.difficulty_level === 'beginner' ? 'Básico' :
                 subtopicDetail.difficulty_level === 'intermediate' ? 'Intermedio' : 'Avanzado'}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
            <View
              style={[
                styles.progressFill,
                { 
                  backgroundColor: themeColor || theme.colors.primary,
                  width: `${progress}%`,
                }
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
            {currentReadingIndex + 1} de {subtopicDetail.readings.length}
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {currentReading && (
          <Card style={styles.readingCard}>
            <View style={styles.readingHeader}>
              <Text style={[styles.readingTitle, { color: theme.colors.text }]}>
                {currentReading.title}
              </Text>
              <View style={styles.readingMeta}>
                <Icon name="clock" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.readingTime, { color: theme.colors.textSecondary }]}>
                  {currentReading.reading_time} min de lectura
                </Text>
              </View>
            </View>

            <Text style={[styles.readingContent, { color: theme.colors.text }]}>
              {currentReading.content}
            </Text>

            {currentReading.key_concepts && currentReading.key_concepts.length > 0 && (
              <View style={styles.conceptsSection}>
                <Text style={[styles.conceptsTitle, { color: theme.colors.text }]}>
                  Conceptos Clave:
                </Text>
                <View style={styles.conceptsList}>
                  {currentReading.key_concepts.map((concept, index) => (
                    <View key={index} style={[styles.conceptChip, { backgroundColor: themeColor + '20' }]}>
                      <Text style={[styles.conceptText, { color: themeColor || theme.colors.primary }]}>
                        {concept}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </Card>
        )}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        <Button
          variant="outline"
          onPress={handlePreviousReading}
          disabled={currentReadingIndex === 0}
          style={[styles.navButton, { opacity: currentReadingIndex === 0 ? 0.5 : 1 }]}
        >
          Anterior
        </Button>
        
        <Button
          onPress={handleNextReading}
          style={[styles.navButton, { backgroundColor: themeColor || theme.colors.primary }]}
        >
          {currentReadingIndex === subtopicDetail.readings.length - 1 ? 
            (subtopicDetail.quiz ? 'Ir al Quiz' : 'Completar') : 
            'Siguiente'}
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    padding: 16,
    paddingTop: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerRight: {
    width: 24,
    alignItems: 'flex-end',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  progressContainer: {
    gap: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  readingCard: {
    padding: 20,
    marginBottom: 16,
  },
  readingHeader: {
    marginBottom: 16,
  },
  readingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  readingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readingTime: {
    fontSize: 14,
  },
  readingContent: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  conceptsSection: {
    gap: 12,
  },
  conceptsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  conceptsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conceptChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  conceptText: {
    fontSize: 14,
    fontWeight: '500',
  },
  navigation: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  navButton: {
    flex: 1,
  },
  quizTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 20,
  },
  quizDescription: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  completeButton: {
    margin: 20,
  },
});