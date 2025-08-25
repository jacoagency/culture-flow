import { supabase } from '../config/supabase';
import { User } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  points: number;
  level: number;
  current_streak: number;
  best_streak: number;
  total_time_spent: number;
  content_completed: number;
  preferred_categories: string[];
  learning_goal: number;
  notifications: boolean;
  created_at: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  preferredCategories?: string[];
}

export class SupabaseAuthService {
  public supabase = supabase; // Exponer cliente para uso directo
  // Sign up new user
  async signUp(userData: RegisterData) {
    try {
      console.log('📧 Attempting signup for:', userData.email);
      
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            preferred_categories: userData.preferredCategories || [],
          }
        }
      });

      if (error) {
        console.error('❌ Signup error:', error.message);
        throw error;
      }

      console.log('✅ Signup successful for:', userData.email);

      // Create user profile in our custom table
      if (data.user) {
        await this.createUserProfile(data.user, userData);
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message };
    }
  }

  // Sign in user
  async signIn(email: string, password: string) {
    try {
      console.log('Supabase signIn starting...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Supabase signIn response:', { data: !!data, error: !!error });
      if (error) throw error;

      // Get user profile data
      if (data.user) {
        console.log('Fetching user profile for:', data.user.id);
        try {
          const profile = await this.getUserProfile(data.user.id);
          console.log('Profile fetch result:', profile);
          return { 
            success: true, 
            user: data.user,
            profile: profile.success ? profile.data : null
          };
        } catch (profileError) {
          console.warn('Profile fetch failed, continuing without profile:', profileError);
          return { 
            success: true, 
            user: data.user,
            profile: null 
          };
        }
      }

      console.log('No user in data, returning basic success');

      return { success: true, data };
    } catch (error: any) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    }
  }

  // Sign out user
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get current session
  async getSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      if (data.session) {
        const profile = await this.getUserProfile(data.session.user.id);
        return {
          success: true,
          session: data.session,
          profile: profile.data
        };
      }
      
      return { success: true, session: null };
    } catch (error: any) {
      console.error('Get session error:', error);
      return { success: false, error: error.message };
    }
  }

  // Create user profile
  private async createUserProfile(user: User, userData: RegisterData) {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          email: user.email,
          name: userData.name,
          preferred_categories: userData.preferredCategories || [],
          points: 0,
          level: 1,
          current_streak: 0,
          best_streak: 0,
          total_time_spent: 0,
          content_completed: 0,
          learning_goal: 15, // 15 minutes per day default
          notifications: true,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Create profile error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user profile
  async getUserProfile(userId: string) {
    try {
      console.log('Getting profile for user ID:', userId);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000);
      });
      
      const profilePromise = supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const { data, error } = await Promise.race([profilePromise, timeoutPromise]);

      console.log('Profile query result:', { data: !!data, error: !!error });
      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Get profile error:', error);
      return { success: false, error: error.message };
    }
  }

  // Update user profile
  async updateUserProfile(userId: string, updates: Partial<AuthUser>) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Update profile error:', error);
      return { success: false, error: error.message };
    }
  }

  // Listen to auth changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }

  // Get current user
  getCurrentUser() {
    return supabase.auth.getUser();
  }
}

export const authService = new SupabaseAuthService();