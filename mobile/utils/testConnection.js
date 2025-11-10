import api from '../services/api';

export const testConnection = async () => {
  try {
    console.log('Testing server connection...');
    const response = await api.get('/health');
    console.log('Connection test successful:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Connection test failed:', error);
    return { 
      success: false, 
      error: error.message,
      code: error.code,
      details: error.response?.data || error.message
    };
  }
};

