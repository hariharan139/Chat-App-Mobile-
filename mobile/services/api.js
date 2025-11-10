import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Auto-detect API URL based on platform and environment
// Production: Use your deployed backend URL
// Development: Use local IP address for physical devices or localhost for emulators
const getApiUrl = () => {
  // Check if we're in production mode
  if (!__DEV__) {
    // PRODUCTION: Replace with your deployed backend URL
    // Examples:
    // return 'https://your-app.herokuapp.com';
    // return 'https://your-app.railway.app';
    // return 'https://api.yourdomain.com';
    return 'https://your-backend-url.herokuapp.com'; // TODO: Replace with your production URL
  }
  
  // DEVELOPMENT: Use local development server
  if (Platform.OS === 'android') {
    // For Android emulator: use 10.0.2.2
    // For Android physical device: use your computer's IP address
    // Find your IP: ipconfig (Windows) or ifconfig (Mac/Linux)
    return 'http://192.168.29.161:3000'; // TODO: Replace with your local IP
    // Alternative for emulator: return 'http://10.0.2.2:3000';
  }
  // iOS simulator or web
  return 'http://localhost:3000';
};

// Alternative: Use your computer's IP address for Android emulator
// Uncomment and replace with your IP if 10.0.2.2 doesn't work:
// const getApiUrl = () => {
//   if (Platform.OS === 'android') {
//     return 'http://192.168.1.XXX:3000'; // Replace XXX with your IP
//   }
//   return 'http://localhost:3000';
// };

const API_URL = getApiUrl();

// Log the API URL for debugging
console.log('=== API Configuration ===');
console.log('API URL:', API_URL);
console.log('Platform:', Platform.OS);
console.log('Full base URL:', API_URL);
console.log('==========================');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Add token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log full error details
    console.error('=== API Error Details ===');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error config:', {
      url: error.config?.url,
      method: error.config?.method,
      baseURL: error.config?.baseURL,
      fullURL: error.config?.baseURL + error.config?.url
    });
    console.error('Response status:', error.response?.status);
    console.error('Response data:', error.response?.data);
    console.error('Request headers:', error.config?.headers);
    try {
      console.error('Full error object:', JSON.stringify(error, null, 2));
    } catch (e) {
      console.error('Full error object (stringify failed):', error);
    }
    console.error('========================');
    
    // Handle network errors
    if (error.message === 'Network Error' || !error.response) {
      console.error('Network Error - Possible causes:');
      console.error('1. Server not running');
      console.error('2. Wrong API URL');
      console.error('3. CORS issue');
      console.error('4. Firewall blocking connection');
      console.error('5. Android emulator network issue');
      
      error.response = {
        data: { 
          error: `Cannot connect to server at ${error.config?.baseURL}. Make sure the server is running and the URL is correct.`,
          details: error.message,
          code: error.code
        }
      };
    }
    return Promise.reject(error);
  }
);

export default api;

