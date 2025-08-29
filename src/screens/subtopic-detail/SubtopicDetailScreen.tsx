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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: number]: number}>({});
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

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
        }, {
          onConflict: 'user_id,subtopic_id'
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
    console.log('completeSubtopic called');
    if (!user) {
      console.log('No user found');
      return;
    }

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
        }, {
          onConflict: 'user_id,subtopic_id'
        });

      if (error) {
        console.error('Error updating subtopic progress:', error);
        throw error;
      }
      console.log('Subtopic progress updated successfully');

      // Award points to user using direct method
      const { data: currentProfile } = await supabase
        .from('user_profiles')
        .select('points, content_completed')
        .eq('id', user.id)
        .single();

      if (currentProfile) {
        const { error: pointsError } = await supabase
          .from('user_profiles')
          .update({
            points: currentProfile.points + (subtopicDetail?.points_reward || 0),
            content_completed: currentProfile.content_completed + 1,
          })
          .eq('id', user.id);

        if (pointsError) {
          console.error('Error updating points:', pointsError);
        }
      }

      // Update local state to reflect completion
      setSubtopicDetail(prev => prev ? {
        ...prev,
        user_progress: {
          ...prev.user_progress!,
          status: 'completed',
          quiz_passed: true,
          readings_completed: prev.readings.length,
        }
      } : null);

      console.log('About to show celebration screen');
      setShowCelebration(true);
      
      // Auto navigate back after 3 seconds
      setTimeout(() => {
        console.log('Auto navigating back after celebration');
        navigation.goBack();
      }, 3000);

    } catch (error) {
      console.error('Error completing subtopic:', error);
      Alert.alert(
        'Error',
        'Hubo un problema al completar el subtema. Por favor intenta de nuevo.',
        [
          {
            text: 'OK',
            onPress: () => {}
          }
        ]
      );
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

  // Show celebration screen after completing subtopic
  if (showCelebration) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.celebrationTitle, { color: theme.colors.text }]}>
          ¡Increíble! 🎆🎉
        </Text>
        <Text style={[styles.celebrationSubtitle, { color: themeColor || theme.colors.primary }]}>
          🏆 Has dominado
        </Text>
        <Text style={[styles.celebrationTopic, { color: theme.colors.text }]}>
          "{subtopicDetail.title}"
        </Text>
        <Text style={[styles.celebrationPoints, { color: themeColor || theme.colors.primary }]}>
          ✨ +{subtopicDetail.points_reward} XP ganados
        </Text>
        <Text style={[styles.celebrationMessage, { color: theme.colors.textSecondary }]}>
          🚀 ¡Sigues creciendo como un experto cultural!
        </Text>
        <TouchableOpacity 
          style={[styles.celebrationButton, { backgroundColor: themeColor || theme.colors.primary }]}
          onPress={() => {
            console.log('Celebration button pressed, navigating back');
            navigation.goBack();
          }}
        >
          <Text style={styles.celebrationButtonText}>Continuar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleAnswerSelect = (questionIndex: number, answerIndex: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: answerIndex
    }));
  };

  const handleNextQuestion = () => {
    const totalQuestions = subtopicDetail?.quiz?.questions.questions.length || 0;
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Quiz completed
      setQuizCompleted(true);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const calculateQuizScore = () => {
    if (!subtopicDetail?.quiz) return 0;
    const questions = subtopicDetail.quiz.questions.questions;
    let correct = 0;
    
    questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correct_answer) {
        correct++;
      }
    });
    
    return (correct / questions.length) * 100;
  };

  const handleQuizComplete = async () => {
    const score = calculateQuizScore();
    const passed = score >= (subtopicDetail?.quiz?.passing_score || 70);
    
    if (passed) {
      await completeSubtopic();
    } else {
      // Still save progress even if quiz not passed
      try {
        // Get current attempts to increment
        const { data: currentProgress } = await supabase
          .from('user_subtopic_progress')
          .select('quiz_attempts')
          .eq('user_id', user.id)
          .eq('subtopic_id', subtopicId)
          .single();

        await supabase
          .from('user_subtopic_progress')
          .upsert({
            user_id: user.id,
            subtopic_id: subtopicId,
            status: 'in_progress',
            readings_completed: subtopicDetail?.readings.length || 0,
            quiz_passed: false,
            quiz_attempts: (currentProgress?.quiz_attempts || 0) + 1,
            last_attempt_score: Math.round(score),
          }, {
            onConflict: 'user_id,subtopic_id'
          });
      } catch (error) {
        console.error('Error saving quiz attempt:', error);
      }

      Alert.alert(
        '💪 ¡Casi lo logras!',
        `🎯 Obtuviste ${score.toFixed(1)}% (necesitas ${subtopicDetail?.quiz?.passing_score || 70}%)\n\n📚 Repasa el contenido y vuelve a intentarlo.\n🌟 ¡Cada intento te hace más fuerte!`,
        [
          {
            text: 'Reintentar',
            onPress: () => {
              setCurrentQuestionIndex(0);
              setSelectedAnswers({});
              setQuizCompleted(false);
            }
          },
          {
            text: 'Volver al Tema',
            onPress: () => navigation.goBack()
          }
        ]
      );
    }
  };

  if (showQuiz && subtopicDetail.quiz) {
    if (quizCompleted) {
      const score = calculateQuizScore();
      const passed = score >= (subtopicDetail.quiz.passing_score || 70);
      
      return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <ScrollView style={styles.content} contentContainerStyle={styles.quizResultsContainer}>
            <Text style={[styles.quizTitle, { color: theme.colors.text }]}>
              Quiz Completado
            </Text>
            <Text style={[styles.quizScore, { color: passed ? '#27ae60' : '#e74c3c' }]}>
              {score.toFixed(1)}%
            </Text>
            <Text style={[styles.quizResultText, { color: theme.colors.textSecondary }]}>
              {passed ? '🎉 ¡Excelente trabajo! Has dominado este tema.' : `💪 Necesitas ${subtopicDetail.quiz.passing_score}% para aprobar. ¡Sigue intentando!`}
            </Text>
            {passed && (
              <Text style={[styles.quizBonusText, { color: themeColor || theme.colors.primary }]}>
                +{subtopicDetail.points_reward} XP ganados 🏆
              </Text>
            )}
          </ScrollView>
          
          <View style={styles.navigation}>
            <Button
              title="Reintentar"
              variant="outline"
              onPress={() => {
                setCurrentQuestionIndex(0);
                setSelectedAnswers({});
                setQuizCompleted(false);
              }}
              style={styles.navButton}
            />
            
            <Button
              title={passed ? 'Completar' : 'Volver a Intentar'}
              onPress={() => {
                console.log('Button clicked, passed:', passed);
                if (passed) {
                  console.log('Calling completeSubtopic');
                  completeSubtopic();
                } else {
                  console.log('Setting showQuiz to false');
                  setShowQuiz(false);
                }
              }}
              style={[styles.navButton, { backgroundColor: themeColor || theme.colors.primary }]}
            />
          </View>
        </View>
      );
    }

    const currentQuestion = subtopicDetail.quiz.questions.questions[currentQuestionIndex];
    const totalQuestions = subtopicDetail.quiz.questions.questions.length;
    const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;
    
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Quiz Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => setShowQuiz(false)}>
              <Icon name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              Quiz: {subtopicDetail.quiz.title}
            </Text>
            <View style={styles.headerRight} />
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
              {currentQuestionIndex + 1} de {totalQuestions}
            </Text>
          </View>
        </View>

        {/* Question */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.readingCard}>
            <Text style={[styles.questionText, { color: theme.colors.text }]}>
              {currentQuestion.question}
            </Text>
            
            <View style={styles.answersContainer}>
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedAnswers[currentQuestionIndex] === index;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.answerOption,
                      {
                        backgroundColor: isSelected 
                          ? (themeColor || theme.colors.primary) + '20'
                          : theme.colors.surface,
                        borderColor: isSelected 
                          ? themeColor || theme.colors.primary
                          : theme.colors.border,
                        borderWidth: 2,
                      }
                    ]}
                    onPress={() => handleAnswerSelect(currentQuestionIndex, index)}
                  >
                    <Text style={[
                      styles.answerText,
                      {
                        color: isSelected 
                          ? themeColor || theme.colors.primary
                          : theme.colors.text
                      }
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Navigation */}
        <View style={styles.navigation}>
          <Button
            title="Anterior"
            variant="outline"
            onPress={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
            style={[styles.navButton, { opacity: currentQuestionIndex === 0 ? 0.5 : 1 }]}
          />
          
          <Button
            title={currentQuestionIndex === totalQuestions - 1 ? 'Finalizar' : 'Siguiente'}
            onPress={currentQuestionIndex === totalQuestions - 1 ? () => setQuizCompleted(true) : handleNextQuestion}
            disabled={selectedAnswers[currentQuestionIndex] === undefined}
            style={[
              styles.navButton,
              {
                backgroundColor: themeColor || theme.colors.primary,
                opacity: selectedAnswers[currentQuestionIndex] === undefined ? 0.5 : 1
              }
            ]}
          />
        </View>
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
                <Icon name="time" size={16} color={theme.colors.textSecondary} />
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
          title="Anterior"
          variant="outline"
          onPress={handlePreviousReading}
          disabled={currentReadingIndex === 0}
          style={[styles.navButton, { opacity: currentReadingIndex === 0 ? 0.5 : 1 }]}
        />
        
        <Button
          title={currentReadingIndex === subtopicDetail.readings.length - 1 ? 
            (subtopicDetail.quiz ? 'Ir al Quiz' : 'Completar') : 
            'Siguiente'}
          onPress={handleNextReading}
          style={[styles.navButton, { backgroundColor: themeColor || theme.colors.primary }]}
        />
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
    marginBottom: 12,
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
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    lineHeight: 26,
  },
  answersContainer: {
    gap: 12,
  },
  answerOption: {
    padding: 16,
    borderRadius: 12,
    minHeight: 56,
    justifyContent: 'center',
  },
  answerText: {
    fontSize: 16,
    lineHeight: 22,
  },
  quizResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  quizScore: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  quizResultText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  quizBonusText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  celebrationTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  celebrationSubtitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  celebrationTopic: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  celebrationPoints: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  celebrationMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  celebrationButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 160,
  },
  celebrationButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});