import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useContent } from '../../hooks/useContent';
import { apiClient } from '../../services/api';

// Mock the API client
jest.mock('../../services/api');

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('useContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch content on initial load', async () => {
    const mockContent = [
      { id: '1', title: 'Test Content 1', category: 'history' },
      { id: '2', title: 'Test Content 2', category: 'art' },
    ];

    mockApiClient.getFeed.mockResolvedValueOnce({
      success: true,
      data: mockContent,
    });

    const { result } = renderHook(() => useContent());

    // Wait for the initial load to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.content).toEqual(mockContent);
    expect(result.current.error).toBeNull();
    expect(result.current.hasMore).toBe(true);
  });

  it('should handle loading more content', async () => {
    const initialContent = [
      { id: '1', title: 'Content 1', category: 'history' },
    ];
    const moreContent = [
      { id: '2', title: 'Content 2', category: 'art' },
    ];

    mockApiClient.getFeed
      .mockResolvedValueOnce({
        success: true,
        data: initialContent,
      })
      .mockResolvedValueOnce({
        success: true,
        data: moreContent,
      });

    const { result } = renderHook(() => useContent());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.content).toHaveLength(1);

    // Load more
    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.content).toHaveLength(2);
    expect(result.current.content).toEqual([...initialContent, ...moreContent]);
  });

  it('should handle category filtering', async () => {
    const historyContent = [
      { id: '1', title: 'History Content', category: 'history' },
    ];

    mockApiClient.getContentByCategory.mockResolvedValueOnce({
      success: true,
      data: historyContent,
    });

    const { result } = renderHook(() => useContent({ category: 'history' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.content).toEqual(historyContent);
    expect(mockApiClient.getContentByCategory).toHaveBeenCalledWith('history', 1);
  });

  it('should handle refresh', async () => {
    const initialContent = [
      { id: '1', title: 'Content 1', category: 'history' },
    ];
    const refreshedContent = [
      { id: '2', title: 'New Content', category: 'art' },
    ];

    mockApiClient.getFeed
      .mockResolvedValueOnce({
        success: true,
        data: initialContent,
      })
      .mockResolvedValueOnce({
        success: true,
        data: refreshedContent,
      });

    const { result } = renderHook(() => useContent());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.content).toEqual(initialContent);

    // Refresh
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.content).toEqual(refreshedContent);
  });

  it('should handle errors', async () => {
    const errorMessage = 'Failed to load content';

    mockApiClient.getFeed.mockResolvedValueOnce({
      success: false,
      error: errorMessage,
    });

    const { result } = renderHook(() => useContent());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.content).toEqual([]);
  });

  it('should not load more when no more content available', async () => {
    const content = Array.from({ length: 5 }, (_, i) => ({
      id: `${i + 1}`,
      title: `Content ${i + 1}`,
      category: 'history',
    }));

    mockApiClient.getFeed.mockResolvedValueOnce({
      success: true,
      data: content,
    });

    const { result } = renderHook(() => useContent());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Less than 20 items means no more content
    expect(result.current.hasMore).toBe(false);

    // Trying to load more should not make additional API calls
    await act(async () => {
      await result.current.loadMore();
    });

    expect(mockApiClient.getFeed).toHaveBeenCalledTimes(1);
  });
});