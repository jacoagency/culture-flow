import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../hooks/useTheme';
import { TabBar } from '../components/navigation';
import { FeedScreen, ExploreScreen, ProgressScreen, ProfileScreen } from '../screens';

const Tab = createBottomTabNavigator();

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
      <Tab.Navigator
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName="feed"
      >
        <Tab.Screen
          name="feed"
          component={FeedScreen}
          options={{
            tabBarLabel: 'Feed',
          }}
        />
        <Tab.Screen
          name="explore"
          component={ExploreScreen}
          options={{
            tabBarLabel: 'Explorar',
          }}
        />
        <Tab.Screen
          name="progress"
          component={ProgressScreen}
          options={{
            tabBarLabel: 'Progreso',
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
    </NavigationContainer>
  );
};