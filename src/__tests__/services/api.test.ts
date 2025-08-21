import { apiClient } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock fetch
global.fetch = jest.fn();

describe('ApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  describe('Authentication', () => {
    it('should login successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: { id: '1', email: 'test@example.com', name: 'Test User' },
          tokens: { accessToken: 'access', refreshToken: 'refresh' },
        },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiClient.login('test@example.com', 'password');

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
        })
      );
    });

    it('should handle login failure', async () => {
      const mockResponse = {
        success: false,
        error: 'Invalid credentials',
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiClient.login('test@example.com', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });
  });

  describe('Content API', () => {
    it('should fetch feed content', async () => {
      const mockContent = [
        {
          id: '1',
          title: 'Test Content',
          category: 'history',
          difficulty: 2,
        },
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockContent }),
      });

      const result = await apiClient.getFeed(1, 10);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockContent);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/content/feed?page=1&limit=10'),
        expect.any(Object)
      );
    });

    it('should search content', async () => {
      const mockResults = [
        { id: '1', title: 'Renaissance Art', category: 'art' },
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResults }),
      });

      const result = await apiClient.searchContent('Renaissance', 'art');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResults);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/content/search?q=Renaissance&category=art'),
        expect.any(Object)
      );
    });
  });

  describe('Token Management', () => {
    it('should handle token refresh on 401', async () => {
      // Set initial tokens
      await AsyncStorage.setItem('accessToken', 'expired-token');
      await AsyncStorage.setItem('refreshToken', 'valid-refresh');

      // Mock first request failing with 401
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          status: 401,
          json: async () => ({ error: 'Unauthorized' }),
        })
        // Mock refresh token request succeeding
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { accessToken: 'new-access', refreshToken: 'new-refresh' },
          }),
        })
        // Mock retry request succeeding
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [] }),
        });

      const result = await apiClient.getFeed();

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(3); // Original, refresh, retry
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await apiClient.getFeed();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Error de conexión. Verifica tu internet.');
    });
  });
});