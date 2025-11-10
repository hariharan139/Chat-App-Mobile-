import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function Conversation({ user, onPress }) {
  const { colors } = useTheme();
  
  const formatTime = (date) => {
    if (!date) return '';
    const messageDate = new Date(date);
    const now = new Date();
    const diff = now - messageDate;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    const days = Math.floor(minutes / 1440);
    if (days < 7) return `${days}d`;
    return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const unreadCount = user.unreadCount || 0;
  const isUnread = unreadCount > 0;
  // Show unread style if there are unread messages (regardless of sender)
  // In WhatsApp, unread messages show in blue even if they're from you
  const showUnreadStyle = isUnread;

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: colors.background, borderBottomColor: colors.border }]} 
      onPress={onPress}
    >
      <View style={styles.avatarContainer}>
        <View style={[styles.avatar, { backgroundColor: colors.outgoingBubble }]}>
          <Text style={styles.avatarText}>
            {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
          </Text>
        </View>
        {user.isOnline && <View style={styles.onlineIndicator} />}
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[
            styles.username, 
            { color: colors.text, fontWeight: showUnreadStyle ? '600' : '500' }
          ]}>
            {user.username}
          </Text>
          {user.lastMessage && (
            <Text style={[
              styles.time, 
              { color: showUnreadStyle ? '#25D366' : colors.textSecondary }
            ]}>
              {formatTime(user.lastMessage.createdAt)}
            </Text>
          )}
        </View>
        
        {user.lastMessage ? (
          <View style={styles.lastMessageRow}>
            <Text 
              style={[
                styles.lastMessage, 
                { 
                  color: showUnreadStyle ? '#25D366' : colors.textSecondary,
                  fontWeight: showUnreadStyle ? '600' : '400'
                }
              ]} 
              numberOfLines={1}
            >
              {user.lastMessage.text}
            </Text>
          </View>
        ) : (
          <Text style={[styles.noMessage, { color: colors.textSecondary }]}>No messages yet</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 0.5,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#fff',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#25D366',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  username: {
    fontSize: 16,
    fontWeight: '500',
  },
  time: {
    fontSize: 12,
  },
  lastMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
  },
  noMessage: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});

