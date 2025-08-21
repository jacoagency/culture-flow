import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { CulturalCard } from '../../components/cards';
import { CulturalCard as CulturalCardType } from '../../types';
import { useContent, useContentInteractions } from '../../hooks/useContent';
import { useAuth } from '../../contexts/AuthContext';

const { height: screenHeight } = Dimensions.get('window');

export const FeedScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user, refreshUser } = useAuth();
  const { content, loading, error, loadMore, refresh, hasMore } = useContent();
  const { recordInteraction, updateProgress } = useContentInteractions();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleLike = useCallback(async (cardId: string) => {
    try {
      await recordInteraction(cardId, 'like');
      // Update local state optimistically
      // You could also refresh user points here if needed
      await refreshUser();
    } catch (error) {
      console.error('Like error:', error);
    }
  }, [recordInteraction, refreshUser]);

  const handleSave = useCallback(async (cardId: string) => {
    try {
      await recordInteraction(cardId, 'save');
      // Show some feedback to user
    } catch (error) {
      console.error('Save error:', error);
    }
  }, [recordInteraction]);

  const handleCardView = useCallback(async (cardId: string, timeSpent: number) => {
    try {
      await recordInteraction(cardId, 'view');
      await updateProgress(cardId, timeSpent);
    } catch (error) {
      console.error('View tracking error:', error);
    }
  }, [recordInteraction, updateProgress]);

  const handleNext = useCallback(() => {
    if (currentIndex < content.length - 1) {
      setCurrentIndex(prevIndex => prevIndex + 1);
    } else if (hasMore) {
      // Load more cards from backend
      loadMore();
    }
  }, [currentIndex, content.length, hasMore, loadMore]);

  // Render current and next card for smooth transitions
  const visibleCards = [
    content[currentIndex],
    content[currentIndex + 1],
  ].filter(Boolean);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      
      {visibleCards.map((card, index) => (
        <CulturalCard
          key={`${card.id}-${index}`}
          card={card}
          onLike={handleLike}
          onSave={handleSave}
          onNext={handleNext}
          isVisible={index === 0}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: StatusBar.currentHeight || 44,
    justifyContent: 'center',
  },
});