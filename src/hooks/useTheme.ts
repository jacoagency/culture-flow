import { useState, useEffect, createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, ThemeMode } from '../types';
import { lightTheme, darkTheme } from '../theme';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const useThemeProvider = () => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('themeMode');
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
        setThemeModeState(savedTheme as ThemeMode);
      } else {
        // Use system preference if no saved preference
        setThemeModeState(systemColorScheme === 'dark' ? 'dark' : 'light');
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem('themeMode', mode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const toggleTheme = () => {
    const newMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(newMode);
  };

  const theme = themeMode === 'light' ? lightTheme : darkTheme;

  return {
    theme,
    themeMode,
    toggleTheme,
    setThemeMode,
  };
};