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
    const { data: { subscription } } = authService.supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth event:', event, 'Session exists:', !!session);
      setSession(session);
      
      if (session?.user) {
        // Crear usuario básico inmediatamente
        const basicUser = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuario',
          created_at: session.user.created_at || new Date().toISOString(),
          points: 0,
          level: 1,
          current_streak: 0
        };
        
        setUser(basicUser);
        
        // Intentar obtener profile completo en background
        createOrGetProfile(session.user).catch(console.error);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Usar cliente Supabase directo
      const { data: { session }, error } = await authService.supabase.auth.getSession();
      
      if (error) throw error;
      
      if (session?.user) {
        setSession(session);
        // Crear usuario básico inmediatamente
        const basicUser = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuario',
          created_at: session.user.created_at || new Date().toISOString(),
          points: 0,
          level: 1,
          current_streak: 0
        };
        
        setUser(basicUser);
        
        // Profile en background
        createOrGetProfile(session.user).catch(console.error);
      } else {
        setUser(null);
        setSession(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Login directo con Supabase auth - SIN profile
      const { data, error } = await authService.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Crear usuario básico desde auth data
        const basicUser = {
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Usuario',
          created_at: data.user.created_at || new Date().toISOString(),
          points: 0,
          level: 1,
          current_streak: 0
        };
        
        setUser(basicUser);
        
        // Intentar crear/obtener profile en background (no bloquear login)
        createOrGetProfile(data.user).catch(console.error);
        
        return { success: true };
      }
      
      return { success: false, error: 'No user data received' };
    } catch (error: any) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.message || 'Error al iniciar sesión' 
      };
    } finally {
      setLoading(false);
    }
  };

  // Función helper para crear/obtener profile en background
  const createOrGetProfile = async (authUser: any) => {
    try {
      // Intentar obtener profile existente
      const { data, error } = await authService.supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (data) {
        // Profile existe, actualizar user
        setUser(prev => ({ ...prev, ...data }));
      } else {
        // Crear nuevo profile
        const newProfile = {
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuario',
          points: 0,
          level: 1,
          current_streak: 0,
          best_streak: 0,
          total_time_spent: 0,
          content_completed: 0,
          preferred_categories: [],
          learning_goal: 15,
          notifications: true
        };

        const { error: insertError } = await authService.supabase
          .from('user_profiles')
          .insert([newProfile]);

        if (!insertError) {
          setUser(prev => ({ ...prev, ...newProfile }));
        }
      }
    } catch (error) {
      console.warn('Profile creation/fetch failed, continuing with basic user:', error);
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
      setLoading(true);
      const result = await authService.signOut();
      
      if (result.success) {
        setUser(null);
        setSession(null);
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
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
    updateUser,
    refreshUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};