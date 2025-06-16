const bcrypt = require('bcryptjs');
const db = require('../database/init');

async function seedDatabase() {
  console.log('Seeding database...');

  try {
    // Create demo user
    const hashedPassword = await bcrypt.hash('demo123', 10);
    
    db.run('INSERT OR IGNORE INTO users (username, email, password) VALUES (?, ?, ?)', 
      ['demo', 'demo@example.com', hashedPassword], 
      function(err) {
        if (err) {
          console.error('Error creating demo user:', err);
          return;
        }

        const userId = this.lastID || 1;

        // Create sample articles
        const sampleArticles = [
          {
            title: 'Getting Started with React',
            content: '# Getting Started with React\n\nReact is a popular JavaScript library for building user interfaces...',
            category: 'Development',
            tags: 'react,javascript,frontend'
          },
          {
            title: 'Database Design Best Practices',
            content: '# Database Design Best Practices\n\nWhen designing databases, there are several key principles to follow...',
            category: 'Database',
            tags: 'database,sql,design'
          },
          {
            title: 'API Security Guidelines',
            content: '# API Security Guidelines\n\nSecuring your APIs is crucial for protecting your application and user data...',
            category: 'Security',
            tags: 'api,security,authentication'
          }
        ];

        sampleArticles.forEach(article => {
          db.run(
            'INSERT OR IGNORE INTO articles (title, content, author_id, category, tags) VALUES (?, ?, ?, ?, ?)',
            [article.title, article.content, userId, article.category, article.tags],
            function(err) {
              if (err) {
                console.error('Error creating article:', err);
              } else {
                console.log(`Created article: ${article.title}`);
              }
            }
          );
        });

        console.log('Database seeded successfully!');
        console.log('Demo user credentials:');
        console.log('Email: demo@example.com');
        console.log('Password: demo123');
      }
    );
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

seedDatabase();