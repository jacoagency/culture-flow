import { ThemeContextType } from '../../hooks/useTheme';

export const mockTheme: ThemeContextType = {
  theme: {
    mode: 'light',
    colors: {
      primary: '#007AFF',
      background: '#FFFFFF',
      cardBackground: '#F8F9FA',
      text: '#1C1C1E',
      textSecondary: '#8E8E93',
      border: '#E5E5EA',
      success: '#34C759',
      warning: '#FF9500',
      error: '#FF3B30',
      info: '#007AFF',
      surface: '#FFFFFF',
      shadow: 'rgba(0, 0, 0, 0.1)',
    },
  },
  toggleTheme: jest.fn(),
  isSystemTheme: false,
  setSystemTheme: jest.fn(),
};