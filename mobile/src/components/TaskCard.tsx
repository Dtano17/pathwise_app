import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { apiClient } from '../services/api';
import { Task } from '../types';

interface TaskCardProps {
  task: Task;
  onUpdate: () => void;
  colors: any;
}

export default function TaskCard({ task, onUpdate, colors }: TaskCardProps) {
  const [pan] = useState(new Animated.ValueXY());
  const [opacity] = useState(new Animated.Value(1));

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      // Only allow horizontal swipes
      pan.setValue({ x: gesture.dx, y: 0 });
      
      // Update opacity based on swipe distance
      const absX = Math.abs(gesture.dx);
      opacity.setValue(1 - absX / 300);
    },
    onPanResponderRelease: async (_, gesture) => {
      const swipeThreshold = 120;

      if (gesture.dx > swipeThreshold) {
        // Swipe right - Complete task
        await completeTask();
      } else if (gesture.dx < -swipeThreshold) {
        // Swipe left - Skip task
        await skipTask();
      } else {
        // Reset position
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }).start();
      }
    },
  });

  const completeTask = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Animated.timing(pan, {
        toValue: { x: 400, y: 0 },
        duration: 300,
        useNativeDriver: false,
      }).start();

      await apiClient.updateTask(task.id, {
        completed: true,
        completedAt: new Date().toISOString(),
      });

      onUpdate();
    } catch (error) {
      Alert.alert('Error', 'Failed to complete task');
      resetPosition();
    }
  };

  const skipTask = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      Animated.timing(pan, {
        toValue: { x: -400, y: 0 },
        duration: 300,
        useNativeDriver: false,
      }).start();

      // For now, just refresh. You could add a "skipped" status
      setTimeout(onUpdate, 300);
    } catch (error) {
      Alert.alert('Error', 'Failed to skip task');
      resetPosition();
    }
  };

  const resetPosition = () => {
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  return (
    <View style={styles.container}>
      {/* Background indicators */}
      <View style={[styles.swipeIndicator, styles.completeIndicator, { backgroundColor: colors.success }]}>
        <Text style={styles.indicatorText}>✓ Complete</Text>
      </View>
      <View style={[styles.swipeIndicator, styles.skipIndicator, { backgroundColor: colors.warning }]}>
        <Text style={styles.indicatorText}>Skip →</Text>
      </View>

      {/* Task card */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            transform: pan.getTranslateTransform(),
            opacity,
          },
        ]}
      >
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>{task.title}</Text>
          {task.description && (
            <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
              {task.description}
            </Text>
          )}
          {task.estimatedMinutes && (
            <Text style={[styles.duration, { color: colors.textSecondary }]}>
              ⏱ {task.estimatedMinutes} min
            </Text>
          )}
        </View>
        {task.priority && (
          <View style={[
            styles.priorityBadge,
            { backgroundColor: task.priority === 'high' ? colors.error + '20' : colors.warning + '20' }
          ]}>
            <Text style={[
              styles.priorityText,
              { color: task.priority === 'high' ? colors.error : colors.warning }
            ]}>
              {task.priority}
            </Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    position: 'relative',
  },
  swipeIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    zIndex: 0,
  },
  completeIndicator: {
    left: 0,
    right: '50%',
    paddingLeft: 20,
    alignItems: 'flex-start',
  },
  skipIndicator: {
    right: 0,
    left: '50%',
    paddingRight: 20,
    alignItems: 'flex-end',
  },
  indicatorText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  content: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    marginBottom: 4,
  },
  duration: {
    fontSize: 12,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
