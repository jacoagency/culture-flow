import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Icon, Button } from '../../components/ui';
import { supabase } from '../../config/supabase';

interface ThemeProgress {
  id: number;
  name: string;
  icon: string;
  color: string;
  level: number;
  experience_points: number;
  content_completed: number;
  progress_percentage: number;
}

interface UserSettings {
  notifications: boolean;
  learning_goal: number;
  preferred_categories: string[];
}

export const ConfiguracionesScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [themeProgress, setThemeProgress] = useState<ThemeProgress[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings>({
    notifications: true,
    learning_goal: 30,
    preferred_categories: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Get user profile settings
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserSettings({
          notifications: profile.notifications ?? true,
          learning_goal: profile.learning_goal ?? 30,
          preferred_categories: profile.preferred_categories ?? [],
        });
      }

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
      const formattedProgress = themesData?.map(themeData => {
        const totalSubtopics = themeData.theme_subtopics?.[0]?.count || 0;
        const completedSubtopics = subtopicProgress?.filter(sp => 
          sp.theme_subtopics.theme_id === themeData.id && sp.status === 'completed'
        ).length || 0;
        
        const experiencePoints = completedSubtopics * 10;
        const level = Math.floor(experiencePoints / 100) + 1;
        const progress_percentage = totalSubtopics > 0 ? (completedSubtopics / totalSubtopics) * 100 : 0;
        
        return {
          id: themeData.id,
          name: themeData.name,
          icon: themeData.icon,
          color: themeData.color,
          level,
          experience_points: experiencePoints,
          content_completed: completedSubtopics,
          progress_percentage: Math.min(progress_percentage, 100),
        };
      }).filter(tp => tp.experience_points > 0)
        .sort((a, b) => b.experience_points - a.experience_points) || [];

      setThemeProgress(formattedProgress);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Refresh configuration data when screen comes into focus (after completing quizzes)
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Configuration screen focused - refreshing data...');
      fetchData();
    }, [user])
  );

  const updateUserSettings = async (key: keyof UserSettings, value: any) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ [key]: value })
        .eq('id', user.id);

      if (error) throw error;

      setUserSettings(prev => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error('Error updating settings:', error);
      Alert.alert('Error', 'No se pudo actualizar la configuración');
    }
  };


  const goalOptions = [15, 30, 45, 60, 90];


  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Configuración y Progreso
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Personaliza tu experiencia y revisa tu avance
        </Text>
      </View>

      {/* Progress Section */}
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="trending-up" size={24} color={theme.colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Tu progreso por área
          </Text>
        </View>

        {themeProgress.map((theme_item) => (
          <View key={theme_item.id} style={styles.progressItem}>
            <View style={styles.progressHeader}>
              <View
                style={[
                  styles.themeIcon,
                  { backgroundColor: theme_item.color + '20' }
                ]}
              >
                <Icon
                  name={theme_item.icon as any}
                  size={20}
                  color={theme_item.color}
                />
              </View>
              <View style={styles.progressInfo}>
                <Text style={[styles.progressName, { color: theme.colors.text }]}>
                  {theme_item.name}
                </Text>
                <Text style={[styles.progressStats, { color: theme.colors.textSecondary }]}>
                  Nivel {theme_item.level} • {theme_item.experience_points} XP • {theme_item.content_completed} completados
                </Text>
              </View>
              <Text style={[styles.progressPercentage, { color: theme.colors.text }]}>
                {Math.round(theme_item.progress_percentage)}%
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
                      backgroundColor: theme_item.color,
                      width: `${theme_item.progress_percentage}%`,
                    }
                  ]}
                />
              </View>
            </View>
          </View>
        ))}

        {themeProgress.length === 0 && (
          <Text style={[styles.noProgressText, { color: theme.colors.textSecondary }]}>
            Completa la encuesta inicial para ver tu progreso
          </Text>
        )}
      </Card>

      {/* Settings Section */}
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="settings" size={24} color={theme.colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Configuración
          </Text>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
              Notificaciones
            </Text>
            <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
              Recibe recordatorios diarios
            </Text>
          </View>
          <Switch
            value={userSettings.notifications}
            onValueChange={(value) => updateUserSettings('notifications', value)}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
            thumbColor={userSettings.notifications ? theme.colors.primary : theme.colors.textSecondary}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
              Meta diaria
            </Text>
            <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
              Tiempo de estudio objetivo
            </Text>
          </View>
          <View style={styles.goalOptions}>
            {goalOptions.map((goal) => (
              <TouchableOpacity
                key={goal}
                style={[
                  styles.goalOption,
                  { borderColor: theme.colors.border },
                  userSettings.learning_goal === goal && {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.primary,
                  }
                ]}
                onPress={() => updateUserSettings('learning_goal', goal)}
              >
                <Text
                  style={[
                    styles.goalOptionText,
                    {
                      color: userSettings.learning_goal === goal
                        ? '#fff' : theme.colors.text
                    }
                  ]}
                >
                  {goal}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Card>

      {/* Analytics Section */}
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="bar-chart" size={24} color={theme.colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Estadísticas
          </Text>
        </View>

        <View style={styles.analyticsGrid}>
          <View style={styles.analyticsItem}>
            <Text style={[styles.analyticsValue, { color: theme.colors.text }]}>
              {themeProgress.reduce((sum, tp) => sum + tp.experience_points, 0)}
            </Text>
            <Text style={[styles.analyticsLabel, { color: theme.colors.textSecondary }]}>
              XP Total
            </Text>
          </View>
          <View style={styles.analyticsItem}>
            <Text style={[styles.analyticsValue, { color: theme.colors.text }]}>
              {themeProgress.reduce((sum, tp) => sum + tp.content_completed, 0)}
            </Text>
            <Text style={[styles.analyticsLabel, { color: theme.colors.textSecondary }]}>
              Completados
            </Text>
          </View>
          <View style={styles.analyticsItem}>
            <Text style={[styles.analyticsValue, { color: theme.colors.text }]}>
              {Math.round(themeProgress.reduce((sum, tp) => sum + tp.progress_percentage, 0) / Math.max(themeProgress.length, 1))}%
            </Text>
            <Text style={[styles.analyticsLabel, { color: theme.colors.textSecondary }]}>
              Progreso promedio
            </Text>
          </View>
          <View style={styles.analyticsItem}>
            <Text style={[styles.analyticsValue, { color: theme.colors.text }]}>
              {themeProgress.reduce((sum, tp) => sum + tp.level, 0)}
            </Text>
            <Text style={[styles.analyticsLabel, { color: theme.colors.textSecondary }]}>
              Niveles totales
            </Text>
          </View>
        </View>
      </Card>

      {/* Account Section */}
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="user" size={24} color={theme.colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Cuenta
          </Text>
        </View>

        <TouchableOpacity style={styles.accountItem}>
          <Text style={[styles.accountLabel, { color: theme.colors.text }]}>
            Perfil
          </Text>
          <Icon name="chevron-right" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.accountItem}>
          <Text style={[styles.accountLabel, { color: theme.colors.text }]}>
            Privacidad
          </Text>
          <Icon name="chevron-right" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.accountItem}>
          <Text style={[styles.accountLabel, { color: theme.colors.text }]}>
            Ayuda y soporte
          </Text>
          <Icon name="chevron-right" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

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
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  themeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  progressInfo: {
    flex: 1,
  },
  progressName: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressStats: {
    fontSize: 12,
    marginTop: 2,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    marginTop: 8,
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
  noProgressText: {
    textAlign: 'center',
    fontSize: 16,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  goalOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  goalOption: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  goalOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  analyticsItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: 16,
  },
  analyticsValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  analyticsLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  accountLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});