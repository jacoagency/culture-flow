import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Button, Icon } from '../../components/ui';
import { OnboardingSurvey } from '../../components/survey';
import { supabase } from '../../config/supabase';

interface ThemeProgress {
  id: number;
  name: string;
  icon: string;
  color: string;
  level: number;
  experience_points: number;
  content_completed: number;
}

interface DashboardData {
  totalPoints: number;
  currentStreak: number;
  contentCompleted: number;
  recentContent: any[];
  themeProgress: ThemeProgress[];
  surveyCompleted: boolean;
}

export const DashboardScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalPoints: 0,
    currentStreak: 0,
    contentCompleted: 0,
    recentContent: [],
    themeProgress: [],
    surveyCompleted: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Get user profile data
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Get real theme progress from subtopic completions
      const { data: themesData } = await supabase
        .from('personal_development_themes')
        .select(`
          *,
          theme_subtopics (count)
        `)
        .order('order_index');

      // Get user subtopic progress
      const { data: subtopicProgress } = await supabase
        .from('user_subtopic_progress')
        .select(`
          subtopic_id,
          status,
          theme_subtopics!inner(theme_id)
        `)
        .eq('user_id', user.id);

      // Calculate theme progress
      const themeProgressData = themesData?.map(themeData => {
        const completedSubtopics = subtopicProgress?.filter(sp => 
          sp.theme_subtopics.theme_id === themeData.id && sp.status === 'completed'
        ).length || 0;
        
        const experiencePoints = completedSubtopics * 10;
        const level = Math.floor(experiencePoints / 100) + 1;
        
        return {
          theme_id: themeData.id,
          level,
          experience_points: experiencePoints,
          content_completed: completedSubtopics,
          personal_development_themes: {
            name: themeData.name,
            icon: themeData.icon,
            color: themeData.color
          }
        };
      }).filter(tp => tp.experience_points > 0) || [];

      // Get recent completed subtopics
      const { data: recentContent } = await supabase
        .from('user_subtopic_progress')
        .select(`
          *,
          theme_subtopics (
            title,
            theme_id,
            personal_development_themes (
              name,
              color
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(5);

      setDashboardData({
        totalPoints: profile?.points || 0,
        currentStreak: profile?.current_streak || 0,
        contentCompleted: profile?.content_completed || 0,
        recentContent: recentContent || [],
        themeProgress: themeProgressData?.map(tp => ({
          id: tp.theme_id,
          name: tp.personal_development_themes.name,
          icon: tp.personal_development_themes.icon,
          color: tp.personal_development_themes.color,
          level: tp.level,
          experience_points: tp.experience_points,
          content_completed: tp.content_completed,
        })) || [],
        surveyCompleted: profile?.survey_completed || false,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleSurveyComplete = () => {
    console.log('✅ Survey completed! Redirecting to dashboard...');
    fetchDashboardData();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '¡Buenos días!';
    if (hour < 18) return '¡Buenas tardes!';
    return '¡Buenas noches!';
  };

  const getMotivationalMessage = () => {
    const messages = [
      'Cada día es una oportunidad para crecer',
      'Tu desarrollo personal no tiene límites',
      'Pequeños pasos, grandes transformaciones',
      'Invierte en ti, es la mejor decisión',
      'El cambio comienza con una acción',
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  if (!dashboardData.surveyCompleted) {
    return <OnboardingSurvey onComplete={handleSurveyComplete} />;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: theme.colors.text }]}>
          {getGreeting()}
        </Text>
        <Text style={[styles.userName, { color: theme.colors.primary }]}>
          {user?.user_metadata?.name || user?.email?.split('@')[0]}
        </Text>
        <Text style={[styles.motivationText, { color: theme.colors.textSecondary }]}>
          {getMotivationalMessage()}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Icon name="zap" size={24} color={theme.colors.primary} />
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {dashboardData.currentStreak}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Racha actual
          </Text>
        </Card>

        <Card style={styles.statCard}>
          <Icon name="star" size={24} color={theme.colors.accent} />
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {dashboardData.totalPoints}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Puntos totales
          </Text>
        </Card>

        <Card style={styles.statCard}>
          <Icon name="check-circle" size={24} color={theme.colors.success} />
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {dashboardData.contentCompleted}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Completados
          </Text>
        </Card>
      </View>

      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Tu progreso por área
          </Text>
          <TouchableOpacity>
            <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>
              Ver todo
            </Text>
          </TouchableOpacity>
        </View>

        {dashboardData.themeProgress.slice(0, 5).map((themeProgress) => (
          <View key={themeProgress.id} style={styles.themeProgressItem}>
            <View style={styles.themeInfo}>
              <View
                style={[
                  styles.themeIcon,
                  { backgroundColor: themeProgress.color + '20' }
                ]}
              >
                <Icon
                  name={themeProgress.icon as any}
                  size={20}
                  color={themeProgress.color}
                />
              </View>
              <View style={styles.themeDetails}>
                <Text style={[styles.themeName, { color: theme.colors.text }]}>
                  {themeProgress.name}
                </Text>
                <Text style={[styles.themeLevel, { color: theme.colors.textSecondary }]}>
                  Nivel {themeProgress.level} • {themeProgress.experience_points} XP
                </Text>
              </View>
            </View>
            <View style={styles.themeStats}>
              <Text style={[styles.themeCompleted, { color: theme.colors.textSecondary }]}>
                {themeProgress.content_completed}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      {dashboardData.recentContent.length > 0 && (
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Contenido reciente
          </Text>
          
          {dashboardData.recentContent.map((item, index) => (
            <View key={index} style={styles.recentContentItem}>
              <Icon name="check-circle" size={20} color={theme.colors.success} />
              <View style={styles.recentContentInfo}>
                <Text style={[styles.recentContentTitle, { color: theme.colors.text }]}>
                  {item.cultural_content?.title}
                </Text>
                <Text style={[styles.recentContentDate, { color: theme.colors.textSecondary }]}>
                  Completado hace {Math.floor((new Date().getTime() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24))} días
                </Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Continúa tu desarrollo
        </Text>
        <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
          Explora contenido personalizado basado en tus intereses y progreso
        </Text>
        <Button 
          style={styles.exploreButton}
          onPress={() => {/* Navigate to themes */}}
        >
          Explorar contenido
        </Button>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  motivationText: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionDescription: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  themeProgressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  themeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  themeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  themeDetails: {
    flex: 1,
  },
  themeName: {
    fontSize: 16,
    fontWeight: '600',
  },
  themeLevel: {
    fontSize: 14,
    marginTop: 2,
  },
  themeStats: {
    alignItems: 'center',
  },
  themeCompleted: {
    fontSize: 14,
    fontWeight: '600',
  },
  recentContentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  recentContentInfo: {
    marginLeft: 12,
    flex: 1,
  },
  recentContentTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  recentContentDate: {
    fontSize: 12,
    marginTop: 2,
  },
  exploreButton: {
    marginTop: 8,
  },
});