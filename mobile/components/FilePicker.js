import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../context/ThemeContext';

export default function FilePicker({ visible, onClose, onFileSelected, onImageSelected, onVideoSelected }) {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(false);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaLibraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraStatus !== 'granted' || mediaLibraryStatus !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera and media library permissions to use this feature.');
        return false;
      }
    }
    return true;
  };

  const handleCameraPhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      onClose();
      return;
    }

    try {
      setLoading(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        onImageSelected(result.assets[0]);
        onClose();
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setLoading(false);
    }
  };

  const handleCameraVideo = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      onClose();
      return;
    }

    try {
      setLoading(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 60, // 60 seconds max
      });

      if (!result.canceled && result.assets[0]) {
        onVideoSelected(result.assets[0]);
        onClose();
      }
    } catch (error) {
      console.error('Error recording video:', error);
      Alert.alert('Error', 'Failed to record video');
    } finally {
      setLoading(false);
    }
  };

  const handleGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      onClose();
      return;
    }

    try {
      setLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        // Check if it's a video based on URI or type
        if (asset.type === 'video' || (asset.uri && asset.uri.includes('video'))) {
          onVideoSelected(asset);
        } else if (asset.type === 'image' || asset.uri) {
          onImageSelected(asset);
        }
        onClose();
      }
    } catch (error) {
      console.error('Error picking from gallery:', error);
      Alert.alert('Error', 'Failed to pick from gallery');
    } finally {
      setLoading(false);
    }
  };

  const handleDocument = async () => {
    try {
      setLoading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        onFileSelected(result.assets[0]);
        onClose();
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.modalContent, { backgroundColor: isDark ? colors.surface : '#ffffff' }]}>
          <View style={styles.modalHandle} />
          
          <View style={styles.optionsGrid}>
            <TouchableOpacity
              style={[styles.optionCard, { backgroundColor: isDark ? colors.background : '#f0f2f5' }]}
              onPress={handleGallery}
              disabled={loading}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: isDark ? '#1f2937' : '#e5e7eb' }]}>
                <Text style={styles.optionIcon}>🖼️</Text>
              </View>
              <Text style={[styles.optionText, { color: colors.text }]}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionCard, { backgroundColor: isDark ? colors.background : '#f0f2f5' }]}
              onPress={handleCameraPhoto}
              disabled={loading}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: isDark ? '#1f2937' : '#e5e7eb' }]}>
                <Text style={styles.optionIcon}>📷</Text>
              </View>
              <Text style={[styles.optionText, { color: colors.text }]}>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionCard, { backgroundColor: isDark ? colors.background : '#f0f2f5' }]}
              onPress={handleCameraVideo}
              disabled={loading}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: isDark ? '#1f2937' : '#e5e7eb' }]}>
                <Text style={styles.optionIcon}>🎥</Text>
              </View>
              <Text style={[styles.optionText, { color: colors.text }]}>Video</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionCard, { backgroundColor: isDark ? colors.background : '#f0f2f5' }]}
              onPress={handleDocument}
              disabled={loading}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: isDark ? '#1f2937' : '#e5e7eb' }]}>
                <Text style={styles.optionIcon}>📄</Text>
              </View>
              <Text style={[styles.optionText, { color: colors.text }]}>Document</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: isDark ? colors.background : '#f0f2f5' }]}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={[styles.cancelText, { color: isDark ? colors.text : '#008069' }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingHorizontal: 16,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  optionCard: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  optionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionIcon: {
    fontSize: 32,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
  },
  cancelButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

