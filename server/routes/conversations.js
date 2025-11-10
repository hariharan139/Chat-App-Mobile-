const express = require('express');
const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Find or create a conversation between two users
router.post('/find-or-create', authenticate, async (req, res) => {
  try {
    const { otherUserId } = req.body;
    const currentUserId = req.user._id;

    if (!otherUserId) {
      return res.status(400).json({ error: 'otherUserId is required' });
    }

    if (currentUserId.toString() === otherUserId) {
      return res.status(400).json({ error: 'Cannot create conversation with yourself' });
    }

    // Find existing conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, otherUserId] }
    });

    // Create if doesn't exist
    if (!conversation) {
      conversation = new Conversation({
        participants: [currentUserId, otherUserId]
      });
      await conversation.save();
    }

    res.json({
      id: conversation._id,
      participants: conversation.participants
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages for a conversation
router.get('/:id/messages', authenticate, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.user._id;

    // Verify user is a participant in this conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!conversation.participants.some(p => p.toString() === userId.toString())) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get messages
    const messages = await Message.find({ conversationId })
      .populate('senderId', 'username')
      .sort({ createdAt: 1 });

    res.json(messages.map(msg => ({
      id: msg._id,
      conversationId: msg.conversationId,
      senderId: msg.senderId._id,
      senderUsername: msg.senderId.username,
      text: msg.text,
      messageType: msg.messageType,
      fileUrl: msg.fileUrl,
      fileName: msg.fileName,
      fileSize: msg.fileSize,
      mimeType: msg.mimeType,
      thumbnailUrl: msg.thumbnailUrl,
      delivered: msg.delivered,
      deliveredAt: msg.deliveredAt,
      read: msg.read,
      readAt: msg.readAt,
      createdAt: msg.createdAt
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

