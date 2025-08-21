import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  shadow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  padding,
  shadow = true,
}) => {
  const { theme } = useTheme();

  const cardStyles = [
    styles.card,
    {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: padding ?? theme.spacing.md,
      shadowColor: theme.colors.shadow,
      shadowOpacity: shadow ? 0.1 : 0,
      elevation: shadow ? 4 : 0,
    },
    style,
  ];

  return <View style={cardStyles}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowRadius: 8,
  },
});