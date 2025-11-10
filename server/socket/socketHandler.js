const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

// Store typing indicators: { conversationId: { userId: timestamp } }
const typingUsers = {};

const handleSocketConnection = (socket, io) => {
  const userId = socket.userId;

  console.log(`User connected: ${userId}`);
  console.log(`Socket ID: ${socket.id}`);

  // Update user online status
  User.findByIdAndUpdate(userId, { isOnline: true })
    .then(async (user) => {
      // Notify all conversations that user came online
      const userConversations = await Conversation.find({ participants: userId });
      userConversations.forEach((conversation) => {
        const otherParticipant = conversation.participants.find(p => p.toString() !== userId);
        if (otherParticipant) {
          io.to(`user:${otherParticipant}`).emit('user:status', {
            userId: userId.toString(),
            isOnline: true,
            lastSeen: user.lastSeen
          });
        }
      });
    })
    .catch(err => console.error('Error updating online status:', err));

  // Join user's personal room
  const userRoom = `user:${userId}`;
  socket.join(userRoom);
  console.log(`User joined room: ${userRoom}`);

  // Handle disconnect
  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${userId}`);
    
    // Update user offline status and last seen
    const lastSeenDate = new Date();
    await User.findByIdAndUpdate(userId, { 
      isOnline: false, 
      lastSeen: lastSeenDate
    }).catch(err => console.error('Error updating offline status:', err));
    
    // Notify all conversations that user went offline
    const userConversations = await Conversation.find({ participants: userId });
    userConversations.forEach(async (conversation) => {
      const otherParticipant = conversation.participants.find(p => p.toString() !== userId);
      if (otherParticipant) {
        io.to(`user:${otherParticipant}`).emit('user:status', {
          userId: userId.toString(),
          isOnline: false,
          lastSeen: lastSeenDate
        });
      }
    });

    // Clean up typing indicators
    Object.keys(typingUsers).forEach(conversationId => {
      if (typingUsers[conversationId][userId]) {
        delete typingUsers[conversationId][userId];
        if (Object.keys(typingUsers[conversationId]).length === 0) {
          delete typingUsers[conversationId];
        }
      }
    });
  });

  // Handle message delivery confirmation
  socket.on('message:delivered', async (data) => {
    try {
      const { messageId } = data;
      if (!messageId) {
        console.error('message:delivered - missing messageId');
        return;
      }

      console.log('Message delivery confirmed:', messageId);

      const message = await Message.findById(messageId);
      if (!message) {
        console.error('Message not found for delivery:', messageId);
        return;
      }

      // Update message as delivered
      message.delivered = true;
      message.deliveredAt = new Date();
      await message.save();

      // Notify sender that message was delivered
      const senderId = message.senderId.toString();
      console.log('Notifying sender:', senderId);
      io.to(`user:${senderId}`).emit('message:delivered', {
        messageId: messageId.toString(),
        conversationId: message.conversationId.toString()
      });
    } catch (error) {
      console.error('Error handling message delivery:', error);
    }
  });

  // Handle sending a message
  socket.on('message:send', async (data) => {
    try {
      console.log('=== Message Send Request ===');
      console.log('User ID:', userId);
      console.log('Data:', data);
      
      const { conversationId, text, messageType, fileUrl, fileName, fileSize, mimeType } = data;

      if (!conversationId) {
        console.error('Missing conversationId');
        return socket.emit('error', { message: 'conversationId is required' });
      }

      // Text messages require text, file messages require fileUrl
      if (!text && !fileUrl) {
        console.error('Missing text or fileUrl');
        return socket.emit('error', { message: 'Either text or fileUrl is required' });
      }

      // Verify user is a participant
      const conversation = await Conversation.findById(conversationId);
      console.log('Conversation found:', conversation ? 'Yes' : 'No');
      
      if (!conversation) {
        console.error('Conversation not found:', conversationId);
        return socket.emit('error', { message: 'Conversation not found' });
      }
      
      const isParticipant = conversation.participants.some(p => p.toString() === userId);
      console.log('Is participant:', isParticipant);
      console.log('Participants:', conversation.participants.map(p => p.toString()));
      
      if (!isParticipant) {
        console.error('Access denied - user not a participant');
        return socket.emit('error', { message: 'Access denied' });
      }

      // Create message (initially not delivered)
      const messageData = {
        conversationId,
        senderId: userId,
        text: text ? text.trim() : '',
        messageType: messageType || 'text',
        delivered: false
      };

      // Add file data if present
      if (fileUrl) {
        messageData.fileUrl = fileUrl;
        messageData.fileName = fileName;
        messageData.fileSize = fileSize;
        messageData.mimeType = mimeType;
      }

      const message = new Message(messageData);
      await message.save();

      // Update conversation last message
      conversation.lastMessage = message._id;
      conversation.lastMessageAt = new Date();
      
      // Update unread count for recipients (not sender)
      const recipients = conversation.participants.filter(p => p.toString() !== userId);
      recipients.forEach(recipientId => {
        const recipientIdStr = recipientId.toString();
        if (!conversation.unreadCount) {
          conversation.unreadCount = new Map();
        }
        const currentCount = conversation.unreadCount.get(recipientIdStr) || 0;
        conversation.unreadCount.set(recipientIdStr, currentCount + 1);
      });
      
      await conversation.save();

      // Populate sender info
      await message.populate('senderId', 'username');

      // Prepare message payload for emitting (initially not delivered)
      const messagePayload = {
        id: message._id.toString(),
        conversationId: message.conversationId.toString(),
        senderId: message.senderId._id.toString(),
        senderUsername: message.senderId.username,
        text: message.text,
        messageType: message.messageType,
        delivered: false, // Will be updated when recipient confirms
        deliveredAt: null,
        read: false,
        readAt: null,
        createdAt: message.createdAt
      };

      // Add file data if present
      if (message.fileUrl) {
        messagePayload.fileUrl = message.fileUrl;
        messagePayload.fileName = message.fileName;
        messagePayload.fileSize = message.fileSize;
        messagePayload.mimeType = message.mimeType;
        messagePayload.thumbnailUrl = message.thumbnailUrl;
      }

      console.log('Emitting message to participants:', conversation.participants.map(p => p.toString()));
      console.log('Message payload:', messagePayload);
      
      // Emit to all participants (recipients will confirm delivery)
      conversation.participants.forEach(participantId => {
        const room = `user:${participantId}`;
        console.log(`Emitting to room: ${room}`);
        io.to(room).emit('message:new', messagePayload);
      });
      
      console.log('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Handle typing start
  socket.on('typing:start', async (data) => {
    try {
      const { conversationId } = data;

      if (!conversationId) {
        return socket.emit('error', { message: 'conversationId is required' });
      }

      // Verify user is a participant
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.some(p => p.toString() === userId)) {
        return socket.emit('error', { message: 'Conversation not found or access denied' });
      }

      // Add typing indicator
      if (!typingUsers[conversationId]) {
        typingUsers[conversationId] = {};
      }
      typingUsers[conversationId][userId] = Date.now();

      // Notify other participant
      const otherParticipant = conversation.participants.find(
        p => p.toString() !== userId
      );
      if (otherParticipant) {
        const user = await User.findById(userId).select('username');
        io.to(`user:${otherParticipant}`).emit('typing:start', {
          conversationId,
          userId,
          username: user.username
        });
      }
    } catch (error) {
      console.error('Error handling typing start:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Handle typing stop
  socket.on('typing:stop', async (data) => {
    try {
      const { conversationId } = data;

      if (!conversationId) {
        return socket.emit('error', { message: 'conversationId is required' });
      }

      // Verify user is a participant
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.some(p => p.toString() === userId)) {
        return socket.emit('error', { message: 'Conversation not found or access denied' });
      }

      // Remove typing indicator
      if (typingUsers[conversationId]) {
        delete typingUsers[conversationId][userId];
        if (Object.keys(typingUsers[conversationId]).length === 0) {
          delete typingUsers[conversationId];
        }
      }

      // Notify other participant
      const otherParticipant = conversation.participants.find(
        p => p.toString() !== userId
      );
      if (otherParticipant) {
        io.to(`user:${otherParticipant}`).emit('typing:stop', {
          conversationId,
          userId
        });
      }
    } catch (error) {
      console.error('Error handling typing stop:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Handle message read
  socket.on('message:read', async (data) => {
    try {
      const { conversationId, messageIds } = data;

      if (!conversationId || !messageIds || !Array.isArray(messageIds)) {
        return socket.emit('error', { message: 'conversationId and messageIds array are required' });
      }

      // Verify user is a participant
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.some(p => p.toString() === userId)) {
        return socket.emit('error', { message: 'Conversation not found or access denied' });
      }

      // Mark messages as read
      const updateResult = await Message.updateMany(
        {
          _id: { $in: messageIds },
          conversationId,
          senderId: { $ne: userId }, // Only mark messages sent by others as read
          read: false
        },
        {
          read: true,
          readAt: new Date()
        }
      );

      // Reset unread count for current user in this conversation
      if (updateResult.modifiedCount > 0) {
        const userIdStr = userId.toString();
        if (!conversation.unreadCount) {
          conversation.unreadCount = new Map();
        }
        conversation.unreadCount.set(userIdStr, 0);
        await conversation.save();
        
        // Notify home screen to refresh unread counts
        io.to(`user:${userId}`).emit('conversation:unread-updated', {
          conversationId,
          unreadCount: 0
        });
      }

      // Notify sender
      const otherParticipant = conversation.participants.find(
        p => p.toString() !== userId
      );
      if (otherParticipant) {
        io.to(`user:${otherParticipant}`).emit('message:read', {
          conversationId,
          messageIds
        });
      }
    } catch (error) {
      console.error('Error handling message read:', error);
      socket.emit('error', { message: error.message });
    }
  });
};

module.exports = { handleSocketConnection };

