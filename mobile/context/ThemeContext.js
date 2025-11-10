import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemTheme = useColorScheme();
  const [theme, setTheme] = useState('light'); // 'light' or 'dark'
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load saved theme preference
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme');
        if (savedTheme === 'light' || savedTheme === 'dark') {
          setTheme(savedTheme);
        } else {
          // Use system theme if no preference saved
          setTheme(systemTheme || 'light');
        }
      } catch (error) {
        console.error('Error loading theme:', error);
        setTheme(systemTheme || 'light');
      } finally {
        setIsLoading(false);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem('theme', newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const colors = {
    light: {
      background: '#efeae2',
      surface: '#ffffff',
      text: '#111b21',
      textSecondary: '#667781',
      border: '#e9edef',
      incomingBubble: '#ffffff',
      outgoingBubble: '#d9fdd3',
      incomingText: '#111b21',
      outgoingText: '#111b21',
      time: '#667781',
      header: '#008069',
      input: '#f0f2f5',
    },
    dark: {
      background: '#0b141a',
      surface: '#202c33',
      text: '#e9edef',
      textSecondary: '#8696a0',
      border: '#313d45',
      incomingBubble: '#202c33',
      outgoingBubble: '#005c4b',
      incomingText: '#e9edef',
      outgoingText: '#e9edef',
      time: '#8696a0',
      header: '#202c33',
      input: '#1e2a30',
    },
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors: colors[theme], isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

