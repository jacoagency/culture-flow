import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  points: number;
  level: number;
  currentStreak: number;
  bestStreak: number;
  totalTimeSpent: number;
  contentCompleted: number;
  preferredCategories: string[];
  learningGoal: number;
  notifications: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  preferredCategories?: string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        const response = await apiClient.getCurrentUser();
        if (response.success && response.data) {
          setUser(response.data);
        } else {
          // Token is invalid, clear it
          await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.login(email, password);
      if (response.success && response.data) {
        setUser(response.data.user);
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Error al iniciar sesión' };
      }
    } catch (error) {
      return { success: false, error: 'Error de conexión' };
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      const response = await apiClient.register(userData);
      if (response.success && response.data) {
        setUser(response.data.user);
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Error al registrarse' };
      }
    } catch (error) {
      return { success: false, error: 'Error de conexión' };
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local user state
      setUser(null);
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    try {
      const response = await apiClient.updateProfile(userData);
      if (response.success) {
        setUser(prevUser => prevUser ? { ...prevUser, ...userData } : null);
      }
    } catch (error) {
      console.error('Update user error:', error);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await apiClient.getCurrentUser();
      if (response.success && response.data) {
        setUser(response.data);
      }
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};