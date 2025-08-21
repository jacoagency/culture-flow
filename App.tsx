import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeContext, useThemeProvider } from './src/hooks/useTheme';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { AppNavigator } from './src/navigation';
import { AuthScreen } from './src/screens/AuthScreen';

const AppContent: React.FC = () => {
  const { theme } = useThemeProvider();
  const { user, loading } = useAuth();

  if (loading) {
    return null; // You can add a loading screen here
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {user ? <AppNavigator /> : <AuthScreen />}
        <StatusBar 
          style={theme.mode === 'dark' ? 'light' : 'dark'} 
          backgroundColor={theme.colors.background}
        />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
};

export default function App() {
  const themeValue = useThemeProvider();

  return (
    <ThemeContext.Provider value={themeValue}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeContext.Provider>
  );
}