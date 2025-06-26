const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Use a configurable path for uploads.
// On Railway, this should point to a directory on a mounted volume, e.g., /data/uploads
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|md/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Upload file and attach to article
router.post('/:articleId', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { articleId } = req.params;
  const userId = req.user.userId;

  // Verify user owns the article
  db.get('SELECT * FROM articles WHERE id = ? AND author_id = ?', [articleId, userId], (err, article) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!article) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Article not found or unauthorized' });
    }

    // Save attachment info to database
    db.run(
      'INSERT INTO attachments (article_id, filename, original_name, file_path, file_size, mime_type) VALUES (?, ?, ?, ?, ?, ?)',
      [articleId, req.file.filename, req.file.originalname, req.file.path, req.file.size, req.file.mimetype],
      function(err) {
        if (err) {
          // Clean up uploaded file
          fs.unlinkSync(req.file.path);
          return res.status(500).json({ error: 'Failed to save attachment' });
        }

        res.json({
          message: 'File uploaded successfully',
          attachment: {
            id: this.lastID,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            mimeType: req.file.mimetype
          }
        });
      }
    );
  });
});

// Delete attachment
router.delete('/attachment/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  // Get attachment and verify ownership
  db.get(`
    SELECT att.*, a.author_id 
    FROM attachments att 
    JOIN articles a ON att.article_id = a.id 
    WHERE att.id = ?
  `, [id], (err, attachment) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!attachment || attachment.author_id !== userId) {
      return res.status(404).json({ error: 'Attachment not found or unauthorized' });
    }

    // Delete file from filesystem
    if (fs.existsSync(attachment.file_path)) {
      fs.unlinkSync(attachment.file_path);
    }

    // Delete from database
    db.run('DELETE FROM attachments WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete attachment' });
      }

      res.json({ message: 'Attachment deleted successfully' });
    });
  });
});

module.exports = router;