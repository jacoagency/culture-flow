import { supabase } from '../config/supabase';

export interface ContentItem {
  id: string;
  title: string;
  description: string;
  content_type?: 'article' | 'video' | 'audio' | 'interactive' | 'quiz';
  category: string;
  subcategory?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration_minutes?: number;
  points_reward?: number;
  content_url?: string;
  image_url?: string;
  audio_url?: string;
  video_url?: string;
  facts?: string[];
  quiz_questions?: QuizQuestion[];
  tags?: string[];
  language?: string;
  region?: string;
  historical_period?: string;
  is_trending?: boolean;
  view_count?: number;
  like_count?: number;
  share_count?: number;
  created_at: string;
  updated_at: string;
  // Para compatibilidad con hooks existentes
  content?: string;
  estimated_time?: number;
  points?: number;
  multimedia?: Array<{ type: string; url: string; alt: string; }>;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
}

export interface UserInteraction {
  id: string;
  user_id: string;
  content_id: string;
  interaction_type: 'view' | 'like' | 'save' | 'share' | 'complete';
  time_spent?: number;
  progress?: number;
  score?: number;
  created_at: string;
}

export class SupabaseContentService {
  // Helper para mapear datos de BD al interface
  private mapContentItem(item: any): ContentItem {
    return {
      ...item,
      // Mapear campos para compatibilidad
      content_type: item.content_type || 'article',
      estimated_time: item.duration_minutes || 5,
      points: item.points_reward || 10,
      multimedia: item.image_url ? [{ 
        type: 'image', 
        url: item.image_url, 
        alt: item.title 
      }] : [],
      // Asegurar arrays vacíos en lugar de null
      facts: item.facts || [],
      tags: item.tags || [],
    };
  }

  // Get feed content with recommendations
  async getFeedContent(userId: string, page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;
      
      // Get user preferences first
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('preferred_categories, level')
        .eq('id', userId)
        .single();

      const preferredCategories = userProfile?.preferred_categories || [];
      const userLevel = userProfile?.level || 1;

      // Build query based on user preferences
      let query = supabase
        .from('cultural_content')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // If user has preferences, prioritize that content
      if (preferredCategories.length > 0) {
        query = query.or(
          preferredCategories.map(cat => `category.eq.${cat}`).join(',')
        );
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Mix in some trending content
      const { data: trendingData } = await supabase
        .from('cultural_content')
        .select('*')
        .eq('is_trending', true)
        .limit(Math.floor(limit * 0.3));

      // Combine and shuffle content
      const combinedContent = this.shuffleAndMixContent(
        data || [], 
        trendingData || [],
        userLevel
      );

      return { success: true, data: combinedContent };
    } catch (error: any) {
      console.error('Get feed error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get content by category
  async getContentByCategory(category: string, page: number = 1, limit: number = 20) {
    try {
      console.log(`Loading category: ${category}, page: ${page}, limit: ${limit}`);
      const offset = (page - 1) * limit;
      
      const { data, error } = await supabase
        .from('cultural_content')
        .select('*')
        .eq('category', category)
        .order('view_count', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Supabase category query error:', error);
        throw error;
      }
      
      console.log(`Found ${data?.length || 0} items for category ${category}`);
      const mappedData = data?.map(item => this.mapContentItem(item)) || [];
      
      return { success: true, data: mappedData };
    } catch (error: any) {
      console.error('Get category content error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get trending content
  async getTrendingContent(period: '1h' | '24h' | '7d' = '24h') {
    try {
      console.log(`Loading trending content for period: ${period}`);
      
      // Simplificar query - solo trending content, sin filtro de tiempo por ahora
      const { data, error } = await supabase
        .from('cultural_content')
        .select('*')
        .eq('is_trending', true)
        .order('view_count', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Supabase trending query error:', error);
        throw error;
      }
      
      console.log(`Found ${data?.length || 0} trending items`);
      const mappedData = data?.map(item => this.mapContentItem(item)) || [];
      
      return { success: true, data: mappedData };
    } catch (error: any) {
      console.error('Get trending content error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get single content item by ID
  async getContentById(contentId: string) {
    try {
      console.log(`Loading content by ID: ${contentId}`);
      
      const { data, error } = await supabase
        .from('cultural_content')
        .select('*')
        .eq('id', contentId)
        .single();

      if (error) {
        console.error('Supabase content by ID query error:', error);
        throw error;
      }
      
      if (!data) {
        return { success: false, error: 'Content not found' };
      }

      console.log(`Found content: ${data.title}`);
      const mappedData = this.mapContentItem(data);
      
      return { success: true, data: mappedData };
    } catch (error: any) {
      console.error('Get content by ID error:', error);
      return { success: false, error: error.message };
    }
  }

  // Search content
  async searchContent(query: string, category?: string) {
    try {
      let supabaseQuery = supabase
        .from('cultural_content')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`);

      if (category) {
        supabaseQuery = supabaseQuery.eq('category', category);
      }

      const { data, error } = await supabaseQuery
        .order('view_count', { ascending: false })
        .limit(50);

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Search content error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get content by ID
  async getContentById(contentId: string) {
    try {
      const { data, error } = await supabase
        .from('cultural_content')
        .select('*')
        .eq('id', contentId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Get content by ID error:', error);
      return { success: false, error: error.message };
    }
  }

  // Record interaction
  async recordInteraction(
    userId: string, 
    contentId: string, 
    type: 'view' | 'like' | 'save' | 'share' | 'complete',
    timeSpent?: number,
    score?: number
  ) {
    try {
      // Insert interaction
      const { error: interactionError } = await supabase
        .from('user_interactions')
        .insert({
          user_id: userId,
          content_id: contentId,
          interaction_type: type,
          time_spent: timeSpent,
          score: score,
          created_at: new Date().toISOString(),
        });

      if (interactionError) throw interactionError;

      // Update content counters
      const updateField = `${type}_count`;
      if (['view', 'like', 'share'].includes(type)) {
        const { error: updateError } = await supabase.rpc('increment_counter', {
          table_name: 'cultural_content',
          row_id: contentId,
          field_name: updateField
        });
        
        if (updateError) console.error('Counter update error:', updateError);
      }

      // Update user points for interactions
      const points = this.getPointsForInteraction(type, timeSpent);
      if (points > 0) {
        await this.updateUserPoints(userId, points);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Record interaction error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user's saved content
  async getSavedContent(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_interactions')
        .select(`
          content_id,
          created_at,
          cultural_content (*)
        `)
        .eq('user_id', userId)
        .eq('interaction_type', 'save')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const savedContent = data?.map(item => ({
        ...item.cultural_content,
        saved_at: item.created_at
      })) || [];

      return { success: true, data: savedContent };
    } catch (error: any) {
      console.error('Get saved content error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user progress
  async getUserProgress(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_interactions')
        .select('*')
        .eq('user_id', userId)
        .eq('interaction_type', 'complete');

      if (error) throw error;

      const stats = {
        totalCompleted: data?.length || 0,
        totalTimeSpent: data?.reduce((sum, item) => sum + (item.time_spent || 0), 0) || 0,
        averageScore: data?.length ? 
          data.reduce((sum, item) => sum + (item.score || 0), 0) / data.length : 0
      };

      return { success: true, data: stats };
    } catch (error: any) {
      console.error('Get user progress error:', error);
      return { success: false, error: error.message };
    }
  }

  // Private helper methods
  private shuffleAndMixContent(
    feedContent: ContentItem[], 
    trendingContent: ContentItem[],
    userLevel: number
  ): ContentItem[] {
    // Filter content by difficulty based on user level
    const filteredFeed = feedContent.filter(item => {
      if (userLevel === 1) return item.difficulty === 'beginner';
      if (userLevel <= 3) return ['beginner', 'intermediate'].includes(item.difficulty);
      return true; // All difficulties for advanced users
    });

    // Mix trending content every 5 items
    const mixed: ContentItem[] = [];
    let trendingIndex = 0;

    for (let i = 0; i < filteredFeed.length; i++) {
      mixed.push(filteredFeed[i]);
      
      // Insert trending content every 5 items
      if ((i + 1) % 5 === 0 && trendingIndex < trendingContent.length) {
        mixed.push(trendingContent[trendingIndex]);
        trendingIndex++;
      }
    }

    return mixed;
  }

  private getPointsForInteraction(
    type: string, 
    timeSpent?: number
  ): number {
    switch (type) {
      case 'view': return timeSpent ? Math.floor(timeSpent / 60) : 1; // 1 point per minute
      case 'like': return 2;
      case 'save': return 3;
      case 'share': return 5;
      case 'complete': return 10;
      default: return 0;
    }
  }

  private async updateUserPoints(userId: string, points: number) {
    try {
      const { error } = await supabase.rpc('increment_user_points', {
        user_id: userId,
        points_to_add: points
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Update user points error:', error);
    }
  }
}

export const contentService = new SupabaseContentService();