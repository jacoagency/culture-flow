import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const { theme } = useTheme();

  const buttonStyles = [
    styles.button,
    {
      backgroundColor: getBackgroundColor(),
      borderColor: getBorderColor(),
      borderWidth: variant === 'outline' ? 2 : 0,
      paddingVertical: getPaddingVertical(),
      paddingHorizontal: getPaddingHorizontal(),
      opacity: disabled ? 0.6 : 1,
    },
    style,
  ];

  const textStyles = [
    styles.text,
    {
      color: getTextColor(),
      fontSize: getFontSize(),
    },
    textStyle,
  ];

  function getBackgroundColor() {
    if (variant === 'ghost' || variant === 'outline') return 'transparent';
    if (variant === 'secondary') return theme.colors.surface;
    return theme.colors.primary;
  }

  function getBorderColor() {
    return theme.colors.primary;
  }

  function getTextColor() {
    if (variant === 'primary') return '#ffffff';
    if (variant === 'secondary') return theme.colors.text;
    return theme.colors.primary;
  }

  function getPaddingVertical() {
    if (size === 'small') return theme.spacing.xs;
    if (size === 'large') return theme.spacing.md;
    return theme.spacing.sm;
  }

  function getPaddingHorizontal() {
    if (size === 'small') return theme.spacing.md;
    if (size === 'large') return theme.spacing.xl;
    return theme.spacing.lg;
  }

  function getFontSize() {
    if (size === 'small') return theme.typography.caption.fontSize;
    if (size === 'large') return theme.typography.h3.fontSize;
    return theme.typography.body.fontSize;
  }

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  text: {
    fontWeight: '600',
  },
});