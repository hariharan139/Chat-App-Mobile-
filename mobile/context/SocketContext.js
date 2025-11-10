import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { AuthContext } from './AuthContext';

const SocketContext = createContext();

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

const API_URL = getApiUrl();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { userToken } = useContext(AuthContext);

  useEffect(() => {
    console.log('=== Socket Provider Effect ===');
    console.log('UserToken exists:', !!userToken);
    console.log('API URL:', API_URL);
    
    if (userToken) {
      console.log('Initializing socket connection...');
      
      // Initialize socket connection
      const newSocket = io(API_URL, {
        auth: {
          token: userToken
        },
        transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000
      });

      newSocket.on('connect', () => {
        console.log('✅ Socket connected successfully');
        console.log('Socket ID:', newSocket.id);
        console.log('Socket connected:', newSocket.connected);
        setSocket(newSocket); // Set socket only after successful connection
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
          // Server disconnected, reconnect manually
          newSocket.connect();
        }
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        console.error('Error message:', error.message);
        console.error('Error type:', error.type);
        // Don't set socket to null on error, let it retry
      });

      newSocket.on('error', (error) => {
        console.error('❌ Socket error:', error);
      });

      newSocket.on('reconnect', (attemptNumber) => {
        console.log('✅ Socket reconnected after', attemptNumber, 'attempts');
        setSocket(newSocket);
      });

      newSocket.on('reconnect_error', (error) => {
        console.error('❌ Socket reconnection error:', error);
      });

      newSocket.on('reconnect_failed', () => {
        console.error('❌ Socket reconnection failed after all attempts');
        setSocket(null);
      });

      // Set socket immediately so it's available (even if not connected yet)
      // We'll check socket.connected before sending messages
      setSocket(newSocket);

      return () => {
        console.log('Cleaning up socket connection...');
        if (newSocket.connected) {
          newSocket.disconnect();
        }
        newSocket.close();
        setSocket(null);
      };
    } else {
      console.log('No userToken, closing socket if exists');
      if (socket) {
        socket.close();
        setSocket(null);
      }
    }
  }, [userToken]);

  // Log socket state for debugging
  useEffect(() => {
    if (socket) {
      console.log('Socket state updated:', {
        connected: socket.connected,
        id: socket.id,
        disconnected: socket.disconnected
      });
    } else {
      console.log('Socket is null');
    }
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

