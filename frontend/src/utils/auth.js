import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

const TOKEN_KEY = 'testify_token';
const USER_KEY = 'testify_user';

export const saveAuth = async (token, user) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getToken = async () => {
  return await AsyncStorage.getItem(TOKEN_KEY);
};

export const getUser = async () => {
  const userStr = await AsyncStorage.getItem(USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
};

export const clearAuth = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
};

// Generic API request helper
export const apiRequest = async (endpoint, options = {}) => {
  const token = await getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Request failed');
  }
  return data;
};

// Multipart form data request (for file uploads)
export const apiUpload = async (endpoint, formData) => {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Upload failed');
  }
  return data;
};
