const express = require('express');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get all users (excluding current user)
router.get('/', authenticate, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select('username email isOnline lastSeen')
      .sort({ username: 1 });

    // Get last message and unread count for each user
    const usersWithLastMessage = await Promise.all(
      users.map(async (user) => {
        // Find conversation between current user and this user
        const conversation = await Conversation.findOne({
          participants: { $all: [req.user._id, user._id] }
        }).populate('lastMessage');

        let lastMessage = null;
        let unreadCount = 0;
        if (conversation && conversation.lastMessage) {
          const lastMsg = conversation.lastMessage;
          lastMessage = {
            text: lastMsg.messageType === 'text' ? lastMsg.text : 
                  lastMsg.messageType === 'image' ? '📷 Photo' :
                  lastMsg.messageType === 'video' ? '🎥 Video' :
                  lastMsg.messageType === 'audio' ? '🎵 Audio' :
                  lastMsg.messageType === 'document' ? `📄 ${lastMsg.fileName || 'Document'}` : lastMsg.text,
            createdAt: lastMsg.createdAt,
            senderId: lastMsg.senderId.toString(),
            read: lastMsg.read,
            messageType: lastMsg.messageType
          };
          
          // Get unread count for current user
          const userIdStr = req.user._id.toString();
          if (conversation.unreadCount && conversation.unreadCount instanceof Map) {
            unreadCount = conversation.unreadCount.get(userIdStr) || 0;
          } else if (conversation.unreadCount && typeof conversation.unreadCount === 'object') {
            // Handle case where it's already an object (Mongoose converts Map to object in JSON)
            unreadCount = conversation.unreadCount[userIdStr] || 0;
          } else {
            unreadCount = 0;
          }
        }

        return {
          id: user._id,
          username: user.username,
          email: user.email,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
          lastMessage,
          unreadCount
        };
      })
    );

    res.json(usersWithLastMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

