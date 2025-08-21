import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Icon } from '../ui';

interface StreakCounterProps {
  currentStreak: number;
  longestStreak: number;
}

export const StreakCounter: React.FC<StreakCounterProps> = ({
  currentStreak,
  longestStreak,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      <View style={styles.streakItem}>
        <Icon name="flame" size={24} color="#ff6b35" />
        <View style={styles.streakText}>
          <Text style={[styles.streakNumber, { color: theme.colors.text }]}>
            {currentStreak}
          </Text>
          <Text style={[styles.streakLabel, { color: theme.colors.textSecondary }]}>
            Racha actual
          </Text>
        </View>
      </View>
      
      <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
      
      <View style={styles.streakItem}>
        <Icon name="trophy" size={24} color="#ffd700" />
        <View style={styles.streakText}>
          <Text style={[styles.streakNumber, { color: theme.colors.text }]}>
            {longestStreak}
          </Text>
          <Text style={[styles.streakLabel, { color: theme.colors.textSecondary }]}>
            Mejor racha
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  streakItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakText: {
    flex: 1,
  },
  streakNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  streakLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  separator: {
    width: 1,
    height: 40,
    marginHorizontal: 16,
  },
});