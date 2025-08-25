import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/ui';
import { StreakCounter, LevelProgress, AchievementCard } from '../../components/gamification';
import { useProgressData } from '../../hooks/useProgressData';
import { categoryColors } from '../../theme/colors';

export const ProgressScreen: React.FC = () => {
  const { theme } = useTheme();
  const { 
    progress, 
    weeklyStats, 
    categoryProgress, 
    achievements, 
    loading, 
    error 
  } = useProgressData();

  const CategoryProgressItem = ({ categoryData }: { categoryData: any }) => {
    const progressPercent = categoryData.completed > 0 ? 
      Math.min((categoryData.completed / 25) * 100, 100) : 0;

    return (
      <Card style={styles.categoryCard}>
        <View style={styles.categoryHeader}>
          <View
            style={[
              styles.categoryIcon,
              { backgroundColor: categoryColors[categoryData.category as keyof typeof categoryColors] || theme.colors.primary }
            ]}
          >
            <Text style={styles.categoryIconText}>{categoryData.category[0].toUpperCase()}</Text>
          </View>
          <View style={styles.categoryInfo}>
            <Text style={[styles.categoryName, { color: theme.colors.text }]}>
              {categoryData.category.charAt(0).toUpperCase() + categoryData.category.slice(1)}
            </Text>
            <Text style={[styles.categoryProgress, { color: theme.colors.textSecondary }]}>
              {categoryData.completed}/25 completadas
            </Text>
          </View>
          <View style={styles.categoryStats}>
            <Text style={[styles.categoryPercentage, { color: categoryColors[categoryData.category as keyof typeof categoryColors] || theme.colors.primary }]}>
              {Math.round(progressPercent)}%
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.categoryProgressBar,
            { backgroundColor: theme.colors.border }
          ]}
        >
          <View
            style={[
              styles.categoryProgressFill,
              {
                width: `${progressPercent}%`,
                backgroundColor: categoryColors[categoryData.category as keyof typeof categoryColors] || theme.colors.primary,
              }
            ]}
          />
        </View>
      </Card>
    );
  };

  const renderAchievement = ({ item }: { item: any }) => (
    <AchievementCard achievement={item} size="small" />
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Cargando tu progreso...
        </Text>
      </View>
    );
  }

  if (!progress) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.text }]}>
          No se pudo cargar el progreso
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Stats Overview */}
      <Card style={styles.overviewCard}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Tu Progreso
        </Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: theme.colors.primary }]}>
              {progress.totalCompleted}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Tarjetas completadas
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: theme.colors.success }]}>
              {progress.totalCompleted > 0 ? Math.round((progress.totalCompleted / progress.weeklyGoal) * 100) : 0}%
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Progreso total
            </Text>
          </View>
        </View>
      </Card>

      {/* Streak and Level */}
      <View style={styles.section}>
        <StreakCounter
          currentStreak={progress.currentStreak}
          longestStreak={progress.bestStreak}
        />
      </View>

      <View style={styles.section}>
        <LevelProgress
          currentLevel={progress.level}
          currentPoints={progress.points}
        />
      </View>

      {/* Categories Progress */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Progreso por Categoría
        </Text>
        <View style={styles.categoriesContainer}>
          {categoryProgress.map((categoryData, index) => (
            <CategoryProgressItem key={index} categoryData={categoryData} />
          ))}
        </View>
      </View>

      {/* Achievements */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Logros
        </Text>
        {achievements.length > 0 ? (
          <FlatList
            data={achievements}
            renderItem={renderAchievement}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.achievementsList}
          />
        ) : (
          <Card style={styles.noAchievements}>
            <Text style={[styles.noAchievementsText, { color: theme.colors.textSecondary }]}>
              ¡Completa algunos artículos para ganar tus primeros logros! 🎯
            </Text>
          </Card>
        )}
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
  overviewCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  categoriesContainer: {
    gap: 12,
  },
  categoryCard: {
    padding: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryIconText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryProgress: {
    fontSize: 12,
    marginTop: 2,
  },
  categoryStats: {
    alignItems: 'flex-end',
  },
  categoryPercentage: {
    fontSize: 18,
    fontWeight: '700',
  },
  categoryProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  achievementsList: {
    paddingHorizontal: 4,
    gap: 12,
  },
  bottomSpacer: {
    height: 100,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  noAchievements: {
    padding: 20,
    alignItems: 'center',
  },
  noAchievementsText: {
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});