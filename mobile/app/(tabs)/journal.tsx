import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiClient } from '../../src/services/api';
import { JournalEntry } from '../../src/types';
import { Colors } from '../../src/constants/colors';

const CATEGORIES = [
  { id: 'travel', label: '✈️ Travel & Places', keyword: '@travel' },
  { id: 'food', label: '🍽️ Restaurants & Food', keyword: '@restaurants' },
  { id: 'entertainment', label: '🎬 Entertainment', keyword: '@entertainment' },
  { id: 'wellness', label: '💪 Health & Wellness', keyword: '@wellness' },
  { id: 'learning', label: '📚 Learning & Growth', keyword: '@learning' },
  { id: 'social', label: '👥 Social & Relationships', keyword: '@social' },
  { id: 'work', label: '💼 Work & Career', keyword: '@work' },
  { id: 'hobbies', label: '🎨 Hobbies & Interests', keyword: '@hobbies' },
  { id: 'general', label: '📝 General', keyword: '@general' },
];

export default function JournalScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const [content, setContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [detectedKeywords, setDetectedKeywords] = useState<string[]>([]);

  useEffect(() => {
    loadEntries();
    requestPermissions();
  }, []);

  // Detect keywords as user types
  useEffect(() => {
    const keywords = (content.match(/@[\w]+/g) || []).map(k => k.toLowerCase());
    setDetectedKeywords(keywords);
  }, [content]);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos to add images to journal entries.');
    }
  };

  const loadEntries = async () => {
    try {
      const response = await apiClient.getJournal();
      setEntries(response.data);
    } catch (error) {
      console.error('Failed to load journal:', error);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImages(prev => [...prev, result.assets[0].uri]);
    }
  };

  const saveEntry = async () => {
    if (!content.trim() && images.length === 0) {
      Alert.alert('Empty entry', 'Please add some content or images');
      return;
    }

    setLoading(true);
    try {
      // Upload images first if any
      let uploadedMedia = [];
      if (images.length > 0) {
        const formData = new FormData();
        images.forEach((uri, index) => {
          formData.append('media', {
            uri,
            name: `image-${index}.jpg`,
            type: 'image/jpeg',
          } as any);
        });

        const uploadResponse = await apiClient.uploadMedia(formData);
        uploadedMedia = uploadResponse.data.media || [];
      }

      // Detect @keywords in content
      const keywords = (content.match(/@[\w]+/g) || []).map(k => k.toLowerCase());

      // Create journal entry with smart categorization
      await apiClient.createJournalEntry({
        text: content,
        media: uploadedMedia,
        keywords,
      });

      setContent('');
      setImages([]);
      setSelectedCategory(null);
      loadEntries();

      Alert.alert('Success', 'Journal entry saved!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save journal entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Journal Entry</Text>
        
        <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: selectedCategory === cat.id ? colors.primary : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={[
                styles.categoryText,
                { color: selectedCategory === cat.id ? '#fff' : colors.text },
              ]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.label, { color: colors.textSecondary }]}>What's on your mind?</Text>
        <TextInput
          style={[styles.textArea, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
          value={content}
          onChangeText={setContent}
          placeholder="Share your thoughts, experiences, or use @keywords..."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={6}
        />

        {detectedKeywords.length > 0 && (
          <View style={[styles.keywordHint, { backgroundColor: '#F3E8FF', borderColor: '#9333EA' }]}>
            <Text style={styles.keywordHintTitle}>✨ Detected Keywords:</Text>
            <View style={styles.keywordTags}>
              {detectedKeywords.map((keyword, index) => (
                <View key={index} style={[styles.keywordTag, { backgroundColor: '#9333EA' }]}>
                  <Text style={styles.keywordTagText}>{keyword}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.keywordHintText}>
              Your entry will be automatically categorized!
            </Text>
          </View>
        )}

        {images.length > 0 && (
          <View style={styles.imagesContainer}>
            {images.map((uri, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.image} />
                <TouchableOpacity
                  style={[styles.removeImage, { backgroundColor: colors.error }]}
                  onPress={() => setImages(prev => prev.filter((_, i) => i !== index))}
                >
                  <Text style={styles.removeImageText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={pickImage}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>📷 Add Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={saveEntry}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Save Entry</Text>
            )}
          </TouchableOpacity>
        </View>

        {entries.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Entries</Text>
            {entries.slice(0, 5).map((entry) => (
              <View key={entry.id} style={[styles.entryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.entryCategory, { color: colors.primary }]}>
                  {CATEGORIES.find(c => c.id === entry.category)?.label || entry.category}
                </Text>
                <Text style={[styles.entryContent, { color: colors.text }]} numberOfLines={3}>
                  {entry.content}
                </Text>
                <Text style={[styles.entryDate, { color: colors.textSecondary }]}>
                  {new Date(entry.createdAt).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  categoriesScroll: {
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  textArea: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 15,
    textAlignVertical: 'top',
    minHeight: 120,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 8,
    marginBottom: 8,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImage: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  recentSection: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  entryCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  entryCategory: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  entryContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  entryDate: {
    fontSize: 12,
  },
  keywordHint: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  keywordHintTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C3AED',
    marginBottom: 8,
  },
  keywordTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  keywordTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  keywordTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  keywordHintText: {
    fontSize: 11,
    color: '#7C3AED',
    fontStyle: 'italic',
  },
});
