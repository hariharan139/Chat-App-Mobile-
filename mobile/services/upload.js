import { Platform } from 'react-native';

const getApiUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://192.168.29.161:3000';
  }
  return 'http://localhost:3000';
};

const API_URL = getApiUrl();

export const uploadFile = async (fileUri, fileName, mimeType, token) => {
  try {
    const formData = new FormData();
    
    // Extract filename from URI if not provided
    const name = fileName || fileUri.split('/').pop() || `file_${Date.now()}`;
    
    // Normalize MIME type for audio files
    let normalizedMimeType = mimeType || 'application/octet-stream';
    if (normalizedMimeType === 'audio/m4a' || normalizedMimeType === 'audio/x-m4a') {
      // Server accepts audio/m4a, but some platforms send different MIME types
      normalizedMimeType = 'audio/m4a';
    }
    
    // Create file object for FormData (React Native format)
    // Keep the file:// prefix for React Native
    formData.append('file', {
      uri: fileUri,
      type: normalizedMimeType,
      name: name,
    });

    console.log('Uploading file:', { fileUri, fileName, mimeType: normalizedMimeType, name });

    const response = await fetch(`${API_URL}/uploads`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type - let fetch set it with boundary
        'Accept': 'application/json',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        // Try to extract error message from HTML response
        const errorMatch = errorText.match(/Error: ([^<]+)/);
        errorData = { error: errorMatch ? errorMatch[1] : (errorText || 'Upload failed') };
      }
      throw new Error(errorData.error || 'Upload failed');
    }

    const data = await response.json();
    console.log('Upload success:', data);
    return data;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

export default uploadFile;

