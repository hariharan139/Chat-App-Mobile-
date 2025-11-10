import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import Conversation from '../components/Conversation';

export default function HomeScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const { signOut, user } = useContext(AuthContext);
  const { socket } = useSocket();
  const { colors, toggleTheme, isDark } = useTheme();

  useEffect(() => {
    fetchUsers();
    
    // Listen for new messages to update last message
    if (socket) {
      socket.on('message:new', (message) => {
        // Refresh users list to get updated last message and unread count
        fetchUsers();
      });
      
      socket.on('user:status', (statusData) => {
        // Update user online status and last seen
        setUsers(prevUsers => 
          prevUsers.map(u => 
            u.id === statusData.userId
              ? { ...u, isOnline: statusData.isOnline, lastSeen: statusData.lastSeen }
              : u
          )
        );
      });
      
      socket.on('conversation:unread-updated', () => {
        // Refresh users list to get updated unread counts
        fetchUsers();
      });
    }

    return () => {
      if (socket) {
        socket.off('message:new');
        socket.off('user:status');
        socket.off('conversation:unread-updated');
      }
    };
  }, [socket]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const handleUserPress = async (otherUser) => {
    // Navigate to chat screen with user info
    // The unread count will be reset when messages are marked as read in the chat
    navigation.navigate('Chat', { otherUser });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Chats</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={toggleTheme} style={styles.themeButton}>
            <Text style={[styles.themeText, { color: colors.text }]}>
              {isDark ? '☀️' : '🌙'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
            <Text style={[styles.logoutText, { color: colors.outgoingBubble }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Conversation
            user={item}
            onPress={() => handleUserPress(item)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No users found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    paddingTop: 60,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  themeButton: {
    padding: 8,
  },
  themeText: {
    fontSize: 20,
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
  },
});

