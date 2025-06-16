# Knowledge Base Server

Backend API server for the Knowledge Base application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update the `.env` file with your configuration.

4. Seed the database with sample data:
```bash
npm run seed
```

5. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### Articles
- `GET /api/articles` - Get all articles (with optional search and category filters)
- `GET /api/articles/:id` - Get single article
- `POST /api/articles` - Create new article (requires authentication)
- `PUT /api/articles/:id` - Update article (requires authentication)
- `DELETE /api/articles/:id` - Delete article (requires authentication)

### File Upload
- `POST /api/upload/:articleId` - Upload file attachment to article
- `DELETE /api/upload/attachment/:id` - Delete attachment

## Demo Credentials

After running the seed script, you can use these credentials:
- Email: demo@example.com
- Password: demo123