import api from '../services/api';

class Conversation {
  static async findOrCreate(userId1, userId2) {
    try {
      const response = await api.post('/conversations/find-or-create', {
        otherUserId: String(userId2)
      });
      
      return {
        _id: response.data.id,
        participants: response.data.participants
      };
    } catch (error) {
      console.error('Error finding/creating conversation:', error);
      throw error;
    }
  }
}

export default Conversation;

