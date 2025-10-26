import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { apiClient } from '../../src/services/api';
import { User, Progress } from '../../src/types';
import { Colors } from '../../src/constants/colors';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const [user, setUser] = useState<User | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(colorScheme === 'dark');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userRes, progressRes] = await Promise.all([
        apiClient.getUser(),
        apiClient.getProgress(),
      ]);
      setUser(userRes.data);
      setProgress(progressRes.data);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('authToken');
            router.replace('/auth');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {user?.username.substring(0, 2).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={[styles.username, { color: colors.text }]}>
          {user?.username || 'Guest'}
        </Text>
        {user?.email && (
          <Text style={[styles.email, { color: colors.textSecondary }]}>
            {user.email}
          </Text>
        )}
      </View>

      {progress && (
        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statsTitle, { color: colors.text }]}>Your Progress</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {progress.completedToday}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Completed Today
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.secondary }]}>
                {progress.weeklyStreak}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Week Streak
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.warning }]}>
                {progress.monthlyTotal}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                This Month
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
        
        <View style={[styles.settingItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.settingLabel, { color: colors.text }]}>Notifications</Text>
          <Text style={[styles.settingValue, { color: colors.textSecondary }]}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.settingLabel, { color: colors.text }]}>Priorities</Text>
          <Text style={[styles.settingValue, { color: colors.textSecondary }]}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.actionButtonText, { color: colors.text }]}>About JournalMate</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.actionButtonText, { color: colors.text }]}>Help & Support</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.error + '15', borderColor: colors.error }]}
          onPress={handleLogout}
        >
          <Text style={[styles.actionButtonText, { color: colors.error }]}>Logout</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.version, { color: colors.textSecondary }]}>
        Version 1.0.0
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
  },
  statsCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 15,
  },
  actionButton: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginVertical: 24,
  },
});
