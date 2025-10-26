import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  useColorScheme,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { apiClient } from '../services/api';
import { Task, Activity } from '../types';
import { Colors } from '../constants/colors';
import TaskCard from '../components/TaskCard';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const [activeTab, setActiveTab] = useState<'tasks' | 'activities'>('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tasksRes, activitiesRes] = await Promise.all([
        apiClient.getTasks(),
        apiClient.getActivities(),
      ]);
      setTasks(tasksRes.data);
      setActivities(activitiesRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tab Switcher */}
      <View style={[styles.tabContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tasks' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('tasks')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'tasks' ? colors.primary : colors.textSecondary }
          ]}>
            Tasks ({tasks.filter(t => !t.completed).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'activities' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('activities')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'activities' ? colors.primary : colors.textSecondary }
          ]}>
            Activities ({activities.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'tasks' ? (
        <FlatList
          data={tasks.filter(t => !t.completed)}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TaskCard task={item} onUpdate={loadData} colors={colors} />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No pending tasks
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Create a new plan to get started!
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.activityTitle, { color: colors.text }]}>
                {item.title}
              </Text>
              {item.description && (
                <Text style={[styles.activityDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
              <View style={styles.activityFooter}>
                {item.category && (
                  <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.categoryText, { color: colors.primary }]}>
                      {item.category}
                    </Text>
                  </View>
                )}
                {item.tasks && (
                  <Text style={[styles.taskCount, { color: colors.textSecondary }]}>
                    {item.tasks.filter(t => t.completed).length}/{item.tasks.length} tasks
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No activities yet
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },
  activityCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  activityDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  activityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  taskCount: {
    fontSize: 12,
  },
});
