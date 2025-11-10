const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware for REST API authentication
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware for Socket.IO authentication
const authenticateSocket = async (socket, next) => {
  try {
    console.log('=== Socket Authentication ===');
    console.log('Handshake auth:', socket.handshake.auth);
    console.log('Handshake headers:', socket.handshake.headers);
    
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    
    if (!token) {
      console.error('No token provided in socket handshake');
      return next(new Error('Authentication error: No token provided'));
    }

    console.log('Token found, verifying...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded, userId:', decoded.userId);
    
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      console.error('User not found for userId:', decoded.userId);
      return next(new Error('Authentication error: User not found'));
    }

    socket.userId = user._id.toString();
    socket.user = user;
    console.log('✅ Socket authenticated for user:', user.username);
    next();
  } catch (error) {
    console.error('Socket authentication error:', error.message);
    next(new Error(`Authentication error: ${error.message}`));
  }
};

module.exports = { authenticate, authenticateSocket };

