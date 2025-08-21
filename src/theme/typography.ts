import { TextStyle } from '../types';

export const typography = {
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
  } as TextStyle,
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 30,
  } as TextStyle,
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 26,
  } as TextStyle,
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  } as TextStyle,
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  } as TextStyle,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
};