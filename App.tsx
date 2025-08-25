import 'react-native-url-polyfill/auto';
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ThemeContext, useThemeProvider } from './src/hooks/useTheme';
import { AuthScreen } from './src/screens/AuthScreen';
import { AppNavigator } from './src/navigation';
import { testConnectivity, logEnvironmentInfo } from './src/utils/connectivity';

const AppContent: React.FC = () => {
  const { theme } = useThemeProvider();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Test connectivity on app startup
    logEnvironmentInfo();
    testConnectivity().then(result => {
      console.log('🔍 Startup connectivity test:', result);
      if (!result.isConnected) {
        console.error('⚠️ App started without Supabase connection:', result.error);
      }
    });
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppNavigator />
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
    <SafeAreaProvider>
      <ThemeContext.Provider value={themeValue}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeContext.Provider>
    </SafeAreaProvider>
  );
}