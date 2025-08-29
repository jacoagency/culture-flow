import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Card, Icon, Button } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  points: number;
  level: number;
  current_streak: number;
  best_streak: number;
  total_time_spent: number;
  content_completed: number;
  learning_goal: number;
  notifications: boolean;
  survey_completed: boolean;
}

interface Achievement {
  id: string;
  achievement_name: string;
  description: string;
  icon_url?: string;
  points_awarded: number;
  unlocked_at: string;
}

interface ThemeProgress {
  theme_name: string;
  level: number;
  experience_points: number;
  content_completed: number;
  color: string;
  icon: string;
}

export const ProfileScreen: React.FC = () => {
  const { theme, themeMode, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [themeProgress, setThemeProgress] = useState<ThemeProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfileData = async () => {
    if (!user) return;

    try {
      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      
      // Get user achievements
      const { data: achievementsData } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false });

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
      }).filter(tp => tp.experience_points > 0)
        .sort((a, b) => b.experience_points - a.experience_points)
        .slice(0, 3) || [];

      setProfile({
        id: profileData.id,
        email: profileData.email,
        name: profileData.name,
        avatar_url: profileData.avatar_url,
        points: profileData.points || 0,
        level: profileData.level || 1,
        current_streak: profileData.current_streak || 0,
        best_streak: profileData.best_streak || 0,
        total_time_spent: profileData.total_time_spent || 0,
        content_completed: profileData.content_completed || 0,
        learning_goal: profileData.learning_goal || 30,
        notifications: profileData.notifications ?? true,
        survey_completed: profileData.survey_completed ?? false,
      });

      setAchievements(achievementsData || []);

      const formattedThemeProgress = themeProgressData?.map(tp => ({
        theme_name: tp.personal_development_themes.name,
        level: tp.level,
        experience_points: tp.experience_points,
        content_completed: tp.content_completed,
        color: tp.personal_development_themes.color,
        icon: tp.personal_development_themes.icon,
      })) || [];

      setThemeProgress(formattedThemeProgress);

    } catch (error) {
      console.error('Error fetching profile data:', error);
      Alert.alert('Error', 'No se pudo cargar el perfil');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfileData();
  };

  const handleSignOut = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const calculateNextLevelXP = (currentLevel: number) => {
    return Math.pow(currentLevel, 2) * 100;
  };

  const calculateLevelProgress = (points: number, level: number) => {
    const currentLevelMin = Math.pow(level - 1, 2) * 100;
    const nextLevelMin = Math.pow(level, 2) * 100;
    const progress = (points - currentLevelMin) / (nextLevelMin - currentLevelMin);
    return Math.max(0, Math.min(1, progress));
  };

  if (isLoading || !user || !profile) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Cargando perfil...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <Card style={styles.header}>
        <View style={styles.profileInfo}>
          <Image
            source={{ 
              uri: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=4f46e5&color=fff&size=100`
            }}
            style={styles.avatar}
          />
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.colors.text }]}>
              {profile.name}
            </Text>
            <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>
              {profile.email}
            </Text>
            <View style={styles.userStats}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                  {profile.points}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Puntos XP
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                  {profile.content_completed}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Completados
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                  {profile.level}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Nivel
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Card>

      {/* Level Progress */}
      <Card style={styles.section}>
        <View style={styles.progressHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Progreso de Nivel
          </Text>
          <Text style={[styles.levelText, { color: theme.colors.primary }]}>
            Nivel {profile.level}
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
                  backgroundColor: theme.colors.primary,
                  width: `${calculateLevelProgress(profile.points, profile.level) * 100}%`,
                }
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
            {profile.points} / {calculateNextLevelXP(profile.level)} XP
          </Text>
        </View>
      </Card>

      {/* Streak Info */}
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Racha de Estudio
        </Text>
        <View style={styles.streakContainer}>
          <View style={styles.streakItem}>
            <Icon name="zap" size={32} color={theme.colors.accent} />
            <Text style={[styles.streakValue, { color: theme.colors.text }]}>
              {profile.current_streak}
            </Text>
            <Text style={[styles.streakLabel, { color: theme.colors.textSecondary }]}>
              Días actuales
            </Text>
          </View>
          <View style={styles.streakItem}>
            <Icon name="trophy" size={32} color={theme.colors.success} />
            <Text style={[styles.streakValue, { color: theme.colors.text }]}>
              {profile.best_streak}
            </Text>
            <Text style={[styles.streakLabel, { color: theme.colors.textSecondary }]}>
              Mejor racha
            </Text>
          </View>
          <View style={styles.streakItem}>
            <Icon name="time" size={32} color={theme.colors.primary} />
            <Text style={[styles.streakValue, { color: theme.colors.text }]}>
              {Math.round(profile.total_time_spent / 60)}
            </Text>
            <Text style={[styles.streakLabel, { color: theme.colors.textSecondary }]}>
              Horas totales
            </Text>
          </View>
        </View>
      </Card>

      {/* Top Areas */}
      {themeProgress.length > 0 && (
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Tus Mejores Áreas
          </Text>
          {themeProgress.map((themeItem, index) => (
            <View key={index} style={styles.themeProgressItem}>
              <View
                style={[
                  styles.themeIcon,
                  { backgroundColor: themeItem.color + '20' }
                ]}
              >
                <Icon
                  name={themeItem.icon as any}
                  size={24}
                  color={themeItem.color}
                />
              </View>
              <View style={styles.themeInfo}>
                <Text style={[styles.themeName, { color: theme.colors.text }]}>
                  {themeItem.theme_name}
                </Text>
                <Text style={[styles.themeStats, { color: theme.colors.textSecondary }]}>
                  Nivel {themeItem.level} • {themeItem.experience_points} XP
                </Text>
              </View>
              <Text style={[styles.themeCompleted, { color: theme.colors.text }]}>
                {themeItem.content_completed}
              </Text>
            </View>
          ))}
        </Card>
      )}

      {/* Achievements */}
      {achievements.length > 0 && (
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Logros Recientes
          </Text>
          {achievements.slice(0, 3).map((achievement) => (
            <View key={achievement.id} style={styles.achievementItem}>
              <View style={styles.achievementIcon}>
                <Icon name="award" size={24} color={theme.colors.accent} />
              </View>
              <View style={styles.achievementInfo}>
                <Text style={[styles.achievementName, { color: theme.colors.text }]}>
                  {achievement.achievement_name}
                </Text>
                <Text style={[styles.achievementDescription, { color: theme.colors.textSecondary }]}>
                  {achievement.description}
                </Text>
              </View>
              <Text style={[styles.achievementPoints, { color: theme.colors.primary }]}>
                +{achievement.points_awarded}
              </Text>
            </View>
          ))}
        </Card>
      )}

      {/* Settings */}
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Configuración
        </Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Icon name="moon" size={20} color={theme.colors.textSecondary} />
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
              Modo oscuro
            </Text>
          </View>
          <Switch
            value={themeMode === 'dark'}
            onValueChange={toggleTheme}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Icon name="notifications" size={20} color={theme.colors.textSecondary} />
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
              Notificaciones
            </Text>
          </View>
          <View style={styles.settingValue}>
            <Text style={[styles.settingValueText, { color: theme.colors.textSecondary }]}>
              {profile.notifications ? 'Activadas' : 'Desactivadas'}
            </Text>
            <Icon name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Icon name="target" size={20} color={theme.colors.textSecondary} />
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
              Meta diaria
            </Text>
          </View>
          <View style={styles.settingValue}>
            <Text style={[styles.settingValueText, { color: theme.colors.textSecondary }]}>
              {profile.learning_goal} min
            </Text>
            <Icon name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Icon name="survey" size={20} color={theme.colors.textSecondary} />
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
              Encuesta inicial
            </Text>
          </View>
          <View style={styles.settingValue}>
            <Text style={[styles.settingValueText, { color: theme.colors.textSecondary }]}>
              {profile.survey_completed ? 'Completada' : 'Pendiente'}
            </Text>
            <Icon name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>
      </Card>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Editar Perfil"
          onPress={() => {}}
          variant="outline"
          style={styles.actionButton}
        />
        
        <Button
          title="Cerrar Sesión"
          onPress={handleSignOut}
          variant="outline"
          style={styles.actionButton}
        />
      </View>

      <View style={styles.bottomSpacer} />
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
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    marginBottom: 16,
    padding: 20,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 12,
  },
  userStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressBarContainer: {
    gap: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'right',
  },
  streakContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  streakItem: {
    alignItems: 'center',
  },
  streakValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  streakLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  themeProgressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  themeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  themeInfo: {
    flex: 1,
  },
  themeName: {
    fontSize: 16,
    fontWeight: '600',
  },
  themeStats: {
    fontSize: 12,
    marginTop: 2,
  },
  themeCompleted: {
    fontSize: 14,
    fontWeight: '600',
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,193,7,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '600',
  },
  achievementDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  achievementPoints: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 16,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValueText: {
    fontSize: 14,
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    marginHorizontal: 0,
  },
  bottomSpacer: {
    height: 100,
  },
});