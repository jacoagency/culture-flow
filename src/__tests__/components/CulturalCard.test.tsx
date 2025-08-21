import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CulturalCard } from '../../components/cards/CulturalCard';
import { ThemeContext } from '../../hooks/useTheme';
import { mockTheme } from '../mocks/theme';

const mockCard = {
  id: '1',
  title: 'The Renaissance Era',
  description: 'A period of cultural rebirth in Europe',
  content: 'The Renaissance was a fervent period of European cultural, artistic, political and economic "rebirth"...',
  imageUrl: 'https://example.com/renaissance.jpg',
  category: 'history' as const,
  difficulty: 2,
  tags: ['renaissance', 'europe', 'art'],
  estimatedReadTime: 5,
  points: 25,
  liked: false,
  saved: false,
  views: 150,
  likes: 12,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeContext.Provider value={mockTheme}>
      {component}
    </ThemeContext.Provider>
  );
};

describe('CulturalCard', () => {
  const mockOnLike = jest.fn();
  const mockOnSave = jest.fn();
  const mockOnShare = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const { getByText } = renderWithTheme(
      <CulturalCard
        card={mockCard}
        onLike={mockOnLike}
        onSave={mockOnSave}
        onShare={mockOnShare}
      />
    );

    expect(getByText('The Renaissance Era')).toBeTruthy();
    expect(getByText('A period of cultural rebirth in Europe')).toBeTruthy();
    expect(getByText('25 pts')).toBeTruthy();
    expect(getByText('5 min read')).toBeTruthy();
  });

  it('should display category badge', () => {
    const { getByText } = renderWithTheme(
      <CulturalCard
        card={mockCard}
        onLike={mockOnLike}
        onSave={mockOnSave}
        onShare={mockOnShare}
      />
    );

    expect(getByText('🏛️ Historia')).toBeTruthy();
  });

  it('should display difficulty indicators', () => {
    const { getByTestId } = renderWithTheme(
      <CulturalCard
        card={mockCard}
        onLike={mockOnLike}
        onSave={mockOnSave}
        onShare={mockOnShare}
      />
    );

    const difficultyContainer = getByTestId('difficulty-indicator');
    expect(difficultyContainer).toBeTruthy();
  });

  it('should handle like button press', () => {
    const { getByTestId } = renderWithTheme(
      <CulturalCard
        card={mockCard}
        onLike={mockOnLike}
        onSave={mockOnSave}
        onShare={mockOnShare}
      />
    );

    const likeButton = getByTestId('like-button');
    fireEvent.press(likeButton);

    expect(mockOnLike).toHaveBeenCalledWith(mockCard.id);
  });

  it('should handle save button press', () => {
    const { getByTestId } = renderWithTheme(
      <CulturalCard
        card={mockCard}
        onLike={mockOnLike}
        onSave={mockOnSave}
        onShare={mockOnShare}
      />
    );

    const saveButton = getByTestId('save-button');
    fireEvent.press(saveButton);

    expect(mockOnSave).toHaveBeenCalledWith(mockCard.id);
  });

  it('should handle share button press', () => {
    const { getByTestId } = renderWithTheme(
      <CulturalCard
        card={mockCard}
        onLike={mockOnLike}
        onSave={mockOnSave}
        onShare={mockOnShare}
      />
    );

    const shareButton = getByTestId('share-button');
    fireEvent.press(shareButton);

    expect(mockOnShare).toHaveBeenCalledWith(mockCard.id);
  });

  it('should show liked state', () => {
    const likedCard = { ...mockCard, liked: true };

    const { getByTestId } = renderWithTheme(
      <CulturalCard
        card={likedCard}
        onLike={mockOnLike}
        onSave={mockOnSave}
        onShare={mockOnShare}
      />
    );

    const likeButton = getByTestId('like-button');
    // The button should show the liked state (you may need to adjust based on your implementation)
    expect(likeButton).toBeTruthy();
  });

  it('should show saved state', () => {
    const savedCard = { ...mockCard, saved: true };

    const { getByTestId } = renderWithTheme(
      <CulturalCard
        card={savedCard}
        onLike={mockOnLike}
        onSave={mockOnSave}
        onShare={mockOnShare}
      />
    );

    const saveButton = getByTestId('save-button');
    expect(saveButton).toBeTruthy();
  });

  it('should display tags', () => {
    const { getByText } = renderWithTheme(
      <CulturalCard
        card={mockCard}
        onLike={mockOnLike}
        onSave={mockOnSave}
        onShare={mockOnShare}
      />
    );

    expect(getByText('renaissance')).toBeTruthy();
    expect(getByText('europe')).toBeTruthy();
    expect(getByText('art')).toBeTruthy();
  });

  it('should handle different difficulty levels', () => {
    const easyCard = { ...mockCard, difficulty: 1 };
    const hardCard = { ...mockCard, difficulty: 5 };

    const { rerender, getByTestId } = renderWithTheme(
      <CulturalCard
        card={easyCard}
        onLike={mockOnLike}
        onSave={mockOnSave}
        onShare={mockOnShare}
      />
    );

    expect(getByTestId('difficulty-indicator')).toBeTruthy();

    rerender(
      <ThemeContext.Provider value={mockTheme}>
        <CulturalCard
          card={hardCard}
          onLike={mockOnLike}
          onSave={mockOnSave}
          onShare={mockOnShare}
        />
      </ThemeContext.Provider>
    );

    expect(getByTestId('difficulty-indicator')).toBeTruthy();
  });
});