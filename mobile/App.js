import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';
import { AuthContext } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const checkLoginStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const userData = await AsyncStorage.getItem('userData');
        if (token && userData) {
          setUserToken(token);
          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.error('Error checking login status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkLoginStatus();
  }, []);

  const authContext = {
    signIn: async (token, userData) => {
      try {
        console.log('Signing in user, setting token...');
        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        setUserToken(token);
        setUser(userData);
        console.log('User signed in, token set:', !!token);
      } catch (error) {
        console.error('Error signing in:', error);
      }
    },
    signOut: async () => {
      try {
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userData');
        setUserToken(null);
        setUser(null);
      } catch (error) {
        console.error('Error signing out:', error);
      }
    },
    user,
    userToken // Add userToken to context so SocketContext can access it
  };

  if (isLoading) {
    return null; // You can add a loading screen here
  }

  return (
    <ThemeProvider>
      <AuthContext.Provider value={authContext}>
        <SocketProvider>
          <NavigationContainer>
            <StatusBar style="auto" />
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              {userToken ? (
                <>
                  <Stack.Screen name="Home" component={HomeScreen} />
                  <Stack.Screen 
                    name="Chat" 
                    component={ChatScreen}
                    options={{ headerShown: true }}
                  />
                </>
              ) : (
                <>
                  <Stack.Screen name="Login" component={LoginScreen} />
                  <Stack.Screen name="Register" component={RegisterScreen} />
                </>
              )}
            </Stack.Navigator>
          </NavigationContainer>
        </SocketProvider>
      </AuthContext.Provider>
    </ThemeProvider>
  );
}

