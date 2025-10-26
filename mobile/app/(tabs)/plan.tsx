import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { apiClient } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';

export default function PlanningScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const [mode, setMode] = useState<'quick' | 'smart' | null>(null);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const startPlanning = async (planMode: 'quick' | 'smart') => {
    setMode(planMode);
    setMessages([
      {
        role: 'assistant',
        content: `Great! Let's create a ${planMode === 'smart' ? 'comprehensive' : 'quick'} plan. What would you like to plan?`,
      },
    ]);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      if (!sessionId) {
        const response = await apiClient.startConversation({
          initialMessage: userMessage,
          planType: mode,
        });
        setSessionId(response.data.sessionId);
        setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
      } else {
        const response = await apiClient.sendMessage(sessionId, userMessage);
        setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!mode) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.modeSelection}>
          <Text style={[styles.title, { color: colors.text }]}>Choose Your Planning Mode</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Select how you want to create your plan
          </Text>

          <TouchableOpacity
            style={[styles.modeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => startPlanning('quick')}
          >
            <Text style={styles.modeIcon}>⚡</Text>
            <Text style={[styles.modeTitle, { color: colors.text }]}>Quick Plan</Text>
            <Text style={[styles.modeDescription, { color: colors.textSecondary }]}>
              Fast planning with 5 essential questions. Perfect when you're short on time.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => startPlanning('smart')}
          >
            <Text style={styles.modeIcon}>🎯</Text>
            <Text style={[styles.modeTitle, { color: colors.text }]}>Smart Plan</Text>
            <Text style={[styles.modeDescription, { color: colors.textSecondary }]}>
              Comprehensive planning with live updates, web search, and detailed recommendations.
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map((message, index) => (
          <View
            key={index}
            style={[
              styles.messageBubble,
              message.role === 'user'
                ? { backgroundColor: colors.primary, alignSelf: 'flex-end' }
                : { backgroundColor: colors.card, alignSelf: 'flex-start', borderColor: colors.border, borderWidth: 1 },
            ]}
          >
            <Text style={[
              styles.messageText,
              { color: message.role === 'user' ? '#fff' : colors.text },
            ]}>
              {message.content}
            </Text>
          </View>
        ))}
        {loading && (
          <View style={[styles.loadingBubble, { backgroundColor: colors.card }]}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </ScrollView>

      <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
          value={input}
          onChangeText={setInput}
          placeholder="Type your message..."
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: input.trim() ? colors.primary : colors.border }]}
          onPress={sendMessage}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modeSelection: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
  },
  modeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  modeIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  modeTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  modeDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  loadingBubble: {
    padding: 16,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
