import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '../../hooks/useTheme';
import { Icon } from '../ui';
import Animated, {
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';

const tabIcons = {
  dashboard: 'grid',
  temas: 'book',
  configuraciones: 'settings',
  profile: 'person',
} as const;

export const TabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel || route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const iconName = tabIcons[route.name as keyof typeof tabIcons] || 'home';

        const animatedIconStyle = useAnimatedStyle(() => {
          const scale = withSpring(isFocused ? 1.2 : 1);
          return { transform: [{ scale }] };
        });

        const animatedTextStyle = useAnimatedStyle(() => {
          const opacity = withSpring(isFocused ? 1 : 0.6);
          return { opacity };
        });

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tab}
            activeOpacity={0.8}
          >
            <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
              <Icon
                name={iconName as any}
                size={24}
                color={isFocused ? theme.colors.primary : theme.colors.textSecondary}
              />
            </Animated.View>
            <Animated.Text
              style={[
                styles.label,
                {
                  color: isFocused ? theme.colors.primary : theme.colors.textSecondary,
                  fontSize: theme.typography.caption.fontSize,
                },
                animatedTextStyle,
              ]}
            >
              {label}
            </Animated.Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 80,
    paddingBottom: 20,
    paddingTop: 8,
    paddingHorizontal: 16,
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 4,
  },
  label: {
    fontWeight: '500',
  },
});