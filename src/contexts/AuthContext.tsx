import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, AuthUser } from '../services/supabaseAuth';
import { Session } from '@supabase/supabase-js';

interface User extends AuthUser {
  // All user properties are now defined in AuthUser interface
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>; // Alias for logout
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
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    checkAuthStatus();
    
    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth event:', event);
      setSession(session);
      
      if (session?.user) {
        console.log('👤 User authenticated, fetching profile...');
        // Get user profile with better error handling
        try {
          const profile = await authService.getUserProfile(session.user.id);
          if (profile.success && profile.data) {
            console.log('✅ Profile loaded successfully');
            setUser(profile.data);
          } else {
            console.warn('⚠️ Profile fetch failed, but user is authenticated');
            // Create a basic user object from auth data if profile fails
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || 'Usuario',
              points: 0,
              level: 1,
              current_streak: 0,
              best_streak: 0,
              total_time_spent: 0,
              content_completed: 0,
              preferred_categories: [],
              learning_goal: 15,
              notifications: true,
              created_at: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error('❌ Profile fetch error, using fallback user data:', error);
          // Create fallback user object
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || 'Usuario',
            points: 0,
            level: 1,
            current_streak: 0,
            best_streak: 0,
            total_time_spent: 0,
            content_completed: 0,
            preferred_categories: [],
            learning_goal: 15,
            notifications: true,
            created_at: new Date().toISOString(),
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const sessionResult = await authService.getSession();
      if (sessionResult.success && sessionResult.session) {
        setSession(sessionResult.session);
        if (sessionResult.profile) {
          setUser(sessionResult.profile);
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const result = await authService.signIn(email, password);
      
      if (result.success) {
        if (result.profile) {
          setUser(result.profile);
        }
        return { success: true };
      } else {
        return { 
          success: false, 
          error: result.error || 'Error al iniciar sesión' 
        };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.message || 'Error de conexión' 
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setLoading(true);
      const result = await authService.signUp(userData);
      
      if (result.success) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: result.error || 'Error al registrarse' 
        };
      }
    } catch (error: any) {
      console.error('Register error:', error);
      return { 
        success: false, 
        error: error.message || 'Error de conexión' 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Starting logout process...');
      setLoading(true);
      
      // First clear local state immediately
      setUser(null);
      setSession(null);
      
      // Then sign out from Supabase
      const result = await authService.signOut();
      console.log('🚪 Supabase signOut result:', result);
      
      if (!result.success) {
        console.warn('⚠️ Supabase signOut failed, but local state already cleared');
      }
    } catch (error) {
      console.error('❌ Logout error:', error);
    } finally {
      setLoading(false);
      console.log('✅ Logout process completed');
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    try {
      if (!user) return;
      
      const result = await authService.updateUserProfile(user.id, userData);
      if (result.success && result.data) {
        setUser(result.data);
      }
    } catch (error) {
      console.error('Update user error:', error);
    }
  };

  const refreshUser = async () => {
    try {
      if (!session?.user) return;
      
      const profile = await authService.getUserProfile(session.user.id);
      if (profile.success && profile.data) {
        setUser(profile.data);
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
    signOut: logout, // Alias for logout
    updateUser,
    refreshUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};