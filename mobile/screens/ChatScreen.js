import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  Linking
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { uploadFile } from '../services/upload';
import { useSocket } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Conversation from '../models/Conversation';
import MessageBubble from '../components/MessageBubble';
import FilePicker from '../components/FilePicker';
import ImageViewer from '../components/ImageViewer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Audio } from 'expo-av';

export default function ChatScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { otherUser: initialOtherUser } = route.params;
  const { user } = useContext(AuthContext);
  const { socket } = useSocket();
  const { colors, isDark } = useTheme();
  const [otherUser, setOtherUser] = useState(initialOtherUser);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState(null);
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [filePickerVisible, setFilePickerVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const recordingRef = useRef(null);

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Last seen recently';
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diff = now - lastSeenDate;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Last seen just now';
    if (minutes < 60) return `Last seen ${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Last seen ${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `Last seen ${days} day${days > 1 ? 's' : ''} ago`;
    return `Last seen ${lastSeenDate.toLocaleDateString()}`;
  };

  useEffect(() => {
    if (user && user.id && otherUser && otherUser.id) {
      initializeConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, otherUser.id, user.id]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitleContainer}>
          <TouchableOpacity 
            style={styles.headerProfileContainer}
            activeOpacity={0.7}
            onPress={() => {
              // TODO: Navigate to profile screen
              console.log('Profile pressed');
            }}
          >
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>
                {otherUser.username ? otherUser.username.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <View style={styles.headerTitleText}>
              <Text style={styles.headerTitleName} numberOfLines={1}>
                {otherUser.username}
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {otherUser.isOnline 
                  ? 'online' 
                  : formatLastSeen(otherUser.lastSeen)
                }
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      ),
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBackButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.headerBackIcon}>←</Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={styles.headerRightContainer}>
          <TouchableOpacity
            style={styles.headerMenuButton}
            onPress={() => {
              // TODO: Show menu options (View contact, Media, Search, etc.)
              console.log('Menu pressed');
            }}
          >
            <Text style={styles.headerMenuIcon}>⋮</Text>
          </TouchableOpacity>
        </View>
      ),
      headerShown: true,
      headerStyle: {
        backgroundColor: isDark ? colors.header : '#008069',
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: 0,
      },
      headerTintColor: '#ffffff',
      headerTitleAlign: 'left',
      headerShadowVisible: false,
    });
  }, [otherUser, isDark, colors.header, navigation]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Cleanup recording if component unmounts
      const cleanupRecording = async () => {
        if (recordingRef.current) {
          try {
            const status = await recordingRef.current.getStatusAsync();
            if (status.isRecording || status.canRecord) {
              await recordingRef.current.stopAndUnloadAsync();
            }
          } catch (e) {
            // Ignore errors during cleanup
          }
          recordingRef.current = null;
        }
      };
      cleanupRecording();
      if (socket) {
        socket.off('message:new');
        socket.off('typing:start');
        socket.off('typing:stop');
        socket.off('message:read');
        socket.off('message:delivered');
        socket.off('error');
      }
    };
  }, [socket]);

  // Refresh messages when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (conversationId) {
        console.log('Screen focused, refreshing messages...');
        fetchMessages();
      }
      // Also refresh user info to get updated last seen
      if (socket) {
        // Listen for user status updates
        const handleUserStatus = (statusData) => {
          if (statusData.userId === otherUser.id) {
            // Update otherUser state
            setOtherUser(prev => ({
              ...prev,
              isOnline: statusData.isOnline,
              lastSeen: statusData.lastSeen
            }));
          }
        };
        socket.on('user:status', handleUserStatus);
        return () => {
          socket.off('user:status', handleUserStatus);
        };
      }
    }, [conversationId, otherUser.id, socket])
  );

  const fetchMessages = async () => {
    if (!conversationId) return;
    try {
      const response = await api.get(`/conversations/${conversationId}/messages`);
      // Sort messages by date (oldest first) for proper display
      const sortedMessages = response.data.sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
      );
      setMessages(sortedMessages);
      
      // Scroll to bottom after loading
      setTimeout(() => {
        if (flatListRef.current && sortedMessages.length > 0) {
          flatListRef.current.scrollToEnd({ animated: false });
        }
      }, 100);
      
      // Mark messages as read when viewing chat
      const unreadMessageIds = response.data
        .filter(msg => !msg.read && String(msg.senderId) !== String(user.id))
        .map(msg => msg.id);
      
      if (unreadMessageIds.length > 0 && socket && socket.connected) {
        socket.emit('message:read', {
          conversationId: conversationId,
          messageIds: unreadMessageIds
        });
        // Refresh home screen to update unread counts
        // This will be handled by the navigation listener
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Setup socket listeners when conversationId is available
  useEffect(() => {
    if (conversationId && socket) {
      setupSocketListeners();
    }
  }, [conversationId, socket]);

  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      // Scroll to end when new messages arrive
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const initializeConversation = async () => {
    try {
      console.log('Initializing conversation between:', user.id, 'and', otherUser.id);
      
      // Find or create conversation
      const conversation = await Conversation.findOrCreate(user.id, otherUser.id);
      console.log('Conversation found/created:', conversation._id);
      setConversationId(conversation._id);

      // Fetch messages
      const response = await api.get(`/conversations/${conversation._id}/messages`);
      console.log('Fetched messages:', response.data.length);
      // Sort messages by date (oldest first) for proper display
      const sortedMessages = response.data.sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
      );
      setMessages(sortedMessages);

      // Mark messages as read
      const unreadMessageIds = response.data
        .filter(msg => !msg.read && String(msg.senderId) !== String(user.id))
        .map(msg => msg.id);
      
      if (unreadMessageIds.length > 0 && socket && socket.connected) {
        console.log('Marking messages as read:', unreadMessageIds);
        socket.emit('message:read', {
          conversationId: conversation._id,
          messageIds: unreadMessageIds
        });
      }
    } catch (error) {
      console.error('Error initializing conversation:', error);
      Alert.alert('Error', 'Failed to load conversation: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    if (!socket) {
      console.log('Socket not available for listeners');
      return;
    }

    console.log('Setting up socket listeners for conversation:', conversationId);
    console.log('Socket connected:', socket.connected);

        socket.on('message:new', (message) => {
      console.log('Received message:new event:', message);
      console.log('Current conversationId:', conversationId);
      console.log('Message conversationId:', message.conversationId);
      
      // Convert both to strings for comparison
      const currentConvId = String(conversationId);
      const messageConvId = String(message.conversationId);
      
      if (messageConvId === currentConvId) {
        console.log('Message matches current conversation, adding to messages');
        
        // If this message is for me (not from me), mark as delivered
        if (String(message.senderId) !== String(user.id) && socket) {
          socket.emit('message:delivered', {
            messageId: message.id
          });
          
          // Mark as read immediately when receiving (since chat is open)
          socket.emit('message:read', {
            conversationId: message.conversationId,
            messageIds: [message.id]
          });
        }
        
        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          const exists = prev.some(msg => String(msg.id) === String(message.id));
          if (exists) {
            console.log('Message already exists, updating...');
            // Update existing message (for status updates)
            return prev.map(msg => 
              String(msg.id) === String(message.id) 
                ? { ...msg, ...message }
                : msg
            );
          }
          
          // Check if this is replacing a temp message (same text and sender)
          const tempMessageIndex = prev.findIndex(msg => 
            msg.id.startsWith('temp-') && 
            msg.text === message.text && 
            String(msg.senderId) === String(message.senderId)
          );
          
          if (tempMessageIndex !== -1) {
            // Replace temp message with real one
            const updated = [...prev];
            updated[tempMessageIndex] = message;
            return updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          }
          
          // Add new message and sort by date
          const updated = [...prev, message];
          return updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        });
        
        // Scroll to bottom when new message arrives
        setTimeout(() => {
          if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      } else {
        console.log('Message does not match current conversation');
      }
    });

    socket.on('message:delivered', (data) => {
      console.log('Message delivered event received:', data);
      // Update message status when delivery is confirmed (only for messages we sent)
      if (String(data.conversationId) === String(conversationId)) {
        setMessages(prev =>
          prev.map(msg =>
            String(msg.id) === String(data.messageId) && String(msg.senderId) === String(user.id)
              ? { ...msg, delivered: true, deliveredAt: new Date() }
              : msg
          )
        );
      }
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      Alert.alert('Connection Error', error.message || 'An error occurred');
    });

    socket.on('typing:start', (data) => {
      if (data.conversationId === conversationId && String(data.userId) !== String(user.id)) {
        setIsTyping(true);
      }
    });

    socket.on('typing:stop', (data) => {
      if (data.conversationId === conversationId) {
        setIsTyping(false);
      }
    });

    socket.on('message:read', (data) => {
      if (data.conversationId === conversationId) {
        setMessages(prev =>
          prev.map(msg =>
            data.messageIds.includes(msg.id)
              ? { ...msg, read: true, readAt: new Date() }
              : msg
          )
        );
      }
    });
  };

  // Mark received messages as delivered when they arrive
  useEffect(() => {
    if (socket && conversationId && socket.connected) {
      // Find messages we received that aren't marked as delivered yet
      const receivedMessages = messages.filter(
        msg => String(msg.senderId) !== String(user.id) && !msg.delivered
      );
      
      if (receivedMessages.length > 0) {
        // Mark each as delivered
        receivedMessages.forEach(msg => {
          console.log('Marking message as delivered:', msg.id);
          socket.emit('message:delivered', {
            messageId: msg.id
          });
        });
      }
    }
  }, [messages.length, socket, conversationId, user.id]); // Only run when message count changes

  const handleSend = () => {
    if (!inputText.trim()) {
      console.log('Cannot send: input text is empty');
      return;
    }
    
    if (!conversationId) {
      console.error('Cannot send: conversationId is null');
      Alert.alert('Error', 'Conversation not initialized. Please try again.');
      return;
    }
    
    if (!socket) {
      console.error('Cannot send: socket is null');
      console.error('Socket context state:', { socket });
      Alert.alert('Error', 'Not connected to server. Socket is not initialized. Please try logging out and back in.');
      return;
    }

    if (!socket.connected) {
      console.error('Cannot send: socket is not connected');
      console.error('Socket state:', {
        connected: socket.connected,
        disconnected: socket.disconnected,
        id: socket.id
      });
      Alert.alert('Error', 'Not connected to server. Please wait for connection or try refreshing.');
      // Try to reconnect
      if (socket.disconnected) {
        console.log('Attempting to reconnect socket...');
        socket.connect();
      }
      return;
    }

    const messageText = inputText.trim();
    console.log('Sending message:', { conversationId, text: messageText, socketConnected: socket.connected });
    setInputText('');

    // Stop typing indicator
    if (typing) {
      socket.emit('typing:stop', { conversationId });
      setTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }

    // Optimistically add message to UI (will be updated when server confirms)
    const tempMessage = {
      id: `temp-${Date.now()}`,
      conversationId,
      senderId: user.id,
      senderUsername: user.username,
      text: messageText,
      delivered: false,
      read: false,
      createdAt: new Date().toISOString()
    };
    
    setMessages(prev => {
      const updated = [...prev, tempMessage];
      return updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    });

    // Scroll to bottom
    setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 100);

    // Send message
    socket.emit('message:send', {
      conversationId,
      text: messageText,
    }, (response) => {
      if (response && response.error) {
        console.error('Message send error:', response.error);
        Alert.alert('Error', response.error);
        // Remove temp message on error
        setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      } else {
        console.log('Message sent successfully');
      }
    });
  };

  const handleCameraPhoto = async () => {
    try {
      setUploading(true);
      
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'Not authenticated');
        return;
      }

      // Import ImagePicker dynamically to avoid issues
      const ImagePicker = require('expo-image-picker');
      
      // Request permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos.');
        setUploading(false);
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const uploadResult = await uploadFile(
          asset.uri,
          asset.fileName || `photo_${Date.now()}.jpg`,
          asset.mimeType || 'image/jpeg',
          token
        );
        await sendFileMessage(uploadResult, 'image');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setUploading(false);
    }
  };

  const handleImageSelected = async (asset) => {
    try {
      setUploading(true);
      setFilePickerVisible(false);
      
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'Not authenticated');
        return;
      }

      const uploadResult = await uploadFile(
        asset.uri,
        asset.fileName || `photo_${Date.now()}.jpg`,
        asset.mimeType || 'image/jpeg',
        token
      );

      // Send message with image
      await sendFileMessage(uploadResult, 'image');
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleVideoSelected = async (asset) => {
    try {
      setUploading(true);
      setFilePickerVisible(false);
      
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'Not authenticated');
        return;
      }

      const uploadResult = await uploadFile(
        asset.uri,
        asset.fileName || `video_${Date.now()}.mp4`,
        asset.mimeType || 'video/mp4',
        token
      );

      // Send message with video
      await sendFileMessage(uploadResult, 'video');
    } catch (error) {
      console.error('Error uploading video:', error);
      Alert.alert('Error', 'Failed to upload video');
    } finally {
      setUploading(false);
    }
  };

  const handleDocumentSelected = async (asset) => {
    try {
      setUploading(true);
      setFilePickerVisible(false);
      
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'Not authenticated');
        return;
      }

      const uploadResult = await uploadFile(
        asset.uri,
        asset.name,
        asset.mimeType || 'application/octet-stream',
        token
      );

      // Send message with document
      await sendFileMessage(uploadResult, 'document');
    } catch (error) {
      console.error('Error uploading document:', error);
      Alert.alert('Error', 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const sendFileMessage = async (fileData, messageType) => {
    if (!conversationId || !socket || !socket.connected) {
      Alert.alert('Error', 'Cannot send file. Please check your connection.');
      return;
    }

    // Get full file URL - construct from API URL
    const fileUrl = fileData.fileUrl;
    // Use the same base URL logic as api.js
    const getApiUrl = () => {
      if (Platform.OS === 'android') {
        return 'http://192.168.29.161:3000';
      }
      return 'http://localhost:3000';
    };
    const baseUrl = getApiUrl();
    const fullFileUrl = fileUrl.startsWith('http') ? fileUrl : `${baseUrl}${fileUrl}`;

    // Optimistically add message to UI
    const tempMessage = {
      id: `temp-${Date.now()}`,
      conversationId,
      senderId: user.id,
      senderUsername: user.username,
      text: '',
      messageType: messageType,
      fileUrl: fullFileUrl,
      fileName: fileData.fileName,
      fileSize: fileData.fileSize,
      mimeType: fileData.mimeType,
      delivered: false,
      read: false,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => {
      const updated = [...prev, tempMessage];
      return updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    });

    // Scroll to bottom
    setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 100);

    // Send message via socket
    socket.emit('message:send', {
      conversationId,
      text: '',
      messageType: messageType,
      fileUrl: fullFileUrl,
      fileName: fileData.fileName,
      fileSize: fileData.fileSize,
      mimeType: fileData.mimeType
    }, (response) => {
      if (response && response.error) {
        console.error('Message send error:', response.error);
        Alert.alert('Error', response.error);
        // Remove temp message on error
        setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      } else {
        console.log('File message sent successfully');
      }
    });
  };

  const handleDocumentPress = async (fileUrl, fileName) => {
    try {
      Alert.alert(
        'Open Document',
        'Choose an option',
        [
          {
            text: 'Download & Share',
            onPress: async () => {
              try {
                // Use legacy downloadAsync for now (works reliably)
                const { downloadAsync } = require('expo-file-system/legacy');
                const sanitizedFileName = (fileName || 'document').replace(/[^a-z0-9.]/gi, '_');
                const fileUri = FileSystem.documentDirectory + sanitizedFileName;
                
                const downloadResult = await downloadAsync(fileUrl, fileUri);
                
                if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(downloadResult.uri, {
                    mimeType: 'application/*',
                    dialogTitle: 'Share document',
                  });
                } else {
                  Alert.alert('Sharing not available', 'Sharing is not available on this device.');
                }
              } catch (error) {
                console.error('Error downloading/sharing document:', error);
                // Fallback to opening in browser
                Linking.openURL(fileUrl).catch(err => {
                  console.error('Error opening document:', err);
                  Alert.alert('Error', 'Failed to open document');
                });
              }
            },
          },
          {
            text: 'Open in Browser',
            onPress: () => {
              Linking.openURL(fileUrl).catch(err => {
                console.error('Error opening document:', err);
                Alert.alert('Error', 'Failed to open document in browser');
              });
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Error handling document press:', error);
      Alert.alert('Error', 'Failed to open document');
    }
  };

  const startRecording = async () => {
    try {
      // Clean up any existing recording first using ref
      if (recordingRef.current) {
        try {
          const status = await recordingRef.current.getStatusAsync();
          if (status.isRecording || status.canRecord) {
            await recordingRef.current.stopAndUnloadAsync();
          }
        } catch (e) {
          console.log('Cleaning up previous recording:', e);
        }
        recordingRef.current = null;
        setRecording(null);
        // Wait a bit for cleanup to complete
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Microphone permission is required to record voice messages.');
        return;
      }

      // Set audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      recordingRef.current = newRecording;
      setRecording(newRecording);
      setIsRecording(true);
      console.log('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
      recordingRef.current = null;
      setRecording(null);
      Alert.alert('Error', `Failed to start recording: ${error.message}`);
    }
  };

  const stopRecording = async () => {
    // Use ref to get current recording state (avoids stale closures)
    const currentRecording = recordingRef.current;
    if (!currentRecording && !recording) {
      setIsRecording(false);
      return;
    }
    
    // Use recording from ref if available, otherwise from state
    const recordingToStop = currentRecording || recording;
    if (!recordingToStop) {
      setIsRecording(false);
      return;
    }

    try {
      setIsRecording(false);
      
      // Get URI before stopping
      let uri;
      try {
        uri = recordingToStop.getURI();
      } catch (e) {
        console.error('Error getting recording URI:', e);
        uri = null;
      }
      
      // Stop and unload recording
      try {
        await recordingToStop.stopAndUnloadAsync();
      } catch (e) {
        console.error('Error stopping recording:', e);
        // Continue even if stop fails
      }
      
      // Reset audio mode
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });
      } catch (e) {
        console.error('Error resetting audio mode:', e);
      }

      console.log('Recording stopped and stored at', uri);

      // Clear recording state
      recordingRef.current = null;
      setRecording(null);

      // Upload and send the voice message
      if (uri) {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          Alert.alert('Error', 'Not authenticated');
          return;
        }

        setUploading(true);
        try {
          // Use audio/m4a for all platforms (server accepts it)
          const uploadResult = await uploadFile(
            uri,
            `voice_${Date.now()}.m4a`,
            'audio/m4a',
            token
          );

          await sendFileMessage(uploadResult, 'audio');
        } catch (uploadError) {
          console.error('Error uploading voice message:', uploadError);
          Alert.alert('Error', `Failed to upload voice message: ${uploadError.message}`);
        } finally {
          setUploading(false);
        }
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsRecording(false);
      recordingRef.current = null;
      setRecording(null);
      Alert.alert('Error', `Failed to stop recording: ${error.message}`);
    }
  };

  const handleInputChange = (text) => {
    setInputText(text);

    if (!typing && conversationId && socket) {
      socket.emit('typing:start', { conversationId });
      setTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (socket && conversationId) {
        socket.emit('typing:stop', { conversationId });
        setTyping(false);
      }
    }, 3000);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            isOwn={String(item.senderId) === String(user.id)}
            onImagePress={(imageUrl) => {
              setSelectedImageUrl(imageUrl);
              setImageViewerVisible(true);
            }}
            onDocumentPress={handleDocumentPress}
          />
        )}
        contentContainerStyle={[
          styles.messagesContainer,
          { paddingBottom: 10, flexGrow: 1 }
        ]}
        inverted={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No messages yet. Start the conversation!
            </Text>
          </View>
        }
      />

      {isTyping && (
        <View style={styles.typingContainer}>
          <Text style={[styles.typingText, { color: colors.textSecondary }]}>
            {otherUser.username} is typing...
          </Text>
        </View>
      )}

      <View style={[styles.inputContainer, { backgroundColor: isDark ? colors.input : '#f0f2f5', borderTopColor: colors.border }]}>
        {/* Camera Button */}
        <TouchableOpacity
          style={styles.cameraButton}
          onPress={() => {
            // Direct camera access
            handleCameraPhoto();
          }}
          disabled={uploading}
        >
          <Text style={styles.cameraButtonText}>📷</Text>
        </TouchableOpacity>
        
        {/* Attach Button */}
        <TouchableOpacity
          style={styles.attachButton}
          onPress={() => setFilePickerVisible(true)}
          disabled={uploading}
        >
          <Text style={styles.attachButtonText}>📎</Text>
        </TouchableOpacity>
        
        {/* Input Field */}
        <View style={[styles.inputWrapper, { backgroundColor: isDark ? colors.surface : '#ffffff' }]}>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            value={inputText}
            onChangeText={handleInputChange}
            placeholder="Message"
            placeholderTextColor={isDark ? colors.textSecondary : '#667781'}
            multiline
            maxLength={4096}
            textAlignVertical="center"
          />
        </View>
        
        {/* Send Button or Emoji/Mic Button */}
        {inputText.trim() ? (
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSend}
            disabled={uploading || isRecording}
          >
            <Text style={styles.sendButtonText}>➤</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.micButtonContainer}>
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>Recording...</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.micButton, isRecording && styles.micButtonRecording]}
              onPressIn={startRecording}
              onPressOut={stopRecording}
              disabled={uploading}
            >
              <Text style={[styles.micButtonText, isRecording && styles.micButtonTextRecording]}>🎤</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FilePicker
        visible={filePickerVisible}
        onClose={() => setFilePickerVisible(false)}
        onImageSelected={handleImageSelected}
        onVideoSelected={handleVideoSelected}
        onFileSelected={handleDocumentSelected}
      />

      <ImageViewer
        visible={imageViewerVisible}
        imageUrl={selectedImageUrl}
        onClose={() => {
          setImageViewerVisible(false);
          setSelectedImageUrl(null);
        }}
      />
    </KeyboardAvoidingView>
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
  headerTitleContainer: {
    flex: 1,
    width: '100%',
  },
  headerProfileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerAvatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerTitleText: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitleName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    marginTop: 1,
    letterSpacing: 0.1,
  },
  headerBackButton: {
    padding: 8,
    marginLeft: Platform.OS === 'ios' ? -8 : 0,
    marginRight: 4,
  },
  headerBackIcon: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 28,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Platform.OS === 'ios' ? 0 : 8,
  },
  headerMenuButton: {
    padding: 8,
    marginLeft: 4,
    marginRight: Platform.OS === 'ios' ? 0 : 4,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  headerMenuIcon: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 22,
  },
  cameraButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
    marginBottom: 2,
  },
  cameraButtonText: {
    fontSize: 24,
    opacity: 0.8,
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
    marginBottom: 2,
    transform: [{ rotate: '-45deg' }],
  },
  attachButtonText: {
    fontSize: 24,
    opacity: 0.8,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 21,
    borderWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    minHeight: 42,
    maxHeight: 100,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  input: {
    fontSize: 15,
    lineHeight: 20,
    padding: 0,
    margin: 0,
    minHeight: 22,
    maxHeight: 80,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    marginBottom: 2,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '600',
    marginLeft: 2,
  },
  micButtonContainer: {
    position: 'relative',
    marginLeft: 6,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  micButtonRecording: {
    backgroundColor: '#f44336',
  },
  micButtonText: {
    fontSize: 24,
    opacity: 0.8,
  },
  micButtonTextRecording: {
    opacity: 1,
  },
  recordingIndicator: {
    position: 'absolute',
    bottom: 50,
    left: -40,
    backgroundColor: '#f44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 120,
    justifyContent: 'center',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    marginRight: 6,
  },
  recordingText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 12 : 10,
    paddingTop: 8,
    minHeight: 62,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  messagesContainer: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    paddingBottom: 20,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 14,
  },
  typingContainer: {
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  typingText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});

