import { useState, useEffect, useCallback } from 'react';
import { contentService, ContentItem } from '../services/supabaseContent';
import { useAuth } from '../contexts/AuthContext';

interface UseContentResult {
  content: ContentItem[];
  loading: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  hasMore: boolean;
}

interface UseContentOptions {
  category?: string;
  initialLoad?: boolean;
}

export const useContent = (options: UseContentOptions = {}): UseContentResult => {
  const { category, initialLoad = true } = options;
  const { user } = useAuth();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadContent = useCallback(async (pageNum: number = 1, reset: boolean = false) => {
    if (loading || !user) return;
    
    setLoading(true);
    setError(null);

    try {
      let response;
      if (category) {
        response = await contentService.getContentByCategory(category, pageNum);
      } else {
        response = await contentService.getFeedContent(user.id, pageNum);
      }

      if (response.success && response.data) {
        const newContent = response.data;
        
        if (reset) {
          setContent(newContent);
        } else {
          setContent(prev => [...prev, ...newContent]);
        }

        setHasMore(newContent.length === 20); // Assuming 20 items per page
        setPage(pageNum);
      } else {
        setError(response.error || 'Error loading content');
      }
      
    } catch (err) {
      setError('Error loading content');
      console.error('Content loading error:', err);
    } finally {
      setLoading(false);
    }
  }, [category, loading, user]);

  const loadMore = useCallback(async () => {
    if (hasMore && !loading) {
      await loadContent(page + 1, false);
    }
  }, [hasMore, loading, page, loadContent]);

  const refresh = useCallback(async () => {
    setPage(1);
    setHasMore(true);
    await loadContent(1, true);
  }, [loadContent]);

  useEffect(() => {
    if (initialLoad) {
      loadContent(1, true);
    }
  }, [category, initialLoad, loadContent]);

  return {
    content,
    loading,
    error,
    loadMore,
    refresh,
    hasMore,
  };
};

// Hook for trending content
export const useTrendingContent = (period: '1h' | '24h' | '7d' = '24h') => {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTrending = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await contentService.getTrendingContent(period);
      if (response.success && response.data) {
        setContent(response.data);
      } else {
        setError(response.error || 'Error loading trending content');
      }
    } catch (err) {
      setError('Error loading trending content');
      console.error('Trending content error:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadTrending();
  }, [loadTrending]);

  return { content, loading, error, refresh: loadTrending };
};

// Hook for content search
export const useContentSearch = () => {
  const [results, setResults] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, category?: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await contentService.searchContent(query, category);
      if (response.success && response.data) {
        setResults(response.data);
      } else {
        setError(response.error || 'Error searching content');
        setResults([]);
      }
    } catch (err) {
      setError('Error searching content');
      setResults([]);
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return { results, loading, error, search, clearSearch };
};

// Hook for content interactions
export const useContentInteractions = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const recordInteraction = useCallback(async (
    contentId: string, 
    type: 'like' | 'save' | 'share' | 'view' | 'complete',
    timeSpent?: number,
    score?: number
  ) => {
    if (!user) return;

    try {
      setLoading(true);
      await contentService.recordInteraction(user.id, contentId, type, timeSpent, score);
    } catch (error) {
      console.error('Interaction error:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateProgress = useCallback(async (
    contentId: string, 
    timeSpent: number, 
    completed: boolean = false,
    score?: number
  ) => {
    if (!user) return;

    try {
      setLoading(true);
      const type = completed ? 'complete' : 'view';
      await contentService.recordInteraction(user.id, contentId, type, timeSpent, score);
    } catch (error) {
      console.error('Progress update error:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { recordInteraction, updateProgress, loading };
};