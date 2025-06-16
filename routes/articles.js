const express = require('express');
const db = require('../database/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all articles
router.get('/', (req, res) => {
  const { search, category } = req.query;
  let query = `
    SELECT a.*, u.username as author_name 
    FROM articles a 
    JOIN users u ON a.author_id = u.id
  `;
  const params = [];

  if (search || category) {
    query += ' WHERE ';
    const conditions = [];
    
    if (search) {
      conditions.push('(a.title LIKE ? OR a.content LIKE ? OR a.tags LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (category) {
      conditions.push('a.category = ?');
      params.push(category);
    }
    
    query += conditions.join(' AND ');
  }

  query += ' ORDER BY a.created_at DESC';

  db.all(query, params, (err, articles) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(articles);
  });
});

// Get single article
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  db.get(`
    SELECT a.*, u.username as author_name 
    FROM articles a 
    JOIN users u ON a.author_id = u.id 
    WHERE a.id = ?
  `, [id], (err, article) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Get attachments
    db.all('SELECT * FROM attachments WHERE article_id = ?', [id], (err, attachments) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      article.attachments = attachments || [];
      res.json(article);
    });
  });
});

// Create article
router.post('/', authenticateToken, (req, res) => {
  const { title, content, category, tags } = req.body;
  const authorId = req.user.userId;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  db.run(
    'INSERT INTO articles (title, content, author_id, category, tags) VALUES (?, ?, ?, ?, ?)',
    [title, content, authorId, category || null, tags || null],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create article' });
      }

      res.status(201).json({
        message: 'Article created successfully',
        articleId: this.lastID
      });
    }
  );
});

// Update article
router.put('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { title, content, category, tags } = req.body;
  const userId = req.user.userId;

  // Check if article exists and user owns it
  db.get('SELECT * FROM articles WHERE id = ? AND author_id = ?', [id, userId], (err, article) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!article) {
      return res.status(404).json({ error: 'Article not found or unauthorized' });
    }

    db.run(
      'UPDATE articles SET title = ?, content = ?, category = ?, tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title, content, category || null, tags || null, id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to update article' });
        }

        res.json({ message: 'Article updated successfully' });
      }
    );
  });
});

// Delete article
router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  // Check if article exists and user owns it
  db.get('SELECT * FROM articles WHERE id = ? AND author_id = ?', [id, userId], (err, article) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!article) {
      return res.status(404).json({ error: 'Article not found or unauthorized' });
    }

    db.run('DELETE FROM articles WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete article' });
      }

      res.json({ message: 'Article deleted successfully' });
    });
  });
});

module.exports = router;