import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useTheme } from '../../hooks/useTheme';
import { Card, Icon } from '../ui';
import { CulturalCard as CulturalCardType } from '../../types';
import { categoryColors } from '../../theme/colors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_HEIGHT = screenHeight * 0.75;

interface CulturalCardProps {
  card: CulturalCardType;
  onLike: (cardId: string) => void;
  onSave: (cardId: string) => void;
  onPress?: (card: CulturalCardType) => void;
  onNext: () => void;
  isVisible: boolean;
}

export const CulturalCard: React.FC<CulturalCardProps> = ({
  card,
  onLike,
  onSave,
  onPress,
  onNext,
  isVisible,
}) => {
  const { theme } = useTheme();
  const [showFullContent, setShowFullContent] = useState(false);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(isVisible ? 1 : 0.9);
  const opacity = useSharedValue(isVisible ? 1 : 0.8);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      scale.value = withSpring(1.05);
    },
    onActive: (event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    },
    onEnd: (event) => {
      const shouldSwipeNext = Math.abs(event.translationY) > 150 && event.velocityY < -500;
      
      if (shouldSwipeNext) {
        translateY.value = withSpring(-screenHeight);
        runOnJS(onNext)();
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
      scale.value = withSpring(1);
    },
  });

  const animatedCardStyle = useAnimatedStyle(() => {
    const rotateZ = interpolate(
      translateX.value,
      [-screenWidth / 2, 0, screenWidth / 2],
      [-10, 0, 10]
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
        { rotateZ: `${rotateZ}deg` },
      ],
      opacity: opacity.value,
    };
  });

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${card.title}\n\n${card.description}\n\nAprende más en CulturaFlow!`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const categoryColor = categoryColors[card.category.id as keyof typeof categoryColors] || theme.colors.primary;

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.container, animatedCardStyle]}>
        <Card style={styles.card} shadow>
          {/* Header with category */}
          <View style={styles.header}>
            <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
              <Icon name={card.category.icon as any} size={16} color="#fff" />
              <Text style={styles.categoryText}>{card.category.name}</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onSave(card.id)}
              >
                <Icon
                  name={card.saved ? 'bookmark' : 'bookmark-outline'}
                  size={20}
                  color={card.saved ? theme.colors.warning : theme.colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                <Icon name="share-outline" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Image */}
          {card.imageUrl && (
            <View style={styles.imageContainer}>
              <Image source={{ uri: card.imageUrl }} style={styles.image} />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.3)']}
                style={styles.imageOverlay}
              />
            </View>
          )}

          {/* Content - Clickeable */}
          <TouchableOpacity 
            style={styles.content}
            onPress={() => onPress?.(card)}
            activeOpacity={0.8}
          >
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {card.title}
            </Text>
            
            <Text
              style={[styles.description, { color: theme.colors.textSecondary }]}
              numberOfLines={showFullContent ? undefined : 3}
            >
              {card.description}
            </Text>

            {card.description.length > 150 && (
              <TouchableOpacity
                onPress={() => setShowFullContent(!showFullContent)}
                style={styles.readMoreButton}
              >
                <Text style={[styles.readMoreText, { color: theme.colors.primary }]}>
                  {showFullContent ? 'Ver menos' : 'Leer más'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Content body */}
            {showFullContent && (
              <Text style={[styles.contentText, { color: theme.colors.text }]}>
                {card.content}
              </Text>
            )}

            {/* Tags */}
            <View style={styles.tagsContainer}>
              {card.tags.slice(0, 3).map((tag, index) => (
                <View
                  key={index}
                  style={[styles.tag, { backgroundColor: theme.colors.surface }]}
                >
                  <Text style={[styles.tagText, { color: theme.colors.textSecondary }]}>
                    #{tag}
                  </Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerInfo}>
              <Text style={[styles.difficulty, { color: categoryColor }]}>
                {card.difficulty.toUpperCase()}
              </Text>
              <Text style={[styles.readTime, { color: theme.colors.textSecondary }]}>
                {card.timeToRead} min lectura
              </Text>
              <Text style={[styles.points, { color: theme.colors.primary }]}>
                +{card.points} pts
              </Text>
            </View>
            
            <TouchableOpacity
              style={[styles.likeButton, { backgroundColor: theme.colors.surface }]}
              onPress={() => onLike(card.id)}
            >
              <Icon
                name={card.liked ? 'heart' : 'heart-outline'}
                size={24}
                color={card.liked ? theme.colors.error : theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Swipe indicator */}
          <View style={styles.swipeIndicator}>
            <Icon name="chevron-up" size={20} color={theme.colors.textSecondary} />
            <Text style={[styles.swipeText, { color: theme.colors.textSecondary }]}>
              Desliza hacia arriba
            </Text>
          </View>
        </Card>
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: screenWidth - 32,
    height: CARD_HEIGHT,
    alignSelf: 'center',
  },
  card: {
    flex: 1,
    padding: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  imageContainer: {
    height: 200,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    lineHeight: 28,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 8,
  },
  readMoreButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  contentText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 'auto',
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  difficulty: {
    fontSize: 12,
    fontWeight: '700',
  },
  readTime: {
    fontSize: 12,
  },
  points: {
    fontSize: 14,
    fontWeight: '600',
  },
  likeButton: {
    padding: 8,
    borderRadius: 20,
  },
  swipeIndicator: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 4,
  },
  swipeText: {
    fontSize: 12,
    fontWeight: '500',
  },
});