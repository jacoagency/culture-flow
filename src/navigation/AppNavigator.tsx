import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../hooks/useTheme';
import { TabBar } from '../components/navigation';
import { DashboardScreen, TemasScreen, ConfiguracionesScreen, ProfileScreen } from '../screens';
import { ContentDetailScreen } from '../screens/content/ContentDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Tab Navigator Component
const TabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="dashboard"
    >
      <Tab.Screen
        name="dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
        }}
      />
      <Tab.Screen
        name="temas"
        component={TemasScreen}
        options={{
          tabBarLabel: 'Temas',
        }}
      />
      <Tab.Screen
        name="configuraciones"
        component={ConfiguracionesScreen}
        options={{
          tabBarLabel: 'Config',
        }}
      />
      <Tab.Screen
        name="profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Perfil',
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const { theme } = useTheme();

  return (
    <NavigationContainer
      theme={{
        dark: theme.mode === 'dark',
        colors: {
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.card,
          text: theme.colors.text,
          border: theme.colors.border,
          notification: theme.colors.accent,
        },
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="main" component={TabNavigator} />
        <Stack.Screen 
          name="content-detail" 
          component={ContentDetailScreen}
          options={{
            headerShown: true,
            headerTitle: '',
            headerBackTitle: 'Atrás',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};