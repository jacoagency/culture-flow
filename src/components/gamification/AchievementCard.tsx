import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Card, Icon, ProgressBar } from '../ui';
import { Achievement } from '../../types';

interface AchievementCardProps {
  achievement: Achievement;
  size?: 'small' | 'medium';
}

export const AchievementCard: React.FC<AchievementCardProps> = ({
  achievement,
  size = 'medium',
}) => {
  const { theme } = useTheme();
  const isUnlocked = !!achievement.unlockedAt;
  const progress = achievement.progress / achievement.maxProgress;

  const containerStyle = size === 'small' ? styles.smallContainer : styles.container;
  const iconSize = size === 'small' ? 32 : 48;

  return (
    <Card style={[containerStyle, { opacity: isUnlocked ? 1 : 0.7 }]}>
      <View style={styles.header}>
        <View style={[
          styles.iconContainer,
          {
            backgroundColor: isUnlocked ? theme.colors.primary : theme.colors.border,
            width: iconSize + 16,
            height: iconSize + 16,
          }
        ]}>
          <Icon
            name={achievement.icon as any}
            size={iconSize}
            color={isUnlocked ? '#fff' : theme.colors.textSecondary}
          />
        </View>
        
        {isUnlocked && (
          <View style={styles.unlockedBadge}>
            <Icon name="checkmark-circle" size={20} color={theme.colors.success} />
          </View>
        )}
      </View>

      <Text style={[styles.title, { color: theme.colors.text }]}>
        {achievement.title}
      </Text>
      
      <Text
        style={[styles.description, { color: theme.colors.textSecondary }]}
        numberOfLines={size === 'small' ? 2 : 3}
      >
        {achievement.description}
      </Text>

      {!isUnlocked && (
        <View style={styles.progressContainer}>
          <ProgressBar
            progress={progress}
            height={6}
            color={theme.colors.primary}
            style={styles.progressBar}
          />
          <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
            {achievement.progress}/{achievement.maxProgress}
          </Text>
        </View>
      )}

      {isUnlocked && achievement.unlockedAt && (
        <Text style={[styles.unlockedDate, { color: theme.colors.success }]}>
          Desbloqueado {achievement.unlockedAt.toLocaleDateString()}
        </Text>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 180,
    padding: 16,
    alignItems: 'center',
  },
  smallContainer: {
    width: 140,
    padding: 12,
    alignItems: 'center',
  },
  header: {
    position: 'relative',
    marginBottom: 12,
  },
  iconContainer: {
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 12,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    marginBottom: 4,
  },
  progressText: {
    fontSize: 10,
    fontWeight: '600',
  },
  unlockedDate: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
});