import { Platform } from 'react-native';

// Automatically use localhost when running in browser, LAN IP for physical device
const getApiUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api';
  }
  // For physical device / Expo Go use PC's local IP on Wi-Fi
  return 'http://10.195.134.80:5000/api';
};

export const API_BASE_URL = getApiUrl();
