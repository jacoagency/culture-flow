import { useState, useEffect, useCallback } from 'react';
import { contentService, ContentItem } from '../services/supabaseContent';

export interface ExploreCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  content_count: number;
}

// Static categories for the Explore screen
export const EXPLORE_CATEGORIES: ExploreCategory[] = [
  {
    id: 'arte',
    name: 'Arte y Arquitectura',
    description: 'Descubre obras maestras, artistas famosos y estilos arquitectónicos',
    icon: '🎨',
    color: '#FF6B6B',
    content_count: 0
  },
  {
    id: 'historia',
    name: 'Historia',
    description: 'Explora eventos históricos, personajes y civilizaciones',
    icon: '🏛️',
    color: '#4ECDC4',
    content_count: 0
  },
  {
    id: 'musica',
    name: 'Música',
    description: 'Géneros musicales, compositores y tradiciones sonoras',
    icon: '🎵',
    color: '#45B7D1',
    content_count: 0
  },
  {
    id: 'literatura',
    name: 'Literatura',
    description: 'Autores, obras clásicas y movimientos literarios',
    icon: '📚',
    color: '#96CEB4',
    content_count: 0
  },
  {
    id: 'gastronomia',
    name: 'Gastronomía',
    description: 'Platos típicos, tradiciones culinarias y cultura alimentaria',
    icon: '🍽️',
    color: '#FFEAA7',
    content_count: 0
  },
  {
    id: 'tradiciones',
    name: 'Tradiciones',
    description: 'Festivales, costumbres y celebraciones culturales',
    icon: '🎭',
    color: '#DDA0DD',
    content_count: 0
  },
  {
    id: 'ciencia',
    name: 'Ciencia y Tecnología',
    description: 'Descubrimientos científicos con contexto cultural',
    icon: '🔬',
    color: '#74B9FF',
    content_count: 0
  },
  {
    id: 'geografia',
    name: 'Geografía Cultural',
    description: 'Lugares emblemáticos, paisajes y sitios históricos',
    icon: '🗺️',
    color: '#A29BFE',
    content_count: 0
  }
];

interface UseExploreContentResult {
  categories: ExploreCategory[];
  categoryContent: { [key: string]: ContentItem[] };
  loading: boolean;
  error: string | null;
  loadCategoryContent: (categoryId: string) => Promise<void>;
  refreshCategory: (categoryId: string) => Promise<void>;
}

export const useExploreContent = (): UseExploreContentResult => {
  const [categories, setCategories] = useState<ExploreCategory[]>(EXPLORE_CATEGORIES);
  const [categoryContent, setCategoryContent] = useState<{ [key: string]: ContentItem[] }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load content for a specific category
  const loadCategoryContent = useCallback(async (categoryId: string) => {
    if (categoryContent[categoryId] && categoryContent[categoryId].length > 0) {
      return; // Already loaded
    }

    setLoading(true);
    setError(null);

    try {
      const response = await contentService.getContentByCategory(categoryId, 1, 12);
      if (response.success && response.data) {
        setCategoryContent(prev => ({
          ...prev,
          [categoryId]: response.data
        }));

        // Update category content count
        setCategories(prev => prev.map(cat => 
          cat.id === categoryId 
            ? { ...cat, content_count: response.data.length }
            : cat
        ));
      } else {
        setError(response.error || 'Error loading category content');
      }
    } catch (err) {
      setError('Error loading category content');
      console.error('Category content loading error:', err);
    } finally {
      setLoading(false);
    }
  }, [categoryContent]);

  // Refresh content for a specific category
  const refreshCategory = useCallback(async (categoryId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await contentService.getContentByCategory(categoryId, 1, 12);
      if (response.success && response.data) {
        setCategoryContent(prev => ({
          ...prev,
          [categoryId]: response.data
        }));

        // Update category content count
        setCategories(prev => prev.map(cat => 
          cat.id === categoryId 
            ? { ...cat, content_count: response.data.length }
            : cat
        ));
      } else {
        setError(response.error || 'Error refreshing category content');
      }
    } catch (err) {
      setError('Error refreshing category content');
      console.error('Category refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load initial popular content for each category
  useEffect(() => {
    const loadInitialContent = async () => {
      try {
        const popularCategories = ['arte', 'historia', 'musica', 'literatura'];
        
        for (const categoryId of popularCategories) {
          await loadCategoryContent(categoryId);
        }
      } catch (error) {
        console.error('Error loading initial explore content:', error);
      }
    };

    loadInitialContent();
  }, [loadCategoryContent]);

  return {
    categories,
    categoryContent,
    loading,
    error,
    loadCategoryContent,
    refreshCategory,
  };
};

// Hook for getting featured content for the explore screen
export const useFeaturedContent = () => {
  const [featuredContent, setFeaturedContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFeaturedContent = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await contentService.getTrendingContent('24h');
      if (response.success && response.data) {
        // Take top 5 trending items as featured
        setFeaturedContent(response.data.slice(0, 5));
      } else {
        setError(response.error || 'Error loading featured content');
      }
    } catch (err) {
      setError('Error loading featured content');
      console.error('Featured content loading error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeaturedContent();
  }, [loadFeaturedContent]);

  return {
    featuredContent,
    loading,
    error,
    refresh: loadFeaturedContent,
  };
};