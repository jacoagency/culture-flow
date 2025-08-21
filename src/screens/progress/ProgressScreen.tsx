import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Card } from '../../components/ui';
import { StreakCounter, LevelProgress, AchievementCard } from '../../components/gamification';
import { mockUser, categories } from '../../data/mockData';
import { categoryColors } from '../../theme/colors';

export const ProgressScreen: React.FC = () => {
  const { theme } = useTheme();
  const user = mockUser;

  const CategoryProgress = ({ category }: { category: any }) => {
    // Simulate progress for each category
    const completed = Math.floor(Math.random() * 20) + 5;
    const total = 25;
    const progress = completed / total;

    return (
      <Card style={styles.categoryCard}>
        <View style={styles.categoryHeader}>
          <View
            style={[
              styles.categoryIcon,
              { backgroundColor: categoryColors[category.id as keyof typeof categoryColors] }
            ]}
          >
            <Text style={styles.categoryIconText}>{category.name[0]}</Text>
          </View>
          <View style={styles.categoryInfo}>
            <Text style={[styles.categoryName, { color: theme.colors.text }]}>
              {category.name}
            </Text>
            <Text style={[styles.categoryProgress, { color: theme.colors.textSecondary }]}>
              {completed}/{total} completadas
            </Text>
          </View>
          <View style={styles.categoryStats}>
            <Text style={[styles.categoryPercentage, { color: categoryColors[category.id as keyof typeof categoryColors] }]}>
              {Math.round(progress * 100)}%
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
                width: `${progress * 100}%`,
                backgroundColor: categoryColors[category.id as keyof typeof categoryColors],
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
              {user.progress.cardsCompleted}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Tarjetas completadas
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: theme.colors.success }]}>
              {Math.round((user.progress.cardsCompleted / 150) * 100)}%
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
          currentStreak={user.progress.currentStreak}
          longestStreak={user.progress.longestStreak}
        />
      </View>

      <View style={styles.section}>
        <LevelProgress
          currentLevel={user.progress.level}
          currentPoints={user.progress.totalPoints}
        />
      </View>

      {/* Categories Progress */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Progreso por Categoría
        </Text>
        <View style={styles.categoriesContainer}>
          {categories.map((category) => (
            <CategoryProgress key={category.id} category={category} />
          ))}
        </View>
      </View>

      {/* Achievements */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Logros
        </Text>
        <FlatList
          data={user.progress.achievements}
          renderItem={renderAchievement}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.achievementsList}
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
});