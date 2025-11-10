import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking, Dimensions, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_IMAGE_WIDTH = SCREEN_WIDTH * 0.65;
const MAX_IMAGE_HEIGHT = 300;

export default function MessageBubble({ message, isOwn, onImagePress, onDocumentPress }) {
  const { colors } = useTheme();
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(message.messageType === 'image');
  
  // Audio player state
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(null);
  const [position, setPosition] = useState(0);
  const playbackStatusRef = useRef(null);

  const formatTime = (date) => {
    if (!date) return '';
    const messageDate = new Date(date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
    
    if (messageDay.getTime() === today.getTime()) {
      // Today - show time only
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      // Other day - show date and time
      return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
             ' ' + messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const getMessageStatus = () => {
    if (!isOwn) return null;
    
    // WhatsApp status logic:
    // Single gray tick (✓): Sent
    // Double gray ticks (✓✓): Delivered
    // Double blue ticks (✓✓): Read
    
    if (message.read) {
      // Double blue checkmark for read messages
      return { icon: '✓✓', color: '#53bdeb' }; // WhatsApp blue
    } else if (message.delivered) {
      // Double gray checkmark for delivered messages
      return { icon: '✓✓', color: colors.time };
    } else {
      // Single gray checkmark for sent messages
      return { icon: '✓', color: colors.time };
    }
  };

  // Audio playback functions
  useEffect(() => {
    return () => {
      // Cleanup audio when component unmounts
      if (sound) {
        sound.unloadAsync().catch(console.error);
      }
    };
  }, [sound]);

  const loadAudio = async () => {
    if (sound) {
      // If sound is already loaded, just play it
      await playAudio();
      return;
    }

    try {
      setIsLoading(true);
      
      // Set audio mode for playback
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      // Load the audio file
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: message.fileUrl },
        { shouldPlay: false },
        (status) => {
          if (status.isLoaded) {
            setDuration(status.durationMillis);
            setPosition(status.positionMillis);
            setIsPlaying(status.isPlaying);
            
            if (status.didJustFinish) {
              // Audio finished playing
              setIsPlaying(false);
              setPosition(0);
            }
          }
        }
      );

      setSound(newSound);
      setIsLoading(false);
      await newSound.playAsync();
      setIsPlaying(true);
    } catch (error) {
      console.error('Error loading audio:', error);
      setIsLoading(false);
      // Fallback to opening in browser
      Linking.openURL(message.fileUrl).catch(err => console.error('Error opening audio:', err));
    }
  };

  const playAudio = async () => {
    if (!sound) return;
    
    try {
      await sound.playAsync();
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const pauseAudio = async () => {
    if (!sound) return;
    
    try {
      await sound.pauseAsync();
      setIsPlaying(false);
    } catch (error) {
      console.error('Error pausing audio:', error);
    }
  };

  const togglePlayPause = async () => {
    if (isLoading) return;
    
    if (!sound) {
      await loadAudio();
    } else {
      if (isPlaying) {
        await pauseAudio();
      } else {
        await playAudio();
      }
    }
  };

  const formatDuration = (millis) => {
    if (!millis) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderMessageContent = () => {
    // Image message
    if (message.messageType === 'image' && message.fileUrl) {
      return (
        <View>
          <TouchableOpacity
            onPress={() => {
              if (onImagePress) {
                onImagePress(message.fileUrl);
              }
            }}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: message.fileUrl }}
              style={styles.messageImage}
              resizeMode="cover"
              onError={() => {
                console.error('Image load error:', message.fileUrl);
                setImageError(true);
                setImageLoading(false);
              }}
              onLoad={() => {
                setImageLoading(false);
                setImageError(false);
              }}
            />
            {imageLoading && !imageError && (
              <View style={[styles.imageLoading, { backgroundColor: colors.surface }]}>
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
              </View>
            )}
            {imageError && (
              <View style={[styles.imageError, { backgroundColor: colors.surface }]}>
                <Text style={[styles.errorText, { color: colors.textSecondary }]}>Failed to load image</Text>
              </View>
            )}
          </TouchableOpacity>
          {message.text && (
            <Text style={[
              styles.text, 
              isOwn 
                ? { color: colors.outgoingText } 
                : { color: colors.incomingText },
              styles.imageCaption
            ]}>
              {message.text}
            </Text>
          )}
        </View>
      );
    }

    // Video message
    if (message.messageType === 'video' && message.fileUrl) {
      return (
        <View>
          <TouchableOpacity
            onPress={() => {
              // TODO: Play video in video player
              Linking.openURL(message.fileUrl).catch(err => console.error('Error opening video:', err));
            }}
            style={styles.videoContainer}
            activeOpacity={0.9}
          >
            <View style={[styles.videoThumbnail, { backgroundColor: colors.surface }]}>
              <Text style={styles.videoIcon}>🎥</Text>
              <Text style={[styles.videoText, { color: colors.text }]}>Video</Text>
            </View>
            {message.thumbnailUrl && (
              <Image
                source={{ uri: message.thumbnailUrl }}
                style={styles.videoThumbnailImage}
                resizeMode="cover"
              />
            )}
          </TouchableOpacity>
          {message.text && (
            <Text style={[
              styles.text, 
              isOwn 
                ? { color: colors.outgoingText } 
                : { color: colors.incomingText },
              styles.videoCaption
            ]}>
              {message.text}
            </Text>
          )}
        </View>
      );
    }

    // Document message
    if (message.messageType === 'document' && message.fileUrl) {
      const fileSize = message.fileSize ? formatFileSize(message.fileSize) : '';
      return (
        <TouchableOpacity
          onPress={() => {
            if (onDocumentPress) {
              onDocumentPress(message.fileUrl, message.fileName);
            } else {
              Linking.openURL(message.fileUrl).catch(err => console.error('Error opening document:', err));
            }
          }}
          style={[styles.documentContainer, { backgroundColor: colors.surface }]}
          activeOpacity={0.7}
        >
          <Text style={styles.documentIcon}>📄</Text>
          <View style={styles.documentInfo}>
            <Text style={[styles.documentName, { color: colors.text }]} numberOfLines={1}>
              {message.fileName || 'Document'}
            </Text>
            {fileSize && (
              <Text style={[styles.documentSize, { color: colors.textSecondary }]}>
                {fileSize}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      );
    }

    // Audio message
    if (message.messageType === 'audio' && message.fileUrl) {
      const progress = duration ? (position / duration) * 100 : 0;
      
      return (
        <View style={[styles.audioContainer, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            onPress={togglePlayPause}
            style={styles.audioPlayButton}
            activeOpacity={0.7}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={isOwn ? colors.outgoingText : colors.incomingText} />
            ) : (
              <Text style={[styles.audioPlayIcon, { color: isOwn ? colors.outgoingText : colors.incomingText }]}>
                {isPlaying ? '⏸' : '▶'}
              </Text>
            )}
          </TouchableOpacity>
          
          <View style={styles.audioInfo}>
            <View style={styles.audioProgressBar}>
              <View 
                style={[
                  styles.audioProgressFill, 
                  { 
                    width: `${progress}%`,
                    backgroundColor: isOwn ? colors.outgoingText : colors.incomingText
                  }
                ]} 
              />
            </View>
            <View style={styles.audioTextRow}>
              <Text style={[styles.audioText, { color: colors.text }]}>Voice Message</Text>
              <Text style={[styles.audioDuration, { color: colors.textSecondary }]}>
                {duration ? formatDuration(position) + ' / ' + formatDuration(duration) : 'Tap to play'}
              </Text>
            </View>
          </View>
        </View>
      );
    }

    // Text message (default)
    return (
      <Text style={[
        styles.text, 
        isOwn 
          ? { color: colors.outgoingText } 
          : { color: colors.incomingText }
      ]}>
        {message.text}
      </Text>
    );
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <View style={[styles.container, isOwn && styles.containerOwn]}>
      <View style={[
        styles.bubble, 
        isOwn 
          ? { backgroundColor: colors.outgoingBubble } 
          : { backgroundColor: colors.incomingBubble },
        (message.messageType === 'image' || message.messageType === 'video') && styles.mediaBubble
      ]}>
        {!isOwn && message.messageType !== 'image' && message.messageType !== 'video' && (
          <Text style={[styles.senderName, { color: colors.text }]}>
            {message.senderUsername}
          </Text>
        )}
        {renderMessageContent()}
        <View style={[
          styles.footer,
          (message.messageType === 'image' || message.messageType === 'video') && styles.mediaFooter
        ]}>
          <Text style={[
            styles.time, 
            { color: message.messageType === 'image' || message.messageType === 'video' 
              ? (isOwn ? 'rgba(255, 255, 255, 0.9)' : colors.time)
              : colors.time
            }
          ]}>
            {formatTime(message.createdAt)}
          </Text>
          {isOwn && (() => {
            const status = getMessageStatus();
            if (!status) return null;
            return (
              <Text style={[
                styles.readStatus, 
                { 
                  color: message.messageType === 'image' || message.messageType === 'video'
                    ? status.color === '#53bdeb' ? '#53bdeb' : 'rgba(255, 255, 255, 0.9)'
                    : status.color
                }
              ]}>
                {status.icon}
              </Text>
            );
          })()}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 0.5,
    marginHorizontal: 2,
    alignItems: 'flex-start',
    paddingHorizontal: 6,
  },
  containerOwn: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 7.5,
    paddingHorizontal: 7,
    paddingTop: 6,
    paddingBottom: 8,
    paddingRight: 9,
    // WhatsApp-like shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  senderName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
    opacity: 0.9,
  },
  text: {
    fontSize: 14.2,
    lineHeight: 19,
    letterSpacing: 0.1,
    paddingRight: 0,
    includeFontPadding: false,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
  },
  mediaFooter: {
    position: 'absolute',
    bottom: 4,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  time: {
    fontSize: 11.5,
    marginRight: 4,
    includeFontPadding: false,
  },
  readStatus: {
    fontSize: 13,
    marginLeft: 4,
    includeFontPadding: false,
    fontWeight: '400',
  },
  mediaBubble: {
    padding: 0,
    overflow: 'hidden',
    maxWidth: MAX_IMAGE_WIDTH,
  },
  messageImage: {
    width: MAX_IMAGE_WIDTH,
    maxWidth: '100%',
    minHeight: 150,
    maxHeight: MAX_IMAGE_HEIGHT,
    borderRadius: 7.5,
  },
  imageLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 7.5,
  },
  loadingText: {
    color: '#fff',
    fontSize: 12,
  },
  imageError: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 7.5,
  },
  errorText: {
    color: '#fff',
    fontSize: 12,
  },
  imageCaption: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingBottom: 6,
  },
  videoContainer: {
    width: MAX_IMAGE_WIDTH,
    maxWidth: '100%',
    height: 200,
    borderRadius: 7.5,
    overflow: 'hidden',
    position: 'relative',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoThumbnailImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  videoIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  videoText: {
    fontSize: 14,
    fontWeight: '500',
  },
  videoCaption: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingBottom: 6,
  },
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 7.5,
    minWidth: 200,
    maxWidth: MAX_IMAGE_WIDTH,
  },
  documentIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  documentSize: {
    fontSize: 12,
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 7.5,
    minWidth: 200,
    maxWidth: MAX_IMAGE_WIDTH,
  },
  audioPlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  audioPlayIcon: {
    fontSize: 20,
    marginLeft: 2,
  },
  audioInfo: {
    flex: 1,
  },
  audioProgressBar: {
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 1.5,
    marginBottom: 6,
    overflow: 'hidden',
  },
  audioProgressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  audioTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  audioText: {
    fontSize: 14,
    fontWeight: '500',
  },
  audioDuration: {
    fontSize: 11,
    marginLeft: 8,
  },
});
