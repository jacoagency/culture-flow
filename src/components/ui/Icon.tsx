import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

interface IconProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
}

export const Icon: React.FC<IconProps> = ({ name, size = 24, color }) => {
  const { theme } = useTheme();
  const iconColor = color || theme.colors.text;

  return <Ionicons name={name} size={size} color={iconColor} />;
};