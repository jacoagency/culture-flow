import { Theme, ThemeMode } from '../types';
import { lightColors, darkColors } from './colors';
import { typography, spacing, borderRadius } from './typography';

export const createTheme = (mode: ThemeMode): Theme => ({
  mode,
  colors: mode === 'light' ? lightColors : darkColors,
  typography,
  spacing,
  borderRadius,
});

export const lightTheme = createTheme('light');
export const darkTheme = createTheme('dark');

export * from './colors';
export * from './typography';