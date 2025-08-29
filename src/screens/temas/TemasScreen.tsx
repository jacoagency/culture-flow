import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Icon } from '../../components/ui';
import { supabase } from '../../config/supabase';

interface Theme {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  progress?: {
    level: number;
    experience_points: number;
    content_completed: number;
  };
  contentCount: number;
}

type FilterType = 'all' | 'in_progress' | 'completed' | 'not_started';

export const TemasScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [filteredThemes, setFilteredThemes] = useState<Theme[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchThemes = async () => {
    try {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      // Get all themes with subtopic count
      const { data: themesData } = await supabase
        .from('personal_development_themes')
        .select(`
          *,
          theme_subtopics (count)
        `)
        .order('order_index');

      // Get user subtopic progress to calculate theme progress
      const { data: subtopicProgress } = await supabase
        .from('user_subtopic_progress')
        .select(`
          subtopic_id,
          status,
          theme_subtopics!inner(theme_id)
        `)
        .eq('user_id', user.id);

      const themesWithProgress = themesData?.map(themeData => {
        const totalSubtopics = themeData.theme_subtopics?.[0]?.count || 0;
        
        // Count completed subtopics for this theme
        const completedSubtopics = subtopicProgress?.filter(sp => 
          sp.theme_subtopics.theme_id === themeData.id && sp.status === 'completed'
        ).length || 0;
        
        // Calculate experience points (10 XP per completed subtopic)
        const experiencePoints = completedSubtopics * 10;
        
        // Calculate level (every 100 XP = 1 level, starting from level 1)
        const level = Math.floor(experiencePoints / 100) + 1;
        
        const progress = experiencePoints > 0 ? {
          level,
          experience_points: experiencePoints,
          content_completed: completedSubtopics,
          total_content: totalSubtopics,
          theme_id: themeData.id
        } : null;

        return {
          id: themeData.id,
          name: themeData.name,
          description: themeData.description,
          icon: themeData.icon,
          color: themeData.color,
          progress,
          contentCount: totalSubtopics,
        };
      }) || [];

      setThemes(themesWithProgress);
      setFilteredThemes(themesWithProgress);
    } catch (error) {
      console.error('Error fetching themes:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchThemes();
  }, [user]);

  useEffect(() => {
    filterThemes();
  }, [themes, searchQuery, activeFilter]);

  const filterThemes = () => {
    let filtered = themes;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(theme =>
        theme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        theme.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    switch (activeFilter) {
      case 'in_progress':
        filtered = filtered.filter(theme => {
          const percentage = getProgressPercentage(theme.progress);
          return percentage > 0 && percentage < 100;
        });
        break;
      case 'completed':
        filtered = filtered.filter(theme => {
          const percentage = getProgressPercentage(theme.progress);
          return percentage >= 100;
        });
        break;
      case 'not_started':
        filtered = filtered.filter(theme => {
          const percentage = getProgressPercentage(theme.progress);
          return percentage === 0;
        });
        break;
      default:
        // 'all' - no additional filtering
        break;
    }

    setFilteredThemes(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchThemes();
  };

  const getProgressPercentage = (progress: Theme['progress']) => {
    if (!progress || progress.experience_points === 0) return 0;
    // Calculate progress based on content completed vs available
    return Math.min((progress.content_completed / Math.max(progress.total_content || 1, 1)) * 100, 100);
  };

  const getThemeStatus = (progress: Theme['progress']) => {
    if (!progress || progress.experience_points === 0) return 'Sin iniciar';
    const percentage = getProgressPercentage(progress);
    if (percentage >= 100) return 'Completado';
    return `En progreso`;
  };

  const handleThemePress = (theme: Theme) => {
    navigation.navigate('theme-detail' as never, { themeId: theme.id } as never);
  };

  const filters = [
    { key: 'all' as FilterType, label: 'Todos', count: themes.length },
    { key: 'in_progress' as FilterType, label: 'En progreso', count: themes.filter(t => {
      const percentage = getProgressPercentage(t.progress);
      return percentage > 0 && percentage < 100;
    }).length },
    { key: 'not_started' as FilterType, label: 'Sin iniciar', count: themes.filter(t => {
      const percentage = getProgressPercentage(t.progress);
      return percentage === 0;
    }).length },
    { key: 'completed' as FilterType, label: 'Completados', count: themes.filter(t => {
      const percentage = getProgressPercentage(t.progress);
      return percentage >= 100;
    }).length },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Áreas de desarrollo
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Explora las 10 áreas clave para tu crecimiento personal
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputContainer, { backgroundColor: theme.colors.card }]}>
          <Icon name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Buscar temas..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                { 
                  backgroundColor: activeFilter === filter.key ? theme.colors.primary : theme.colors.card,
                  borderColor: activeFilter === filter.key ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setActiveFilter(filter.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: activeFilter === filter.key ? '#fff' : theme.colors.text },
                ]}
              >
                {filter.label}
              </Text>
              <View style={[
                styles.filterCount,
                { 
                  backgroundColor: activeFilter === filter.key ? 'rgba(255,255,255,0.3)' : theme.colors.primary + '20'
                }
              ]}>
                <Text style={[
                  styles.filterCountText,
                  { color: activeFilter === filter.key ? '#fff' : theme.colors.primary }
                ]}>
                  {filter.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.themesContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredThemes.map((themeItem) => (
          <TouchableOpacity
            key={themeItem.id}
            onPress={() => handleThemePress(themeItem)}
            activeOpacity={0.7}
          >
            <Card style={styles.themeCard}>
              <View style={styles.themeHeader}>
                <View
                  style={[
                    styles.themeIcon,
                    { backgroundColor: themeItem.color + '20' }
                  ]}
                >
                  <Icon
                    name={themeItem.icon as any}
                    size={28}
                    color={themeItem.color}
                  />
                </View>
                <View style={styles.themeInfo}>
                  <Text style={[styles.themeName, { color: theme.colors.text }]}>
                    {themeItem.name}
                  </Text>
                  <Text style={[styles.themeDescription, { color: theme.colors.textSecondary }]}>
                    {themeItem.description}
                  </Text>
                </View>
              </View>

              <View style={styles.themeStats}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.colors.text }]}>
                    {themeItem.contentCount}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                    contenidos
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.colors.text }]}>
                    {themeItem.progress?.level ? `Nivel ${themeItem.progress.level}` : 'Nivel 1'}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                    {getThemeStatus(themeItem.progress)}
                  </Text>
                </View>
              </View>

              <View style={styles.progressContainer}>
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
                        backgroundColor: themeItem.color,
                        width: `${getProgressPercentage(themeItem.progress)}%`,
                      }
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
                  {Math.round(getProgressPercentage(themeItem.progress))}% completado
                </Text>
              </View>
            </Card>
          </TouchableOpacity>
        ))}

        {filteredThemes.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="search" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
              No se encontraron temas
            </Text>
            <Text style={[styles.emptyStateSubtext, { color: theme.colors.textSecondary }]}>
              Intenta con diferentes términos de búsqueda o filtros
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
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
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filtersContainer: {
    marginBottom: 16,
    height: 44,
  },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 12,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1,
    gap: 8,
    height: 36,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: {
    fontSize: 12,
    fontWeight: '700',
  },
  themesContainer: {
    flex: 1,
  },
  themeCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
  },
  themeHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  themeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  themeInfo: {
    flex: 1,
  },
  themeName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  themeDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  themeStats: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
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
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});