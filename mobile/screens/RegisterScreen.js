import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { testConnection } from '../utils/testConnection';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const { signIn } = useContext(AuthContext);
  const { colors } = useTheme();

  const handleRegister = async () => {
    if (!username || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Validate username length (3-20 characters)
    if (username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters long');
      return;
    }

    if (username.length > 20) {
      Alert.alert('Error', 'Username must be no more than 20 characters long');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Validate password length
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    
    // Test connection first
    console.log('Testing server connection before registration...');
    const connectionTest = await testConnection();
    if (!connectionTest.success) {
      Alert.alert(
        'Connection Error', 
        `Cannot connect to server:\n${connectionTest.error}\n\nPlease check:\n1. Server is running\n2. Correct API URL\n3. Network connection`
      );
      setLoading(false);
      return;
    }
    
    try {
      const response = await api.post('/auth/register', {
        username,
        email,
        password,
      });

      if (response.data.token) {
        await signIn(response.data.token, response.data.user);
      }
    } catch (error) {
      console.error('=== Registration Error ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Response:', error.response);
      console.error('Request config:', error.config);
      try {
        console.error('Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      } catch (e) {
        console.error('Full error (stringify failed):', error);
      }
      console.error('==========================');
      
      let errorMessage = 'Could not create account. Please check your connection and try again.';
      
      if (error.response?.data?.error) {
        // Extract user-friendly error message
        const serverError = error.response.data.error;
        
        // Handle validation errors
        if (serverError.includes('username') && serverError.includes('shorter')) {
          errorMessage = 'Username must be at least 3 characters long';
        } else if (serverError.includes('username') && serverError.includes('longer')) {
          errorMessage = 'Username must be no more than 20 characters long';
        } else if (serverError.includes('User already exists')) {
          errorMessage = 'This username or email is already registered. Please use different credentials.';
        } else if (serverError.includes('email')) {
          errorMessage = 'Please enter a valid email address';
        } else if (serverError.includes('password')) {
          errorMessage = 'Password must be at least 6 characters long';
        } else {
          errorMessage = serverError;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        errorMessage = `Cannot connect to server. Please check:\n1. Server is running\n2. Correct API URL\n3. Network connection`;
      }
      
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Sign up to get started</Text>

        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          placeholder="Username (3-20 characters)"
          placeholderTextColor={colors.textSecondary}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          maxLength={20}
        />

        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          placeholder="Email"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          placeholder="Password (min 6 characters)"
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Register</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>
            Already have an account? Login
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  input: {
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#007AFF',
    fontSize: 14,
  },
});

