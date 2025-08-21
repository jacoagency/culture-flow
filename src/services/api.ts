import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// API Configuration
const API_BASE_URL = __DEV__ ? 'http://192.168.1.76:3001' : 'https://api.culturaflow.com';
const API_VERSION = '/api/v1';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

class ApiClient {
  private baseURL: string;
  private accessToken: string | null = null;

  constructor() {
    this.baseURL = `${API_BASE_URL}${API_VERSION}`;
    this.initializeTokens();
  }

  private async initializeTokens() {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      this.accessToken = token;
    } catch (error) {
      console.error('Error initializing tokens:', error);
    }
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle token refresh if needed
      if (response.status === 401 && this.accessToken) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry the original request
          headers.Authorization = `Bearer ${this.accessToken}`;
          const retryResponse = await fetch(url, {
            ...options,
            headers,
          });
          return await retryResponse.json();
        } else {
          // Redirect to login
          await this.clearTokens();
          Alert.alert('Sesión expirada', 'Por favor inicia sesión de nuevo');
          return { success: false, error: 'Token expired' };
        }
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request error:', error);
      return { 
        success: false, 
        error: 'Error de conexión. Verifica tu internet.' 
      };
    }
  }

  private async refreshAccessToken(): Promise<boolean> {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) return false;

      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        await this.setTokens(data.data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  private async setTokens(tokens: AuthTokens) {
    this.accessToken = tokens.accessToken;
    await AsyncStorage.setItem('accessToken', tokens.accessToken);
    await AsyncStorage.setItem('refreshToken', tokens.refreshToken);
  }

  private async clearTokens() {
    this.accessToken = null;
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
  }

  // Authentication methods
  async login(email: string, password: string) {
    const response = await this.request<{ user: any; tokens: AuthTokens }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data) {
      await this.setTokens(response.data.tokens);
      return response;
    }
    return response;
  }

  async register(userData: {
    name: string;
    email: string;
    password: string;
    preferredCategories?: string[];
  }) {
    const response = await this.request<{ user: any; tokens: AuthTokens }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (response.success && response.data) {
      await this.setTokens(response.data.tokens);
      return response;
    }
    return response;
  }

  async logout() {
    await this.request('/auth/logout', { method: 'POST' });
    await this.clearTokens();
  }

  async getCurrentUser() {
    return await this.request('/auth/me');
  }

  // Content methods
  async getFeed(page: number = 1, limit: number = 20) {
    return await this.request(`/content/feed?page=${page}&limit=${limit}`);
  }

  async getContentByCategory(category: string, page: number = 1) {
    return await this.request(`/content/category/${category}?page=${page}&limit=20`);
  }

  async getTrendingContent(period: '1h' | '24h' | '7d' = '24h') {
    return await this.request(`/content/trending?period=${period}`);
  }

  async searchContent(query: string, category?: string) {
    const params = new URLSearchParams({ q: query });
    if (category) params.append('category', category);
    return await this.request(`/content/search?${params.toString()}`);
  }

  async getContentById(id: string) {
    return await this.request(`/content/${id}`);
  }

  // Interaction methods
  async recordInteraction(contentId: string, type: 'like' | 'save' | 'share' | 'view') {
    return await this.request('/interactions', {
      method: 'POST',
      body: JSON.stringify({ contentId, type }),
    });
  }

  async updateProgress(contentId: string, timeSpent: number, completed: boolean = false) {
    return await this.request('/interactions/progress', {
      method: 'POST',
      body: JSON.stringify({ contentId, timeSpent, completed }),
    });
  }

  async getSavedContent() {
    return await this.request('/interactions/saved/content');
  }

  // User methods
  async updateProfile(profileData: {
    name?: string;
    preferredCategories?: string[];
    learningGoal?: number;
    notifications?: boolean;
  }) {
    return await this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async getUserStats() {
    return await this.request('/users/stats');
  }

  async getUserAchievements() {
    return await this.request('/users/achievements');
  }

  // Recommendations
  async getRecommendations() {
    return await this.request('/recommendations');
  }

  async trackRecommendationInteraction(recommendationId: string, action: 'clicked' | 'dismissed') {
    return await this.request('/recommendations/interact', {
      method: 'POST',
      body: JSON.stringify({ recommendationId, action }),
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;