import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Card, Icon } from '../../components/ui';
import { useExploreContent, useFeaturedContent, EXPLORE_CATEGORIES } from '../../hooks/useExploreContent';
import { useContentSearch } from '../../hooks/useContent';

export const ExploreScreen: React.FC = () => {
  const { theme } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { 
    categories, 
    categoryContent, 
    loading: exploreLoading,
    loadCategoryContent 
  } = useExploreContent();
  
  const { featuredContent } = useFeaturedContent();
  const { results: searchResults, loading: searchLoading, search } = useContentSearch();

  // Handle search
  React.useEffect(() => {
    if (searchQuery) {
      const timeoutId = setTimeout(() => {
        search(searchQuery, selectedCategory || undefined);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, selectedCategory, search]);

  // Get content to display
  const getDisplayContent = () => {
    if (searchQuery) {
      return searchResults;
    }
    if (selectedCategory) {
      return categoryContent[selectedCategory] || [];
    }
    return featuredContent;
  };

  const displayContent = getDisplayContent();
  const isLoading = exploreLoading || searchLoading;

  const CategoryCard = ({ category }: { category: any }) => {
    const isSelected = selectedCategory === category.id;
    
    const handleCategoryPress = async () => {
      const newCategory = isSelected ? null : category.id;
      setSelectedCategory(newCategory);
      
      if (newCategory && !categoryContent[newCategory]) {
        await loadCategoryContent(newCategory);
      }
    };
    
    return (
      <TouchableOpacity
        style={[
          styles.categoryCard,
          {
            backgroundColor: isSelected ? category.color : theme.colors.card,
            borderColor: category.color,
            borderWidth: isSelected ? 0 : 1,
          }
        ]}
        onPress={handleCategoryPress}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 32 }}>{category.icon}</Text>
        <Text
          style={[
            styles.categoryCardTitle,
            { color: isSelected ? '#fff' : theme.colors.text }
          ]}
        >
          {category.name}
        </Text>
        <Text
          style={[
            styles.categoryCardDescription,
            { color: isSelected ? 'rgba(255,255,255,0.8)' : theme.colors.textSecondary }
          ]}
        >
          {category.description}
        </Text>
        {category.content_count > 0 && (
          <Text
            style={[
              styles.contentCount,
              { color: isSelected ? 'rgba(255,255,255,0.9)' : theme.colors.textSecondary }
            ]}
          >
            {category.content_count} contenidos
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const CardPreview = ({ card }: { card: any }) => {
    const categoryInfo = categories.find(cat => cat.id === card.category);
    
    return (
      <TouchableOpacity style={styles.cardPreview} activeOpacity={0.8}>
        <Card style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <View
              style={[
                styles.previewCategoryBadge,
                { backgroundColor: categoryInfo?.color || theme.colors.primary }
              ]}
            >
              <Text style={styles.previewCategoryText}>
                {categoryInfo?.name || card.category}
              </Text>
            </View>
            <Text style={[styles.previewDifficulty, { color: theme.colors.textSecondary }]}>
              {card.difficulty?.toUpperCase()}
            </Text>
          </View>
          
          <Text style={[styles.previewTitle, { color: theme.colors.text }]} numberOfLines={2}>
            {card.title}
          </Text>
          
          <Text style={[styles.previewDescription, { color: theme.colors.textSecondary }]} numberOfLines={3}>
            {card.description}
          </Text>
          
          <View style={styles.previewFooter}>
            <View style={styles.previewTags}>
              {card.tags?.slice(0, 2).map((tag: string, index: number) => (
                <Text key={index} style={[styles.previewTag, { color: theme.colors.primary }]}>
                  #{tag}
                </Text>
              ))}
            </View>
            <Text style={[styles.previewPoints, { color: theme.colors.primary }]}>
              +{card.points_reward || card.points || 0} pts
            </Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderCard = ({ item }: { item: any }) => (
    <CardPreview card={item} />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
          <Icon name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Buscar contenido cultural..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        {(selectedCategory || searchQuery) && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setSelectedCategory(null);
              setSearchQuery('');
            }}
          >
            <Icon name="close" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Categories */}
        {!searchQuery && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Explorar Categorías
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContainer}
            >
              {categories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Results */}
        <View style={styles.section}>
          <View style={styles.resultsHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {selectedCategory
                ? `${categories.find(c => c.id === selectedCategory)?.name}`
                : searchQuery
                ? `Resultados para "${searchQuery}"`
                : 'Contenido Destacado'
              }
            </Text>
            <Text style={[styles.resultsCount, { color: theme.colors.textSecondary }]}>
              {displayContent.length} contenidos
            </Text>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Cargando contenido...
              </Text>
            </View>
          ) : (
            <FlatList
              data={displayContent}
              renderItem={renderCard}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.row}
              scrollEnabled={false}
              contentContainerStyle={styles.cardsList}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  clearButton: {
    padding: 8,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  categoriesContainer: {
    paddingHorizontal: 4,
    gap: 16,
  },
  categoryCard: {
    width: 160,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  categoryCardDescription: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsCount: {
    fontSize: 14,
  },
  row: {
    justifyContent: 'space-between',
  },
  cardsList: {
    gap: 16,
  },
  cardPreview: {
    flex: 1,
    maxWidth: '48%',
  },
  previewCard: {
    padding: 16,
    height: 200,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  previewCategoryText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  previewDifficulty: {
    fontSize: 10,
    fontWeight: '600',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 18,
  },
  previewDescription: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  previewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 12,
  },
  previewTags: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  previewTag: {
    fontSize: 10,
    fontWeight: '500',
  },
  previewPoints: {
    fontSize: 12,
    fontWeight: '700',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  contentCount: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
});