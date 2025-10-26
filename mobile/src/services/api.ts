import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Update this with your Replit URL
const API_URL = 'https://2b38394c-a6cf-4e62-beaa-a0a84cbdfc59-00-2sqz7qoqe2kh7.sisko.replit.dev';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const apiClient = {
  // Auth
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  signup: (email: string, password: string, username: string) =>
    api.post('/api/auth/signup', { email, password, username }),
  getUser: () => api.get('/api/user'),

  // Tasks
  getTasks: () => api.get('/api/tasks'),
  updateTask: (id: string, data: any) => api.patch(`/api/tasks/${id}`, data),
  deleteTask: (id: string) => api.delete(`/api/tasks/${id}`),

  // Activities
  getActivities: () => api.get('/api/activities'),
  getActivity: (id: string) => api.get(`/api/activities/${id}`),
  createActivity: (data: any) => api.post('/api/activities', data),
  updateActivity: (id: string, data: any) => api.patch(`/api/activities/${id}`, data),
  deleteActivity: (id: string) => api.delete(`/api/activities/${id}`),

  // Planning
  startConversation: (data: any) => api.post('/api/chat/start', data),
  sendMessage: (sessionId: string, message: string) =>
    api.post('/api/chat/message', { sessionId, message }),

  // Journal
  getJournal: () => api.get('/api/journal'),
  createJournalEntry: (data: any) => api.post('/api/journal/smart-entry', data),
  uploadMedia: (formData: FormData) =>
    api.post('/api/journal/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Progress
  getProgress: () => api.get('/api/progress'),
};

export default api;
