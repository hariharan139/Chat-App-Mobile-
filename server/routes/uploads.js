const express = require('express');
const router = express.Router();
const path = require('path');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Note: Static file serving is handled in server/index.js with:
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// So files are accessible at: /uploads/images/filename, /uploads/videos/filename, etc.

// Upload file endpoint
router.post('/', authenticate, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Determine message type based on MIME type
    let messageType = 'document';
    if (req.file.mimetype.startsWith('image/')) {
      messageType = 'image';
    } else if (req.file.mimetype.startsWith('video/')) {
      messageType = 'video';
    } else if (req.file.mimetype.startsWith('audio/')) {
      messageType = 'audio';
    }

    // Return file info with full URL
    const fileUrl = `/uploads/${messageType}s/${req.file.filename}`;
    
    res.json({
      fileUrl: fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      messageType: messageType
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Note: Files are served statically via express.static in index.js
// This route is kept for backwards compatibility but files are served from /uploads/images/, /uploads/videos/, etc.

module.exports = router;

