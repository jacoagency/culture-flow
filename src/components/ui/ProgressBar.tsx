import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';

interface ProgressBarProps {
  progress: number; // 0 to 1
  height?: number;
  style?: ViewStyle;
  color?: string;
  backgroundColor?: string;
  animated?: boolean;
  duration?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 8,
  style,
  color,
  backgroundColor,
  animated = true,
  duration = 800,
}) => {
  const { theme } = useTheme();
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      animatedProgress.value = withTiming(progress, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      animatedProgress.value = progress;
    }
  }, [progress, animated, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%`,
  }));

  const progressColor = color || theme.colors.primary;
  const bgColor = backgroundColor || theme.colors.border;

  return (
    <View
      style={[
        styles.container,
        {
          height,
          backgroundColor: bgColor,
          borderRadius: height / 2,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.progress,
          {
            height,
            backgroundColor: progressColor,
            borderRadius: height / 2,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  progress: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});