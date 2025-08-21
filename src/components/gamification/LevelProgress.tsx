import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { ProgressBar, Icon } from '../ui';

interface LevelProgressProps {
  currentLevel: number;
  currentPoints: number;
  pointsForNextLevel?: number;
}

export const LevelProgress: React.FC<LevelProgressProps> = ({
  currentLevel,
  currentPoints,
  pointsForNextLevel = (currentLevel + 1) * 100,
}) => {
  const { theme } = useTheme();
  
  const pointsInCurrentLevel = currentPoints % pointsForNextLevel;
  const progress = pointsInCurrentLevel / pointsForNextLevel;
  const pointsNeeded = pointsForNextLevel - pointsInCurrentLevel;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      <View style={styles.header}>
        <View style={styles.levelBadge}>
          <Icon name="star" size={20} color="#ffd700" />
          <Text style={[styles.levelText, { color: theme.colors.text }]}>
            Nivel {currentLevel}
          </Text>
        </View>
        <Text style={[styles.pointsText, { color: theme.colors.textSecondary }]}>
          {pointsNeeded} pts para nivel {currentLevel + 1}
        </Text>
      </View>
      
      <ProgressBar
        progress={progress}
        height={8}
        color={theme.colors.primary}
        style={styles.progressBar}
      />
      
      <View style={styles.footer}>
        <Text style={[styles.currentPoints, { color: theme.colors.text }]}>
          {pointsInCurrentLevel} pts
        </Text>
        <Text style={[styles.nextLevelPoints, { color: theme.colors.textSecondary }]}>
          {pointsForNextLevel} pts
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelText: {
    fontSize: 18,
    fontWeight: '700',
  },
  pointsText: {
    fontSize: 12,
  },
  progressBar: {
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  currentPoints: {
    fontSize: 12,
    fontWeight: '600',
  },
  nextLevelPoints: {
    fontSize: 12,
  },
});