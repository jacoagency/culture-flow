import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../contexts/AuthContext';
import { contentService, ContentItem } from '../../services/supabaseContent';
import { useContentInteractions } from '../../hooks/useContent';
import { Card, Icon } from '../../components/ui';

type RouteParams = {
  'content-detail': {
    contentId: string;
    content?: ContentItem;
  };
};

export const ContentDetailScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'content-detail'>>();
  
  const { contentId, content: initialContent } = route.params;
  const [content, setContent] = useState<ContentItem | null>(initialContent || null);
  const [loading, setLoading] = useState(!initialContent);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [startTime] = useState(Date.now());

  const { recordInteraction, updateProgress } = useContentInteractions();

  useEffect(() => {
    if (!initialContent) {
      loadContent();
    }
    
    // Record view interaction
    if (user && contentId) {
      recordInteraction(contentId, 'view').catch(console.error);
    }
    
    // Cleanup function to record time spent
    return () => {
      if (user && contentId) {
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        updateProgress(contentId, timeSpent).catch(console.error);
      }
    };
  }, []);

  const loadContent = async () => {
    try {
      setLoading(true);
      const response = await contentService.getContentById(contentId);
      if (response.success && response.data) {
        setContent(response.data);
      } else {
        Alert.alert('Error', 'No se pudo cargar el contenido');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading content:', error);
      Alert.alert('Error', 'No se pudo cargar el contenido');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user || !content) return;
    
    try {
      await recordInteraction(content.id, 'like');
      setLiked(!liked);
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const handleSave = async () => {
    if (!user || !content) return;
    
    try {
      await recordInteraction(content.id, 'save');
      setSaved(!saved);
      Alert.alert('Guardado', 'Contenido guardado en tu colección');
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  const handleComplete = async () => {
    if (!user || !content) return;
    
    try {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      await recordInteraction(content.id, 'complete', timeSpent, 100);
      Alert.alert(
        '¡Completado!', 
        `Has ganado ${content.points_reward || content.points || 10} puntos`,
        [{ text: 'Continuar', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Complete error:', error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loading, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
          Cargando contenido...
        </Text>
      </View>
    );
  }

  if (!content) {
    return (
      <View style={[styles.container, styles.loading, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.text }]}>
          Contenido no encontrado
        </Text>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header Image */}
      {(content.image_url || content.multimedia?.[0]?.url) && (
        <Image
          source={{ uri: content.image_url || content.multimedia?.[0]?.url }}
          style={styles.headerImage}
          resizeMode="cover"
        />
      )}

      {/* Content */}
      <View style={styles.contentContainer}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {content.title}
        </Text>

        <View style={styles.metadata}>
          <View style={[styles.badge, { backgroundColor: theme.colors.primary + '20' }]}>
            <Text style={[styles.badgeText, { color: theme.colors.primary }]}>
              {content.category}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: theme.colors.accent + '20' }]}>
            <Text style={[styles.badgeText, { color: theme.colors.accent }]}>
              {content.difficulty}
            </Text>
          </View>
          <Text style={[styles.duration, { color: theme.colors.textSecondary }]}>
            {content.estimated_time || content.duration_minutes || 5} min
          </Text>
        </View>

        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          {content.description}
        </Text>

        <Text style={[styles.content, { color: theme.colors.text }]}>
          {content.content || 'Explora este fascinante tema cultural y aprende sobre sus orígenes, tradiciones y su impacto en la sociedad actual.'}
        </Text>

        {/* Facts */}
        {content.facts && content.facts.length > 0 && (
          <Card style={styles.factsCard}>
            <Text style={[styles.factsTitle, { color: theme.colors.text }]}>
              Datos Interesantes
            </Text>
            {content.facts.map((fact, index) => (
              <View key={index} style={styles.factItem}>
                <Text style={[styles.factBullet, { color: theme.colors.primary }]}>•</Text>
                <Text style={[styles.factText, { color: theme.colors.text }]}>
                  {fact}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: liked ? theme.colors.primary : theme.colors.card }]}
            onPress={handleLike}
          >
            <Icon name={liked ? "heart" : "heart-outline"} size={24} color={liked ? 'white' : theme.colors.primary} />
            <Text style={[styles.actionButtonText, { color: liked ? 'white' : theme.colors.primary }]}>
              {liked ? 'Te gusta' : 'Me gusta'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: saved ? theme.colors.accent : theme.colors.card }]}
            onPress={handleSave}
          >
            <Icon name={saved ? "bookmark" : "bookmark-outline"} size={24} color={saved ? 'white' : theme.colors.accent} />
            <Text style={[styles.actionButtonText, { color: saved ? 'white' : theme.colors.accent }]}>
              {saved ? 'Guardado' : 'Guardar'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Complete Button */}
        <TouchableOpacity
          style={[styles.completeButton, { backgroundColor: theme.colors.success }]}
          onPress={handleComplete}
        >
          <Text style={styles.completeButtonText}>
            Completar (+{content.points_reward || content.points || 10} puntos)
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerImage: {
    width: '100%',
    height: 250,
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    lineHeight: 32,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  duration: {
    fontSize: 14,
    fontWeight: '500',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  content: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 24,
  },
  factsCard: {
    marginBottom: 24,
    padding: 16,
  },
  factsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  factItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  factBullet: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 2,
  },
  factText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  completeButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});