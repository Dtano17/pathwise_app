import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  useColorScheme,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { apiClient } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';

interface RichJournalEntry {
  id?: string;
  text: string;
  media?: Array<{
    url: string;
    type: 'image' | 'video';
    thumbnail?: string;
  }>;
  timestamp?: string;
  aiConfidence?: number;
  keywords?: string[];
}

type JournalItem = string | RichJournalEntry;

interface CustomCategory {
  id: string;
  name: string;
  color: string;
}

const CATEGORIES = [
  { id: 'restaurants', label: '🍽️ Restaurants & Food', color: '#EF4444' },
  { id: 'movies', label: '🎬 Movies & TV Shows', color: '#A855F7' },
  { id: 'music', label: '🎵 Music & Artists', color: '#3B82F6' },
  { id: 'books', label: '📚 Books & Reading', color: '#10B981' },
  { id: 'hobbies', label: '✨ Hobbies & Interests', color: '#F59E0B' },
  { id: 'travel', label: '✈️ Travel & Places', color: '#6366F1' },
  { id: 'style', label: '👗 Personal Style', color: '#EC4899' },
  { id: 'favorites', label: '⭐ Favorite Things', color: '#F59E0B' },
  { id: 'notes', label: '📝 Personal Notes', color: '#64748B' }
];

const COLOR_OPTIONS = [
  '#14B8A6',
  '#8B5CF6',
  '#EC4899',
  '#EF4444',
  '#84CC16'
];

// Helper function to get text from journal item
const getItemText = (item: JournalItem): string => {
  if (typeof item === 'string') {
    return item;
  }
  return item.text || '';
};

export default function JournalScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  
  const [activeCategory, setActiveCategory] = useState<string>('restaurants');
  const [newItem, setNewItem] = useState('');
  const [journalData, setJournalData] = useState<Record<string, JournalItem[]>>({});
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);

  useEffect(() => {
    loadJournalData();
  }, []);

  const loadJournalData = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getUserPreferences();
      const data = response.data;
      
      // Load journal data from preferences
      if (data?.preferences?.journalData) {
        setJournalData(data.preferences.journalData);
      }
      
      // Load custom categories from preferences
      if (data?.preferences?.customJournalCategories) {
        setCustomCategories(data.preferences.customJournalCategories);
      }
    } catch (error) {
      console.error('Failed to load journal:', error);
      Alert.alert('Error', 'Failed to load journal data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Merge default and custom categories
  const allCategories = [
    ...CATEGORIES,
    ...customCategories.map(c => ({
      id: c.id,
      label: `📁 ${c.name}`,
      color: c.color,
      isCustom: true
    }))
  ];

  const currentCategory = allCategories.find(c => c.id === activeCategory);
  const currentItems = journalData[activeCategory] || [];

  const saveToBackend = async (category: string, items: JournalItem[]) => {
    setSaving(true);
    try {
      await apiClient.updateJournal(category, items);
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save journal entry. Please try again.');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.trim()) return;
    
    const updatedItems = [...currentItems, newItem.trim()];
    setJournalData(prev => ({ ...prev, [activeCategory]: updatedItems }));
    setNewItem('');
    
    // Auto-save to backend
    try {
      await saveToBackend(activeCategory, updatedItems);
    } catch (error) {
      // Revert on error
      setJournalData(prev => ({ ...prev, [activeCategory]: currentItems }));
    }
  };

  const handleRemoveItem = async (index: number) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedItems = currentItems.filter((_, i) => i !== index);
            const previousItems = [...currentItems];
            
            // Optimistic update
            setJournalData(prev => ({ ...prev, [activeCategory]: updatedItems }));
            
            // Auto-save to backend
            try {
              await saveToBackend(activeCategory, updatedItems);
            } catch (error) {
              // Revert on error
              setJournalData(prev => ({ ...prev, [activeCategory]: previousItems }));
            }
          }
        }
      ]
    );
  };

  const handleAddCustomCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Name Required', 'Please enter a category name.');
      return;
    }

    const categoryId = `custom-${newCategoryName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    const newCategory: CustomCategory = {
      id: categoryId,
      name: newCategoryName.trim(),
      color: selectedColor
    };

    const updatedCategories = [...customCategories, newCategory];
    setCustomCategories(updatedCategories);
    
    // Initialize empty array for the new category
    setJournalData(prev => ({ ...prev, [categoryId]: [] }));
    
    // Save custom categories to backend
    setSaving(true);
    try {
      await apiClient.updateCustomCategories(updatedCategories);
      
      setNewCategoryName('');
      setSelectedColor(COLOR_OPTIONS[0]);
      setShowAddCategoryDialog(false);
      setActiveCategory(categoryId);
      Alert.alert('Success', 'Custom category created!');
    } catch (error) {
      console.error('Failed to save category:', error);
      // Revert on error
      setCustomCategories(customCategories);
      setJournalData(prev => {
        const newData = { ...prev };
        delete newData[categoryId];
        return newData;
      });
      Alert.alert('Error', 'Failed to create category. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Journal</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Capture what makes you unique
        </Text>
      </View>

      {/* Category Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
      >
        {allCategories.map((cat) => {
          const isActive = activeCategory === cat.id;
          const itemCount = journalData[cat.id]?.length || 0;
          
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryTab,
                {
                  backgroundColor: isActive ? cat.color : colors.card,
                  borderColor: isActive ? cat.color : colors.border,
                },
              ]}
              onPress={() => setActiveCategory(cat.id)}
            >
              <Text style={[
                styles.categoryLabel,
                { color: isActive ? '#fff' : colors.text },
              ]}>
                {cat.label}
              </Text>
              {itemCount > 0 && (
                <View style={[
                  styles.countBadge,
                  { backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : colors.primary }
                ]}>
                  <Text style={[
                    styles.countText,
                    { color: '#fff' }
                  ]}>
                    {itemCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
        
        <TouchableOpacity
          style={[styles.addCategoryButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowAddCategoryDialog(true)}
        >
          <Text style={styles.addCategoryText}>+ Add Category</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Current Category Header */}
      {currentCategory && (
        <View style={[styles.categoryHeader, { backgroundColor: currentCategory.color }]}>
          <View style={styles.categoryHeaderContent}>
            <Text style={styles.categoryHeaderTitle}>{currentCategory.label}</Text>
            <Text style={styles.categoryHeaderSubtitle}>
              {activeCategory === 'restaurants' && 'Your favorite restaurants, cuisines, and food preferences'}
              {activeCategory === 'movies' && 'Movies, shows, genres, and actors you love'}
              {activeCategory === 'music' && 'Artists, bands, genres, and playlists that move you'}
              {activeCategory === 'books' && 'Books, authors, and genres you enjoy reading'}
              {activeCategory === 'hobbies' && 'Activities and interests that bring you joy'}
              {activeCategory === 'travel' && "Places you've been or dream of visiting"}
              {activeCategory === 'style' && 'Your fashion preferences, favorite brands, and style notes'}
              {activeCategory === 'favorites' && 'Your all-time favorite things across all categories'}
              {activeCategory === 'notes' && 'Personal thoughts, memories, and things about yourself'}
              {!CATEGORIES.find(c => c.id === activeCategory) && 'Your custom journal category'}
            </Text>
          </View>
        </View>
      )}

      {/* Add New Entry */}
      <View style={[styles.inputSection, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View style={styles.inputContainer}>
          {activeCategory === 'notes' ? (
            <TextInput
              style={[styles.textArea, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
              value={newItem}
              onChangeText={setNewItem}
              placeholder="Write your thoughts here..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
            />
          ) : (
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
              value={newItem}
              onChangeText={setNewItem}
              placeholder={`Add to ${currentCategory?.label || 'this category'}...`}
              placeholderTextColor={colors.textSecondary}
              onSubmitEditing={handleAddItem}
              returnKeyType="done"
            />
          )}
        </View>
        
        <TouchableOpacity
          style={[
            styles.addButton,
            { 
              backgroundColor: currentCategory?.color || colors.primary,
              opacity: (!newItem.trim() || saving) ? 0.5 : 1 
            }
          ]}
          onPress={handleAddItem}
          disabled={!newItem.trim() || saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.addButtonText}>Add</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Items List */}
      <ScrollView style={styles.itemsList} contentContainerStyle={styles.itemsContent}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading journal...</Text>
          </View>
        ) : currentItems.length > 0 ? (
          currentItems.map((item, index) => (
            <View key={index} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.itemText, { color: colors.text }]}>
                {getItemText(item)}
              </Text>
              <TouchableOpacity
                style={[styles.removeButton, { backgroundColor: colors.error + '20' }]}
                onPress={() => handleRemoveItem(index)}
              >
                <Text style={[styles.removeButtonText, { color: colors.error }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: currentCategory?.color + '20' }]}>
              <Text style={styles.emptyIconText}>{currentCategory?.label.split(' ')[0]}</Text>
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No entries yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Start capturing your thoughts and preferences.{'\n'}This helps personalize your experience!
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Custom Category Modal */}
      <Modal
        visible={showAddCategoryDialog}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddCategoryDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Custom Category</Text>
            
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Category Name</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="e.g., Recipes, Goals, Quotes"
              placeholderTextColor={colors.textSecondary}
            />
            
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Color</Text>
            <View style={styles.colorOptions}>
              {COLOR_OPTIONS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorOptionSelected
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && (
                    <Text style={styles.colorCheckmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => {
                  setShowAddCategoryDialog(false);
                  setNewCategoryName('');
                  setSelectedColor(COLOR_OPTIONS[0]);
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  { backgroundColor: colors.primary, opacity: (!newCategoryName.trim() || saving) ? 0.5 : 1 }
                ]}
                onPress={handleAddCustomCategory}
                disabled={!newCategoryName.trim() || saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalButtonTextPrimary}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Save Indicator */}
      {saving && (
        <View style={[styles.saveIndicator, { backgroundColor: colors.card }]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.saveIndicatorText, { color: colors.textSecondary }]}>Saving...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  categoriesScroll: {
    maxHeight: 60,
  },
  categoriesContent: {
    padding: 12,
    gap: 8,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
  },
  addCategoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addCategoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  categoryHeader: {
    padding: 16,
  },
  categoryHeaderContent: {
    gap: 4,
  },
  categoryHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  categoryHeaderSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  inputSection: {
    padding: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  inputContainer: {
    flex: 1,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 15,
  },
  textArea: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 15,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  addButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  itemsList: {
    flex: 1,
  },
  itemsContent: {
    padding: 12,
    gap: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  itemCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  itemText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIconText: {
    fontSize: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 15,
  },
  colorOptions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  colorCheckmark: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  modalButtonPrimary: {
    borderWidth: 0,
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  saveIndicator: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveIndicatorText: {
    fontSize: 14,
  },
});
