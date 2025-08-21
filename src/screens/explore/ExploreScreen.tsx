import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Card, Icon } from '../../components/ui';
import { categories, mockCards } from '../../data/mockData';
import { categoryColors } from '../../theme/colors';

export const ExploreScreen: React.FC = () => {
  const { theme } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCards = mockCards.filter(card => {
    const matchesCategory = !selectedCategory || card.category.id === selectedCategory;
    const matchesSearch = !searchQuery || 
      card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  const CategoryCard = ({ category }: { category: any }) => {
    const isSelected = selectedCategory === category.id;
    const categoryColor = categoryColors[category.id as keyof typeof categoryColors];
    
    return (
      <TouchableOpacity
        style={[
          styles.categoryCard,
          {
            backgroundColor: isSelected ? categoryColor : theme.colors.card,
            borderColor: categoryColor,
            borderWidth: isSelected ? 0 : 1,
          }
        ]}
        onPress={() => setSelectedCategory(isSelected ? null : category.id)}
        activeOpacity={0.8}
      >
        <Icon
          name={category.icon}
          size={32}
          color={isSelected ? '#fff' : categoryColor}
        />
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
      </TouchableOpacity>
    );
  };

  const CardPreview = ({ card }: { card: any }) => (
    <TouchableOpacity style={styles.cardPreview} activeOpacity={0.8}>
      <Card style={styles.previewCard}>
        <View style={styles.previewHeader}>
          <View
            style={[
              styles.previewCategoryBadge,
              { backgroundColor: categoryColors[card.category.id as keyof typeof categoryColors] }
            ]}
          >
            <Text style={styles.previewCategoryText}>{card.category.name}</Text>
          </View>
          <Text style={[styles.previewDifficulty, { color: theme.colors.textSecondary }]}>
            {card.difficulty.toUpperCase()}
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
            {card.tags.slice(0, 2).map((tag: string, index: number) => (
              <Text key={index} style={[styles.previewTag, { color: theme.colors.primary }]}>
                #{tag}
              </Text>
            ))}
          </View>
          <Text style={[styles.previewPoints, { color: theme.colors.primary }]}>
            +{card.points} pts
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );

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
                : 'Contenido Popular'
              }
            </Text>
            <Text style={[styles.resultsCount, { color: theme.colors.textSecondary }]}>
              {filteredCards.length} tarjetas
            </Text>
          </View>

          <FlatList
            data={filteredCards}
            renderItem={renderCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            scrollEnabled={false}
            contentContainerStyle={styles.cardsList}
          />
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
});